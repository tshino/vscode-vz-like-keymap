const vscode = require("vscode");

function activate(context) {
    var isSelectionMode = false;
    var isSelectionModeBox = false;
    var lastSelectionAnchor = null;
    let updateIsSelectionMode = function(textEditor) {
        if (!isSelectionMode && !textEditor.selection.isEmpty) {
            isSelectionMode = true;
            isSelectionModeBox = false;
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
                updateIsSelectionMode(textEditor);
            }
        })
    );
    let registerTextEditorCommand = function(name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };
    let registerCursorCommand = function(name, nameSelect, nameBoxSelect) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            updateIsSelectionMode(textEditor);
            let command = isSelectionMode ?
                (isSelectionModeBox && nameBoxSelect) ? nameBoxSelect : nameSelect :
                name;
            vscode.commands.executeCommand(command);
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
    // Using cursorEndSelect is a compromise since 'cursorLineEndSelect' seems not defined.
    registerCursorCommand('cursorLineEnd', 'cursorEndSelect');
    registerCursorCommand('cursorTop', 'cursorTopSelect');
    registerCursorCommand('cursorBottom', 'cursorBottomSelect');
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
            var res = vscode.commands.executeCommand(command);
            if (!textEditor.selection.isEmpty && isSelectionMode && isSelectionModeBox) {
                res.then(function() {
                    vscode.commands.executeCommand('removeSecondaryCursors');
                });
            }
            isSelectionMode = false;
            isSelectionModeBox = false;
        });
    };
    let registerNonEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, _edit) {
            var res = vscode.commands.executeCommand(command);
            if (!textEditor.selection.isEmpty) {
                res.then(function() {
                    vscode.commands.executeCommand('cancelSelection');
                });
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
        var res = vscode.commands.executeCommand('closeFindWidget');
        res.then(function() {
            vscode.commands.executeCommand('actions.find');
        });
    });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
