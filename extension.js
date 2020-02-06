"use strict";
const vscode = require("vscode");

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
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(function(event) {
            if (event.textEditor === vscode.window.activeTextEditor) {
                updateIsSelectionMode(event.textEditor);
            }
        })
    );
    let registerTextEditorCommand = function(name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };
    let exec = function(commands) {
        var res = vscode.commands.executeCommand(commands.shift());
        if (0 < commands.length) {
            res.then(function() { exec(commands); });
        }
    };
    let moveCursorTo = function(textEditor, line, col, select) {
        var anchor = textEditor.selection.anchor;
        var selection = {
            selectionStartLineNumber: (select ? anchor.line : line) + 1,
            selectionStartColumn: (select ? anchor.character : col) + 1,
            positionLineNumber: line + 1,
            positionColumn: col + 1
        };
        var res = vscode.commands.executeCommand('setSelection', { selection: selection });
        res.then(function() {
            var pos = new vscode.Position(line, col);
            textEditor.revealRange(
                new vscode.Range(pos, pos)
            );
        });
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
    let registerCursorCommand = function(name, cmdForSelect, cmdForBoxSelect) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            updateIsSelectionMode(textEditor);
            if (inSelectionMode) {
                if (inBoxSelectionMode) {
                    if (!cmdForBoxSelect) {
                        resetBoxSelection();
                    }
                    exec([cmdForBoxSelect || cmdForSelect]);
                } else {
                    exec([cmdForSelect]);
                }
            } else {
                exec([name]);
            }
        });
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
    registerCursorCommand('cursorPageUp', 'cursorPageUpSelect', 'cursorColumnSelectPageUp');
    registerCursorCommand('cursorPageDown', 'cursorPageDownSelect', 'cursorColumnSelectPageDown');
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
    registerCursorCommand('cursorPageUpSelect', 'cursorPageUpSelect');
    registerCursorCommand('cursorPageDownSelect', 'cursorPageDownSelect');
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
            var res = vscode.commands.executeCommand('setSelection', {
                selection: {
                    selectionStartLineNumber: sel.active.line + 1,
                    selectionStartColumn: sel.active.character + 1,
                    positionLineNumber: sel.anchor.line + 1,
                    positionColumn: sel.anchor.character + 1,
                }
            });
            res.then(function() {
                textEditor.revealRange(
                    new vscode.Range(sel.anchor, sel.anchor)
                );
            });
            resetSelection();
        }
    });
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    registerTextEditorCommand('stopBoxSelection', function(_textEditor, _edit) {
        vscode.commands.executeCommand('removeSecondaryCursors');
        resetBoxSelection();
    });
    let getFolderUris = function(textEditor) {
        let uris = [];
        let docUri = textEditor.document.uri;
        if (docUri.scheme !== 'untitled') {
            let parentPath = docUri.path.replace(/[/\\][^/\\]+$/, '');
            uris.push(docUri.with({
                path: parentPath,
                query: '',
                fragment: ''
            }));
        }
        let wsFolders = vscode.workspace.workspaceFolders;
        if (wsFolders) {
            for (var i = 0; i < wsFolders.length; i++) {
                uris.push(wsFolders[i].uri);
            }
        }
        return uris;
    };
    let getHomePath = function() {
        if ('HOME' in process.env) {
            return process.env['HOME'];
        }
        if ('HOMEDRIVE' in process.env && 'HOMEPATH' in process.env) {
            return process.env['HOMEDRIVE'] + process.env['HOMEPATH'];
        }
        return '';
    };
    let isUNCPath = function(path) {
        return path.match(/^\/\/[^\/]+\//);
    };
    let isAbsolutePath = function(path) {
        return path.match(/^(?:\/|[a-zA-Z]:\/)/);
    };
    let makeFileUri = function(folderUri, path) {
        try {
            if (isUNCPath(path)) {
                return new vscode.Uri({
                    scheme: 'file',
                    authority: path.replace(/^\/\/|(?<=[^\/])\/.+/g, ''),
                    path: path.replace(/^\/\/[^\/]+/, '')
                });
            }
            if (isAbsolutePath(path) && folderUri.scheme === 'file') {
                return folderUri.with({ path: path });
            }
            return folderUri.with({ path: folderUri.path + '/' + path });
        } catch (_e) {
            return null;
        }
    };
    let openTextDocument = function(uri, line) {
        vscode.workspace.openTextDocument(uri).then(function(doc) {
            vscode.window.showTextDocument(doc).then(function(textEditor) {
                if (line) {
                    moveCursorTo(textEditor, line - 1, 0, false);
                }
            }, function(err) {});
        }, function(err) {});
    };
    let extractFileNames = function(textEditor) {
        let line = textEditor.selection.active.line;
        let text = textEditor.document.lineAt(line).text;
        let names = text.split(/(?:[\s;,"'<>(){}\|\[\]@=+*]|:(?![\/\\]))+/);
        return names;
    };
    let tagJump = function(textEditor) {
        let folders = getFolderUris(textEditor);
        let names = extractFileNames(textEditor);
        let index = 0;
        let getNextCandidate = function() {
            if (0 < names.length) {
                if (index < folders.length) {
                    let ret = {
                        folder: folders[index],
                        name: names[0].trim(),
                        line: 0
                    };
                    index += 1;
                    if (2 <= names.length) {
                        ret.line = parseInt(names[1].match(/^[0-9]+/) || '0');
                    }
                    return ret;
                }
                index = 0;
                names.shift();
                return getNextCandidate();
            }
            return undefined;
        };
        let tryNext = function() {
            let cand = getNextCandidate();
            if (!cand) {
                return;
            }
            let folder = cand.folder;
            let name = cand.name;
            let line = cand.line;
            if (name.match(/^.+\\\\/)) {
                name = name.replace(/\\\\/g, '\\');
            }
            if (name.match(/^\~[\/\\]/)) {
                let home = getHomePath();
                if (home !== '') {
                    name = home + '/' + name.substring(2);
                }
            }
            name = name.replace(/\\/g, '/');
            name = name.replace(/^\.\/|\/$/g, '');
            if (name === '') {
                tryNext();
                return;
            }
            let uri = makeFileUri(folder, name);
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
    registerTextEditorCommand('closeFindWidget', function(_textEditor, _edit) {
        exec(['closeFindWidget', 'cancelSelection']);
    });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
