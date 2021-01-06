"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");

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

const SearchHandler = function(modeHandler) {
    const mode = modeHandler;

    const find = function(_textEditor, _edit) {
        exec(['closeFindWidget', 'actions.find']);
    };
    const selectWordToFind = function(textEditor, _edit) {
        if (textEditor.selection.isEmpty && !EditUtil.isCursorAtEndOfLine(textEditor)) {
            exec(['cursorWordEndRightSelect', 'actions.find']);
        } else {
            exec(['actions.find']);
        }
    };
    const expandWordToFind = function(textEditor, _edit) {
        let sel = textEditor.selection;
        if (1 < textEditor.selections.length || sel.anchor.line !== sel.active.line) {
            return;
        }
        if (sel.anchor.character > sel.active.character) {
            sel = new vscode.Selection(sel.active, sel.anchor);
            textEditor.selection = sel;
        }
        if (EditUtil.isCursorAtEndOfLine(textEditor)) {
            return;
        }
        exec(['cursorWordEndRightSelect', 'actions.find']);
    };
    const closeFindWidget = function(textEditor, _edit) {
        textEditor.selection = new vscode.Selection(
            textEditor.selection.start,
            textEditor.selection.start
        );
        mode.resetSelection(textEditor);
        exec(['closeFindWidget']);
    };

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'find', find);
        registerTextEditorCommand(context, 'selectWordToFind', selectWordToFind);
        registerTextEditorCommand(context, 'expandWordToFind', expandWordToFind);
        registerTextEditorCommand(context, 'closeFindWidget', closeFindWidget);
    };
    return {
        registerCommands
    };
};

exports.SearchHandler = SearchHandler;

const theInstance = SearchHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
