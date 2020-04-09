"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const cursor_style = require("./cursor_style.js");
const tag_jump = require("./tag_jump.js");

function activate(context) {
    const mode = mode_handler.ModeHandler();
    const cursor_style_controller = cursor_style.CursorStyleController();
    mode.onStartSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', true);
        cursor_style_controller.startSelection(textEditor);
    });
    mode.onResetSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', false);
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
    let taskAfterScroll = null;
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
    const enumVisibleLines = function(textEditor) {
        let vranges = textEditor.visibleRanges;
        let lines = [];
        for (let i = 0; i < vranges.length; i++) {
            let start = vranges[i].start.line;
            let end = vranges[i].end.line;
            for (let j = start; j <= end; j++) {
                lines.push(j);
            }
        }
        return lines;
    };
    const getLowerBoundLineIndex = function(lines, line) {
        for (var i = 0; i < lines.length; i++) {
            if (line <= lines[i]) {
                return i;
            }
        }
        return lines.length;
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
    const registerCursorCommand3 = function(name, basicCmd, selectCmd, boxSelectCmd) {
        registerTextEditorCommand(name, makeCursorCommand(basicCmd, selectCmd, boxSelectCmd));
    };
    const registerCursorCommand = function(name, cmdForSelect, cmdForBoxSelect) {
        registerCursorCommand3(name, name, cmdForSelect, cmdForBoxSelect);
    };
    registerTextEditorCommand('cursorLineStartSelect', function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        moveCursorTo(textEditor, line, 0, true);
    });
    registerTextEditorCommand('cursorLineEndSelect', function(textEditor, _edit) {
        let line = textEditor.selection.active.line;
        let col = textEditor.document.lineAt(line).range.end.character;
        moveCursorTo(textEditor, line, col, true);
    });
    registerCursorCommand('cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
    registerCursorCommand('cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
    registerCursorCommand('cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
    registerCursorCommand('cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
    registerCursorCommand('cursorWordStartLeft', 'cursorWordStartLeftSelect');
    registerCursorCommand('cursorWordStartRight', 'cursorWordStartRightSelect');
    const cursorHalfPageUpImpl = function(textEditor, select) {
        let curr = textEditor.selection.active;
        let vlines = enumVisibleLines(textEditor);
        let currIndex = getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2));
        if (0 === vlines[0]) {
            let newLine = vlines[Math.max(0, currIndex - halfPage)];
            moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
        } else {
            taskAfterScroll = function(textEditor) {
                let newVlines = enumVisibleLines(textEditor);
                let deltaScroll = getLowerBoundLineIndex(newVlines, vlines[0]);
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
            textEditor.revealRange(
                new vscode.Range(
                    new vscode.Position(vlines[0], 0),
                    new vscode.Position(vlines[0], 0)
                ), vscode.TextEditorRevealType.InCenter
            );
        }
    };
    const cursorHalfPageDownImpl = function(textEditor, select) {
        let curr = textEditor.selection.active;
        let vlines = enumVisibleLines(textEditor);
        let lineCount = textEditor.document.lineCount;
        let currIndex = getLowerBoundLineIndex(vlines, curr.line);
        let onePage = Math.max(1, vlines.length);
        let halfPage = Math.max(1, Math.floor(onePage / 2));
        if (lineCount - 1 === vlines[vlines.length - 1]) {
            let newLine = vlines[Math.min(currIndex + halfPage, vlines.length - 1)];
            moveCursorTo(textEditor, newLine, curr.character, select);
        } else {
            taskAfterScroll = function(textEditor) {
                let newVlines = enumVisibleLines(textEditor);
                let newLine = newVlines[Math.min(newVlines.length - 1, currIndex)];
                moveCursorToWithoutScroll(textEditor, newLine, curr.character, select);
            };
            textEditor.revealRange(
                new vscode.Range(
                    new vscode.Position(vlines[vlines.length - 1], 0),
                    new vscode.Position(vlines[vlines.length - 1], 0)
                ), vscode.TextEditorRevealType.InCenter
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
    registerTextEditorCommand('cursorHalfPageUp', cursorHalfPageUp);
    registerTextEditorCommand('cursorHalfPageDown', cursorHalfPageDown);
    registerTextEditorCommand('cursorHalfPageUpSelect', cursorHalfPageUpSelect);
    registerTextEditorCommand('cursorHalfPageDownSelect', cursorHalfPageDownSelect);
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
    const isLastLineVisible = function(textEditor) {
        let vlines = enumVisibleLines(textEditor);
        let lineCount = textEditor.document.lineCount;
        return vlines[vlines.length - 1] === lineCount - 1;
    };
    const cursorFullPageDown = function(textEditor) {
        if (!isLastLineVisible(textEditor)) {
            exec('scrollPageDown');
        }
        cursorFullPageDownImpl(textEditor);
    };
    const cursorFullPageDownSelect = function(textEditor) {
        if (!isLastLineVisible(textEditor)) {
            exec('scrollPageDown');
        }
        cursorFullPageDownSelectImpl(textEditor);
    };
    registerTextEditorCommand('cursorPageUp', function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageUp(textEditor);
        } else {
            return cursorFullPageUp(textEditor);
        }
    });
    registerTextEditorCommand('cursorPageDown', function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageDown(textEditor);
        } else {
            return cursorFullPageDown(textEditor);
        }
    });
    registerTextEditorCommand('cursorPageUpSelect', function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageUpSelect(textEditor);
        } else {
            return cursorFullPageUpSelect(textEditor);
        }
    });
    registerTextEditorCommand('cursorPageDownSelect', function(textEditor) {
        if ('Half' === vscode.workspace.getConfiguration('vzKeymap').get('scrollPageSize')) {
            return cursorHalfPageDownSelect(textEditor);
        } else {
            return cursorFullPageDownSelect(textEditor);
        }
    });
    registerCursorCommand('cursorLineStart', 'vz.cursorLineStartSelect');
    registerCursorCommand('cursorHome', 'cursorHomeSelect');
    registerCursorCommand('cursorLineEnd', 'vz.cursorLineEndSelect');
    registerCursorCommand('cursorEnd', 'cursorEndSelect');
    registerCursorCommand('cursorTop', 'cursorTopSelect');
    registerCursorCommand('cursorBottom', 'cursorBottomSelect');
    registerCursorCommand('cursorLeftSelect', 'cursorLeftSelect');
    registerCursorCommand('cursorRightSelect', 'cursorRightSelect');
    registerCursorCommand('cursorUpSelect', 'cursorUpSelect');
    registerCursorCommand('cursorDownSelect', 'cursorDownSelect');
    registerCursorCommand('cursorHomeSelect', 'cursorHomeSelect');
    registerCursorCommand('cursorEndSelect', 'cursorEndSelect');
    registerTextEditorCommand('cursorViewTop', function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        let vlines = enumVisibleLines(textEditor);
        let line = vlines[vlines[0] === 0 ? 0 : Math.min(margin, vlines.length - 1)];
        let col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, mode.inSelection());
    });
    registerTextEditorCommand('cursorViewBottom', function(textEditor, _edit) {
        mode.sync(textEditor);
        mode.resetBoxSelection();
        let margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        margin = Math.max(1, margin);
        let lineCount = textEditor.document.lineCount;
        let vlines = enumVisibleLines(textEditor);
        let bottom = vlines.length - 1;
        let line = vlines[vlines[bottom] === lineCount - 1 ? bottom : Math.max(0, bottom - margin)];
        let col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, mode.inSelection());
    });
    registerTextEditorCommand('scrollLineUp', function(textEditor, _edit) {
        // Scroll and cursor are dispatched concurrently to avoid flickering.
        exec(['scrollLineUp']);
        if (0 < textEditor.selection.active.line) {
            exec(['vz.cursorUp']);
        }
    });
    registerTextEditorCommand('scrollLineUpUnselect', function() {
        exec(['cancelSelection', 'vz.scrollLineUp']);
    });
    registerTextEditorCommand('scrollLineDown', function(textEditor, _edit) {
        // Scroll and cursor are dispatched concurrently to avoid flickering.
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            exec(['scrollLineDown']);
            exec(['vz.cursorDown']);
        }
    });
    registerTextEditorCommand('scrollLineDownUnselect', function() {
        exec(['cancelSelection', 'vz.scrollLineDown']);
    });
    const registerToggleSelectionCommand = function(name, isBox) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            mode.sync(textEditor);
            if (mode.inSelection()) {
                if (!textEditor.selection.isEmpty) {
                    vscode.commands.executeCommand('cancelSelection');
                } else {
                    vscode.commands.executeCommand('removeSecondaryCursors');
                }
                mode.resetSelection(textEditor);
            } else {
                mode.startSelection(textEditor, isBox);
            }
        });
    };
    registerTextEditorCommand('reverseSelection', function(textEditor, _edit) {
        let sel = textEditor.selection;
        if (!sel.isEmpty && 1 === textEditor.selections.length) {
            mode.resetSelection(textEditor);
            textEditor.selection = new vscode.Selection(sel.active, sel.anchor);
            textEditor.revealRange(new vscode.Range(sel.anchor, sel.anchor));
        }
    });
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    registerTextEditorCommand('stopBoxSelection', function(_textEditor, _edit) {
        vscode.commands.executeCommand('removeSecondaryCursors');
        mode.resetBoxSelection();
    });
    const openTextDocument = function(uri, line) {
        vscode.workspace.openTextDocument(uri).then(function(doc) {
            vscode.window.showTextDocument(doc).then(function(textEditor) {
                if (line) {
                    moveCursorTo(textEditor, line - 1, 0, false);
                }
            }, function(err) {});
        }, function(err) {});
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
    const tagJump = function(textEditor) {
        let folders = getBaseFolders(textEditor);
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
            //console.log(uri.toString());
            vscode.workspace.fs.stat(uri).then(function(stat) {
                if (stat.type === vscode.FileType.File ||
                    stat.type === (vscode.FileType.File | vscode.FileType.SymbolicLink)) {
                    openTextDocument(uri, line);
                } else {
                    tryNext();
                }
            }, function(e) { // No entry
                tryNext();
            });
        };
        tryNext();
    };
    registerTextEditorCommand('tagJump', tagJump);
    const makeEditCommand = function(command) {
        return function(textEditor, _edit) {
            if (!textEditor.selection.isEmpty && mode.inSelection() && mode.inBoxSelection()) {
                exec([command, 'removeSecondaryCursors']);
            } else {
                exec([command]);
            }
            mode.resetSelection(textEditor);
        };
    };
    const makeNonEditCommand = function(command) {
        return function(textEditor, _edit) {
            if (1 < textEditor.selections.length) {
                exec([command, 'removeSecondaryCursors', 'cancelSelection']);
            } else if (!textEditor.selection.isEmpty) {
                exec([command, 'cancelSelection']);
            } else {
                exec([command]);
            }
            mode.resetSelection(textEditor);
        };
    };
    registerTextEditorCommand('deleteLeft', makeEditCommand('deleteLeft'));
    registerTextEditorCommand('deleteRight', makeEditCommand('deleteRight'));
    registerTextEditorCommand('deleteWordLeft', makeEditCommand('deleteWordLeft'));
    registerTextEditorCommand('deleteWordRight', makeEditCommand('deleteWordRight'));
    registerTextEditorCommand('deleteAllLeft', makeEditCommand('deleteAllLeft'));
    registerTextEditorCommand('deleteAllRight', makeEditCommand('deleteAllRight'));
    registerTextEditorCommand('clipboardCut', makeEditCommand('editor.action.clipboardCutAction'));
    registerTextEditorCommand('clipboardCopy', makeNonEditCommand('editor.action.clipboardCopyAction'));
    registerTextEditorCommand('clipboardPaste', makeEditCommand('editor.action.clipboardPasteAction'));
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
