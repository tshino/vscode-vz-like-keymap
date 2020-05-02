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

module.exports = testUtils;
