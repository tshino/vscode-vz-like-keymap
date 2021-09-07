"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const keyboard_macro = require("./keyboard_macro.js");
const edit_commands = require("./edit_commands.js");
const cursor_commands = require("./cursor_commands.js");
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
    const cursorHandler = cursor_commands.getInstance();

    let selectingMatch = false;

    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    selectingMatch = false;
                }
            })
        );
    };
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
            if (!textEditor.selection.isEmpty) {
                selectingMatch = true;
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
            if (!textEditor.selection.isEmpty) {
                selectingMatch = true;
            }
        }
    );
    const flipSelectionBackward = async function(textEditor) {
        const flipped = Array.from(textEditor.selections).map(
            sel => new vscode.Selection(sel.end, sel.start)
        );
        if (!EditUtil.isEqualSelections(textEditor.selections, flipped)) {
            mode.expectSync();
            textEditor.selections = flipped;
            for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                await sleep(10);
            }
            mode.sync(textEditor);
        }
        if (!textEditor.selections[0].isEmpty) {
            selectingMatch = true;
        }
    };
    const cancelMatchSelection = async function(textEditor) {
        if (mode.inSelection()) {
            if (1 < textEditor.selections.length || !textEditor.selections[0].isEmpty) {
                mode.expectSync();
                textEditor.selections = [new vscode.Selection(
                    textEditor.selections[0].start,
                    textEditor.selections[0].start
                )];
                for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                    await sleep(10);
                }
                mode.sync(textEditor);
            }
            mode.resetSelection(textEditor);
            selectingMatch = false;
        }
    };

    const findStart = makeGuardedCommand(
        'findStart',
        async function(textEditor, _edit) {
            let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await flipSelectionBackward(textEditor);
            await promise;
        }
    );
    const findPreviousMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.previousMatchFindAction');
        for (let i = 0; i < 5 && !mode.synchronized(); i++) {
            await sleep(10);
        }
        mode.sync(textEditor);
        await flipSelectionBackward(textEditor);
    };
    const findStartPreviousMatchImpl = async function(textEditor, _edit) {
        let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        await findPreviousMatchImpl(textEditor);
        await promise;
    };
    const findNextMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.nextMatchFindAction');
        for (let i = 0; i < 5 && !mode.synchronized(); i++) {
            await sleep(10);
        }
        mode.sync(textEditor);
        await flipSelectionBackward(textEditor);
    };
    const findStartNextMatchImpl = async function(textEditor, _edit) {
        let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        await findNextMatchImpl(textEditor);
        await promise;
    };
    const findPreviousMatch = makeGuardedCommand('findPreviousMatch', findPreviousMatchImpl);
    const findStartPreviousMatch = makeGuardedCommand('findStartPreviousMatch', findStartPreviousMatchImpl);
    const findNextMatch = makeGuardedCommand('findNextMatch', findNextMatchImpl);
    const findStartNextMatch = makeGuardedCommand('findStartNextMatch', findStartNextMatchImpl);

    const makeFindStartCursorImpl = function(funcBody) {
        return async function(textEditor, _edit) {
            let promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await cancelMatchSelection(textEditor);
            await funcBody(textEditor);
            await promise;
        };
    };
    const findStartCursorLeft = makeGuardedCommand(
        'findStartCursorLeft',
        makeFindStartCursorImpl(cursorHandler.cursorLeft)
    );
    const findStartCursorRight = makeGuardedCommand(
        'findStartCursorRight',
        makeFindStartCursorImpl(cursorHandler.cursorRight)
    );
    const findStartCursorUp = makeGuardedCommand(
        'findStartCursorUp',
        makeFindStartCursorImpl(cursorHandler.cursorUp)
    );
    const findStartCursorDown = makeGuardedCommand(
        'findStartCursorDown',
        makeFindStartCursorImpl(cursorHandler.cursorDown)
    );
    const findStartCursorWordStartLeft = makeGuardedCommand(
        'findStartCursorWordStartLeft',
        makeFindStartCursorImpl(cursorHandler.cursorWordStartLeft)
    );
    const findStartCursorWordStartRight = makeGuardedCommand(
        'findStartCursorWordStartRight',
        makeFindStartCursorImpl(cursorHandler.cursorWordStartRight)
    );
    const findStartCursorLineStart = makeGuardedCommand(
        'findStartCursorLineStart',
        makeFindStartCursorImpl(cursorHandler.cursorLineStart)
    );
    const findStartCursorLineEnd = makeGuardedCommand(
        'findStartCursorLineEnd',
        makeFindStartCursorImpl(cursorHandler.cursorLineEnd)
    );
    const findStartCursorHome = makeGuardedCommand(
        'findStartCursorHome',
        makeFindStartCursorImpl(cursorHandler.cursorHome)
    );
    const findStartCursorEnd = makeGuardedCommand(
        'findStartCursorEnd',
        makeFindStartCursorImpl(cursorHandler.cursorEnd)
    );
    const findStartCursorTop = makeGuardedCommand(
        'findStartCursorTop',
        makeFindStartCursorImpl(cursorHandler.cursorTop)
    );
    const findStartCursorBottom = makeGuardedCommand(
        'findStartCursorBottom',
        makeFindStartCursorImpl(cursorHandler.cursorBottom)
    );
    const findStartCursorViewTop = makeGuardedCommand(
        'findStartCursorViewTop',
        makeFindStartCursorImpl(cursorHandler.cursorViewTop)
    );
    const findStartCursorViewBottom = makeGuardedCommand(
        'findStartCursorViewBottom',
        makeFindStartCursorImpl(cursorHandler.cursorViewBottom)
    );
    const findStartScrollLineUp = makeGuardedCommand(
        'findStartScrollLineUp',
        makeFindStartCursorImpl(cursorHandler.scrollLineUp)
    );
    const findStartScrollLineDown = makeGuardedCommand(
        'findStartScrollLineDown',
        makeFindStartCursorImpl(cursorHandler.scrollLineDown)
    );

    const replaceOne = makeGuardedCommand(
        'replaceOne',
        async function(textEditor, _edit) {
            editHandler.expectEdits(); // may not happen
            mode.expectSync(2); // may not happen but may happen at most twice (replace and find-next)
            await vscode.commands.executeCommand('editor.action.replaceOne');
            editHandler.cancelExpectEdits();
            for (let i = 0; i < 5 && !mode.synchronized(); i++) {
                await sleep(10);
            }
            mode.sync(textEditor);
            await flipSelectionBackward(textEditor);
        }
    );
    const closeFindWidget = makeGuardedCommand(
        'closeFindWidget',
        async function(textEditor, _edit) {
            let promise = vscode.commands.executeCommand('closeFindWidget');
            await cancelMatchSelection(textEditor);
            await promise;
            selectingMatch = false;
        }
    );

    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand(context, 'find', find);
        registerTextEditorCommand(context, 'findReplace', findReplace);
        registerTextEditorCommand(context, 'selectWordToFind', selectWordToFind);
        registerTextEditorCommand(context, 'expandWordToFind', expandWordToFind);
        registerTextEditorCommand(context, 'findStart', findStart);
        registerTextEditorCommand(context, 'findPreviousMatch', findPreviousMatch);
        registerTextEditorCommand(context, 'findStartPreviousMatch', findStartPreviousMatch);
        registerTextEditorCommand(context, 'findNextMatch', findNextMatch);
        registerTextEditorCommand(context, 'findStartNextMatch', findStartNextMatch);
        registerTextEditorCommand(context, 'findStartCursorLeft', findStartCursorLeft);
        registerTextEditorCommand(context, 'findStartCursorRight', findStartCursorRight);
        registerTextEditorCommand(context, 'findStartCursorUp', findStartCursorUp);
        registerTextEditorCommand(context, 'findStartCursorDown', findStartCursorDown);
        registerTextEditorCommand(context, 'findStartCursorWordStartLeft', findStartCursorWordStartLeft);
        registerTextEditorCommand(context, 'findStartCursorWordStartRight', findStartCursorWordStartRight);
        registerTextEditorCommand(context, 'findStartCursorLineStart', findStartCursorLineStart);
        registerTextEditorCommand(context, 'findStartCursorLineEnd', findStartCursorLineEnd);
        registerTextEditorCommand(context, 'findStartCursorHome', findStartCursorHome);
        registerTextEditorCommand(context, 'findStartCursorEnd', findStartCursorEnd);
        registerTextEditorCommand(context, 'findStartCursorTop', findStartCursorTop);
        registerTextEditorCommand(context, 'findStartCursorBottom', findStartCursorBottom);
        registerTextEditorCommand(context, 'findStartCursorViewTop', findStartCursorViewTop);
        registerTextEditorCommand(context, 'findStartCursorViewBottom', findStartCursorViewBottom);
        registerTextEditorCommand(context, 'findStartScrollLineUp', findStartScrollLineUp);
        registerTextEditorCommand(context, 'findStartScrollLineDown', findStartScrollLineDown);
        registerTextEditorCommand(context, 'replaceOne', replaceOne);
        registerTextEditorCommand(context, 'closeFindWidget', closeFindWidget);
    };
    return {
        waitForEndOfGuardedCommand, // for testing purpose
        isSelectingMatch: function() { return selectingMatch; }, // for testing purpose
        find,
        findReplace,
        selectWordToFind,
        expandWordToFind,
        findStart,
        findPreviousMatch,
        findStartPreviousMatch,
        findNextMatch,
        findStartNextMatch,
        findStartCursorLeft,
        findStartCursorRight,
        findStartCursorUp,
        findStartCursorDown,
        findStartCursorWordStartLeft,
        findStartCursorWordStartRight,
        findStartCursorLineStart,
        findStartCursorLineEnd,
        findStartCursorHome,
        findStartCursorEnd,
        findStartCursorTop,
        findStartCursorBottom,
        findStartCursorViewTop,
        findStartCursorViewBottom,
        findStartScrollLineUp,
        findStartScrollLineDown,
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
