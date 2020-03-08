"use strict";
const vscode = require("vscode");

const CursorStyleController = function() {
    let userCursorStyle = null;
    const initialize = function() {
        let style = vscode.workspace.getConfiguration('editor').get('cursorStyle');
        switch (style) {
            case 'line':
                userCursorStyle = vscode.TextEditorCursorStyle.Line;
                break;
            case 'line-thin':
                userCursorStyle = vscode.TextEditorCursorStyle.LineThin;
                break;
            case 'block':
                userCursorStyle = vscode.TextEditorCursorStyle.Block;
                break;
            case 'block-outline':
                userCursorStyle = vscode.TextEditorCursorStyle.BlockOutline;
                break;
            case 'underline':
                userCursorStyle = vscode.TextEditorCursorStyle.Underline;
                break;
            case 'underline-thin':
                userCursorStyle = vscode.TextEditorCursorStyle.UnderlineThin;
                break;
            default:
                break;
        }
    };
    const getSelectionModeCursorStyle = function() {
        if (userCursorStyle !== vscode.TextEditorCursorStyle.Block) {
            return vscode.TextEditorCursorStyle.Block;
        } else {
            return vscode.TextEditorCursorStyle.Line;
        }
    };
    const startSelection = function(textEditor) {
        if (userCursorStyle === null) {
            userCursorStyle = textEditor.options.cursorStyle;
        }
        textEditor.options.cursorStyle = getSelectionModeCursorStyle();
    };
    const resetSelection = function(textEditor) {
        if (userCursorStyle !== null) {
            textEditor.options.cursorStyle = userCursorStyle;
        }
    };
    return {
        initialize: initialize,
        getSelectionModeCursorStyle: getSelectionModeCursorStyle,
        startSelection: startSelection,
        resetSelection: resetSelection,

        // for testing
        getUserCursorStyle: function() { return userCursorStyle; },
        // for testing
        setUserCursorStyle: function(cursorStyle) { userCursorStyle = cursorStyle; }
    };
};

exports.CursorStyleController = CursorStyleController;
