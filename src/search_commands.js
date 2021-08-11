"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const keyboard_macro = require("./keyboard_macro.js");
const EditUtil = require("./edit_util.js");

const kbMacroHandler = keyboard_macro.getInstance();
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

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    let reentryGuard = null;
    const makeGuardedCommand = function(name, func) {
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            kbMacroHandler.pushIfRecording('vz.' + name, guardedCommand);
            await func(textEditor, edit);
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

    const find = function(_textEditor, _edit) {
        exec(['closeFindWidget', 'actions.find']);
    };
    const selectWordToFind = makeGuardedCommand(
        'selectWordToFind',
        async function(textEditor, _edit) {
            if (textEditor.selection.isEmpty && !EditUtil.isCursorAtEndOfLine(textEditor)) {
                await vscode.commands.executeCommand('cursorWordEndRightSelect');
                await vscode.commands.executeCommand('actions.find');
            } else {
                await vscode.commands.executeCommand('actions.find');
            }
        }
    );
    const expandWordToFind = makeGuardedCommand(
        'expandWordToFind',
        async function(textEditor, _edit) {
            let sel = textEditor.selection;
            if (sel.anchor.line !== sel.active.line) {
                return;
            }
            if (sel.anchor.character > sel.active.character) {
                let sels = Array.from(textEditor.selections).map(
                    sel => new vscode.Selection(sel.start, sel.end)
                );
                textEditor.selections = sels;
            }
            if (EditUtil.isCursorAtEndOfLine(textEditor)) {
                return;
            }
            await vscode.commands.executeCommand('cursorWordEndRightSelect');
            await vscode.commands.executeCommand('actions.find');
        }
    );
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
        waitForEndOfGuardedCommand, // for testing purpose
        selectWordToFind,
        expandWordToFind,
        registerCommands
    };
};

exports.SearchHandler = SearchHandler;

const theInstance = SearchHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
