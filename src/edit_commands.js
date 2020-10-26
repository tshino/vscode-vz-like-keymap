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
        let numExpectedChanges = 0;
        let onExpectedDelete = null;
        const reset = function() {
            possibleDeletingInfo.length = 0;
        };
        const setPossibleDeletingInfo = function(deletingInfo) {
            possibleDeletingInfo = deletingInfo;
            numExpectedChanges = deletingInfo.filter(x => x[1].length !== 0).length;
        };
        const onDelete = function(changes) {
            if (!onExpectedDelete) {
                return;
            }
            if (changes.length !== numExpectedChanges) {
                // not matched
                return;
            }
            let deleted = [];
            for (let i = 0, j = 0, n = possibleDeletingInfo.length; i < n; i++) {
                let p = possibleDeletingInfo[i];
                if (p[1].length === 0) {
                    deleted.push({ isLeftward: true, text: '' });
                    continue;
                }
                let c = changes[j++];
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
            for (let i = 0; i < deleted.length; i++) {
                deleted[i].text = EditUtil.normalizeEOL(deleted[i].text);
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
    const popUndeleteStack = function() {
        if (0 < undeleteStack.length) {
            return undeleteStack.pop();
        } else {
            return [];
        }
    };
    const pushUndeleteStack = function(deleted) {
        undeleteStack.push(deleted);
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
    const getTextStackLength = function() {
        return textStack.length;
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
    const clearStack = async function(_textEditor, _edit) {
        clearTextStack();
        await vscode.env.clipboard.writeText('');
        vscode.window.setStatusBarMessage('Text stack has been cleared.', 3000);
    };
    const runEditCommand = function(command, textEditor, _edit) {
        if (mode.inSelection() && !mode.inBoxSelection()) {
            vscode.commands.executeCommand(command);
            mode.resetSelection(textEditor);
        } else {
            vscode.commands.executeCommand(command);
        }
    };
    const prepareDeleting = function(textEditor, isLeftward) {
        let deletingInfo = [];
        for (let i = 0; i < textEditor.selections.length; i++) {
            let selection = textEditor.selections[i];
            let position = selection.active;
            if (selection.isEmpty) {
                let start = position, end = position;
                if (isLeftward) {
                    start = new vscode.Position(Math.max(0, position.line - 1), 0);
                } else {
                    let nextLine = Math.min(textEditor.document.lineCount - 1, position.line + 1);
                    end = new vscode.Position(nextLine, textEditor.document.lineAt(nextLine).text.length);
                }
                let text = textEditor.document.getText(new vscode.Range(start, end));
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
    const deleteWordLeft = function(textEditor, edit) {
        prepareDeletingLeft(textEditor);
        runEditCommand('deleteWordLeft', textEditor, edit);
    };
    const deleteWordRight = function(textEditor, edit) {
        prepareDeletingRight(textEditor);
        runEditCommand('deleteWordRight', textEditor, edit);
    };
    const deleteAllLeft = function(textEditor, edit) {
        prepareDeletingLeft(textEditor);
        runEditCommand('deleteAllLeft', textEditor, edit);
    };
    const deleteAllRight = function(textEditor, edit) {
        prepareDeletingRight(textEditor);
        runEditCommand('deleteAllRight', textEditor, edit);
    };
    const insertDeletedTexts = async function(textEditor, deleted) {
        let n = textEditor.selections.length;
        await textEditor.edit(function(edit) {
            for (let i = 0; i < n; i++) {
                let selection = textEditor.selections[i];
                if (deleted[i].isLeftward && selection.isEmpty) {
                    edit.insert(selection.active, deleted[i].text);
                } else {
                    edit.replace(selection, deleted[i].text);
                }
            }
        });
        let selections = Array.from(textEditor.selections);
        let updateSelections = false;
        n = Math.min(selections.length, deleted.length);
        for (let i = 0; i < n; i++) {
            let newCursor = null;
            if (!deleted[i].isLeftward) {
                newCursor = selections[i].anchor;
                if (deleted[i].offset !== undefined) {
                    newCursor = selections[i].anchor.translate({characterDelta: deleted[i].offset});
                }
            } else if (!selections[i].isEmpty) {
                newCursor = selections[i].active;
            }
            if (newCursor) {
                selections[i] = new vscode.Selection(newCursor, newCursor);
                updateSelections = true;
            }
        }
        if (updateSelections) {
            textEditor.selections = selections;
            if (n === 1) {
                mode.resetSelection(textEditor);
            }
        }
    };
    const undelete = async function(textEditor, _edit) {
        let deleted = popUndeleteStack();
        if (0 < deleted.length) {
            let n = textEditor.selections.length;
            if (deleted.length > n) {
                if (n === 1) {
                    let selections = [textEditor.selections[0]];
                    let pos = textEditor.selections[0].start;
                    let lineCount = textEditor.document.lineCount;
                    for (let i = 1; i < deleted.length; i++) {
                        let x = pos.character, y = pos.line + i;
                        if (y < lineCount) {
                            let len = textEditor.document.lineAt(y).text.length;
                            if (x <= len) {
                                selections.push(new vscode.Selection(y, x, y, x));
                            } else {
                                selections.push(new vscode.Selection(y, 0, y, 0));
                                deleted[i].text = ' '.repeat(x) + deleted[i].text;
                                deleted[i].offset = x;
                            }
                        } else {
                            let overflowed = deleted.slice(i - 1).map(d => d.text).join('');
                            deleted[i - 1].text = overflowed;
                            deleted.length = i;
                            break;
                        }
                    }
                    textEditor.selections = selections;
                } else {
                    let overflowed = deleted.slice(n - 1).map(d => d.text).join('');
                    deleted[n - 1].text = overflowed;
                    deleted.length = n;
                }
            } else if (deleted.length < n) {
                let fill_value = (
                    deleted.length === 1 ? deleted[0] : { isLeftward: true, text: '' }
                );
                while (deleted.length < n) {
                    deleted.push(fill_value);
                }
            }
            await insertDeletedTexts(textEditor, deleted);
        }
    };
    const LOWERCASE = 0;
    const UPPERCASE = 1;
    const TITLECASE = 2;
    const SINGLEUPPERCASELETTER = 3;
    const isLowercaseAlphabet = function(char) {
        return char.toUpperCase() !== char;
    };
    const isUppercaseAlphabet = function(char) {
        return char.toLowerCase() !== char;
    };
    const isAlphabet = function(char) {
        return isLowercaseAlphabet(char) || isUppercaseAlphabet(char);
    };
    const getCase = function(text) {
        let char = text.charAt(0);
        if (isLowercaseAlphabet(char)) {
            return LOWERCASE;
        }
        if (isUppercaseAlphabet(char)) {
            if (1 < text.length) {
                let char2 = text.charAt(1);
                if (isLowercaseAlphabet(char2)) {
                    return TITLECASE;
                }
                if (isUppercaseAlphabet(char2)) {
                    return UPPERCASE;
                }
            }
            return SINGLEUPPERCASELETTER;
        }
        return null;
    };
    const detectCurrentCaseAt = function(text, col) {
        if (col === text.length || !isAlphabet(text.charAt(col))) {
            --col;
        }
        if (0 <= col && isAlphabet(text.charAt(col))) {
            while (0 < col && isAlphabet(text.charAt(col - 1))) {
                --col;
            }
            return getCase(text.slice(col));
        }
        return null;
    };
    const detectCurrentCaseInSelection = function(text) {
        let col = 0;
        let current = null;
        for (;;) {
            while (col < text.length && !isAlphabet(text.charAt(col))) {
                ++col;
            }
            if (col === text.length) {
                break;
            }
            current =  getCase(text.slice(col));
            if (current !== null && current !== SINGLEUPPERCASELETTER) {
                return current;
            }
            while (col < text.length && isAlphabet(text.charAt(col))) {
                ++col;
            }
        }
        return current;
    };
    const detectCurrentCaseOfSelection = function(textEditor) {
        for (let i = 0; i < textEditor.selections.length; i++) {
            let range = textEditor.selections[i];
            let current = null;
            if (range.isEmpty) {
                let text = textEditor.document.lineAt(range.start.line).text;
                current = detectCurrentCaseAt(text, range.start.character);
            } else {
                let text = textEditor.document.getText(range);
                current = detectCurrentCaseInSelection(text);
            }
            if (current !== null) {
                return current;
            }
        }
        return null;
    };
    // State transition:
    //      1.lowercase --> 2.uppercase --> 3.titlecase --> (return to 1)
    //      1.single-lowercase-letter --> 2.single-uppercase-letter --> (return to 1)
    let lastCaseTransformTo = null;
    let lastCaseTransformPos = null;
    const getNextCaseTransformTo = function(textEditor) {
        if (lastCaseTransformPos !== null &&
            !lastCaseTransformPos.isEqual(textEditor.selections[0].start)) {
            lastCaseTransformTo = null;
        }
        lastCaseTransformPos = textEditor.selections[0].start;
        let next = null;
        let current = detectCurrentCaseOfSelection(textEditor);
        if (current === null && lastCaseTransformTo !== null) {
            next = (lastCaseTransformTo + 1) % 3;
        } else {
            next =
                current === UPPERCASE ? TITLECASE :
                current === TITLECASE ? LOWERCASE :
                current === SINGLEUPPERCASELETTER ? LOWERCASE :
                UPPERCASE;
        }
        lastCaseTransformTo = next;
        return next;
    };
    const transformCase = async function(textEditor, _edit) {
        let nextCase = getNextCaseTransformTo(textEditor);
        switch (nextCase) {
            case LOWERCASE:
                await vscode.commands.executeCommand('editor.action.transformToLowercase');
                break;
            case UPPERCASE:
                await vscode.commands.executeCommand('editor.action.transformToUppercase');
                break;
            case TITLECASE:
                await vscode.commands.executeCommand('editor.action.transformToTitlecase');
                break;
            default:
                break;
        }
    };
    const insertPath = async function(textEditor, _edit) {
        let path = textEditor.document.fileName;
        await vscode.commands.executeCommand('paste', { text: path });
    };
    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand(context, 'clipboardCut', cutAndPush);
        registerTextEditorCommand(context, 'clipboardCopy', copyAndPush);
        registerTextEditorCommand(context, 'clipboardPopAndPaste', popAndPaste);
        registerTextEditorCommand(context, 'clipboardPaste', paste);
        registerTextEditorCommand(context, 'clipboardClearStack', clearStack);
        registerTextEditorCommand(context, 'deleteLeft', deleteLeft);
        registerTextEditorCommand(context, 'deleteRight', deleteRight);
        registerTextEditorCommand(context, 'deleteWordLeft', deleteWordLeft);
        registerTextEditorCommand(context, 'deleteWordRight', deleteWordRight);
        registerTextEditorCommand(context, 'deleteAllLeft', deleteAllLeft);
        registerTextEditorCommand(context, 'deleteAllRight', deleteAllRight);
        registerTextEditorCommand(context, 'undelete', undelete);
        registerTextEditorCommand(context, 'transformCase', transformCase);
        registerTextEditorCommand(context, 'insertPath', insertPath);
    };
    return {
        clearUndeleteStack, // for testing purpose
        readUndeleteStack, // for testing purpose
        pushUndeleteStack, // for testing purpose
        singleLineRange,
        cancelSelection,
        readText,
        deleteRanges,
        makeCutCopyRanges,
        clearTextStack, // for testing purpose
        getTextStackLength, // for testing purpose
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
        clearStack,
        deleteLeft,
        deleteRight,
        deleteWordLeft,
        deleteWordRight,
        deleteAllLeft,
        deleteAllRight,
        undelete,
        transformCase,
        insertPath,
        registerCommands
    };
};

exports.EditHandler = EditHandler;

const theInstance = EditHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
