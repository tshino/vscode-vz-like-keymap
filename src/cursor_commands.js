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
    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'cursorLineStartSelect', function(textEditor, _edit) {
            let line = textEditor.selection.active.line;
            moveCursorTo(textEditor, line, 0, true);
        });
        registerTextEditorCommand(context, 'cursorLineEndSelect', function(textEditor, _edit) {
            let line = textEditor.selection.active.line;
            let col = textEditor.document.lineAt(line).range.end.character;
            moveCursorTo(textEditor, line, col, true);
        });
        registerCursorCommand(context, 'cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
        registerCursorCommand(context, 'cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
        registerCursorCommand(context, 'cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
        registerCursorCommand(context, 'cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
        registerCursorCommand(context, 'cursorWordStartLeft', 'cursorWordStartLeftSelect');
        registerCursorCommand(context, 'cursorWordStartRight', 'cursorWordStartRightSelect');
    };
    return {
        makeCursorCommand,
        registerCursorCommand,
        moveCursorToWithoutScroll,
        moveCursorTo,
        registerCommands
    };
};

const theInstance = CursorHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
