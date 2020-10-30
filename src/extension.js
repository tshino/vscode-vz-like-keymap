"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const cursor_style = require("./cursor_style.js");
const EditUtil = require("./edit_util.js");
const edit_commands = require("./edit_commands.js");
const cursor_commands = require("./cursor_commands.js");

function activate(context) {
    const mode = mode_handler.getInstance();
    const cursor_style_controller = cursor_style.CursorStyleController();
    const editHandler = edit_commands.getInstance();
    const cursorHandler = cursor_commands.getInstance();
    const modeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    editHandler.registerCommands(context);
    cursorHandler.registerCommands(context);
    mode.onStartSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', true);
        modeIndicator.text = "[B]";
        modeIndicator.show();
        cursor_style_controller.startSelection(textEditor);
    });
    mode.onResetSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', false);
        modeIndicator.hide();
        cursor_style_controller.resetSelection(textEditor);
    });
    if (vscode.window.activeTextEditor) {
        cursor_style_controller.initialize();
        mode.initialize(vscode.window.activeTextEditor);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(function(textEditor) {
            if (textEditor) {
                // The cursor style may have changed while the editor is inactive.
                cursor_style_controller.initialize();
                mode.initialize(textEditor);
            }
        })
    );
    const registerTextEditorCommand = function(name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };
    const exec = function(commands, index = 0) {
        if (typeof commands === 'string') {
            commands = [ commands ];
        }
        let res = vscode.commands.executeCommand(commands[index]);
        if (index + 1 < commands.length) {
            res.then(function() { exec(commands, index + 1); });
        }
    };

    registerTextEditorCommand('find', function(_textEditor, _edit) {
        exec(['closeFindWidget', 'actions.find']);
    });
    const isCursorAtEndOfLine = function(textEditor) {
        let cursor = textEditor.selection.active;
        let lineLen = textEditor.document.lineAt(cursor.line).range.end.character;
        return lineLen <= cursor.character;
    };
    registerTextEditorCommand('selectWordToFind', function(textEditor, _edit) {
        if (textEditor.selection.isEmpty && !isCursorAtEndOfLine(textEditor)) {
            exec(['cursorWordEndRightSelect', 'actions.find']);
        } else {
            exec(['actions.find']);
        }
    });
    registerTextEditorCommand('expandWordToFind', function(textEditor, _edit) {
        let sel = textEditor.selection;
        if (1 < textEditor.selections.length || sel.anchor.line !== sel.active.line) {
            return;
        }
        if (sel.anchor.character > sel.active.character) {
            sel = new vscode.Selection(sel.active, sel.anchor);
            textEditor.selection = sel;
        }
        if (isCursorAtEndOfLine(textEditor)) {
            return;
        }
        exec(['cursorWordEndRightSelect', 'actions.find']);
    });
    registerTextEditorCommand('closeFindWidget', function(textEditor, _edit) {
        textEditor.selection = new vscode.Selection(
            textEditor.selection.start,
            textEditor.selection.start
        );
        mode.resetSelection(textEditor);
        exec(['closeFindWidget']);
    });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
