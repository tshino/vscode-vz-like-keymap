"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");
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
    let taskAfterScroll = null;

    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    taskAfterScroll = null;
                    mode.sync(event.textEditor);
                }
            })
        );
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorVisibleRanges(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    let task = taskAfterScroll;
                    if (task) {
                        taskAfterScroll = null;
                        task(event.textEditor);
                    }
                }
            })
        );
        context.subscriptions.push(
            vscode.workspace.onDidRenameFiles(function(renameEvent) {
                let files = renameEvent.files;
                for (let i = 0; i < files.length; i++) {
                    updateMarkListOnRename(
                        files[i].oldUri,
                        files[i].newUri
                    );
                }
            })
        );
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(function(event) {
                updateMarkListOnChangeDocument(event.document, event.contentChanges);
            })
        );
    };

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
    const registerCursorCommand = function(context, name, cmdForSelect, cmdForBoxSelect) {
        registerTextEditorCommand(context, name, makeCursorCommand(name, cmdForSelect, cmdForBoxSelect));
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

    const cursorHalfPageUpImpl = function(textEditor, select) {
        let curr = textEditor.selection.active;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let currIndex = EditUtil.getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2) - 1);
        if (0 === vlines[0]) {
            let newLine = vlines[Math.max(0, currIndex - halfPage)];
            moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        } else {
            taskAfterScroll = function(textEditor) {
                let newVlines = EditUtil.enumVisibleLines(textEditor);
                let deltaScroll = EditUtil.getLowerBoundLineIndex(newVlines, vlines[0]);
                let delta = Math.max(halfPage, deltaScroll);
                let newLine = (
                    0 === newVlines[0] ? (
                        delta <= currIndex
                            ? vlines[currIndex - delta]
                            : newVlines[Math.max(0, deltaScroll + currIndex - delta)]
                    ) : (
                        newVlines[Math.min(newVlines.length - 1, currIndex)]
                    )
                );
                moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
            };
            let center = 2 <= vlines.length ? vlines[1] : vlines[0];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
        }
    };
    const cursorHalfPageDownImpl = function(textEditor, select) {
        let curr = textEditor.selection.active;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let lineCount = textEditor.document.lineCount;
        let currIndex = EditUtil.getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2));
        if (lineCount - 1 === vlines[vlines.length - 1]) {
            let newLine = vlines[Math.min(currIndex + halfPage, vlines.length - 1)];
            moveCursorTo(textEditor, newLine, curr.character, select);
        } else {
            taskAfterScroll = function(textEditor) {
                let newVlines = EditUtil.enumVisibleLines(textEditor);
                let newLine = newVlines[Math.min(newVlines.length - 1, currIndex)];
                moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
            };
            let center = (2 <= vlines.length && halfPage * 2 < onePage) ? vlines[vlines.length - 2] : vlines[vlines.length - 1];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
        }
    };
    const cursorHalfPageUp = function(textEditor, _edit) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        cursorHalfPageUpImpl(textEditor, mode.inSelection());
    };
    const cursorHalfPageDown = function(textEditor, _edit) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        cursorHalfPageDownImpl(textEditor, mode.inSelection());
    };
    const cursorHalfPageUpSelect = function(textEditor, _edit) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        cursorHalfPageUpImpl(textEditor, true);
    };
    const cursorHalfPageDownSelect = function(textEditor, _edit) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        cursorHalfPageDownImpl(textEditor, true);
    };

    const cursorFullPageUp = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUp'],
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorColumnSelectPageUp']
    );
    const cursorFullPageDownImpl = makeCursorCommand(
        ['cursorPageDown'],
        ['cursorPageDownSelect'],
        ['cursorColumnSelectPageDown']
    );
    const cursorFullPageUpSelect = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorPageUpSelect']
    );
    const cursorFullPageDownSelectImpl = makeCursorCommand(
        ['cursorPageDownSelect'],
        ['cursorPageDownSelect']
    );
    const cursorFullPageDown = function(textEditor) {
        if (!EditUtil.isLastLineVisible(textEditor)) {
            exec('scrollPageDown');
        }
        cursorFullPageDownImpl(textEditor);
    };
    const cursorFullPageDownSelect = function(textEditor) {
        if (!EditUtil.isLastLineVisible(textEditor)) {
            exec('scrollPageDown');
        }
        cursorFullPageDownSelectImpl(textEditor);
    };
    const cursorPageUp = function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageUp(textEditor);
        } else {
            return cursorFullPageUp(textEditor);
        }
    };
    const cursorPageDown = function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageDown(textEditor);
        } else {
            return cursorFullPageDown(textEditor);
        }
    };
    const cursorPageUpSelect = function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageUpSelect(textEditor);
        } else {
            return cursorFullPageUpSelect(textEditor);
        }
    };
    const cursorPageDownSelect = function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageDownSelect(textEditor);
        } else {
            return cursorFullPageDownSelect(textEditor);
        }
    };
    const cursorViewTop = function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let line = vlines[vlines[0] === 0 ? 0 : Math.min(margin, vlines.length - 1)];
        let col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, mode.inSelection());
    };
    const cursorViewBottom = function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        margin = Math.max(1, margin);
        let lineCount = textEditor.document.lineCount;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let bottom = vlines.length - 1;
        let line = vlines[vlines[bottom] === lineCount - 1 ? bottom : Math.max(0, bottom - margin)];
        let col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, mode.inSelection());
    };

    const cursorLineStartSelect = function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        moveCursorTo(textEditor, line, 0, true);
    };
    const cursorLineEndSelect = function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        let col = textEditor.document.lineAt(line).range.end.character;
        moveCursorTo(textEditor, line, col, true);
    };
    const scrollLineUp = function(textEditor, _edit) {
        // Scroll and cursor are dispatched concurrently to avoid flickering.
        exec(['scrollLineUp']);
        if (0 < textEditor.selection.active.line) {
            exec(['vz.cursorUp']);
        }
    };
    const scrollLineUpUnselect = function() {
        exec(['cancelSelection', 'vz.scrollLineUp']);
    };
    const scrollLineDown = function(textEditor, _edit) {
        // Scroll and cursor are dispatched concurrently to avoid flickering.
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            exec(['scrollLineDown']);
            exec(['vz.cursorDown']);
        }
    };
    const scrollLineDownUnselect = function() {
        exec(['cancelSelection', 'vz.scrollLineDown']);
    };
    let markedPositionMap = new Map();
    const getMarkedPosition = function(textEditor) {
        let key = textEditor.document.uri.toString();
        if (markedPositionMap.has(key)) {
            let offset = markedPositionMap.get(key);
            return textEditor.document.positionAt(offset);
        } else {
            return undefined;
        }
    };
    const setMarkedPosition = function(textEditor, pos) {
        let key = textEditor.document.uri.toString();
        if (pos) {
            let offset = textEditor.document.offsetAt(pos);
            markedPositionMap.set(key, offset);
        } else {
            markedPositionMap.delete(key);
        }
    };
    const updateMarkListOnRename = function(oldUri, newUri) {
        let oldKey = oldUri.toString();
        let newKey = newUri.toString();
        if (markedPositionMap.has(oldKey)) {
            markedPositionMap.set(newKey, markedPositionMap.get(oldKey));
            markedPositionMap.delete(oldKey);
        }
    };
    const updateMarkListOnChangeDocument = function(document, changes) {
        let key = document.uri.toString();
        if (markedPositionMap.has(key)) {
            let offset = markedPositionMap.get(key);
            let delta = 0;
            for (let i = 0; i < changes.length; i++) {
                let chg = changes[i];
                if (chg.rangeOffset <= offset) {
                    delta += chg.text.length - Math.min(chg.rangeLength, offset - chg.rangeOffset);
                }
            }
            markedPositionMap.set(key, offset + delta);
        }
    };
    const currentCursorPosition = function(textEditor) {
        let last = textEditor.selections.length - 1;
        return textEditor.selections[last].active;
    }
    const markPosition = function(textEditor, _edit) {
        let current = currentCursorPosition(textEditor);
        setMarkedPosition(textEditor, current);
    };
    const cursorLastPosition = function(textEditor, _edit) {
        let current = currentCursorPosition(textEditor);
        let pos = getMarkedPosition(textEditor);
        if (pos) {
            if (mode.inSelection()) {
                if (mode.inBoxSelection()) {
                    mode.resetBoxSelection();
                }
                textEditor.selections = [
                    new vscode.Selection(textEditor.selections[0].anchor, pos)
                ];
            } else {
                textEditor.selections = [
                    new vscode.Selection(pos, pos)
                ];
            }
        }
        setMarkedPosition(textEditor, current);
    };
    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand(context, 'cursorHalfPageUp', cursorHalfPageUp);
        registerTextEditorCommand(context, 'cursorHalfPageDown', cursorHalfPageDown);
        registerTextEditorCommand(context, 'cursorHalfPageUpSelect', cursorHalfPageUpSelect);
        registerTextEditorCommand(context, 'cursorHalfPageDownSelect', cursorHalfPageDownSelect);
        registerTextEditorCommand(context, 'cursorPageUp', cursorPageUp);
        registerTextEditorCommand(context, 'cursorPageDown', cursorPageDown);
        registerTextEditorCommand(context, 'cursorPageUpSelect', cursorPageUpSelect);
        registerTextEditorCommand(context, 'cursorPageDownSelect', cursorPageDownSelect);
        registerTextEditorCommand(context, 'cursorViewTop', cursorViewTop);
        registerTextEditorCommand(context, 'cursorViewBottom', cursorViewBottom);
        registerTextEditorCommand(context, 'cursorLineStartSelect', cursorLineStartSelect);
        registerTextEditorCommand(context, 'cursorLineEndSelect', cursorLineEndSelect);
        registerCursorCommand(context, 'cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
        registerCursorCommand(context, 'cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
        registerCursorCommand(context, 'cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
        registerCursorCommand(context, 'cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
        registerCursorCommand(context, 'cursorWordStartLeft', 'cursorWordStartLeftSelect');
        registerCursorCommand(context, 'cursorWordStartRight', 'cursorWordStartRightSelect');
        registerCursorCommand(context, 'cursorLineStart', 'vz.cursorLineStartSelect');
        registerCursorCommand(context, 'cursorHome', 'cursorHomeSelect');
        registerCursorCommand(context, 'cursorLineEnd', 'vz.cursorLineEndSelect');
        registerCursorCommand(context, 'cursorEnd', 'cursorEndSelect');
        registerCursorCommand(context, 'cursorTop', 'cursorTopSelect');
        registerCursorCommand(context, 'cursorBottom', 'cursorBottomSelect');
        registerCursorCommand(context, 'cursorLeftSelect', 'cursorLeftSelect');
        registerCursorCommand(context, 'cursorRightSelect', 'cursorRightSelect');
        registerCursorCommand(context, 'cursorUpSelect', 'cursorUpSelect');
        registerCursorCommand(context, 'cursorDownSelect', 'cursorDownSelect');
        registerCursorCommand(context, 'cursorHomeSelect', 'cursorHomeSelect');
        registerCursorCommand(context, 'cursorEndSelect', 'cursorEndSelect');
        registerTextEditorCommand(context, 'scrollLineUp', scrollLineUp);
        registerTextEditorCommand(context, 'scrollLineUpUnselect', scrollLineUpUnselect);
        registerTextEditorCommand(context, 'scrollLineDown', scrollLineDown);
        registerTextEditorCommand(context, 'scrollLineDownUnselect', scrollLineDownUnselect);
        registerTextEditorCommand(context, 'markPosition', markPosition);
        registerTextEditorCommand(context, 'cursorLastPosition', cursorLastPosition);
    };
    return {
        makeCursorCommand,
        registerCursorCommand,
        moveCursorToWithoutScroll,
        moveCursorTo,
        cursorHalfPageUp,
        cursorHalfPageDown,
        cursorHalfPageUpSelect,
        cursorHalfPageDownSelect,
        cursorFullPageUp,
        cursorFullPageDown,
        cursorFullPageUpSelect,
        cursorFullPageDownSelect,
        cursorViewTop,
        cursorViewBottom,
        cursorLineStartSelect,
        cursorLineEndSelect,
        scrollLineUp,
        scrollLineUpUnselect,
        scrollLineDown,
        scrollLineDownUnselect,
        getMarkedPosition,  // for testing
        setMarkedPosition,  // for testing
        markPosition,
        cursorLastPosition,
        registerCommands
    };
};

const theInstance = CursorHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
