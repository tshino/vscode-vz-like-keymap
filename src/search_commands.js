"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");
const CommandUtil = require("./command_util.js");
const mode_handler = require("./mode_handler.js");
const edit_commands = require("./edit_commands.js");
const cursor_commands = require("./cursor_commands.js");

const SearchHandler = function(modeHandler) {
    const mode = modeHandler;
    const editHandler = edit_commands.getInstance();
    const cursorHandler = cursor_commands.getInstance();

    let selectingMatch = false;
    let selectingSearchWord = false;
    let selectingSearchWordReverse = false;
    let selectingTextEditor = null;
    let selectingMatchSelections = null;
    const discardSelectionList = new Map();

    const setSelectingMatch = function(textEditor) {
        selectingMatch = true;
        selectingTextEditor = textEditor;
        selectingMatchSelections = Array.from(textEditor.selections);
    };
    const setSelectingSearchWord = function(textEditor) {
        selectingSearchWord = true;
        selectingTextEditor = textEditor;
        selectingMatchSelections = Array.from(textEditor.selections);
    };
    const resetSelectionState = function() {
        selectingMatch = false;
        selectingSearchWord = false;
        selectingTextEditor = null;
        selectingMatchSelections = null;
    };

    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(function(event) {
                if (selectingMatch || selectingSearchWord) {
                    if (event.textEditor === selectingTextEditor) {
                        if (!EditUtil.isEqualSelections(selectingMatchSelections, event.textEditor.selections)) {
                            resetSelectionState();
                        } else {
                            cancelSelection(event.textEditor);
                        }
                    }
                }
            })
        );
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(function(textEditor) {
                if (selectingMatch || selectingSearchWord) {
                    if (selectingTextEditor && textEditor !== selectingTextEditor) {
                        const key = selectingTextEditor.document.uri.toString();
                        discardSelectionList.set(key, {
                            selections: Array.from(selectingTextEditor.selections),
                            selectingTextEditor,
                            selectingMatch,
                            selectingSearchWord,
                            selectingSearchWordReverse
                        });
                    }
                }
                if (textEditor) {
                    const key = textEditor.document.uri.toString();
                    if (discardSelectionList.has(key)) {
                        const vars = discardSelectionList.get(key);
                        discardSelectionList.delete(key);
                        if (vars.selectingMatch || vars.selectingSearchWord) {
                            selectingTextEditor = textEditor;
                            selectingMatch = vars.selectingMatch;
                            selectingSearchWord = vars.selectingSearchWord;
                            selectingSearchWordReverse = vars.selectingSearchWordReverse;
                            selectingMatchSelections = vars.selections;
                        }
                    }
                }
            })
        );
    };
    const makeGuardedCommand = CommandUtil.makeGuardedCommand;
    const registerTextEditorCommand = CommandUtil.makeRegisterTextEditorCommand(vscode);
    const waitForSynchronizedShort = async function(mode, textEditor) {
        await mode.waitForSyncTimeout(200).catch(() => {});
        mode.sync(textEditor);
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
    const selectionReachesEndOfDocument = function(textEditor) {
        let selection = textEditor.selections[0];
        let lastLine = textEditor.document.lineCount - 1;
        if (selection.end.line === lastLine &&
            selection.end.character === textEditor.document.lineAt(lastLine).text.length) {
            return true;
        }
        return false;
    };
    const selectWordToFindImpl = async function(textEditor, _edit) {
        let expectSync = false;
        if (selectingSearchWord) {
            const sel = textEditor.selection;
            if (sel.anchor.isAfter(sel.active)) {
                const sels = Array.from(textEditor.selections).map(
                    sel => new vscode.Selection(sel.start, sel.end)
                );
                textEditor.selections = sels;
                mode.expectSync();
                expectSync = true;
            }
            if (!selectionReachesEndOfDocument(textEditor)) {
                if (!expectSync) {
                    mode.expectSync();
                    expectSync = true;
                }
                await vscode.commands.executeCommand('cursorWordEndRightSelect');
                await vscode.commands.executeCommand('actions.findWithSelection');
            } else if (!textEditor.selection.isEmpty) {
                await vscode.commands.executeCommand('actions.findWithSelection');
            }
        } else {
            selectingSearchWordReverse = !textEditor.selection.active.isAfter(textEditor.selection.anchor);
            if (!textEditor.selection.isEmpty) {
                await vscode.commands.executeCommand('actions.findWithSelection');
            } else if (selectionReachesEndOfDocument(textEditor)) {
                await vscode.commands.executeCommand('editor.actions.findWithArgs', { searchString: '' });
                await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            } else {
                mode.expectSync();
                expectSync = true;
                await vscode.commands.executeCommand('cursorWordEndRightSelect');
                await vscode.commands.executeCommand('actions.findWithSelection');
            }
        }
        if (expectSync) {
            await waitForSynchronizedShort(mode, textEditor);
        }
        setSelectingSearchWord(textEditor);
    };
    const selectWordToFind = makeGuardedCommand(
        'selectWordToFind',
        selectWordToFindImpl
    );
    const expandWordToFind = makeGuardedCommand(
        'expandWordToFind',
        async function(textEditor, _edit) {
            if (!selectingSearchWord) {
                selectingSearchWordReverse = !textEditor.selection.active.isAfter(textEditor.selection.anchor);
                setSelectingSearchWord(textEditor);
            }
            await selectWordToFindImpl(textEditor);
        }
    );
    const flipSelectionBackward = async function(textEditor) {
        const isSearchWord = selectingSearchWord;
        const flipped = Array.from(textEditor.selections).map(
            sel => new vscode.Selection(sel.end, sel.start)
        );
        if (!EditUtil.isEqualSelections(textEditor.selections, flipped)) {
            mode.expectSync();
            textEditor.selections = flipped;
            await waitForSynchronizedShort(mode, textEditor);
        }
        if (!textEditor.selections[0].isEmpty) {
            setSelectingMatch(textEditor);
        }
        if (isSearchWord) {
            setSelectingSearchWord(textEditor);
        }
    };
    const cancelSelection = async function(textEditor) {
        if (1 < textEditor.selections.length || !textEditor.selections[0].isEmpty) {
            mode.expectSync();
            let pos;
            if (selectingSearchWord) {
                if (selectingSearchWordReverse) {
                    pos = textEditor.selections[0].start;
                } else {
                    pos = textEditor.selections[0].end;
                }
            } else if (selectingMatch) {
                pos = textEditor.selections[0].start;
            } else {
                pos = textEditor.selections[0].active;
            }
            textEditor.selections = [ new vscode.Selection(pos, pos) ];
            await waitForSynchronizedShort(mode, textEditor);
        }
        if (mode.inSelection()) {
            mode.resetSelection(textEditor);
        }
        resetSelectionState();
    };
    const cancelMatchSelection = async function(textEditor) {
        if (selectingMatch || selectingSearchWord) {
            await cancelSelection(textEditor);
        }
    };

    const findStart = makeGuardedCommand(
        'findStart',
        async function(textEditor, _edit) {
            const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await flipSelectionBackward(textEditor);
            await promise;
        }
    );
    const findPreviousMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.previousMatchFindAction');
        await waitForSynchronizedShort(mode, textEditor);
        await flipSelectionBackward(textEditor);
    };
    const findStartPreviousMatchImpl = async function(textEditor, _edit) {
        const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        await findPreviousMatchImpl(textEditor);
        await promise;
    };
    const findNextMatchImpl = async function(textEditor, _edit) {
        mode.expectSync(); // may not happen
        await vscode.commands.executeCommand('editor.action.nextMatchFindAction');
        await waitForSynchronizedShort(mode, textEditor);
        await flipSelectionBackward(textEditor);
    };
    const findStartNextMatchImpl = async function(textEditor, _edit) {
        const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        await findNextMatchImpl(textEditor);
        await promise;
    };
    const findPreviousMatch = makeGuardedCommand('findPreviousMatch', findPreviousMatchImpl);
    const findStartPreviousMatch = makeGuardedCommand('findStartPreviousMatch', findStartPreviousMatchImpl);
    const findNextMatch = makeGuardedCommand('findNextMatch', findNextMatchImpl);
    const findStartNextMatch = makeGuardedCommand('findStartNextMatch', findStartNextMatchImpl);

    const makeFindStartCursorImpl = function(funcBody) {
        return async function(textEditor, _edit) {
            const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
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
    const findStartCursorNextLineStart = makeGuardedCommand(
        'findStartCursorNextLineStart',
        makeFindStartCursorImpl(cursorHandler.cursorNextLineStart)
    );
    const findStartScrollLineUp = makeGuardedCommand(
        'findStartScrollLineUp',
        makeFindStartCursorImpl(cursorHandler.scrollLineUp)
    );
    const findStartScrollLineDown = makeGuardedCommand(
        'findStartScrollLineDown',
        makeFindStartCursorImpl(cursorHandler.scrollLineDown)
    );

    const findStartCancelSelection = makeGuardedCommand(
        'findStartCancelSelection',
        async function(textEditor, _edit) {
            const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await cancelSelection(textEditor);
            await promise;
        }
    );
    const findStartEnter = makeGuardedCommand(
        'findStartEnter',
        async function(textEditor, _edit) {
            const promise = vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            await cancelMatchSelection(textEditor);
            await editHandler.enterImpl(textEditor);
            await promise;
        }
    );

    const replaceOne = makeGuardedCommand(
        'replaceOne',
        async function(textEditor, _edit) {
            editHandler.expectEdits(); // may not happen
            mode.expectSync(2); // may not happen but may happen at most twice (replace and find-next)
            await vscode.commands.executeCommand('editor.action.replaceOne');
            editHandler.cancelExpectEdits();
            await waitForSynchronizedShort(mode, textEditor);
            await flipSelectionBackward(textEditor);
        }
    );
    const closeFindWidget = makeGuardedCommand(
        'closeFindWidget',
        async function(textEditor, _edit) {
            const promise = vscode.commands.executeCommand('closeFindWidget');
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
        registerTextEditorCommand(context, 'findStartCursorNextLineStart', findStartCursorNextLineStart);
        registerTextEditorCommand(context, 'findStartScrollLineUp', findStartScrollLineUp);
        registerTextEditorCommand(context, 'findStartScrollLineDown', findStartScrollLineDown);
        registerTextEditorCommand(context, 'findStartCancelSelection', findStartCancelSelection);
        registerTextEditorCommand(context, 'findStartEnter', findStartEnter);
        registerTextEditorCommand(context, 'replaceOne', replaceOne);
        registerTextEditorCommand(context, 'closeFindWidget', closeFindWidget);
    };
    return {
        isSelectingMatch: function() { return selectingMatch; }, // for testing purpose
        isSelectingSearchWord: function() { return selectingSearchWord; }, // for testing purpose
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
        findStartCursorNextLineStart,
        findStartScrollLineUp,
        findStartScrollLineDown,
        findStartCancelSelection,
        findStartEnter,
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
