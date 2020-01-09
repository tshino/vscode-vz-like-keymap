const vscode = require("vscode");

function activate(context) {
    var isSelectionMode = false;
    var isSelectionModeBox = false;
    var lastSelectionAnchor = null;
    let startSelection = function(textEditor, box) {
        isSelectionMode = true;
        isSelectionModeBox = box;
        lastSelectionAnchor = textEditor.selection.anchor;
    };
    let updateIsSelectionMode = function(textEditor) {
        if (!isSelectionMode &&
            (!textEditor.selection.isEmpty || 1 < textEditor.selections.length)) {
            startSelection(textEditor, 1 < textEditor.selections.length);
        }
        if (isSelectionMode && textEditor.selection.isEmpty &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            isSelectionMode = false;
            isSelectionModeBox = false;
        }
    };
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(function(textEditor) {
            if (textEditor) {
                isSelectionMode = false;
                isSelectionModeBox = false;
                lastSelectionAnchor = null;
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
            if (isSelectionMode) {
                if (isSelectionModeBox) {
                    if (!cmdForBoxSelect) {
                        isSelectionModeBox = false;
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
        isSelectionModeBox = false;
        var margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        var vlines = enumVisibleLines(textEditor);
        var line = vlines[vlines[0] === 0 ? 0 : Math.min(margin, vlines.length - 1)];
        var col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, isSelectionMode);
    });
    registerTextEditorCommand('cursorViewBottom', function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        isSelectionModeBox = false;
        var margin = vscode.workspace.getConfiguration('editor').get('cursorSurroundingLines');
        var lineCount = textEditor.document.lineCount;
        var vlines = enumVisibleLines(textEditor);
        var bottom = vlines.length - 1;
        var line = vlines[vlines[bottom] === lineCount - 1 ? bottom : Math.max(0, bottom - margin)];
        var col = textEditor.selection.active.character;
        moveCursorTo(textEditor, line, col, isSelectionMode);
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
            if (isSelectionMode) {
                if (!textEditor.selection.isEmpty) {
                    vscode.commands.executeCommand('cancelSelection');
                } else {
                    vscode.commands.executeCommand('removeSecondaryCursors');
                }
                isSelectionMode = false;
                isSelectionModeBox = false;
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
            isSelectionMode = false;
            isSelectionModeBox = false;
        }
    });
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    registerTextEditorCommand('stopBoxSelection', function(_textEditor, _edit) {
        vscode.commands.executeCommand('removeSecondaryCursors');
        isSelectionModeBox = false;
    });
    let registerEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            if (!textEditor.selection.isEmpty && isSelectionMode && isSelectionModeBox) {
                exec([command, 'removeSecondaryCursors']);
            } else {
                exec([command]);
            }
            isSelectionMode = false;
            isSelectionModeBox = false;
        });
    };
    let registerNonEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            if (!textEditor.selection.isEmpty) {
                exec([command, 'cancelSelection']);
            } else {
                exec([command]);
            }
            isSelectionMode = false;
            isSelectionModeBox = false;
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
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
