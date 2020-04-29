'use strict';
const assert = require('assert');
const vscode = require("vscode");

const TestUtils = {};

TestUtils.setupTextEditor = async function({ content, language }) {
    const doc = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(doc);
    const textEditor = vscode.window.activeTextEditor;
    assert.ok( textEditor );
    return textEditor;
};

module.exports = TestUtils;
