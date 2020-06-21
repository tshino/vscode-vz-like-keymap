"use strict";
const vscode = require("vscode");

const CursorHandler = function() {
    const moveCursorToWithoutScroll = function(textEditor, line, col, select) {
        let cursor = new vscode.Position(line, col);
        let anchor = select ? textEditor.selection.anchor : cursor;
        textEditor.selection = new vscode.Selection(anchor, cursor);
    };
    return {
        moveCursorToWithoutScroll
    }
};

const theInstance = CursorHandler();
exports.getInstance = function() {
    return theInstance;
};
