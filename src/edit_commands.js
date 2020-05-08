"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const EditHandler = function(modeHandler) {
    const mode = modeHandler;
    const textStack = [];

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
    let pasteReentryLock = false;
    const cutAndPush = function(textEditor, edit) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        const enableTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        if (!enableTextStack) {
            textStack.length = 0;
        }
        textStack.push({
            text: text,
            isLineMode: isLineMode,
            isBoxMode: mode.inBoxSelection()
        });
        vscode.env.clipboard.writeText(text);
        cancelSelection(textEditor);
        deleteRanges(edit, ranges);
        pasteReentryLock = false;
    };
    const copyAndPush = function(textEditor, _edit) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        const enableTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        if (!enableTextStack) {
            textStack.length = 0;
        }
        textStack.push({
            text: text,
            isLineMode: isLineMode,
            isBoxMode: mode.inBoxSelection()
        });
        vscode.env.clipboard.writeText(text);
        cancelSelection(textEditor);
        pasteReentryLock = false;
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
    const pasteLines = function(textEditor, text) {
        let lastPos = textEditor.selection.start;
        let lineStart = new vscode.Position(lastPos.line, 0);
        textEditor.selection = new vscode.Selection(lineStart, lineStart);
        let res = vscode.commands.executeCommand('paste', { text: text });
        res.then(function() {
            textEditor.selection = new vscode.Selection(lastPos, lastPos);
            pasteReentryLock = false;
        });
        return res;
    };
    const pasteInlineText = function(text) {
        let res = vscode.commands.executeCommand('paste', { text: text });
        res.then(function() {
            pasteReentryLock = false;
        });
        return res;
    };
    const pasteBoxText = function(textEditor, text) {
        let pos = textEditor.selection.active;
        let lines = text.split('\n');
        if (0 < lines.length && lines[lines.length - 1] === '') {
            lines.length = lines.length - 1;
        }
        let lineCount = textEditor.document.lineCount;
        let overflow = pos.line + lines.length - lineCount;
        if (0 < overflow) {
            let rest = lines.slice(lines.length - overflow).join('\n');
            lines.length = lines.length - overflow;
            lines[lines.length] = '\n' + rest;
        }
        let res = textEditor.edit((edit) => {
            for (let i = 0, n = lines.length; i < n; i++) {
                edit.insert(
                    pos.with(pos.line + i),
                    lines[i]
                );
            }
        });
        res.then(function() {
            pasteReentryLock = false;
        });
        return res;
    };
    const popAndPasteImpl = async function(textEditor, withoutPop = false) {
        if (pasteReentryLock) {
            return;
        }
        pasteReentryLock = true;
        let [text, isLineMode, isBoxMode] = withoutPop ? await peekTextStack() : await popTextStack();
        if (isBoxMode) {
            return pasteBoxText(textEditor, text);
        } else if (isLineMode && !mode.inBoxSelection()) {
            return pasteLines(textEditor, text);
        } else {
            return pasteInlineText(text);
        }
    };
    const popAndPaste = async function(textEditor, _edit) {
        const enableTextStack = vscode.workspace.getConfiguration('vzKeymap').get('textStack');
        await popAndPasteImpl(textEditor, enableTextStack ? false : true);
    };
    const paste = async function(textEditor, _edit) {
        await popAndPasteImpl(textEditor, true);
    };
    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'clipboardCut', cutAndPush);
        registerTextEditorCommand(context, 'clipboardCopy', copyAndPush);
        registerTextEditorCommand(context, 'clipboardPopAndPaste', popAndPaste);
        registerTextEditorCommand(context, 'clipboardPaste', paste);
    };
    return {
        singleLineRange: singleLineRange,
        cancelSelection: cancelSelection,
        readText: readText,
        deleteRanges: deleteRanges,
        makeCutCopyRanges: makeCutCopyRanges,
        cutAndPush: cutAndPush,
        copyAndPush: copyAndPush,
        peekTextStack,
        registerCommands
    };
};

exports.EditHandler = EditHandler;
