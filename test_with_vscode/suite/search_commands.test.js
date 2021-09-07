"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const search_commands = require("./../../src/search_commands.js");
const EditUtil = require("./../../src/edit_util.js");

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
    describe('find', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                'abcdef',
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should open findWidget', async () => {
            await resetCursor(0, 3);
            await searchHandler.find(textEditor);

            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
    });
    describe('findReplace', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                'abcdef',
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should open findWidget with replace input', async () => {
            await resetCursor(0, 3);
            await searchHandler.findReplace(textEditor);

            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
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
            assert.strictEqual(searchHandler.isSelectingMatch(), false);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
        it('should select the word the cursor is on and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not change selection if it is not empty (case 1)', async () => {
            await selectRange(2, 0, 2, 3);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 3]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not change selection if it is not empty (case 2)', async () => {
            await selectRanges([[4, 0, 4, 3], [5, 0, 5, 6]]);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not change selection if the cursor is at end of a line (case 1)', async () => {
            await resetCursor(4, 14);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 14]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
        });
        it('should not change selection if the cursor is at end of a line (case 2)', async () => {
            await selectRange(4, 11, 4, 14);

            await searchHandler.selectWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 4, 14]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
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
            assert.strictEqual(searchHandler.isSelectingMatch(), false);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that findWidget is visible (but it seems not possible to test)
        });
        it('should select the word the cursor is on and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 3], [5, 0, 5, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should select multiple words starting from the cursor position and open findWidget (case 1)', async () => {
            await selectRange(4, 0, 4, 3);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 14]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should select multiple words starting from the cursor position and open findWidget (case 2)', async () => {
            await selectRanges([[4, 0, 4, 0], [5, 0, 5, 0]]);

            await searchHandler.expandWordToFind(textEditor);
            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0, 4, 10], [5, 0, 5, 10]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should select an entire word when the first part of the word is already selected', async () => {
            await selectRange(2, 0, 2, 3);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0, 2, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not change selection if the cursor is at end of a line (case 1)', async () => {
            await resetCursor(4, 14);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 14]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
        });
        it('should not change selection if the cursor is at end of a line (case 2)', async () => {
            await selectRange(4, 11, 4, 14);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 4, 14]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not change selection if the selection reaches multiple lines', async () => {
            await selectRange(4, 11, 5, 6);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 11, 5, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
        });
        it('should reverse selection if the direction of selection is backward', async () => {
            await selectRange(0, 6, 0, 0);

            await searchHandler.expandWordToFind(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 0, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
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
    describe('findStart', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    'abcdef abcdef\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should move keyboard focus from findWidget to the document', async () => {
            await resetCursor(4, 0);
            await searchHandler.find(textEditor);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);

            await searchHandler.findStart(textEditor);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
            // FIXME: check that findWidget is still visible (but it seems not possible to test)
            // FIXME: check that the focus is on the document (but it seems not possible to test)
        });
        it('should reverse the direction of current selection', async () => {
            await resetCursor(0, 0);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 0, 6]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);

            await searchHandler.findStart(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 6, 0, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
    });
    describe('findPreviousMatch findStartPreviousMatch', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    'abcdef abcdef\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should find and select previous match of finding (no Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'

            await searchHandler.findPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6, 1, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);

            await searchHandler.findPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 6, 0, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should find and select previous match of finding (with Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'

            await searchHandler.findStartPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6, 1, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that the focus is on the document (but it seems not possible to test)

            await searchHandler.findPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 6, 0, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not move cursor if no other match found (no Start)', async () => {
            await resetCursor(2, 11);
            await searchHandler.selectWordToFind(textEditor); // '123'

            await searchHandler.findPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 14, 2, 11]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not move cursor if no other match found (with Start)', async () => {
            await resetCursor(2, 11);
            await searchHandler.selectWordToFind(textEditor); // '123'

            await searchHandler.findStartPreviousMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 14, 2, 11]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that the focus is on the document (but it seems not possible to test)
        });
        it('should prevent reentry (no Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor);
            let p1 = searchHandler.findPreviousMatch(textEditor);
            let p2 = searchHandler.findPreviousMatch(textEditor);
            await p1;
            await p2;
            await searchHandler.waitForEndOfGuardedCommand();
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6, 1, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should prevent reentry (with Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor);
            let p1 = searchHandler.findStartPreviousMatch(textEditor);
            let p2 = searchHandler.findStartPreviousMatch(textEditor);
            await p1;
            await p2;
            await searchHandler.waitForEndOfGuardedCommand();
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6, 1, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
    });
    describe('findNextMatch findStartNextMatch', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    'abcdef abcdef\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should find and select next match of finding (no Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'

            await searchHandler.findNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 10, 2, 4]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);

            await searchHandler.findNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 6, 3, 0]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should find and select next match of finding (with Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'

            await searchHandler.findStartNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 10, 2, 4]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that the focus is on the document (but it seems not possible to test)

            await searchHandler.findNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 6, 3, 0]]);
        });
        it('should not move cursor if no other match found (no Start)', async () => {
            await resetCursor(2, 11);
            await searchHandler.selectWordToFind(textEditor); // '123'

            await searchHandler.findNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 14, 2, 11]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should not move cursor if no other match found (with Start)', async () => {
            await resetCursor(2, 11);
            await searchHandler.selectWordToFind(textEditor); // '123'

            await searchHandler.findStartNextMatch(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 14, 2, 11]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            // FIXME: check that the focus is on the document (but it seems not possible to test)
        });
        it('should prevent reentry (no Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor);
            let p1 = searchHandler.findNextMatch(textEditor);
            let p2 = searchHandler.findNextMatch(textEditor);
            await p1;
            await p2;
            await searchHandler.waitForEndOfGuardedCommand();
            assert.deepStrictEqual(selectionsAsArray(), [[2, 10, 2, 4]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
        it('should prevent reentry (with Start)', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor);
            let p1 = searchHandler.findStartNextMatch(textEditor);
            let p2 = searchHandler.findStartNextMatch(textEditor);
            await p1;
            await p2;
            await searchHandler.waitForEndOfGuardedCommand();
            assert.deepStrictEqual(selectionsAsArray(), [[2, 10, 2, 4]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
    });
    const testFindStartCursorXXX = async function(func, expectedSelection) {
        assert.strictEqual(searchHandler.isSelectingMatch(), false);
        await searchHandler.selectWordToFind(textEditor);
        assert.strictEqual(searchHandler.isSelectingMatch(), true);

        await func(textEditor);

        assert.strictEqual(mode.inSelection(), false);
        assert.deepStrictEqual(selectionsAsArray(), expectedSelection);
        assert.strictEqual(searchHandler.isSelectingMatch(), false);
        // FIXME: check that the focus is on the document (but it seems not possible to test)
    };
    describe('findStartCursorXXX', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, 'a weak ago today\n'.repeat(10));
        });
        it('should cancel selection and move cursor left one character (findStartCursorLeft)', async () => {
            await selectRange(5, 2, 5, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorLeft, [[5, 1]]);
        });
        it('should cancel selection and move cursor right one character (findStartCursorRight)', async () => {
            await selectRange(5, 2, 5, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorRight, [[5, 3]]);
        });
        it('should cancel selection and move cursor up one line (findStartCursorUp)', async () => {
            await selectRange(5, 2, 5, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorUp, [[4, 2]]);
        });
        it('should cancel selection and move cursor down one line (findStartCursorDown)', async () => {
            await selectRange(5, 2, 5, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorDown, [[6, 2]]);
        });
        it('should cancel selection and move cursor to the last word start (findStartCursorWordStartLeft)', async () => {
            await selectRange(1, 7, 1, 10);
            await testFindStartCursorXXX(searchHandler.findStartCursorWordStartLeft, [[1, 2]]);
        });
        it('should cancel selection and move cursor to the next word start (findStartCursorWordStartRight)', async () => {
            await selectRange(1, 2, 1, 6);
            await testFindStartCursorXXX(searchHandler.findStartCursorWordStartRight, [[1, 7]]);
        });
        it('should cancel selection and move cursor to beginning of current line (findStartCursorLineStart)', async () => {
            await selectRange(4, 5, 7, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorLineStart, [[4, 0]]);
        });
        it('should cancel selection and move cursor to end of current line (findStartCursorLineEnd)', async () => {
            await selectRange(4, 5, 7, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorLineEnd, [[4, 16]]);
        });
        it('should move cursor to beginning of current display line (findStartCursorHome)', async () => {
            await selectRange(7, 2, 7, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorHome, [[7, 0]]);
        });
        it('should move cursor to end of current display line (findStartCursorEnd)', async () => {
            await selectRange(7, 2, 7, 5);
            await testFindStartCursorXXX(searchHandler.findStartCursorEnd, [[7, 16]]);
        });
        it('should cancel selection and move cursor to top of the document (findStartCursorTop)', async () => {
            await selectRange(7, 7, 7, 10);
            await testFindStartCursorXXX(searchHandler.findStartCursorTop, [[0, 0]]);
        });
        it('should cancel selection and move cursor to end of the document (findStartCursorBottom)', async () => {
            await selectRange(7, 7, 7, 10);
            await testFindStartCursorXXX(searchHandler.findStartCursorBottom, [[10, 0]]);
        });
        it('should cancel selection and move cursor to top of current visible area (findStartCursorViewTop)', async () => {
            await selectRange(7, 3, 7, 8);
            await testFindStartCursorXXX(searchHandler.findStartCursorViewTop, [[0, 3]]);
        });
        it('should cancel selection and move cursor to bottom of current visible area (findStartCursorViewBottom)', async () => {
            await selectRange(7, 3, 7, 8);
            await testFindStartCursorXXX(searchHandler.findStartCursorViewBottom, [[10, 0]]);
        });
    });
    describe('findStartScrollLineXXX', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        const testFindStartScrollLineXXX = async function(func, deltaLine, expectedSelection) {
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
            await searchHandler.selectWordToFind(textEditor);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await func(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + deltaLine);
            assert.deepStrictEqual(selectionsAsArray(), expectedSelection);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
            // FIXME: check that the focus is on the document (but it seems not possible to test)
        };
        it('should scroll up and move cursor up one line (findStartScrollLineUp)', async () => {
            await resetCursor(500, 5);
            await testFindStartScrollLineXXX(searchHandler.findStartScrollLineUp, -1, [[499, 5]]);
        });
        it('should cancel selection (findStartScrollLineUp)', async () => {
            await selectRange(500, 5, 500, 7);
            await testFindStartScrollLineXXX(searchHandler.findStartScrollLineUp, -1, [[499, 5]]);
        });
        it('should scroll down and move cursor down one line (findStartScrollLineDown)', async () => {
            await resetCursor(500, 5);
            await testFindStartScrollLineXXX(searchHandler.findStartScrollLineDown, 1, [[501, 5]]);
        });
        it('should cancel selection (findStartScrollLineDown)', async () => {
            await selectRange(500, 5, 500, 7);
            await testFindStartScrollLineXXX(searchHandler.findStartScrollLineDown, 1, [[501, 5]]);
        });
    });
    describe('replaceOne', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    'abcdef abcdef\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('closeFindWidget');
        });
        it('should replace a match of current search word with replace word and find next match', async () => {
            await resetCursor(1, 7);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'
            await searchHandler.findReplace(textEditor);

            // FIXME: We should test the method triggers a replace action, but we can't.
            // Because we cannot set any text to the replace input on the findWidget with provided vscode API AFAIK.
            // So we just invoke the method without any assertion about replacement action, only expecting that it doesn't throw.
            await searchHandler.replaceOne(textEditor);
            // But we can test the result of the action of finding next match expected after the replace action.
            assert.deepStrictEqual(selectionsAsArray(), [[2, 10, 2, 4]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), true);
        });
    });
    describe('closeFindWidget', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdef\n' +
                    'abcdef abcdef\n' +
                    'xyz abcdef 123\n' +
                    'abcdef xyz\n'
                ),
                vscode.EndOfLine.CRLF
            );
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should close findWidget', async () => {
            await resetCursor(2, 3);
            await searchHandler.find(textEditor);

            await searchHandler.closeFindWidget(textEditor);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
            // FIXME: check that findWidget is not visible (but it seems not possible to test)
        });
        it('should cancel selection and locate the cursor to beginning of the last selection', async () => {
            await selectRange(1, 7, 1, 13);
            await searchHandler.selectWordToFind(textEditor); // 'abcdef'
            assert.strictEqual(searchHandler.isSelectingMatch(), true);

            await searchHandler.closeFindWidget(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
            assert.strictEqual(searchHandler.isSelectingMatch(), false);
        });
    });
});
