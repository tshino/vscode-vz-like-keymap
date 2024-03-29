"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const cursor_style = require("./cursor_style.js");
const edit_commands = require("./edit_commands.js");
const cursor_commands = require("./cursor_commands.js");
const search_commands = require("./search_commands.js");
const keyboard_macro = require("./keyboard_macro.js");

function activate(context) {
    const mode = mode_handler.getInstance();
    const cursor_style_controller = cursor_style.CursorStyleController();
    const editHandler = edit_commands.getInstance();
    const cursorHandler = cursor_commands.getInstance();
    const searchHandler = search_commands.getInstance();
    const kbMacroHandler = keyboard_macro.getInstance();
    const modeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    const macroModeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 91);

    editHandler.registerCommands(context);
    cursorHandler.registerCommands(context);
    searchHandler.registerCommands(context);
    kbMacroHandler.registerCommands(context);

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

    kbMacroHandler.onStartRecording(function() {
        vscode.commands.executeCommand('setContext', 'vz.keyboardMacroRecording', true);
        macroModeIndicator.text = "[M]";
        macroModeIndicator.show();
    });
    kbMacroHandler.onStopRecording(function() {
        vscode.commands.executeCommand('setContext', 'vz.keyboardMacroRecording', false);
        macroModeIndicator.hide();
    });

    if (vscode.window.activeTextEditor) {
        cursor_style_controller.initialize();
        mode.initialize(vscode.window.activeTextEditor);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(function(textEditor) {
            kbMacroHandler.cancelRecording();
            if (textEditor) {
                // The cursor style may have changed while the editor is inactive.
                cursor_style_controller.initialize();
                mode.initialize(textEditor);
            }
        })
    );
    context.subscriptions.push(modeIndicator);
    context.subscriptions.push(macroModeIndicator);

    // This code fragment is for making the 'activationEvents' in the package.json.
    // It should contain all the commands that this extension registers.
    //
    // vscode.commands.getCommands().then(commands => {
    //     const myCommands = commands.filter(command => command.startsWith('vz.'));
    //     const activationEvents = [
    //         'onStartupFinished'
    //     ].concat(myCommands.map(command => `onCommand:${command}`));
    //     console.log(JSON.stringify({ activationEvents }, null, '    '));
    // });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
