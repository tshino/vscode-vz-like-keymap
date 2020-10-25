"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const cursor_style = require("./cursor_style.js");
const tag_jump = require("./tag_jump.js");
const EditUtil = require("./edit_util.js");
const edit_commands = require("./edit_commands.js");
const cursor_commands = require("./cursor_commands.js");

function activate(context) {
    const mode = mode_handler.getInstance();
    const cursor_style_controller = cursor_style.CursorStyleController();
    const editHandler = edit_commands.getInstance();
    const cursorHandler = cursor_commands.getInstance();
    const modeIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    editHandler.registerCommands(context);
    cursorHandler.registerCommands(context);
    mode.onStartSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', true);
        modeIndicator.text = "[B]";
        modeIndicator.show();
        cursor_style_controller.startSelection(textEditor);
    });
    mode.onResetSelection(function(textEditor) {
        vscode.commands.executeCommand('setContext', 'vz.inSelectionMode', false);
        modeIndicator.hide();
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
        if (mode.inSelection()) {
            let box = mode.inBoxSelection();
            mode.resetSelection(textEditor);
            textEditor.selections = textEditor.selections.map((sel) => (
                new vscode.Selection(sel.active, sel.anchor)
            )).reverse();
            let pos = textEditor.selections[textEditor.selections.length - 1].active;
            textEditor.revealRange(new vscode.Range(pos, pos));
            mode.startSelection(textEditor, box);
        }
    });
    registerToggleSelectionCommand('toggleSelection', false);
    registerToggleSelectionCommand('toggleBoxSelection', true);
    registerTextEditorCommand('stopBoxSelection', function(textEditor, _edit) {
        if (EditUtil.rangesAllEmpty(textEditor.selections)) {
            vscode.commands.executeCommand('removeSecondaryCursors');
            if (mode.inSelection()) {
                mode.resetSelection(textEditor);
            }
        } else {
            textEditor.selections = textEditor.selections.map((sel) => (
                new vscode.Selection(sel.active, sel.active)
            ));
        }
    });
    const openTextDocument = function(uri, line) {
        vscode.workspace.openTextDocument(uri).then(function(doc) {
            vscode.window.showTextDocument(doc).then(function(textEditor) {
                if (line) {
                    cursorHandler.moveCursorTo(textEditor, line - 1, 0, false);
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
