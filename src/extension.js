"use strict";
const vscode = require("vscode");
const tag_jump = require("./tag_jump.js");

function activate(context) {
    var inSelectionMode = false;
    var inBoxSelectionMode = false;
    var lastSelectionAnchor = null;
    let startSelection = function(textEditor, box) {
        inSelectionMode = true;
        inBoxSelectionMode = box;
        lastSelectionAnchor = textEditor.selection.anchor;
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', true);
    };
    let resetSelection = function() {
        inSelectionMode = false;
        inBoxSelectionMode = false;
        lastSelectionAnchor = null;
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', false);
    };
    let resetBoxSelection = function() {
        inBoxSelectionMode = false;
    };
    let updateIsSelectionMode = function(textEditor) {
        if (!inSelectionMode &&
            (!textEditor.selection.isEmpty || 1 < textEditor.selections.length)) {
            startSelection(textEditor, 1 < textEditor.selections.length);
        }
        if (inSelectionMode && textEditor.selection.isEmpty &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            resetSelection();
        }
    };
    if (vscode.window.activeTextEditor) {
        updateIsSelectionMode(vscode.window.activeTextEditor);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(function(textEditor) {
            if (textEditor) {
                resetSelection();
                updateIsSelectionMode(textEditor);
            }
        })
    );
    let taskAfterScroll = null;
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(function(event) {
            if (event.textEditor === vscode.window.activeTextEditor) {
                taskAfterScroll = null;
                updateIsSelectionMode(event.textEditor);
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
    let registerTextEditorCommand = function(name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };
    let exec = function(commands, index = 0) {
        if (typeof commands === 'string') {
            commands = [ commands ];
        }
        var res = vscode.commands.executeCommand(commands[index]);
        if (index + 1 < commands.length) {
            res.then(function() { exec(commands, index + 1); });
        }
    };
    let moveCursorToWithoutScroll = function(textEditor, line, col, select) {
        var cursor = new vscode.Position(line, col);
        var anchor = select ? textEditor.selection.anchor : cursor;
        textEditor.selection = new vscode.Selection(anchor, cursor);
    };
    let moveCursorTo = function(textEditor, line, col, select) {
        var cursor = new vscode.Position(line, col);
        var anchor = select ? textEditor.selection.anchor : cursor;
        textEditor.selection = new vscode.Selection(anchor, cursor);
        textEditor.revealRange(new vscode.Range(cursor, cursor));
    };
    let enumVisibleLines = function(textEditor) {
        var vranges = textEditor.visibleRanges;
        var lines = [];
        for (var i = 0; i < vranges.length; i++) {
            var start = vranges[i].start.line;
            var end = vranges[i].end.line;
            for (var j = start; j <= end; j++) {
                lines.push(j);
            }
        }
        return lines;
    };
    let getLowerBoundLineIndex = function(lines, line) {
        for (var i = 0; i < lines.length; i++) {
            if (line <= lines[i]) {
                return i;
            }
        }
        return lines.length;
    };
    let makeCursorCommand = function(basicCmd, selectCmd, boxSelectCmd) {
        return function(textEditor, _edit) {
            updateIsSelectionMode(textEditor);
            if (inSelectionMode) {
                if (inBoxSelectionMode && !boxSelectCmd) {
                    resetBoxSelection();
                }
                if (inBoxSelectionMode) {
                    exec(boxSelectCmd);
                } else {
                    exec(selectCmd);
                }
            } else {
                exec(basicCmd);
            }
        };
    };
    let registerCursorCommand3 = function(name, basicCmd, selectCmd, boxSelectCmd) {
        registerTextEditorCommand(name, makeCursorCommand(basicCmd, selectCmd, boxSelectCmd));
    };
    let registerCursorCommand = function(name, cmdForSelect, cmdForBoxSelect) {
        registerCursorCommand3(name, name, cmdForSelect, cmdForBoxSelect);
    };
    registerTextEditorCommand('cursorLineStartSelect', function(textEditor, _edit) {
        var line = textEditor.selection.active.line;
        moveCursorTo(textEditor, line, 0, true);
    });
    registerTextEditorCommand('cursorLineEndSelect', function(textEditor, _edit) {
        var line = textEditor.selection.active.line;
        var col = textEditor.document.lineAt(line).range.end.character;
        moveCursorTo(textEditor, line, col, true);
    });
    registerCursorCommand('cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
    registerCursorCommand('cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
    registerCursorCommand('cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
    registerCursorCommand('cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
    registerCursorCommand('cursorWordStartLeft', 'cursorWordStartLeftSelect');
    registerCursorCommand('cursorWordStartRight', 'cursorWordStartRightSelect');
    let cursorHalfPageUpImpl = function(textEditor, select) {
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
    let cursorHalfPageDownImpl = function(textEditor, select) {
        let curr = textEditor.selection.active;
        let vlines = enumVisibleLines(textEditor);
        var lineCount = textEditor.document.lineCount;
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
    let cursorHalfPageUp = function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        if (inSelectionMode && inBoxSelectionMode) {
            resetBoxSelection();
        }
        cursorHalfPageUpImpl(textEditor, inSelectionMode);
    };
    let cursorHalfPageDown = function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        if (inSelectionMode && inBoxSelectionMode) {
            resetBoxSelection();
        }
        cursorHalfPageDownImpl(textEditor, inSelectionMode);
    };
    let cursorHalfPageUpSelect = function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        if (inSelectionMode && inBoxSelectionMode) {
            resetBoxSelection();
        }
        cursorHalfPageUpImpl(textEditor, true);
    };
    let cursorHalfPageDownSelect = function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        if (inSelectionMode && inBoxSelectionMode) {
            resetBoxSelection();
        }
        cursorHalfPageDownImpl(textEditor, true);
    };
    registerTextEditorCommand('cursorHalfPageUp', cursorHalfPageUp);
    registerTextEditorCommand('cursorHalfPageDown', cursorHalfPageDown);
    registerTextEditorCommand('cursorHalfPageUpSelect', cursorHalfPageUpSelect);
    registerTextEditorCommand('cursorHalfPageDownSelect', cursorHalfPageDownSelect);
    let cursorFullPageUp = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUp'],
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorColumnSelectPageUp']
    );
    let cursorFullPageDownImpl = makeCursorCommand(
        ['cursorPageDown'],
        ['cursorPageDownSelect'],
        ['cursorColumnSelectPageDown']
    );
    let cursorFullPageUpSelect = makeCursorCommand(
        ['scrollPageUp', 'cursorPageUpSelect'],
        ['scrollPageUp', 'cursorPageUpSelect']
    );
    let cursorFullPageDownSelectImpl = makeCursorCommand(
        ['cursorPageDownSelect'],
        ['cursorPageDownSelect']
    );
    let isLastLineVisible = function(textEditor) {
        let vlines = enumVisibleLines(textEditor);
        var lineCount = textEditor.document.lineCount;
        return vlines[vlines.length - 1] === lineCount - 1;
    };
    let cursorFullPageDown = function(textEditor) {
        if (!isLastLineVisible(textEditor)) {
            exec('scrollPageDown');
        }
        cursorFullPageDownImpl(textEditor);
    };
    let cursorFullPageDownSelect = function(textEditor) {
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
        updateIsSelectionMode(textEditor);
        resetBoxSelection();
        var margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        var vlines = enumVisibleLines(textEditor);
        var line = vlines[vlines[0] === 0 ? 0 : Math.min(margin, vlines.length - 1)];
        var col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, inSelectionMode);
    });
    registerTextEditorCommand('cursorViewBottom', function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        resetBoxSelection();
        var margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        var lineCount = textEditor.document.lineCount;
        var vlines = enumVisibleLines(textEditor);
        var bottom = vlines.length - 1;
        var line = vlines[vlines[bottom] === lineCount - 1 ? bottom : Math.max(0, bottom - margin)];
        var col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, inSelectionMode);
    });
    registerTextEditorCommand('scrollLineUp', function(textEditor, _edit) {
        if (0 < textEditor.selection.active.line) {
            exec(['scrollLineUp']);
            exec(['vz.cursorUp']);
        }
    });
    registerTextEditorCommand('scrollLineUpUnselect', function(textEditor, _edit) {
        if (0 < textEditor.selection.active.line) {
            var res = vscode.commands.executeCommand('cancelSelection');
            res.then(function() {
                exec(['scrollLineUp']);
                exec(['vz.cursorUp']);
            });
        }
    });
    registerTextEditorCommand('scrollLineDown', function(textEditor, _edit) {
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            exec(['scrollLineDown']);
            exec(['vz.cursorDown']);
        }
    });
    registerTextEditorCommand('scrollLineDownUnselect', function(textEditor, _edit) {
        if (textEditor.selection.active.line + 1 < textEditor.document.lineCount) {
            var res = vscode.commands.executeCommand('cancelSelection');
            res.then(function() {
                exec(['scrollLineDown']);
                exec(['vz.cursorDown']);
            });
        }
    });
    let registerToggleSelectionCommand = function(name, isBox) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            updateIsSelectionMode(textEditor);
            if (inSelectionMode) {
                if (!textEditor.selection.isEmpty) {
                    vscode.commands.executeCommand('cancelSelection');
                } else {
                    vscode.commands.executeCommand('removeSecondaryCursors');
                }
                resetSelection();
            } else {
                startSelection(textEditor, isBox);
            }
        });
    };
    registerTextEditorCommand('reverseSelection', function(textEditor, _edit) {
        var sel = textEditor.selection;
        if (!sel.isEmpty && 1 === textEditor.selections.length) {
            resetSelection();
            textEditor.selection = new vscode.Selection(sel.active, sel.anchor);
            textEditor.revealRange(new vscode.Range(sel.anchor, sel.anchor));
        }
    });
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    registerTextEditorCommand('stopBoxSelection', function(_textEditor, _edit) {
        vscode.commands.executeCommand('removeSecondaryCursors');
        resetBoxSelection();
    });
    let openTextDocument = function(uri, line) {
        vscode.workspace.openTextDocument(uri).then(function(doc) {
            vscode.window.showTextDocument(doc).then(function(textEditor) {
                if (line) {
                    moveCursorTo(textEditor, line - 1, 0, false);
                }
            }, function(err) {});
        }, function(err) {});
    };
    let getCurrentLineText = function(textEditor) {
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
    let tagJump = function(textEditor) {
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
    let registerEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            if (!textEditor.selection.isEmpty && inSelectionMode && inBoxSelectionMode) {
                exec([command, 'removeSecondaryCursors']);
            } else {
                exec([command]);
            }
            resetSelection();
        });
    };
    let registerNonEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            if (!textEditor.selection.isEmpty) {
                exec([command, 'cancelSelection']);
            } else {
                exec([command]);
            }
            resetSelection();
        });
    };
    registerEditCommand('deleteLeft', 'deleteLeft');
    registerEditCommand('deleteRight', 'deleteRight');
    registerEditCommand('deleteWordLeft', 'deleteWordLeft');
    registerEditCommand('deleteWordRight', 'deleteWordRight');
    registerEditCommand('deleteAllLeft', 'deleteAllLeft');
    registerEditCommand('deleteAllRight', 'deleteAllRight');
    registerEditCommand('clipboardCut', 'editor.action.clipboardCutAction');
    registerNonEditCommand('clipboardCopy', 'editor.action.clipboardCopyAction');
    registerEditCommand('clipboardPaste', 'editor.action.clipboardPasteAction');
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
    registerTextEditorCommand('closeFindWidget', function(_textEditor, _edit) {
        exec(['closeFindWidget', 'cancelSelection']);
    });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
