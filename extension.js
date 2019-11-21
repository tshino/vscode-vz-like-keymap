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
        }
    };
    let registerTextEditorCommand = function(name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };
    let registerCursorCommand = function(name, nameSelect, nameBoxSelect) {
        registerTextEditorCommand(name, function(textEditor, edit) {
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
    let toggleSelectionMode = function(textEditor, isBox) {
        updateIsSelectionMode(textEditor);
        if (isSelectionMode) {
            vscode.commands.executeCommand('cancelSelection');
            isSelectionMode = false;
        } else {
            isSelectionMode = true;
            isSelectionModeBox = isBox;
            lastSelectionAnchor = textEditor.selection.anchor;
        }
    };
    let registerToggleSelectionCommand = function(name, isBox) {
        registerTextEditorCommand(name, function(textEditor, edit) {
            toggleSelectionMode(textEditor, isBox);
        });
    };
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    let registerEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, edit) {
            vscode.commands.executeCommand(command);
            isSelectionMode = false;
        });
    };
    let registerNonEditCommand = function(name, command) {
        registerTextEditorCommand(name, function(textEditor, edit) {
            vscode.commands.executeCommand(command);
            if (!textEditor.selection.isEmpty) {
                vscode.commands.executeCommand('cancelSelection');
            }
            isSelectionMode = false;
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
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
