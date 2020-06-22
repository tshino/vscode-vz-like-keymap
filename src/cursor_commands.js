"use strict";
const vscode = require("vscode");

const CursorHandler = function() {
    const moveCursorToWithoutScroll = function(textEditor, line, col, select) {
        let cursor = new vscode.Position(line, col);
        let anchor = select ? textEditor.selection.anchor : cursor;
        textEditor.selection = new vscode.Selection(anchor, cursor);
    };
    const moveCursorTo = function(textEditor, line, col, select) {
        let cursor = new vscode.Position(line, col);
        let anchor = select ? textEditor.selection.anchor : cursor;
        textEditor.selection = new vscode.Selection(anchor, cursor);
        textEditor.revealRange(new vscode.Range(cursor, cursor));
    };
    return {
        moveCursorToWithoutScroll,
        moveCursorTo
    }
};

const theInstance = CursorHandler();
exports.getInstance = function() {
    return theInstance;
};
