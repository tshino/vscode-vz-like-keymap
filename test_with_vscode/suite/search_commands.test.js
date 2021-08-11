"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const search_commands = require("./../../src/search_commands.js");

describe('SearchHandler', () => {
    const mode = mode_handler.getInstance();
    const searchHandler = search_commands.getInstance();

    let textEditor;
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.resetCursor(textEditor, mode, line, character, revealType);
    };
    const selectRange = async (l1, c1, l2, c2) => {
        await testUtils.selectRange(textEditor, mode, l1, c1, l2, c2);
    };
    const selectRanges = async (ranges) => {
        await testUtils.selectRanges(textEditor, mode, ranges);
    };
    const selectionsAsArray = function() {
        return testUtils.selectionsToArray(textEditor.selections);
    };
    before(async () => {
        vscode.window.showInformationMessage('Started test for SearchHandler.');
        textEditor = await testUtils.setupTextEditor({ content: '' });
        mode.initialize(textEditor);
    });
    describe('selectWordToFind', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    '\n' +
                    'abcdef abcdef\n' +
                    '\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should select the word the cursor is on and open findWidget (case 1)', async () => {
            await resetCursor(2, 0);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
        it('should select the word the cursor is on and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
        });
        it('should not change selection if it is not empty (case 1)', async () => {
            await selectRange(2, 0, 2, 3);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 3]]);
        });
        it('should not change selection if it is not empty (case 2)', async () => {
            await selectRanges([[4, 0, 4, 3], [5, 0, 5, 6]]);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
        });
        it('should not change selection if the cursor is at end of a line (case 1)', async () => {
            await resetCursor(4, 14);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 14]]);
        });
        it('should not change selection if the cursor is at end of a line (case 2)', async () => {
            await selectRange(4, 11, 4, 14);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 4, 14]]);
        });
    });
    describe('expandWordToFind', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    '\n' +
                    'abcdef abcdef\n' +
                    '\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should select the word the cursor is on and open findWidget (case 1)', async () => {
            await resetCursor(2, 0);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
        it('should select the word the cursor is on and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
        });
        it('should select multiple words starting from the cursor position and open findWidget (case 1)', async () => {
            await selectRange(4, 0, 4, 3);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10]]);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 14]]);
        });
        it('should select multiple words starting from the cursor position and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.expandWordToFind(textEditor);
            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10], [5, 0, 5, 10]]);
        });
        it('should select an entire word when the first part of the word is already selected', async () => {
            await selectRange(2, 0, 2, 3);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
        });
        it('should not change selection if the cursor is at end of a line (case 1)', async () => {
            await resetCursor(4, 14);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 14]]);
        });
        it('should not change selection if the cursor is at end of a line (case 2)', async () => {
            await selectRange(4, 11, 4, 14);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 4, 14]]);
        });
        it('should not change selection if the selection reaches multiple lines', async () => {
            await selectRange(4, 11, 5, 6);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 5, 6]]);
        });
        it('should reverse selection if the direction of selection is backward', async () => {
            await selectRange(0, 6, 0, 0);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 0, 6]]);
        });
        it('should prevent reentry', async () => {
            await selectRange(4, 0, 4, 3);
            let p1 = searchHandler.expandWordToFind(textEditor);
            let p2 = searchHandler.expandWordToFind(textEditor);
            await p1;
            await p2;
            await searchHandler.waitForEndOfGuardedCommand();
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10]]);
        });
    });
});
