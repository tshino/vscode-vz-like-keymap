"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const EditHandler = function(context, modeHandler) {
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
        let texts = ranges.map((range) => textEditor.document.getText(range));
        if (1 < ranges.length) {
            if (ranges[0].start.isAfter(ranges[1].start)) {
                texts.reverse();
            }
            return texts.map((text) => text + '\n').join('');
        } else {
            return texts[0];
        }
    };
    const deleteRanges = function(textEditor, ranges) {
        textEditor.edit(function(editBuilder) {
            ranges.forEach((range) => {
                editBuilder.delete(range);
            });
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
    const cutAndPush = function(textEditor, _edit) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        textStack.push({
            text: text,
            isLineMode: isLineMode,
            isBoxMode: mode.inBoxSelection()
        });
        vscode.env.clipboard.writeText(text);
        cancelSelection(textEditor);
        deleteRanges(textEditor, ranges);
    };
    const copyAndPush = function(textEditor, _edit) {
        let [ranges, isLineMode] = makeCutCopyRanges(textEditor);
        let text = readText(textEditor, ranges);
        textStack.push({
            text: text,
            isLineMode: isLineMode,
            isBoxMode: mode.inBoxSelection()
        });
        vscode.env.clipboard.writeText(text);
        cancelSelection(textEditor);
    };
    const popAndPaste = async function(textEditor, _edit) {
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
            vscode.env.clipboard.writeText(next.text);
        } else {
            vscode.env.clipboard.writeText('');
        }
        if (isLineMode) {
            let lastPos = textEditor.selection.start;
            let lineStart = new vscode.Position(lastPos.line, 0);
            textEditor.selection = new vscode.Selection(lineStart, lineStart);
            let res = vscode.commands.executeCommand('paste', { text: text });
            res.then(function() {
                textEditor.selection = new vscode.Selection(lastPos, lastPos);
            });
        } else {
            vscode.commands.executeCommand('paste', { text: text });
        }
    };
    registerTextEditorCommand(context, 'clipboardCut', cutAndPush);
    registerTextEditorCommand(context, 'clipboardCopy', copyAndPush);
    registerTextEditorCommand(context, 'clipboardPaste', popAndPaste);
    return {
        singleLineRange: singleLineRange,
        cancelSelection: cancelSelection,
        readText: readText,
        deleteRanges: deleteRanges,
        makeCutCopyRanges: makeCutCopyRanges,
        cutAndPush: cutAndPush,
        copyAndPush: copyAndPush,
    };
};

exports.EditHandler = EditHandler;
