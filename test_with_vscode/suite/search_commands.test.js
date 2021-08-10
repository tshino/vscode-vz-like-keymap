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
    const sleep = testUtils.sleep;
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
                    '\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should select the word the cursor is on and open findWidget', async () => {
            await resetCursor(2, 0);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            // FIXME: check that findWidget is visible (but it seems not possible to test)
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
                    '\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should select multiple words starting from the cursor position and open findWidget', async () => {
            await selectRange(4, 0, 4, 3);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10]]);
            // FIXME: check that findWidget is visible (but it seems not possible to test)

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 14]]);
        });
    });
});
