"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const EditHandler = function(modeHandler) {
    const mode = modeHandler;
    const textStack = [];
    const undeleteStack = [];

    const deletedTextDetector = (function() {
        let possibleDeletingInfo = [];
        let onExpectedDelete = null;
        const reset = function() {
            possibleDeletingInfo.length = 0;
        };
        const setPossibleDeletingInfo = function(deletingInfo) {
            possibleDeletingInfo = deletingInfo;
        };
        const onDelete = function(changes) {
            if (!onExpectedDelete) {
                return;
            }
            if (changes.length !== possibleDeletingInfo.length) {
                // not matched
                return;
            }
            let deleted = [];
            for (let i = 0, n = changes.length; i < n; i++) {
                let c = changes[i];
                let p = possibleDeletingInfo[i];
                if (c.range.start.isEqual(p[0])) {
                    deleted.push({
                        isLeftward: false,
                        text: p[1].slice(0, c.rangeLength)
                    });
                } else if (c.range.end.isEqual(p[0])) {
                    deleted.push({
                        isLeftward: true,
                        text: p[1].slice(p[1].length - c.rangeLength)
                    });
                } else {
                    // not matched
                    return;
                }
            }
            onExpectedDelete(deleted);
        };
        return {
            reset,
            setPossibleDeletingInfo,
            onDelete,
            setOnExpectedDelete: function(f) { onExpectedDelete = f; }
        };
    })();
    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(function(event) {
                if (event.document === vscode.window.activeTextEditor.document) {
                    let changes = Array.from(event.contentChanges);
                    if (changes.length === 0) {
                        return;
                    }
                    if (changes.every(c => c.text.length === 0)) {
                        // pure deleting
                        changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
                        deletedTextDetector.onDelete(changes);
                    }
                }
                deletedTextDetector.reset();
            })
        );
        deletedTextDetector.setOnExpectedDelete(function(deleted) {
            undeleteStack.push(deleted);
            /*for (let i = 0, n = deleted.length; i < n; i++) {
                let d = deleted[i];
                console.log(d.isLeftward ? 'deleted leftward: ' : 'deleted rightward: ', '"' + d.text + '"');
            }*/
        });
    };
    const clearUndeleteStack = function() {
        undeleteStack.length = 0;
    };
    const readUndeleteStack = function() {
        if (0 < undeleteStack.length) {
            return undeleteStack[undeleteStack.length - 1];
        } else {
            return [];
        }
    };
    const singleLineRange = function(line) {
        return new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line + 1, 0)
        );
    };
    const cancelSelection = function(textEditor) {
        let cursor = mode.inBoxSelection() ?
            EditUtil.topmostSelection(textEditor.selections).start :
            textEditor.selections[0].active;
        textEditor.selection = new vscode.Selection(cursor, cursor);
        if (mode.inSelection()) {
            mode.resetSelection(textEditor);
        }
    };
    const readText = function(textEditor, ranges) {
        let texts = ranges.map((range) => {
            let text = textEditor.document.getText(range)
            return EditUtil.normalizeEOL(text);
        });
        if (1 < ranges.length) {
            if (ranges[0].start.isAfter(ranges[1].start)) {
                texts.reverse();
            }
            return texts.map((text) => text + '\n').join('');
        } else {
            return texts[0];
        }
    };
    const deleteRanges = function(edit, ranges) {
        ranges.forEach((range) => {
            edit.delete(range);
        });
    };
    const makeCutCopyRanges = function(textEditor) {
        let ranges = textEditor.selections.map(
            (selection) => new vscode.Range(selection.start, selection.end)
        );
        let isLineMode = false;
        EditUtil.sortRangesInAscending(ranges);
        if (EditUtil.rangesAllEmpty(ranges)) {
            isLineMode = true;
            if (1 < ranges.length || mode.inBoxSelection()) {
                let lines = EditUtil.getUniqueLineNumbersOfRanges(ranges);
                // Each range should NOT contain '\n' at the last.
                ranges = lines.map(
                    (line) => textEditor.document.lineAt(line).range
                );
            } else {
                // This range has a '\n' at the last.
                ranges = [ singleLineRange(ranges[0].start.line) ];
            }
        }
        return [ranges, isLineMode];
    };
    const clearTextStack = function() {
        textStack.length = 0;
    };
    let reentryGuard = null;
    const cutAndPushImpl = async function(textEditor, useTextStack = true) {
        if (reentryGuard === 'cutAndPush') {
            return;
        }
        reentryGuard = 'cutAndPush';
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        if (!useTextStack) {
            textStack.length = 0;
        }
        let lastCursorPos = textEditor.selections[0].active;
        let isBoxMode = mode.inBoxSelection();
        textStack.push({ text, isLineMode, isBoxMode });
        cancelSelection(textEditor);
        await textEditor.edit((edit) => deleteRanges(edit, ranges));
        if (isLineMode && !isBoxMode) {
            textEditor.selections = [new vscode.Selection(lastCursorPos, lastCursorPos)];
        }
        if (!EditUtil.enumVisibleLines(textEditor).includes(textEditor.selections[0].active.line)) {
            let newCursorPos = textEditor.selections[0].active;
            textEditor.revealRange(
                new vscode.Range(newCursorPos, newCursorPos),
                vscode.TextEditorRevealType.Default
            );
        }
        await vscode.env.clipboard.writeText(text);
        reentryGuard = null;
    };
    const cutAndPush = async function(textEditor, _edit) {
        const useTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        await cutAndPushImpl(textEditor, useTextStack);
    };
    const copyAndPushImpl = async function(textEditor, useTextStack = true) {
        if (reentryGuard === 'copyAndPush') {
            return;
        }
        reentryGuard = 'copyAndPush';
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        if (!useTextStack) {
            textStack.length = 0;
        }
        textStack.push({
            text: text,
            isLineMode: isLineMode,
            isBoxMode: mode.inBoxSelection()
        });
        cancelSelection(textEditor);
        await vscode.env.clipboard.writeText(text);
        reentryGuard = null;
    };
    const copyAndPush = async function(textEditor, _edit) {
        const useTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        await copyAndPushImpl(textEditor, useTextStack);
    };
    const peekTextStack = async function() {
        let text = await vscode.env.clipboard.readText();
        let isLineMode = false;
        let isBoxMode = false;
        if (0 < textStack.length) {
            let top = textStack[textStack.length - 1];
            if (top.text === text) {
                isLineMode = top.isLineMode;
                isBoxMode = top.isBoxMode;
            }
        }
        return [text, isLineMode, isBoxMode];
    };
    const popTextStack = async function() {
        let text = await vscode.env.clipboard.readText();
        let isLineMode = false;
        let isBoxMode = false;
        if (0 < textStack.length) {
            let top = textStack[textStack.length - 1];
            if (top.text === text) {
                isLineMode = top.isLineMode;
                isBoxMode = top.isBoxMode;
                textStack.pop();
            }
        }
        if (0 < textStack.length) {
            let next = textStack[textStack.length - 1];
            await vscode.env.clipboard.writeText(next.text);
        } else {
            await vscode.env.clipboard.writeText('');
        }
        return [text, isLineMode, isBoxMode];
    };
    const pasteLines = async function(textEditor, text) {
        let lastPos = textEditor.selection.start;
        let lineStart = new vscode.Position(lastPos.line, 0);
        textEditor.selection = new vscode.Selection(lineStart, lineStart);
        if (!text.endsWith('\n') &&
            (lastPos.line != textEditor.document.lineCount - 1 ||
            '' != textEditor.document.lineAt(lastPos.line).text)) {
            text += '\n';
        }
        await vscode.commands.executeCommand('paste', { text: text });
        textEditor.selection = new vscode.Selection(lastPos, lastPos);
    };
    const pasteInlineText = async function(text) {
        await vscode.commands.executeCommand('paste', { text: text });
    };
    const pasteBoxText = async function(textEditor, text) {
        let pos = textEditor.selection.active;
        let lines = text.split('\n');
        if (0 < lines.length && lines[lines.length - 1] === '') {
            lines.length = lines.length - 1;
        }
        let lineCount = textEditor.document.lineCount;
        for (let i = 0, n = lines.length; i < n; i++) {
            let len = pos.line + i < lineCount ? (
                textEditor.document.lineAt(pos.line + i).text.length
            ) : 0;
            if (len < pos.character) {
                lines[i] = ' '.repeat(pos.character - len) + lines[i];
            }
        }
        let overflow = pos.line + lines.length - lineCount;
        if (0 < overflow) {
            let rest = lines.slice(lines.length - overflow).join('\n');
            lines.length = lines.length - overflow;
            lines[lines.length] = '\n' + rest;
        }
        await textEditor.edit((edit) => {
            for (let i = 0, n = lines.length; i < n; i++) {
                edit.insert(
                    pos.with(pos.line + i),
                    lines[i]
                );
            }
        });
        let newPos = pos.with({character: pos.character + lines[0].length});
        textEditor.selections = [new vscode.Selection(newPos, newPos)];
    };
    const popAndPasteImpl = async function(textEditor, withoutPop = false) {
        if (reentryGuard === 'popAndPaste') {
            return;
        }
        reentryGuard = 'popAndPaste';
        let [text, isLineMode, isBoxMode] = withoutPop ? await peekTextStack() : await popTextStack();
        if (isBoxMode) {
            await pasteBoxText(textEditor, text);
        } else if (isLineMode && !mode.inBoxSelection()) {
            await pasteLines(textEditor, text);
        } else {
            await pasteInlineText(text);
        }
        reentryGuard = null;
    };
    const popAndPaste = async function(textEditor, _edit) {
        const enableTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        await popAndPasteImpl(textEditor, enableTextStack ? false : true);
    };
    const paste = async function(textEditor, _edit) {
        await popAndPasteImpl(textEditor, true);
    };
    const runEditCommand = function(command, textEditor, _edit) {
        if (mode.inSelection() && !mode.inBoxSelection()) {
            vscode.commands.executeCommand(command);
            mode.resetSelection(textEditor);
        } else {
            vscode.commands.executeCommand(command);
        }
    };
    const makeEditCommand = function(command) {
        return function(textEditor, edit) {
            runEditCommand(command, textEditor, edit);
        };
    };
    const prepareDeleting = function(textEditor, isLeftward) {
        let deletingInfo = [];
        for (let i = 0; i < textEditor.selections.length; i++) {
            let selection = textEditor.selections[i];
            let position = selection.active;
            if (selection.isEmpty) {
                let text = (
                    isLeftward
                    ? '\n' + textEditor.document.lineAt(position.line).text.slice(0, position.character)
                    : textEditor.document.lineAt(position.line).text.slice(position.character) + '\n'
                );
                deletingInfo.push([position, text]);
            } else {
                let range = new vscode.Range(selection.start, selection.end);
                deletingInfo.push([
                    position,
                    textEditor.document.getText(range)
                ]);
            }
        }
        deletingInfo.sort((a, b) => a[0].compareTo(b[0]));
        deletedTextDetector.setPossibleDeletingInfo(deletingInfo);
    };
    const prepareDeletingLeft = function(textEditor) {
        prepareDeleting(textEditor, true);
    };
    const prepareDeletingRight = function(textEditor) {
        prepareDeleting(textEditor, false);
    };
    const deleteLeft = function(textEditor, edit) {
        prepareDeletingLeft(textEditor);
        runEditCommand('deleteLeft', textEditor, edit);
    };
    const deleteRight = function(textEditor, edit) {
        prepareDeletingRight(textEditor);
        runEditCommand('deleteRight', textEditor, edit);
    };
    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand(context, 'clipboardCut', cutAndPush);
        registerTextEditorCommand(context, 'clipboardCopy', copyAndPush);
        registerTextEditorCommand(context, 'clipboardPopAndPaste', popAndPaste);
        registerTextEditorCommand(context, 'clipboardPaste', paste);
        registerTextEditorCommand(context, 'deleteLeft', deleteLeft);
        registerTextEditorCommand(context, 'deleteRight', deleteRight);
        registerTextEditorCommand(context, 'deleteWordLeft', makeEditCommand('deleteWordLeft'));
        registerTextEditorCommand(context, 'deleteWordRight', makeEditCommand('deleteWordRight'));
        registerTextEditorCommand(context, 'deleteAllLeft', makeEditCommand('deleteAllLeft'));
        registerTextEditorCommand(context, 'deleteAllRight', makeEditCommand('deleteAllRight'));
    };
    return {
        clearUndeleteStack, // for testing purpose
        readUndeleteStack,
        singleLineRange,
        cancelSelection,
        readText,
        deleteRanges,
        makeCutCopyRanges,
        clearTextStack, // for testing purpose
        cutAndPushImpl,
        cutAndPush,
        copyAndPushImpl,
        copyAndPush,
        peekTextStack,
        popTextStack,
        pasteLines,
        pasteInlineText,
        pasteBoxText,
        popAndPasteImpl,
        deleteLeft,
        deleteRight,
        registerCommands
    };
};

exports.EditHandler = EditHandler;

const theInstance = EditHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
