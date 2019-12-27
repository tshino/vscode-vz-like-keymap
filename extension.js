const vscode = require("vscode");

function activate(context) {
    var isSelectionMode = false;
    var isSelectionModeBox = false;
    var lastSelectionAnchor = null;
    let updateIsSelectionMode = function(textEditor) {
        if (!isSelectionMode && !textEditor.selection.isEmpty) {
            isSelectionMode = true;
            isSelectionModeBox = 1 < textEditor.selections.length;
            lastSelectionAnchor = textEditor.selection.anchor;
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
    registerCursorCommand('cursorLeft', 'cursorLeftSelect', 'cursorColumnSelectLeft');
    registerCursorCommand('cursorRight', 'cursorRightSelect', 'cursorColumnSelectRight');
    registerCursorCommand('cursorUp', 'cursorUpSelect', 'cursorColumnSelectUp');
    registerCursorCommand('cursorDown', 'cursorDownSelect', 'cursorColumnSelectDown');
    registerCursorCommand('cursorWordStartLeft', 'cursorWordStartLeftSelect');
    registerCursorCommand('cursorWordStartRight', 'cursorWordStartRightSelect');
    registerCursorCommand('cursorPageUp', 'cursorPageUpSelect', 'cursorColumnSelectPageUp');
    registerCursorCommand('cursorPageDown', 'cursorPageDownSelect', 'cursorColumnSelectPageDown');
    // Using cursorHomeSelect is a compromise since 'cursorLineStartSelect' seems not defined.
    registerCursorCommand('cursorLineStart', 'cursorHomeSelect');
    registerCursorCommand('cursorHome', 'cursorHomeSelect');
    // Using cursorEndSelect is a compromise since 'cursorLineEndSelect' seems not defined.
    registerCursorCommand('cursorLineEnd', 'cursorEndSelect');
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
        vscode.commands.executeCommand('cursorMove', {
            to: 'viewPortTop',
            select: isSelectionMode
        });
    });
    registerTextEditorCommand('cursorViewBottom', function(textEditor, _edit) {
        updateIsSelectionMode(textEditor);
        isSelectionModeBox = false;
        vscode.commands.executeCommand('cursorMove', {
            to: 'viewPortBottom',
            select: isSelectionMode
        });
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
                vscode.commands.executeCommand('cancelSelection');
                isSelectionMode = false;
                isSelectionModeBox = false;
            } else {
                isSelectionMode = true;
                isSelectionModeBox = isBox;
                lastSelectionAnchor = textEditor.selection.anchor;
            }
        });
    };
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
