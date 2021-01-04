'use strict';
const assert = require('assert');
const vscode = require("vscode");
const EditUtil = require("./../../src/edit_util.js");

const testUtils = (function() {
    const setupTextEditor = async function({ content, language }) {
        const doc = await vscode.workspace.openTextDocument({ content, language });
        await vscode.window.showTextDocument(doc);
        const textEditor = vscode.window.activeTextEditor;
        assert.ok( textEditor );
        return textEditor;
    };
    const resetDocument = async function(textEditor, content, eol = vscode.EndOfLine.LF) {
        let lineCount = textEditor.document.lineCount;
        let entireDocument = new vscode.Range(0, 0, lineCount, 0);
        await textEditor.edit((edit) => {
            edit.replace(entireDocument, content);
            edit.setEndOfLine(eol);
        });
    };
    const setEndOfLine = async function(textEditor, eol) {
        await textEditor.edit((edit) => {
            edit.setEndOfLine(eol);
        });
    };
    const selectionsToArray = function(selections) {
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
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const isCursorVisible = function(textEditor) {
        let cursorLine = textEditor.selections[0].active.line;
        return EditUtil.enumVisibleLines(textEditor).includes(cursorLine);
    };
    const waitForReveal = async function(textEditor) {
        while (await sleep(1), !isCursorVisible(textEditor)) {}
    };
    const waitForStartSelection = async (mode) => {
        while (await sleep(1), !mode.inSelection()) {}
    };
    const waitForEndSelection = async (mode) => {
        while (await sleep(1), mode.inSelection()) {}
    };

    return {
        setupTextEditor,
        resetDocument,
        setEndOfLine,
        selectionsToArray,
        sleep,
        isCursorVisible,
        waitForReveal,
        waitForStartSelection,
        waitForEndSelection
    };
})();

module.exports = testUtils;
