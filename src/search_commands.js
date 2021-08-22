"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const keyboard_macro = require("./keyboard_macro.js");
const edit_commands = require("./edit_commands.js");
const EditUtil = require("./edit_util.js");

const kbMacroHandler = keyboard_macro.getInstance();
const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

const SearchHandler = function(modeHandler) {
    const mode = modeHandler;
    const editHandler = edit_commands.getInstance();

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    let reentryGuard = null;
    const makeGuardedCommand = function(name, func) {
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            try {
                kbMacroHandler.pushIfRecording('vz.' + name, guardedCommand);
                await func(textEditor, edit);
            } catch (error) {
                console.log('*** debug: unhandled exception in execution of command vz.' + name, error);
            }
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

    const find = makeGuardedCommand(
        'find',
        async function(_textEditor, _edit) {
            await vscode.commands.executeCommand('closeFindWidget');
            await vscode.commands.executeCommand('actions.find');
        }
    );
    const findReplace = makeGuardedCommand(
        'findReplace',
        async function(_textEditor, _edit) {
            await vscode.commands.executeCommand('editor.action.startFindReplaceAction');
        }
    );
    const selectWordToFind = makeGuardedCommand(
        'selectWordToFind',
        async function(textEditor, _edit) {
            if (textEditor.selection.isEmpty && !EditUtil.isCursorAtEndOfLine(textEditor)) {
                mode.expectSync();
                await vscode.commands.executeCommand('cursorWordEndRightSelect');
                await vscode.commands.executeCommand('actions.find');
                for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                    await sleep(10);
                }
                mode.sync(textEditor);
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
            let expectSync = false;
            if (sel.anchor.character > sel.active.character) {
                let sels = Array.from(textEditor.selections).map(
                    sel => new vscode.Selection(sel.start, sel.end)
                );
                textEditor.selections = sels;
                mode.expectSync();
                expectSync = true;
            }
            if (!EditUtil.isCursorAtEndOfLine(textEditor)) {
                if (!expectSync) {
                    mode.expectSync();
                    expectSync = true;
                }
                await vscode.commands.executeCommand('cursorWordEndRightSelect');
                await vscode.commands.executeCommand('actions.find');
            }
            if (expectSync) {
                for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                    await sleep(10);
                }
                mode.sync(textEditor);
            }
        }
    );
    const findStart = makeGuardedCommand(
        'findStart',
        async function(_textEditor, _edit) {
            await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        }
    );
    const findPreviousMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.previousMatchFindAction');
        for (let i = 0; i < 5 && !mode.synchronized(); i++) {
            await sleep(10);
        }
        mode.sync(textEditor);
    };
    const findPreviousMatch = makeGuardedCommand(
        'findPreviousMatch',
        findPreviousMatchImpl
    );
    const findStartPreviousMatch = makeGuardedCommand(
        'findStartPreviousMatch',
        async function(textEditor, _edit) {
            let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await findPreviousMatchImpl(textEditor);
            await promise;
        }
    );
    const findNextMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.nextMatchFindAction');
        for (let i = 0; i < 5 && !mode.synchronized(); i++) {
            await sleep(10);
        }
        mode.sync(textEditor);
    };
    const findNextMatch = makeGuardedCommand(
        'findNextMatch',
        findNextMatchImpl
    );
    const findStartNextMatch = makeGuardedCommand(
        'findStartNextMatch',
        async function(textEditor, _edit) {
            let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await findNextMatchImpl(textEditor);
            await promise;
        }
    );
    const replaceOne = makeGuardedCommand(
        'replaceOne',
        async function(textEditor, _edit) {
            editHandler.expectEdits(); // may not happen
            mode.expectSync(); // may not happen
            await vscode.commands.executeCommand('editor.action.replaceOne');
            editHandler.cancelExpectEdits();
            for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                await sleep(10);
            }
            mode.sync(textEditor);
        }
    );
    const closeFindWidget = makeGuardedCommand(
        'closeFindWidget',
        async function(textEditor, _edit) {
            textEditor.selection = new vscode.Selection(
                textEditor.selection.start,
                textEditor.selection.start
            );
            mode.resetSelection(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        }
    );

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'find', find);
        registerTextEditorCommand(context, 'findReplace', findReplace);
        registerTextEditorCommand(context, 'selectWordToFind', selectWordToFind);
        registerTextEditorCommand(context, 'expandWordToFind', expandWordToFind);
        registerTextEditorCommand(context, 'findStart', findStart);
        registerTextEditorCommand(context, 'findPreviousMatch', findPreviousMatch);
        registerTextEditorCommand(context, 'findStartPreviousMatch', findStartPreviousMatch);
        registerTextEditorCommand(context, 'findNextMatch', findNextMatch);
        registerTextEditorCommand(context, 'findStartNextMatch', findStartNextMatch);
        registerTextEditorCommand(context, 'replaceOne', replaceOne);
        registerTextEditorCommand(context, 'closeFindWidget', closeFindWidget);
    };
    return {
        waitForEndOfGuardedCommand, // for testing purpose
        find,
        findReplace,
        selectWordToFind,
        expandWordToFind,
        findStart,
        findPreviousMatch,
        findStartPreviousMatch,
        findNextMatch,
        findStartNextMatch,
        replaceOne,
        closeFindWidget,
        registerCommands
    };
};

exports.SearchHandler = SearchHandler;

const theInstance = SearchHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
