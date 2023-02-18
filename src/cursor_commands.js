"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");
const CommandUtil = require("./command_util.js");
const tag_jump = require("./tag_jump.js");
const mode_handler = require("./mode_handler.js");
const keyboard_macro = require("./keyboard_macro.js");

const kbMacroHandler = keyboard_macro.getInstance();
const registerTextEditorCommand0 = CommandUtil.makeRegisterTextEditorCommand(vscode);
const registerTextEditorCommand = function(context, name, func) {
    registerTextEditorCommand0(context, name, function(textEditor, edit) {
        kbMacroHandler.pushIfRecording(CommandUtil.CommandPrefix + name, func);
        return func(textEditor, edit);
    });
};

const CursorHandler = function(modeHandler) {
    const mode = modeHandler;
    const taskAfterScroll = [];
    const invokeAll = function(tasks, arg) {
        if (0 < tasks.length) {
            let copied = Array.from(tasks);
            tasks.length = 0;
            copied.forEach(res => res(arg));
        }
    };
    const makeGuardedCommand = CommandUtil.makeGuardedCommand;

    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    if (kbMacroHandler.recording()) {
                        kbMacroHandler.processOnChangeSelections(event);
                    }
                    // do mode.sync AFTER the above kbMacroHandler's process
                    mode.sync(event.textEditor);
                }
            })
        );
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorVisibleRanges(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    invokeAll(taskAfterScroll, event.textEditor);
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

    const waitForScrollTimeout = function(timeout=600) {
        return new Promise((resolve, reject) => {
            const res = async function(textEditor) {
                if (textEditor) {
                    if (resolve) {
                        resolve();
                    }
                } else {
                    if (reject) {
                        reject();
                    }
                }
                resolve = null;
                reject = null;
            };
            taskAfterScroll.push(res);
            setTimeout(() => {
                while (0 < taskAfterScroll.indexOf(res)) {
                    taskAfterScroll.splice(taskAfterScroll.indexOf(res), 1);
                }
                res(null);
            }, timeout);
        });
    };
    const makeCursorCommand = function(basicCmd, selectCmd, boxSelectCmd) {
        return async function(textEditor, _edit) {
            mode.sync(textEditor);
            let cmd = basicCmd;
            if (mode.inSelection()) {
                if (mode.inBoxSelection() && !boxSelectCmd) {
                    mode.resetBoxSelection();
                }
                if (mode.inBoxSelection()) {
                    cmd = boxSelectCmd;
                } else {
                    cmd = selectCmd;
                }
            }
            if (typeof cmd === 'function') {
                await cmd(textEditor);
            } else {
                mode.expectSync();
                if (typeof cmd === 'string') {
                    cmd = [ cmd ];
                }
                for (const command of cmd) {
                    if (typeof command === 'function') {
                        await command(textEditor);
                    } else {
                        await vscode.commands.executeCommand(command);
                    }
                }
                mode.sync(textEditor);
            }
        };
    };
    const registerCursorCommand = function(context, name, cmdForSelect, cmdForBoxSelect) {
        registerTextEditorCommand(context, name, makeCursorCommand(name, cmdForSelect, cmdForBoxSelect));
    };

    const moveCursorToWithoutScroll = async function(textEditor, line, col, select) {
        const reveal = false;
        await moveCursorTo(textEditor, line, col, select, { reveal });
    };
    const moveCursorTo = async function(textEditor, line, col, select, { reveal=true, awaitReveal=false } = {}) {
        const cursor = new vscode.Position(line, col);
        const anchor = select ? textEditor.selection.anchor : cursor;
        const newSelections = [new vscode.Selection(anchor, cursor)];
        const promises = [];
        try {
            if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
                promises.push((async function() {
                    mode.expectSync();
                    textEditor.selections = newSelections;
                    await mode.waitForSyncTimeout(200).catch(() => {});
                    mode.sync(textEditor);
                })());
            }
            if (reveal) {
                if (awaitReveal) {
                    promises.push(waitForScrollTimeout(100).catch(() => {}));
                }
                textEditor.revealRange(new vscode.Range(cursor, cursor));
            }
        } finally {
            await Promise.all(promises);
        }
    };

    const cursorHalfPageUpCommon = async function(textEditor, select) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        let curr = textEditor.selection.active;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let currIndex = EditUtil.getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2) - 1);
        if (0 === vlines[0]) {
            const newLine = vlines[Math.max(0, currIndex - halfPage)];
            await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        } else {
            const promise = waitForScrollTimeout().catch(() => {});
            const center = 2 <= vlines.length ? vlines[1] : vlines[0];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
            await promise;
            const newVlines = EditUtil.enumVisibleLines(textEditor);
            const deltaScroll = EditUtil.getLowerBoundLineIndex(newVlines, vlines[0]);
            const delta = Math.max(halfPage, deltaScroll);
            const newLine = (
                0 === newVlines[0] ? (
                    delta <= currIndex
                        ? vlines[currIndex - delta]
                        : newVlines[Math.max(0, deltaScroll + currIndex - delta)]
                ) : (
                    newVlines[Math.min(newVlines.length - 1, currIndex)]
                )
            );
            await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        }
    };
    const cursorHalfPageDownCommon = async function(textEditor, select) {
        mode.sync(textEditor);
        if (mode.inSelection() && mode.inBoxSelection()) {
            mode.resetBoxSelection();
        }
        let curr = textEditor.selection.active;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let lineCount = textEditor.document.lineCount;
        let currIndex = EditUtil.getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2));
        if (lineCount - 1 === vlines[vlines.length - 1]) {
            const newLine = vlines[Math.min(currIndex + halfPage, vlines.length - 1)];
            if (curr.line != lineCount - 1) {
                await moveCursorTo(textEditor, newLine, curr.character, select);
            }
        } else {
            const promise = waitForScrollTimeout().catch(() => {});
            const center = (2 <= vlines.length && halfPage * 2 < onePage) ? vlines[vlines.length - 2] : vlines[vlines.length - 1];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
            await promise;
            const newVlines = EditUtil.enumVisibleLines(textEditor);
            const newLine = newVlines[Math.min(newVlines.length - 1, currIndex)];
            await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        }
    };
    const cursorHalfPageUpImpl = async function(textEditor, _edit) {
        await cursorHalfPageUpCommon(textEditor, mode.inSelection());
    };
    const cursorHalfPageDownImpl = async function(textEditor, _edit) {
        await cursorHalfPageDownCommon(textEditor, mode.inSelection());
    };
    const cursorHalfPageUpSelectImpl = async function(textEditor, _edit) {
        await cursorHalfPageUpCommon(textEditor, true);
    };
    const cursorHalfPageDownSelectImpl = async function(textEditor, _edit) {
        await cursorHalfPageDownCommon(textEditor, true);
    };
    const cursorHalfPageUp = makeGuardedCommand('cursorHalfPageUp', cursorHalfPageUpImpl);
    const cursorHalfPageDown = makeGuardedCommand('cursorHalfPageDown', cursorHalfPageDownImpl);
    const cursorHalfPageUpSelect = makeGuardedCommand('cursorHalfPageUpSelect', cursorHalfPageUpSelectImpl);
    const cursorHalfPageDownSelect = makeGuardedCommand('cursorHalfPageDownSelect', cursorHalfPageDownSelectImpl);

    const cursorFullPageUpImpl = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUp'],
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorColumnSelectPageUp']
    );
    const cursorFullPageDownWithoutScroll = makeCursorCommand(
        ['cursorPageDown'],
        ['cursorPageDownSelect'],
        ['cursorColumnSelectPageDown']
    );
    const cursorFullPageUpSelectImpl = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorPageUpSelect']
    );
    const cursorFullPageDownSelectWithoutScroll = makeCursorCommand(
        ['cursorPageDownSelect'],
        ['cursorPageDownSelect']
    );
    const cursorFullPageDownImpl = async function(textEditor) {
        const promises = [];
        try {
            if (!EditUtil.isLastLineVisible(textEditor)) {
                promises.push(vscode.commands.executeCommand('scrollPageDown'));
            }
            promises.push(cursorFullPageDownWithoutScroll(textEditor));
        } finally {
            await Promise.all(promises);
        }
    };
    const cursorFullPageDownSelectImpl = async function(textEditor) {
        const promises = [];
        try {
            if (!EditUtil.isLastLineVisible(textEditor)) {
                promises.push(vscode.commands.executeCommand('scrollPageDown'));
            }
            promises.push(cursorFullPageDownSelectWithoutScroll(textEditor));
        } finally {
            await Promise.all(promises);
        }
    };
    const cursorFullPageUp = makeGuardedCommand('cursorFullPageUp', cursorFullPageUpImpl);
    const cursorFullPageDown = makeGuardedCommand('cursorFullPageDown', cursorFullPageDownImpl);
    const cursorFullPageUpSelect = makeGuardedCommand('cursorFullPageUpSelect', cursorFullPageUpSelectImpl);
    const cursorFullPageDownSelect = makeGuardedCommand('cursorFullPageDownSelect', cursorFullPageDownSelectImpl);

    const isPageSizeHalf = function() {
        const pageSize = vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize');
        return 'Half' === pageSize;
    };
    const cursorPageUp = makeGuardedCommand('cursorPageUp', async function(textEditor) {
        if (isPageSizeHalf()) {
            await cursorHalfPageUpImpl(textEditor);
        } else {
            await cursorFullPageUpImpl(textEditor);
        }
    });
    const cursorPageDown = makeGuardedCommand('cursorPageDown', async function(textEditor) {
        if (isPageSizeHalf()) {
            await cursorHalfPageDownImpl(textEditor);
        } else {
            await cursorFullPageDownImpl(textEditor);
        }
    });
    const cursorPageUpSelect = makeGuardedCommand('cursorPageUpSelect', async function(textEditor) {
        if (isPageSizeHalf()) {
            await cursorHalfPageUpSelectImpl(textEditor);
        } else {
            await cursorFullPageUpSelectImpl(textEditor);
        }
    });
    const cursorPageDownSelect = makeGuardedCommand('cursorPageDownSelect', async function(textEditor) {
        if (isPageSizeHalf()) {
            await cursorHalfPageDownSelectImpl(textEditor);
        } else {
            await cursorFullPageDownSelectImpl(textEditor);
        }
    });
    const cursorViewTop = async function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let line = vlines[vlines[0] === 0 ? 0 : Math.min(margin, vlines.length - 1)];
        let col = textEditor.selection.active.character;
        await moveCursorTo(textEditor, line, col, mode.inSelection());
    };
    const cursorViewBottom = async function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        margin = Math.max(1, margin);
        let lineCount = textEditor.document.lineCount;
        let vlines = EditUtil.enumVisibleLines(textEditor);
        let bottom = vlines.length - 1;
        let line = vlines[vlines[bottom] === lineCount - 1 ? bottom : Math.max(0, bottom - margin)];
        let col = textEditor.selection.active.character;
        await moveCursorTo(textEditor, line, col, mode.inSelection());
    };

    const cursorLineStartSelect = async function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        await moveCursorTo(textEditor, line, 0, true);
    };
    const cursorLineEndSelect = async function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        let col = textEditor.document.lineAt(line).range.end.character;
        await moveCursorTo(textEditor, line, col, true);
    };
    const cursorNextLineStart = async function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        const lineCount = textEditor.document.lineCount;
        const line = textEditor.selection.active.line + 1;
        if (line < lineCount) {
            await moveCursorTo(textEditor, line, 0, mode.inSelection());
        } else {
            const col = textEditor.document.lineAt(lineCount - 1).text.length;
            await moveCursorTo(textEditor, lineCount - 1, col, mode.inSelection());
        }
    };
    const cursorLeft = makeCursorCommand('cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
    const cursorRight = makeCursorCommand('cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
    const cursorUp = makeCursorCommand('cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
    const cursorDown = makeCursorCommand('cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
    const cursorWordStartLeft = makeCursorCommand('cursorWordStartLeft', 'cursorWordStartLeftSelect');
    const cursorWordStartRight = makeCursorCommand('cursorWordStartRight', 'cursorWordStartRightSelect');
    const cursorLineStart = makeCursorCommand('cursorLineStart', cursorLineStartSelect);
    const cursorLineEnd = makeCursorCommand('cursorLineEnd', cursorLineEndSelect);
    const cursorHome = makeCursorCommand('cursorHome', 'cursorHomeSelect');
    const cursorEnd = makeCursorCommand('cursorEnd', 'cursorEndSelect');
    const cursorTop = makeCursorCommand('cursorTop', 'cursorTopSelect');
    const cursorBottom = makeCursorCommand('cursorBottom', 'cursorBottomSelect');
    const scrollLineUp = async function(textEditor, _edit) {
        // Commands for scroll and cursor should be dispatched concurrently to avoid flickering.
        const promises = [];
        try {
            promises.push(vscode.commands.executeCommand('scrollLineUp'));
            if (0 < textEditor.selection.active.line) {
                promises.push(cursorUp(textEditor));
            }
        } finally {
            await Promise.all(promises);
        }
    };
    const cancelSelection = async function(textEditor) {
        if (mode.inSelection()) {
            if (!textEditor.selection.isEmpty) {
                mode.expectSync();
                await vscode.commands.executeCommand('cancelSelection');
            } else if (1 < textEditor.selections.length) {
                mode.expectSync();
                await vscode.commands.executeCommand('removeSecondaryCursors');
            }
            mode.resetSelection(textEditor);
        }
    };
    const scrollLineDown = async function(textEditor, _edit) {
        // Commands for scroll and cursor should be dispatched concurrently to avoid flickering.
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            const promises = [];
            try {
                promises.push(vscode.commands.executeCommand('scrollLineDown'));
                promises.push(cursorDown(textEditor));
            } finally {
                await Promise.all(promises);
            }
        }
    };

    const registerToggleSelectionCommand = function(context, name, isBox) {
        registerTextEditorCommand(context, name, async function(textEditor, _edit) {
            mode.sync(textEditor);
            if (mode.inSelection()) {
                await cancelSelection(textEditor);
            } else {
                mode.startSelection(textEditor, isBox);
            }
        });
    };
    const stopBoxSelection = async function(textEditor, _edit) {
        if (mode.inSelection() && 1 < textEditor.selections.length) {
            if (EditUtil.rangesAllEmpty(textEditor.selections)) {
                mode.expectSync();
                await vscode.commands.executeCommand('removeSecondaryCursors');
                mode.resetSelection(textEditor);
            } else {
                textEditor.selections = textEditor.selections.map((sel) => (
                    new vscode.Selection(sel.active, sel.active)
                ));
                mode.sync(textEditor);
                mode.expectSync();
            }
        }
    };
    const reverseSelection = function(textEditor, _edit) {
        if (mode.inSelection() &&
            (1 < textEditor.selections.length || !textEditor.selections[0].isEmpty)) {
            let box = mode.inBoxSelection();
            mode.resetSelection(textEditor);
            let nextCursor = textEditor.selections[0].anchor;
            textEditor.selections = textEditor.selections.map((sel) => (
                new vscode.Selection(sel.active, sel.anchor)
            )).reverse();
            textEditor.revealRange(new vscode.Range(nextCursor, nextCursor));
            mode.startSelection(textEditor, box);
            mode.expectSync();
        }
    };
    const jumpToBracket = async function(_textEditor, _edit) {
        mode.expectSync();
        await vscode.commands.executeCommand('editor.action.jumpToBracket');
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
            let approximation = false;
            for (let i = 0; i < changes.length; i++) {
                let chg = changes[i];
                if (chg.rangeOffset + chg.rangeLength <= offset) {
                    delta += chg.text.length - chg.rangeLength;
                } else if (chg.rangeOffset <= offset) {
                    if (chg.rangeOffset + chg.text.length < offset) {
                        delta += chg.rangeOffset + chg.text.length - offset;
                    } else {
                        approximation = true;
                    }
                }
            }
            offset += delta;
            if (approximation) {
                let pos = document.positionAt(offset).with({ character: 0 });
                offset = document.offsetAt(pos);
            }
            markedPositionMap.set(key, offset);
        }
    };
    const currentCursorPosition = function(textEditor) {
        let last = textEditor.selections.length - 1;
        return textEditor.selections[last].active;
    };
    const markPosition = function(textEditor, _edit) {
        let current = currentCursorPosition(textEditor);
        setMarkedPosition(textEditor, current);
        vscode.window.setStatusBarMessage('Mark has been set.', 3000);
    };
    const cursorLastPosition = async function(textEditor, _edit) {
        let pos = getMarkedPosition(textEditor);
        let current = currentCursorPosition(textEditor);
        setMarkedPosition(textEditor, current);
        let promise;
        if (pos) {
            if (mode.inSelection() && mode.inBoxSelection()) {
                mode.resetBoxSelection();
            }
            promise = moveCursorTo(textEditor, pos.line, pos.character, mode.inSelection()).catch(() => {});
        }
        vscode.window.setStatusBarMessage('Here is the marked position.', 3000);
        if (promise) {
            await promise;
        }
    };

    const openTextDocument = async function(uri, line) {
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const textEditor = await vscode.window.showTextDocument(doc);
            if (line) {
                await moveCursorTo(textEditor, line - 1, 0, false);
            }
        } catch (err) {
            //
        }
    };
    const getCurrentLineText = function(textEditor) {
        let line = textEditor.selection.active.line;
        return textEditor.document.lineAt(line).text;
    };
    const getBaseFolders = function(textEditor) {
        let docUri = textEditor.document.uri;
        let wsFolders = vscode.workspace.workspaceFolders;
        let wsFoldersUris = wsFolders ? wsFolders.map(f => f.uri) : [];
        let folders = tag_jump.enumFolderUris(docUri, wsFoldersUris);
        return folders;
    };
    const getFileNames = function(textEditor) {
        let text = getCurrentLineText(textEditor);
        let names = tag_jump.extractFileNames(text);
        return names;
    };
    const makeTagCandidates = function(folders, fileNames) {
        let candidates = [];
        for (let i = 0; i < fileNames.length; i++) {
            let line = 0;
            if (i + 1 < fileNames.length) {
                line = parseInt(fileNames[i + 1].match(/^[0-9]+/) || '0');
            }
            for (let j = 0; j < folders.length; j++) {
                candidates.push({
                    folder: folders[j],
                    name: fileNames[i],
                    line: line
                });
            }
        }
        return candidates;
    };
    const findTagJumpTarget = async function(folders, names, statFunc) {
        let candidates = makeTagCandidates(folders, names);
        for (let index = 0; index < candidates.length; index++) {
            let cand = candidates[index];
            let line = cand.line;
            let uri = tag_jump.makeFileUri(cand.folder, cand.name);
            if (!uri) {
                continue;
            }
            try {
                let stat = await statFunc(uri);
                if (stat.type === vscode.FileType.File ||
                    stat.type === (vscode.FileType.File | vscode.FileType.SymbolicLink)) {
                    return {
                        uri,
                        line
                    };
                } else { // not a file (directory)
                    continue;
                }
            } catch (_e) { // no entry
                continue;
            }
        }
        return null;
    };
    const tagJump = async function(textEditor) {
        const folders = getBaseFolders(textEditor);
        const names = getFileNames(textEditor);
        const statFunc = vscode.workspace.fs.stat;
        const target = await findTagJumpTarget(folders, names, statFunc);
        if (target) {
            await openTextDocument(target.uri, target.line);
        }
    };

    const registerCommands = function(context) {
        setupListeners(context);
        registerTextEditorCommand0(context, 'cursorHalfPageUp', cursorHalfPageUp);
        registerTextEditorCommand0(context, 'cursorHalfPageDown', cursorHalfPageDown);
        registerTextEditorCommand0(context, 'cursorHalfPageUpSelect', cursorHalfPageUpSelect);
        registerTextEditorCommand0(context, 'cursorHalfPageDownSelect', cursorHalfPageDownSelect);
        registerTextEditorCommand0(context, 'cursorFullPageUp', cursorFullPageUp);
        registerTextEditorCommand0(context, 'cursorFullPageDown', cursorFullPageDown);
        registerTextEditorCommand0(context, 'cursorFullPageUpSelect', cursorFullPageUpSelect);
        registerTextEditorCommand0(context, 'cursorFullPageDownSelect', cursorFullPageDownSelect);
        registerTextEditorCommand0(context, 'cursorPageUp', cursorPageUp);
        registerTextEditorCommand0(context, 'cursorPageDown', cursorPageDown);
        registerTextEditorCommand0(context, 'cursorPageUpSelect', cursorPageUpSelect);
        registerTextEditorCommand0(context, 'cursorPageDownSelect', cursorPageDownSelect);
        registerTextEditorCommand(context, 'cursorViewTop', cursorViewTop);
        registerTextEditorCommand(context, 'cursorViewBottom', cursorViewBottom);
        registerTextEditorCommand(context, 'cursorLineStartSelect', cursorLineStartSelect);
        registerTextEditorCommand(context, 'cursorLineEndSelect', cursorLineEndSelect);
        registerTextEditorCommand(context, 'cursorLeft', cursorLeft);
        registerTextEditorCommand(context, 'cursorRight', cursorRight);
        registerTextEditorCommand(context, 'cursorUp', cursorUp);
        registerTextEditorCommand(context, 'cursorDown', cursorDown);
        registerTextEditorCommand(context, 'cursorWordStartLeft', cursorWordStartLeft);
        registerTextEditorCommand(context, 'cursorWordStartRight', cursorWordStartRight);
        registerTextEditorCommand(context, 'cursorLineStart', cursorLineStart);
        registerTextEditorCommand(context, 'cursorLineEnd', cursorLineEnd);
        registerTextEditorCommand(context, 'cursorHome', cursorHome);
        registerTextEditorCommand(context, 'cursorEnd', cursorEnd);
        registerTextEditorCommand(context, 'cursorTop', cursorTop);
        registerTextEditorCommand(context, 'cursorBottom', cursorBottom);
        registerTextEditorCommand(context, 'cursorNextLineStart', cursorNextLineStart);
        registerCursorCommand(context, 'cursorLeftSelect', 'cursorLeftSelect');
        registerCursorCommand(context, 'cursorRightSelect', 'cursorRightSelect');
        registerCursorCommand(context, 'cursorUpSelect', 'cursorUpSelect');
        registerCursorCommand(context, 'cursorDownSelect', 'cursorDownSelect');
        registerCursorCommand(context, 'cursorHomeSelect', 'cursorHomeSelect');
        registerCursorCommand(context, 'cursorEndSelect', 'cursorEndSelect');
        registerTextEditorCommand(context, 'scrollLineUp', scrollLineUp);
        registerTextEditorCommand(context, 'scrollLineDown', scrollLineDown);
        registerToggleSelectionCommand(context, 'toggleSelection', false);
        registerToggleSelectionCommand(context, 'toggleBoxSelection', true);
        registerTextEditorCommand(context, 'stopBoxSelection', stopBoxSelection);
        registerTextEditorCommand(context, 'reverseSelection', reverseSelection);
        registerTextEditorCommand(context, 'jumpToBracket', jumpToBracket);
        registerTextEditorCommand(context, 'markPosition', markPosition);
        registerTextEditorCommand(context, 'cursorLastPosition', cursorLastPosition);
        registerTextEditorCommand(context, 'tagJump', tagJump);
    };
    return {
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
        cursorLineStart,
        cursorLineEnd,
        cursorLineStartSelect,
        cursorLineEndSelect,
        cursorLeft,
        cursorRight,
        cursorUp,
        cursorDown,
        cursorWordStartLeft,
        cursorWordStartRight,
        cursorHome,
        cursorEnd,
        cursorTop,
        cursorBottom,
        cursorNextLineStart,
        scrollLineUp,
        scrollLineDown,
        stopBoxSelection,
        reverseSelection,
        jumpToBracket,
        getMarkedPosition,  // for testing
        setMarkedPosition,  // for testing
        markPosition,
        cursorLastPosition,
        getFileNames,
        makeTagCandidates,
        findTagJumpTarget,
        registerCommands
    };
};

const theInstance = CursorHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
