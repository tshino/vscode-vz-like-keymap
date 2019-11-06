const vscode = require("vscode");

function activate(context) {
    var isSelectionMode = false;
    var lastSelectionAnchor = null;
    let updateIsSelectionMode = function(textEditor) {
        if (!isSelectionMode && !textEditor.selection.isEmpty) {
            isSelectionMode = true;
            lastSelectionAnchor = textEditor.selection.anchor;
        }
        if (isSelectionMode && textEditor.selection.isEmpty &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            isSelectionMode = false;
        }
    };
    let registerCursorCommand = function(name, nameSelect) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, function(textEditor, edit) {
                updateIsSelectionMode(textEditor);
                vscode.commands.executeCommand(isSelectionMode ? nameSelect : name);
            })
       );
    };
    registerCursorCommand('cursorLeft', 'cursorLeftSelect');
    registerCursorCommand('cursorRight', 'cursorRightSelect');
    registerCursorCommand('cursorUp', 'cursorUpSelect');
    registerCursorCommand('cursorDown', 'cursorDownSelect');
    registerCursorCommand('cursorWordStartLeft', 'cursorWordStartLeftSelect');
    registerCursorCommand('cursorWordStartRight', 'cursorWordStartRightSelect');
    registerCursorCommand('cursorPageUp', 'cursorPageUpSelect');
    registerCursorCommand('cursorPageDown', 'cursorPageDownSelect');
    // Using cursorHomeSelect is a compromise since 'cursorLineStartSelect' seems not defined.
    registerCursorCommand('cursorLineStart', 'cursorHomeSelect');
    // Using cursorEndSelect is a compromise since 'cursorLineEndSelect' seems not defined.
    registerCursorCommand('cursorLineEnd', 'cursorEndSelect');
    registerCursorCommand('cursorTop', 'cursorTopSelect');
    registerCursorCommand('cursorBottom', 'cursorBottomSelect');
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.toggleSelection', function(textEditor, edit) {
            updateIsSelectionMode(textEditor);
            if (isSelectionMode) {
                vscode.commands.executeCommand('cancelSelection');
                isSelectionMode = false;
            } else {
                isSelectionMode = true;
                lastSelectionAnchor = textEditor.selection.anchor;
            }
        })
    );
    let registerEditCommand = function(name, command) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, function(textEditor, edit) {
                vscode.commands.executeCommand(command);
                isSelectionMode = false;
            })
        );
    };
    let registerNonEditCommand = function(name, command) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, function(textEditor, edit) {
                vscode.commands.executeCommand(command);
                if (!textEditor.selection.isEmpty) {
                    vscode.commands.executeCommand('cancelSelection');
                }
                isSelectionMode = false;
            })
        );
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
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
