"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");
const keyboard_macro = require("./keyboard_macro.js");

const kbMacroHandler = keyboard_macro.getInstance();
const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const EditHandler = function(modeHandler) {
    const mode = modeHandler;
    const textStack = [];
    const undeleteStack = [];
    let editsFreeCounter = 0;
    let editsExpected = false; // for keyboard macro recording
    let editsConfirmed = false;
    let missingExpectedEditsCount = 0;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const expectEdits = function() {
        editsExpected = true;
        editsConfirmed = false;
    };
    const endExpectEdits = function() {
        if (!editsConfirmed) {
            missingExpectedEditsCount += 1;
            console.log('*** debug: Missing expected edits #' + missingExpectedEditsCount);
        }
        editsExpected = false;
    };
    const cancelExpectEdits = function() {
        editsExpected = false;
    };
    const getEditsFreeCounter = function() {
        return editsFreeCounter;
    };
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
                    continue;
                } else if (c.range.end.isEqual(p[0])) {
                    if (c.rangeLength <= p[1].length) {
                        deleted.push({
                            isLeftward: true,
                            text: p[1].slice(p[1].length - c.rangeLength)
                        });
                        continue;
                    }
                }
                // not matched
                // console.log('*** unmatched delete event');
                return;
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
                    editsFreeCounter += 1;
                    if (editsExpected) {
                        editsConfirmed = true;
                    }
                    let changes = Array.from(event.contentChanges);
                    if (changes.length === 0) {
                        return;
                    }
                    if (changes.every(c => c.text.length === 0)) {
                        // pure deleting
                        changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
                        deletedTextDetector.onDelete(changes);
                    }
                    if (kbMacroHandler.recording() && !editsExpected) {
                        kbMacroHandler.processOnChangeDocument(changes);
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
    const cancelSelection = async function(textEditor) {
        let cursor = mode.inBoxSelection() ?
            EditUtil.topmostSelection(textEditor.selections).start :
            textEditor.selections[0].active;
        let newSelections = [new vscode.Selection(cursor, cursor)];
        if (mode.inSelection()) {
            mode.resetSelection(textEditor);
        }
        if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
            mode.expectSync();
            textEditor.selections = newSelections;
            await mode.waitForSyncTimeout(100).catch(() => {});
        } else {
            mode.sync(textEditor);
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
    const makeGuardedCommand = function(name, func) {
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            try {
                kbMacroHandler.pushIfRecording('vz.' + name, guardedCommand);
                await func(textEditor, edit);
            } catch (error) {
                console.log('*** debug: unhandled exception in execution of command vz.' + name, error);
            }
            reentryGuard = null;
        };
        return guardedCommand;
    };
    const waitForEndOfGuardedCommand = async function() { // test purpose only
        for (let i = 0; i < 50 && reentryGuard !== null; i++) {
            await sleep(10);
        }
        if (reentryGuard !== null) {
            console.log('*** debug: Guarded command still be running unexpectedly')
        }
    };
    const cutAndPushImpl = async function(textEditor, useTextStack = true) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        if (!useTextStack) {
            if (0 < textStack.length) {
                textStack.length = textStack.length - 1;
            }
        }
        let nextCursorPos = textEditor.selections[0].active;
        let isBoxMode = mode.inBoxSelection();
        textStack.push({ text, isLineMode, isBoxMode });
        if (!isLineMode || isBoxMode) {
            nextCursorPos = mode.inBoxSelection() ?
                EditUtil.topmostSelection(textEditor.selections).start :
                textEditor.selections[0].start;
        }
        expectEdits();
        mode.expectSync();
        await textEditor.edit((edit) => deleteRanges(edit, ranges));
        // for (let i = 0; i < 10 && !mode.synchronized(); i++) {
            // await sleep(5);
        // }
        endExpectEdits();
        let newLineLength = textEditor.document.lineAt(nextCursorPos.line).text.length;
        if (newLineLength < nextCursorPos.character) {
            nextCursorPos = nextCursorPos.with({character: newLineLength});
        }
        let newSelections = [new vscode.Selection(nextCursorPos, nextCursorPos)];
        if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
            mode.expectSync();
            textEditor.selections = newSelections;
            if (mode.inSelection()) {
                mode.resetSelection(textEditor);
            }
            await mode.waitForSyncTimeout(50).catch(() => {});
        } else {
            if (mode.inSelection()) {
                mode.resetSelection(textEditor);
            }
            mode.sync(textEditor);
        }
        if (!EditUtil.enumVisibleLines(textEditor).includes(textEditor.selections[0].active.line)) {
            let newCursorPos = textEditor.selections[0].active;
            textEditor.revealRange(
                new vscode.Range(newCursorPos, newCursorPos),
                vscode.TextEditorRevealType.Default
            );
        }
        await vscode.env.clipboard.writeText(text);
    };
    const clipboardCutAndPush = makeGuardedCommand(
        'clipboardCutAndPush',
        async function(textEditor, _edit) {
            const useTextStack = true;
            await cutAndPushImpl(textEditor, useTextStack);
        }
    );
    const clipboardCut = makeGuardedCommand(
        'clipboardCut',
        async function(textEditor, _edit) {
            const useTextStack = false;
            await cutAndPushImpl(textEditor, useTextStack);
        }
    );
    const copyAndPushImpl = async function(textEditor, useTextStack = true) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        if (!useTextStack) {
            if (0 < textStack.length) {
                textStack.length = textStack.length - 1;
            }
        }
        let isBoxMode = mode.inBoxSelection();
        textStack.push({ text, isLineMode, isBoxMode });
        cancelSelection(textEditor);
        await vscode.env.clipboard.writeText(text);
    };
    const clipboardCopyAndPush = makeGuardedCommand(
        'clipboardCopyAndPush',
        async function(textEditor, _edit) {
            const useTextStack = true;
            await copyAndPushImpl(textEditor, useTextStack);
        }
    );
    const clipboardCopy = makeGuardedCommand(
        'clipboardCopy',
        async function(textEditor, _edit) {
            const useTextStack = false;
            await copyAndPushImpl(textEditor, useTextStack);
        }
    );
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
            (lastPos.line !== textEditor.document.lineCount - 1 ||
            '' !== textEditor.document.lineAt(lastPos.line).text)) {
            text += '\n';
        }
        expectEdits();
        mode.expectSync();
        await vscode.commands.executeCommand('paste', { text: text });
        endExpectEdits();
        let newSelections = [new vscode.Selection(lastPos, lastPos)];
        if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
            mode.expectSync();
            textEditor.selections = newSelections;
            await mode.waitForSyncTimeout(50).catch(() => {});
        } else {
            mode.sync(textEditor);
        }
    };
    const pasteInlineText = async function(text) {
        if (text !== '') {
            expectEdits();
            mode.expectSync();
            await vscode.commands.executeCommand('paste', { text: text });
            endExpectEdits();
        }
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
        expectEdits();
        mode.expectSync();
        await textEditor.edit((edit) => {
            for (let i = 0, n = lines.length; i < n; i++) {
                edit.insert(
                    pos.with(pos.line + i),
                    lines[i]
                );
            }
        });
        endExpectEdits();
        let newPos = pos.with({character: pos.character + lines[0].length});
        let newSelections = [new vscode.Selection(newPos, newPos)];
        if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
            mode.expectSync();
            textEditor.selections = newSelections;
            await mode.waitForSyncTimeout(50).catch(() => {});
        } else {
            mode.sync(textEditor);
        }
    };
    const popAndPasteImpl = async function(textEditor, withPop = true) {
        let [text, isLineMode, isBoxMode] = withPop ? await popTextStack() : await peekTextStack();
        if (isBoxMode) {
            await pasteBoxText(textEditor, text);
        } else if (isLineMode && !mode.inBoxSelection()) {
            await pasteLines(textEditor, text);
        } else {
            await pasteInlineText(text);
        }
    };
    const clipboardPopAndPaste = makeGuardedCommand(
        'clipboardPopAndPaste',
        async function(textEditor, _edit) {
            const withPop = true;
            await popAndPasteImpl(textEditor, withPop);
        }
    );
    const clipboardPaste = makeGuardedCommand(
        'clipboardPaste',
        async function(textEditor, _edit) {
            const withPop = false;
            await popAndPasteImpl(textEditor, withPop);
        }
    );
    const clipboardClearStack = makeGuardedCommand(
        'clipboardClearStack',
        async function(_textEditor, _edit) {
            clearTextStack();
            await vscode.env.clipboard.writeText('');
            vscode.window.setStatusBarMessage('Text stack has been cleared.', 3000);
        }
    );
    const runEditCommand = async function(command, textEditor, _edit) {
        let resetSelection = mode.inSelection() && !mode.inBoxSelection();
        await vscode.commands.executeCommand(command);
        if (resetSelection) {
            mode.resetSelection(textEditor);
        }
    };
    const prepareDeleting = function(textEditor, isLeftward, isLeftAll) {
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
                let start = selection.start;
                if (isLeftward && isLeftAll) {
                    start = new vscode.Position(start.line, 0);
                    position = selection.end;
                }
                let range = new vscode.Range(start, selection.end);
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
        prepareDeleting(textEditor, true, false);
    };
    const prepareDeletingLeftAll = function(textEditor) {
        prepareDeleting(textEditor, true, true);
    };
    const prepareDeletingRight = function(textEditor) {
        prepareDeleting(textEditor, false, false);
    };
    const cursorIsAtBeginningOfDocument = function(textEditor) {
        let selection = textEditor.selections[0];
        if (selection.active.line === 0 &&
            selection.active.character === 0 &&
            selection.isEmpty &&
            textEditor.selections.length === 1) {
            return true;
        }
        return false;
    };
    const cursorIsAtEndOfDocument = function(textEditor) {
        let selection = textEditor.selections[0];
        let lastLine = textEditor.document.lineCount - 1;
        if (selection.active.line === lastLine &&
            selection.active.character === textEditor.document.lineAt(lastLine).text.length &&
            selection.isEmpty &&
            textEditor.selections.length === 1) {
            return true;
        }
        return false;
    };
    const deleteLeft = makeGuardedCommand(
        'deleteLeft',
        async function(textEditor, edit) {
            if (cursorIsAtBeginningOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            mode.expectSync();
            prepareDeletingLeft(textEditor);
            await runEditCommand('deleteLeft', textEditor, edit);
            endExpectEdits();
        }
    );
    const deleteRight = makeGuardedCommand(
        'deleteRight',
        async function(textEditor, edit) {
            if (cursorIsAtEndOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            // if (mode.inSelection()) {
                // mode.expectSync();
            // }
            prepareDeletingRight(textEditor);
            await runEditCommand('deleteRight', textEditor, edit);
            endExpectEdits();
        }
    );
    const deleteWordLeft = makeGuardedCommand(
        'deleteWordLeft',
        async function(textEditor, edit) {
            if (cursorIsAtBeginningOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            mode.expectSync();
            prepareDeletingLeft(textEditor);
            await runEditCommand('deleteWordLeft', textEditor, edit);
            endExpectEdits();
        }
    );
    const deleteWordRight = makeGuardedCommand(
        'deleteWordRight',
        async function(textEditor, edit) {
            if (cursorIsAtEndOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            // if (mode.inSelection()) {
                // mode.expectSync();
            // }
            prepareDeletingRight(textEditor);
            await runEditCommand('deleteWordRight', textEditor, edit);
            endExpectEdits();
        }
    );
    const deleteAllLeft = makeGuardedCommand(
        'deleteAllLeft',
        async function(textEditor, edit) {
            if (cursorIsAtBeginningOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            mode.expectSync();
            prepareDeletingLeftAll(textEditor);
            await runEditCommand('deleteAllLeft', textEditor, edit);
            endExpectEdits();
        }
    );
    const deleteAllRight = makeGuardedCommand(
        'deleteAllRight',
        async function(textEditor, edit) {
            if (cursorIsAtEndOfDocument(textEditor)) {
                return; // nothing to do
            }
            expectEdits();
            // if (mode.inSelection()) {
                // mode.expectSync();
            // }
            prepareDeletingRight(textEditor);
            await runEditCommand('deleteAllRight', textEditor, edit);
            endExpectEdits();
        }
    );
    const insertDeletedTexts = async function(textEditor, deleted) {
        let n = textEditor.selections.length;
        mode.expectSync();
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
            mode.expectSync();
            textEditor.selections = selections;
            if (n === 1) {
                mode.resetSelection(textEditor);
            }
        }
    };
    const undeleteImpl = async function(textEditor, _edit) {
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
            expectEdits();
            await insertDeletedTexts(textEditor, deleted);
            endExpectEdits();
        }
    };
    const undelete = makeGuardedCommand(
        'undelete',
        undeleteImpl
    );
    const insertLineBefore = makeGuardedCommand(
        'insertLineBefore',
        async function(textEditor, _edit) {
            let resetSelection = mode.inSelection() && !mode.inBoxSelection();
            let selectionsWillChange = !(
                1 === textEditor.selections.length &&
                textEditor.selections[0].isEmpty &&
                textEditor.selections[0].start.character === 0
            );
            expectEdits();
            if (selectionsWillChange) {
                mode.expectSync();
            }
            await vscode.commands.executeCommand('editor.action.insertLineBefore');
            if (resetSelection) {
                mode.resetSelection(textEditor);
            }
            endExpectEdits();
            if (selectionsWillChange || resetSelection) {
                await mode.waitForSyncTimeout(50).catch(() => {});
            }
        }
    );
    const copyLinesDown = makeGuardedCommand(
        'copyLinesDown',
        async function(_textEditor, _edit) {
            expectEdits();
            await vscode.commands.executeCommand('editor.action.copyLinesDownAction');
            endExpectEdits();
        }
    );
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
    const transformCase = makeGuardedCommand(
        'transformCase',
        async function(textEditor, _edit) {
            let nextCase = getNextCaseTransformTo(textEditor);
            switch (nextCase) {
                case LOWERCASE:
                    expectEdits();
                    await vscode.commands.executeCommand('editor.action.transformToLowercase');
                    endExpectEdits();
                    break;
                case UPPERCASE:
                    expectEdits();
                    await vscode.commands.executeCommand('editor.action.transformToUppercase');
                    endExpectEdits();
                    break;
                case TITLECASE:
                    expectEdits();
                    await vscode.commands.executeCommand('editor.action.transformToTitlecase');
                    endExpectEdits();
                    break;
                default:
                    break;
            }
        }
    );
    const insertPath = makeGuardedCommand(
        'insertPath',
        async function(textEditor, _edit) {
            expectEdits();
            mode.expectSync();
            let path = textEditor.document.fileName;
            await vscode.commands.executeCommand('paste', { text: path });
            endExpectEdits();
        }
    );
    const undo = makeGuardedCommand(
        'undo',
        async function(textEditor, _edit) {
            expectEdits(); // may not happen
            mode.expectSync(); // may not happen
            await vscode.commands.executeCommand('default:undo');
            cancelExpectEdits();
            await mode.waitForSyncTimeout(50).catch(() => {});
            mode.sync(textEditor);
        }
    );
    const redo = makeGuardedCommand(
        'redo',
        async function(textEditor, _edit) {
            expectEdits(); // may not happen
            mode.expectSync(); // may not happen
            await vscode.commands.executeCommand('default:redo');
            cancelExpectEdits();
            await mode.waitForSyncTimeout(50).catch(() => {});
            mode.sync(textEditor);
        }
    );
    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand(context, 'clipboardCutAndPush', clipboardCutAndPush);
        registerTextEditorCommand(context, 'clipboardCut', clipboardCut);
        registerTextEditorCommand(context, 'clipboardCopyAndPush', clipboardCopyAndPush);
        registerTextEditorCommand(context, 'clipboardCopy', clipboardCopy);
        registerTextEditorCommand(context, 'clipboardPopAndPaste', clipboardPopAndPaste);
        registerTextEditorCommand(context, 'clipboardPaste', clipboardPaste);
        registerTextEditorCommand(context, 'clipboardClearStack', clipboardClearStack);
        registerTextEditorCommand(context, 'deleteLeft', deleteLeft);
        registerTextEditorCommand(context, 'deleteRight', deleteRight);
        registerTextEditorCommand(context, 'deleteWordLeft', deleteWordLeft);
        registerTextEditorCommand(context, 'deleteWordRight', deleteWordRight);
        registerTextEditorCommand(context, 'deleteAllLeft', deleteAllLeft);
        registerTextEditorCommand(context, 'deleteAllRight', deleteAllRight);
        registerTextEditorCommand(context, 'undelete', undelete);
        registerTextEditorCommand(context, 'insertLineBefore', insertLineBefore);
        registerTextEditorCommand(context, 'copyLinesDown', copyLinesDown);
        registerTextEditorCommand(context, 'transformCase', transformCase);
        registerTextEditorCommand(context, 'insertPath', insertPath);
        registerTextEditorCommand(context, 'undo', undo);
        registerTextEditorCommand(context, 'redo', redo);
    };
    return {
        expectEdits,
        cancelExpectEdits,
        getEditsFreeCounter, // for testing purpose
        clearUndeleteStack, // for testing purpose
        readUndeleteStack, // for testing purpose
        pushUndeleteStack, // for testing purpose
        getUndeleteStack: function() { return undeleteStack; }, // for testing purpose
        singleLineRange,
        cancelSelection,
        readText,
        deleteRanges,
        makeCutCopyRanges,
        clearTextStack, // for testing purpose
        getTextStackLength, // for testing purpose
        waitForEndOfGuardedCommand, // for testing purpose
        clipboardCutAndPush,
        clipboardCut,
        clipboardCopyAndPush,
        clipboardCopy,
        peekTextStack,
        popTextStack,
        pasteLines,
        pasteInlineText,
        pasteBoxText,
        clipboardPopAndPaste,
        clipboardPaste,
        clipboardClearStack,
        deleteLeft,
        deleteRight,
        deleteWordLeft,
        deleteWordRight,
        deleteAllLeft,
        deleteAllRight,
        undelete,
        insertLineBefore,
        copyLinesDown,
        transformCase,
        insertPath,
        undo,
        redo,
        registerCommands
    };
};

exports.EditHandler = EditHandler;

const theInstance = EditHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
