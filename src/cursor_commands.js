"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");

const exec = function(commands, index = 0) {
    if (typeof commands === 'string') {
        commands = [ commands ];
    }
    let res = vscode.commands.executeCommand(commands[index]);
    if (index + 1 < commands.length) {
        res.then(function() { exec(commands, index + 1); });
    }
};
const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const CursorHandler = function(modeHandler) {
    const mode = modeHandler;

    const makeCursorCommand = function(basicCmd, selectCmd, boxSelectCmd) {
        return function(textEditor, _edit) {
            mode.sync(textEditor);
            if (mode.inSelection()) {
                if (mode.inBoxSelection() && !boxSelectCmd) {
                    mode.resetBoxSelection();
                }
                if (mode.inBoxSelection()) {
                    exec(boxSelectCmd);
                } else {
                    exec(selectCmd);
                }
            } else {
                exec(basicCmd);
            }
        };
    };
    const registerCursorCommand3 = function(context, name, basicCmd, selectCmd, boxSelectCmd) {
        registerTextEditorCommand(context, name, makeCursorCommand(basicCmd, selectCmd, boxSelectCmd));
    };
    const registerCursorCommand = function(context, name, cmdForSelect, cmdForBoxSelect) {
        registerCursorCommand3(context, name, name, cmdForSelect, cmdForBoxSelect);
    };

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
        makeCursorCommand,
        registerCursorCommand,
        moveCursorToWithoutScroll,
        moveCursorTo
    };
};

const theInstance = CursorHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
