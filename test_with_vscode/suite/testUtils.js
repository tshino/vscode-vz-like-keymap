'use strict';
const assert = require('assert');
const vscode = require("vscode");

const testUtils = {};

testUtils.setupTextEditor = async function({ content, language }) {
    const doc = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(doc);
    const textEditor = vscode.window.activeTextEditor;
    assert.ok( textEditor );
    return textEditor;
};

testUtils.resetDocument = async function(textEditor, content, eol = vscode.EndOfLine.LF) {
    let lineCount = textEditor.document.lineCount;
    let entireDocument = new vscode.Range(0, 0, lineCount, 0);
    await textEditor.edit((edit) => {
        edit.replace(entireDocument, content);
        edit.setEndOfLine(eol);
    });
};

testUtils.setEndOfLine = async function(textEditor, eol) {
    await textEditor.edit((edit) => {
        edit.setEndOfLine(eol);
    });
};

testUtils.selectionsToArray = function(selections) {
    let array = [];
    for (let i = 0; i < selections.length; i++) {
        let s = selections[i];
        if (s.anchor.isEqual(s.active)) {
            array.push([
                s.active.line, s.active.character
            ]);
        } else {
            array.push([
                s.anchor.line, s.anchor.character,
                s.active.line, s.active.character
            ]);
        }
    }
    return array;
};

module.exports = testUtils;
