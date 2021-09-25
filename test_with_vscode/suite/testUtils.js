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
    const resetDocument = async function(textEditor, content, eol = vscode.EndOfLine.LF, languageId = 'plaintext') {
        let lineCount = textEditor.document.lineCount;
        let entireDocument = new vscode.Range(0, 0, lineCount, 0);
        await textEditor.edit((edit) => {
            edit.replace(entireDocument, content);
            edit.setEndOfLine(eol);
        });
        await vscode.languages.setTextDocumentLanguage(textEditor.document, languageId);
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
    const waitForSynchronized = async (mode) => {
        while (await sleep(1), !mode.synchronized()) {}
    };
    const revealCursor = async (textEditor, revealType=undefined) => {
        let cursor = textEditor.selections[0].active;
        textEditor.revealRange(new vscode.Range(cursor, cursor), revealType);
        await waitForReveal(textEditor);
    };
    const resetCursor = async (textEditor, mode, line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        let anotherLine = line === 0 ? 1 : 0;
        if (textEditor.selections[0].active.line !== anotherLine) {
            mode.expectSync();
            textEditor.selections = [ new vscode.Selection(anotherLine, 0, anotherLine, 0) ];
            while (await sleep(1), !mode.synchronized()) {}
        }
        textEditor.selections = [ new vscode.Selection(line, character, line, character) ];
        mode.initialize(textEditor);
        if (revealType !== null) {
            await revealCursor(textEditor, revealType);
        }
        while (await sleep(1),
            !mode.synchronized() ||
            textEditor.selections[0].active.line !== line ||
            textEditor.selections[0].active.character !== character
        ) {}
    };
    const locateCursor = async (textEditor, mode, line, character, revealType=vscode.TextEditorRevealType.Default) => {
        mode.expectSync();
        textEditor.selections = [ new vscode.Selection(line, character, line, character) ];
        if (revealType !== null) {
            await revealCursor(textEditor, revealType);
        }
        await waitForSynchronized(mode);
    };
    const selectRange = async (textEditor, mode, l1, c1, l2, c2) => {
        await resetCursor(textEditor, mode, l1, c1);
        mode.expectSync();
        textEditor.selections = [ new vscode.Selection(l1, c1, l2, c2) ];
        await revealCursor(textEditor);
        await waitForSynchronized(mode);
    };
    const selectRanges = async (textEditor, mode, ranges) => {
        await resetCursor(textEditor, mode, ranges[0][0], ranges[0][1]);
        if (!(
            1 === ranges.length &&
            ranges[0][0] === ranges[0][2] &&
            ranges[0][1] === ranges[0][3]
        )) {
            mode.expectSync();
            textEditor.selections = ranges.map(
                r => new vscode.Selection(r[0], r[1], r[2], r[3])
            );
            await revealCursor(textEditor);
            await waitForSynchronized(mode);
        }
        mode.resetSelection(textEditor);
        mode.startSelection(textEditor, true);
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
        waitForEndSelection,
        resetCursor,
        locateCursor,
        selectRange,
        selectRanges
    };
})();

module.exports = testUtils;
