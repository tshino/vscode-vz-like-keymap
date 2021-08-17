"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");
const tag_jump = require("./tag_jump.js");
const mode_handler = require("./mode_handler.js");
const keyboard_macro = require("./keyboard_macro.js");

const exec = function(commands, index = 0, textEditor = null) {
    if (typeof commands === 'string' || typeof commands === 'function') {
        commands = [ commands ];
    }
    const cmd = commands[index];
    let res = null;
    if (typeof cmd === 'function') {
        res = new Promise((resolve) => { resolve(cmd(textEditor)); });
    } else {
        res = vscode.commands.executeCommand(cmd);
    }
    if (index + 1 < commands.length) {
        res = res.then(function() { return exec(commands, index + 1, textEditor); });
    }
    return res;
};

const kbMacroHandler = keyboard_macro.getInstance();
const registerTextEditorCommand0 = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};
const registerTextEditorCommand = function(context, name, func) {
    const command = 'vz.' + name;
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand(command, function(textEditor, edit) {
            kbMacroHandler.pushIfRecording(command, func);
            return func(textEditor, edit);
        })
    );
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
    const cancelAll = function(tasks) { invokeAll(tasks, null); };

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const setupListeners = function(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(function(event) {
                if (event.textEditor === vscode.window.activeTextEditor) {
                    cancelAll(taskAfterScroll);
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

    const waitForScrollTimeout = async function(task, timeout=200) {
        return new Promise((resolve, reject) => {
            let res = async function(textEditor) {
                if (textEditor) {
                    await task(textEditor);
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
                res(null);
            }, timeout);
        });
    };

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

    const makeCursorCommand = function(basicCmd, selectCmd, boxSelectCmd) {
        return function(textEditor, _edit) {
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
                return exec(cmd, 0, textEditor);
            } else {
                mode.expectSync();
                let res = exec(cmd, 0, textEditor);
                res = res.then(result => {
                    mode.sync(textEditor);
                    return result;
                });
                return res;
            }
        };
    };
    const registerCursorCommand = function(context, name, cmdForSelect, cmdForBoxSelect) {
        registerTextEditorCommand(context, name, makeCursorCommand(name, cmdForSelect, cmdForBoxSelect));
    };

    const moveCursorToWithoutScroll = async function(textEditor, line, col, select) {
        const reveal = false;
        await moveCursorTo(textEditor, line, col, select, reveal);
    };
    const moveCursorTo = async function(textEditor, line, col, select, reveal=true) {
        let cursor = new vscode.Position(line, col);
        let anchor = select ? textEditor.selection.anchor : cursor;
        let newSelections = [new vscode.Selection(anchor, cursor)];
        let expectSelectionChangeCallback = !EditUtil.isEqualSelections(textEditor.selections, newSelections);
        textEditor.selections = newSelections;
        let promises = [];
        if (reveal) {
            promises.push(waitForScrollTimeout(() => {}, 200).catch(() => {}));
            textEditor.revealRange(new vscode.Range(cursor, cursor));
        }
        if (expectSelectionChangeCallback) {
            promises.push(mode.waitForSyncTimeout(200).catch(() => {}));
        }
        await Promise.all(promises);
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
            let newLine = vlines[Math.max(0, currIndex - halfPage)];
            await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        } else {
            let promise = waitForScrollTimeout(async function(textEditor) {
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
                await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
            });
            let center = 2 <= vlines.length ? vlines[1] : vlines[0];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
            await promise;
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
            let newLine = vlines[Math.min(currIndex + halfPage, vlines.length - 1)];
            await moveCursorTo(textEditor, newLine, curr.character, select);
        } else {
            let promise = waitForScrollTimeout(async function(textEditor) {
                let newVlines = EditUtil.enumVisibleLines(textEditor);
                let newLine = newVlines[Math.min(newVlines.length - 1, currIndex)];
                await moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
            });
            let center = (2 <= vlines.length && halfPage * 2 < onePage) ? vlines[vlines.length - 2] : vlines[vlines.length - 1];
            textEditor.revealRange(
                new vscode.Range(center, 0, center, 0),
                vscode.TextEditorRevealType.InCenter
            );
            await promise;
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
        let promises = [];
        if (!EditUtil.isLastLineVisible(textEditor)) {
            promises.push(exec('scrollPageDown'));
        }
        promises.push(cursorFullPageDownWithoutScroll(textEditor));
        await Promise.all(promises);
    };
    const cursorFullPageDownSelectImpl = async function(textEditor) {
        let promises = [];
        if (!EditUtil.isLastLineVisible(textEditor)) {
            promises.push(exec('scrollPageDown'));
        }
        promises.push(cursorFullPageDownSelectWithoutScroll(textEditor));
        await Promise.all(promises);
    };
    const cursorFullPageUp = makeGuardedCommand('cursorFullPageUp', cursorFullPageUpImpl);
    const cursorFullPageDown = makeGuardedCommand('cursorFullPageDown', cursorFullPageDownImpl);
    const cursorFullPageUpSelect = makeGuardedCommand('cursorFullPageUpSelect', cursorFullPageUpSelectImpl);
    const cursorFullPageDownSelect = makeGuardedCommand('cursorFullPageDownSelect', cursorFullPageDownSelectImpl);

    const cursorPageUp = makeGuardedCommand('cursorPageUp', async function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            await cursorHalfPageUpImpl(textEditor);
        } else {
            await cursorFullPageUpImpl(textEditor);
        }
    });
    const cursorPageDown = makeGuardedCommand('cursorPageDown', async function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            await cursorHalfPageDownImpl(textEditor);
        } else {
            await cursorFullPageDownImpl(textEditor);
        }
    });
    const cursorPageUpSelect = makeGuardedCommand('cursorPageUpSelect', async function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            await cursorHalfPageUpSelectImpl(textEditor);
        } else {
            await cursorFullPageUpSelectImpl(textEditor);
        }
    });
    const cursorPageDownSelect = makeGuardedCommand('cursorPageDownSelect', async function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
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
    const cursorLeft = makeCursorCommand('cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
    const cursorRight = makeCursorCommand('cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
    const cursorUp = makeCursorCommand('cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
    const cursorDown = makeCursorCommand('cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
    const cursorLineStart = makeCursorCommand('cursorLineStart', cursorLineStartSelect);
    const cursorLineEnd = makeCursorCommand('cursorLineEnd', cursorLineEndSelect);
    const scrollLineUp = function(textEditor, _edit) {
        // Commands for scroll and cursor should be dispatched concurrently to avoid flickering.
        let res1 = exec(['scrollLineUp']);
        if (0 < textEditor.selection.active.line) {
            let res2 = cursorUp(textEditor);
            return res1.then(() => res2);
        } else {
            return res1;
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
    const scrollLineUpUnselect = function(textEditor) {
        return exec([cancelSelection, scrollLineUp], 0, textEditor);
    };
    const scrollLineDown = function(textEditor, _edit) {
        // Commands for scroll and cursor should be dispatched concurrently to avoid flickering.
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            let res1 = exec(['scrollLineDown']);
            let res2 = cursorDown(textEditor);
            return res1.then(() => res2);
        }
    };
    const scrollLineDownUnselect = function(textEditor) {
        return exec([cancelSelection, scrollLineDown], 0, textEditor);
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
    }
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
            promise = moveCursorTo(textEditor, pos.line, pos.character, mode.inSelection());
        }
        vscode.window.setStatusBarMessage('Here is the marked position.', 3000);
        if (promise) {
            await promise;
        }
    };

    const openTextDocument = function(uri, line) {
        vscode.workspace.openTextDocument(uri).then(function(doc) {
            vscode.window.showTextDocument(doc).then(function(textEditor) {
                if (line) {
                    moveCursorTo(textEditor, line - 1, 0, false);
                }
            }, function(_err) {});
        }, function(_err) {});
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
    const tagJumpImpl = function(textEditor, folders, statFunc, openFunc) {
        let names = getFileNames(textEditor);
        let candidates = makeTagCandidates(folders, names);
        let index = 0;
        let tryNext = function() {
            if (index >= candidates.length) {
                return;
            }
            let cand = candidates[index++];
            let line = cand.line;
            let uri = tag_jump.makeFileUri(cand.folder, cand.name);
            if (!uri) {
                tryNext();
                return;
            }
            statFunc(uri).then(function(stat) {
                if (stat.type === vscode.FileType.File ||
                    stat.type === (vscode.FileType.File | vscode.FileType.SymbolicLink)) {
                    openFunc(uri, line);
                } else {
                    tryNext();
                }
            }, function(_e) { // No entry
                tryNext();
            });
        };
        tryNext();
    };
    const tagJump = function(textEditor) {
        const folders = getBaseFolders(textEditor);
        const statFunc = vscode.workspace.fs.stat;
        const openFunc = openTextDocument;
        tagJumpImpl(textEditor, folders, statFunc, openFunc);
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
        registerCursorCommand(context, 'cursorWordStartLeft', 'cursorWordStartLeftSelect');
        registerCursorCommand(context, 'cursorWordStartRight', 'cursorWordStartRightSelect');
        registerTextEditorCommand(context, 'cursorLineStart', cursorLineStart);
        registerTextEditorCommand(context, 'cursorLineEnd', cursorLineEnd);
        registerCursorCommand(context, 'cursorHome', 'cursorHomeSelect');
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
        waitForEndOfGuardedCommand, // test purpose only
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
        cursorLineStart,
        cursorLineEnd,
        cursorLineStartSelect,
        cursorLineEndSelect,
        cursorLeft,
        cursorRight,
        cursorUp,
        cursorDown,
        scrollLineUp,
        scrollLineUpUnselect,
        scrollLineDown,
        scrollLineDownUnselect,
        stopBoxSelection,
        reverseSelection,
        jumpToBracket,
        getMarkedPosition,  // for testing
        setMarkedPosition,  // for testing
        markPosition,
        cursorLastPosition,
        getFileNames,
        makeTagCandidates,
        tagJumpImpl,
        registerCommands
    };
};

const theInstance = CursorHandler(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
