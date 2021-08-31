"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const cursor_commands = require("./../../src/cursor_commands.js");
const EditUtil = require("./../../src/edit_util.js");

describe('CursorHandler', () => {
    const mode = mode_handler.getInstance();
    const cursorHandler = cursor_commands.getInstance();

    let textEditor;
    const sleep = testUtils.sleep;
    const isCursorVisible = () => testUtils.isCursorVisible(textEditor);
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.resetCursor(textEditor, mode, line, character, revealType);
    };
    const locateCursor = async (line, character, revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.locateCursor(textEditor, mode, line, character, revealType);
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
        vscode.window.showInformationMessage('Started test for CursorHandler.');
        textEditor = await testUtils.setupTextEditor({ content: '' });
        mode.initialize(textEditor);
    });
    describe('moveCursorTo', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '0123456789\n'.repeat(50) +
                    '01234567890123456789\n'.repeat(100) +
                    'abcdefghijklmnopqrstuvwxyz\n'.repeat(500) +
                    'ABCDE\n'.repeat(1000)
                )
            );
        });
        it('should move the cursor to specified position', async () => {
            await resetCursor(5, 5);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(8), true);

            await cursorHandler.moveCursorTo(textEditor, 8, 7, false);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 7]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should start selection if the argument select=true', async () => {
            await resetCursor(5, 5);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(8), true);

            await cursorHandler.moveCursorTo(textEditor, 8, 7, true);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 8, 7]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should expand selection range if the argument select=true', async () => {
            await selectRange(5, 5, 6, 6);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(8), true);

            await cursorHandler.moveCursorTo(textEditor, 8, 7, true);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 8, 7]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should cancel selection if the argument select=false', async () => {
            await selectRange(5, 5, 6, 6);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(8), true);

            await cursorHandler.moveCursorTo(textEditor, 8, 7, false);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 7]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should reveal the location of the cursor after it moved (1)', async () => {
            await resetCursor(5, 5);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(999), false);

            await cursorHandler.moveCursorTo(textEditor, 999, 0, false);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[999, 0]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notStrictEqual(visibleLines0[0], visibleLines1[0]);
        });
        it('should reveal the location of the cursor after it moved (2)', async () => {
            await resetCursor(1234, 0);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(7), false);

            await cursorHandler.moveCursorTo(textEditor, 7, 3, false);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 3]]);
            assert.strictEqual(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notStrictEqual(visibleLines0[0], visibleLines1[0]);
        });
    });
    describe('moveCursorToWithoutScroll', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '0123456789\n'.repeat(50) +
                    '01234567890123456789\n'.repeat(100) +
                    'abcdefghijklmnopqrstuvwxyz\n'.repeat(500) +
                    'ABCDE\n'.repeat(1000)
                )
            );
        });
        it('should move the cursor to specified position', async () => {
            await resetCursor(1234, 0);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0.includes(7), false);

            await cursorHandler.moveCursorToWithoutScroll(textEditor, 7, 3, false);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 3]]);
            assert.strictEqual(isCursorVisible(), false);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(visibleLines0[0], visibleLines1[0]);
        });
    });
    describe('cursorHalfPageUp', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up half page (1)', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500 + (halfPage >> 1);
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorHalfPageUp(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[cursor - halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines0[0] - vlines1[0]));
        });
        it('should scroll up half page (2)', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500 - (halfPage >> 1);
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorHalfPageUp(textEditor);

            mode.sync(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[cursor - halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines0[0] - vlines1[0]));
        });
        it('should move cursor only when the screen is already at top of document', async () => {
            await resetCursor(0, 0);
            let halfPage = (EditUtil.enumVisibleLines(textEditor).length - 1) >> 1;
            let cursor = Math.max(1, halfPage - 2);
            await locateCursor(cursor, 0);

            await cursorHandler.cursorHalfPageUp(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(EditUtil.enumVisibleLines(textEditor)[0], 0);
        });
        it('should extend existing selection', async () => {
            await selectRange(50, 5, 30, 3);

            await cursorHandler.cursorHalfPageUp(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections.length, 1);
            assert.strictEqual(textEditor.selections[0].anchor.line, 50);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 30);
            assert.strictEqual(textEditor.selections[0].active.character, 3);
        });
        it('should stop box-selection and continue selection mode', async () => {
            await selectRanges([
                [50, 5, 50, 8],
                [51, 5, 51, 8],
                [52, 5, 52, 8]
            ]);

            await cursorHandler.cursorHalfPageUp(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.strictEqual(textEditor.selections.length, 1);
            assert.strictEqual(textEditor.selections[0].anchor.line, 50);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 50);
            assert.strictEqual(textEditor.selections[0].active.character, 8);
        });
    });
    describe('cursorHalfPageDown', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down half page (1)', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500 + (halfPage >> 1);
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorHalfPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[cursor + halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines1[0] - vlines0[0]));
        });
        it('should scroll down half page (2)', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500 - (halfPage >> 1);
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorHalfPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[cursor + halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines1[0] - vlines0[0]));
        });
        it('should move cursor only when the screen is already at bottom of document', async () => {
            await resetCursor(1000, 0);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = (vlines0.length - 1) >> 1;
            let cursor = 1000 - Math.max(1, halfPage - 2);
            await locateCursor(cursor, 0, null);

            await cursorHandler.cursorHalfPageDown(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert(vlines1.includes(1000));
            assert.strictEqual(vlines1[0], vlines0[0]);
        });
        it('should extend existing selection', async () => {
            await selectRange(50, 5, 70, 3);

            await cursorHandler.cursorHalfPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections.length, 1);
            assert.strictEqual(textEditor.selections[0].anchor.line, 50);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 70);
            assert.strictEqual(textEditor.selections[0].active.character, 3);
        });
        it('should stop box-selection and continue selection mode', async () => {
            await selectRanges([
                [50, 5, 50, 8],
                [51, 5, 51, 8],
                [52, 5, 52, 8]
            ]);

            await cursorHandler.cursorHalfPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.strictEqual(textEditor.selections.length, 1);
            assert.strictEqual(textEditor.selections[0].anchor.line, 50);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 52);
            assert.strictEqual(textEditor.selections[0].active.character, 8);
        });
    });
    describe('cursorHalfPageUpSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up half page and start selection', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500;

            await cursorHandler.cursorHalfPageUpSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[500, 5, cursor - halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines0[0] - vlines1[0]));
        });
    });
    describe('cursorHalfPageDownSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down half page and start selection', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = EditUtil.getLowerBoundLineIndex(vlines0, 500) - 1;
            let cursor = 500;

            await cursorHandler.cursorHalfPageDownSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[500, 5, cursor + halfPage, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert([halfPage - 1, halfPage, halfPage + 1].includes(vlines1[0] - vlines0[0]));
        });
    });
    describe('cursorFullPageUp', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up full page', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let fullPage = vlines0.length - 1;
            let cursor = 500;
            let pos0 = EditUtil.getLowerBoundLineIndex(vlines0, cursor);

            await cursorHandler.cursorFullPageUp(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(cursor - current.line));
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.strictEqual(pos1, pos0);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 503, 7);

            await cursorHandler.cursorFullPageUp(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections[0].anchor.line, 500);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 503);
            assert.strictEqual(textEditor.selections[0].active.character, 7);
        });
    });
    describe('cursorFullPageDown', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down full page', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let fullPage = vlines0.length - 1;
            let cursor = 500;
            let pos0 = EditUtil.getLowerBoundLineIndex(vlines0, cursor);

            await cursorHandler.cursorFullPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(current.line - cursor));
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.strictEqual(pos1, pos0);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 503, 7);

            await cursorHandler.cursorFullPageDown(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections[0].anchor.line, 500);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 503);
            assert.strictEqual(textEditor.selections[0].active.character, 7);
        });
        it('should move cursor only when the screen is already at bottom of document', async () => {
            await resetCursor(1000, 0);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let halfPage = (vlines0.length - 1) >> 1;
            let cursor = 1000 - Math.max(1, halfPage - 2);
            await locateCursor(cursor, 0, null);

            await cursorHandler.cursorFullPageDown(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert(vlines1.includes(1000));
            assert.strictEqual(vlines1[0], vlines0[0]);
        });
    });
    describe('cursorFullPageUpSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up full page and start selection', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let fullPage = vlines0.length - 1;
            let cursor = 500;
            let pos0 = EditUtil.getLowerBoundLineIndex(vlines0, cursor);

            await cursorHandler.cursorFullPageUpSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(cursor - current.line));
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.strictEqual(pos1, pos0);
        });
    });
    describe('cursorFullPageDownSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down full page and start selection', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let fullPage = vlines0.length - 1;
            let cursor = 500;
            let pos0 = EditUtil.getLowerBoundLineIndex(vlines0, cursor);

            await cursorHandler.cursorFullPageDownSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(current.line - cursor));
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.strictEqual(pos1, pos0);
        });
    });
    describe('cursorViewTop', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should move cursor to top of current visible area', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.cursorViewTop(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert(current.line < 500);
            assert(vlines0[0] <= current.line);
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], vlines1[0]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 10);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.cursorViewTop(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections[0].anchor.line, 500);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            let current = textEditor.selections[0].active;
            assert(current.line < 500);
            assert(vlines0[0] <= current.line);
            assert.strictEqual(current.character, 10);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], vlines1[0]);
        });
        it('should move cursor to top of document if it is already visible', async () => {
            await resetCursor(0, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let cursor = vlines0.length >> 1;
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorViewTop(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5]]);
        });
    });
    describe('cursorViewBottom', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should move cursor at top of current visible area', async () => {
            await resetCursor(500, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.cursorViewBottom(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert(500 < current.line);
            assert(current.line <= vlines0[vlines0.length - 1]);
            assert.strictEqual(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], vlines1[0]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 10);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.cursorViewBottom(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(textEditor.selections[0].anchor.line, 500);
            assert.strictEqual(textEditor.selections[0].anchor.character, 5);
            let current = textEditor.selections[0].active;
            assert(500 < current.line);
            assert(current.line <= vlines0[vlines0.length - 1]);
            assert.strictEqual(current.character, 10);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], vlines1[0]);
        });
        it('should move cursor to bottom of document if it is already visible', async () => {
            await resetCursor(1000, 0, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let cursor = 1000 - (vlines0.length >> 1);
            await locateCursor(cursor, 5, null);

            await cursorHandler.cursorViewBottom(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]); // the last line is empty
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], vlines1[0]);
        });
    });
    describe('cursorLineStart', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to beginning of current line', async () => {
            await resetCursor(7, 5);

            await cursorHandler.cursorLineStart(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            await cursorHandler.cursorLineStart(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 0]]);
        });
    });
    describe('cursorLineEnd', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to end of current line', async () => {
            await resetCursor(7, 5);

            await cursorHandler.cursorLineEnd(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 10]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            await cursorHandler.cursorLineEnd(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 10]]);
        });
    });
    describe('cursorLineStartSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to beginning of current line and start selection', async () => {
            await resetCursor(7, 5);

            await cursorHandler.cursorLineStartSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            await cursorHandler.cursorLineStartSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 0]]);
        });
    });
    describe('cursorLineEndSelect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to end of current line and start selection', async () => {
            await resetCursor(7, 5);

            await cursorHandler.cursorLineEndSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 10]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            await cursorHandler.cursorLineEndSelect(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 10]]);
        });
    });
    describe('cursorLeft', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor left one character', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 10);

            await cursorHandler.cursorLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 7, 9]]);
        });
        it('should extend box-selection', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 4]]);
        });
        it('should extend box-selection (multi line)', async () => {
            await selectRanges([[3, 3, 3, 5]]);
            await cursorHandler.cursorDown(textEditor);

            await cursorHandler.cursorLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 4], [4, 3, 4, 4]]);
        });
    });
    describe('cursorRight', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor right one character', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 9);

            await cursorHandler.cursorRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 7, 10]]);
        });
        it('should extend box-selection', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 6]]);
        });
        it('should extend box-selection (multi line)', async () => {
            await selectRanges([[3, 3, 3, 5]]);
            await cursorHandler.cursorDown(textEditor);

            await cursorHandler.cursorRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 6], [4, 3, 4, 6]]);
        });
    });
    describe('cursorUp', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor up one line', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorUp(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 10);

            await cursorHandler.cursorUp(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 6, 10]]);
        });
        it('should extend box-selection', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorUp(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 5], [2, 3, 2, 5]]);
        });
    });
    describe('cursorDown', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor down one line', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorDown(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 10);

            await cursorHandler.cursorDown(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 8, 10]]);
        });
        it('should extend box-selection', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorDown(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 3, 5], [4, 3, 4, 5]]);
        });
    });
    describe('cursorWordStartLeft', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, 'a weak ago today\n'.repeat(10));
        });
        it('should move cursor to the last word start', async () => {
            await resetCursor(1, 7);

            await cursorHandler.cursorWordStartLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);
        });
        it('should extend selection', async () => {
            await selectRange(2, 11, 2, 7);

            await cursorHandler.cursorWordStartLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 11, 2, 2]]);
        });
    });
    describe('cursorWordStartRight', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, 'a weak ago today\n'.repeat(10));
        });
        it('should move cursor to the next word start', async () => {
            await resetCursor(1, 7);

            await cursorHandler.cursorWordStartRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 11]]);
        });
        it('should extend selection', async () => {
            await selectRange(2, 2, 2, 7);

            await cursorHandler.cursorWordStartRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 2, 2, 11]]);
        });
    });
    describe('cursorTop', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to top of the document', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorTop(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should do nothing if cursor is already at top of the document', async () => {
            await resetCursor(0, 0);

            await cursorHandler.cursorTop(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 10);

            await cursorHandler.cursorTop(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 0, 0]]);
        });
        it('should cancel box-selection mode', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorTop(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 0, 0]]);
        });
    });
    describe('cursorBottom', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(10));
        });
        it('should move cursor to end of the document', async () => {
            await resetCursor(5, 5);

            await cursorHandler.cursorBottom(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should do nothing if cursor is already at end of the document', async () => {
            await resetCursor(0, 0);

            await cursorHandler.cursorBottom(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 7, 7, 10);

            await cursorHandler.cursorBottom(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 7, 10, 0]]);
        });
        it('should cancel box-selection mode', async () => {
            await selectRanges([[3, 3, 3, 5]]);

            await cursorHandler.cursorBottom(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3, 10, 0]]);
        });
    });
    describe('scrollLineUp', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up and move cursor up one line', async () => {
            await resetCursor(500, 5);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineUp(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[499, 5]]);
        });
        it('should only move cursor if the top of document is already visible', async () => {
            await resetCursor(0, 5);
            await locateCursor(1, 5, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines0[0], 0);

            await cursorHandler.scrollLineUp(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0]);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5]]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineUp(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[500, 5, 499, 7]]);
        });
    });
    describe('scrollLineDown', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down and move cursor down one line', async () => {
            await resetCursor(500, 5);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineDown(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 5]]);
        });
        it('should scroll down one line even if the last line of document is already visible', async () => {
            await resetCursor(1000, 0);
            await locateCursor(995, 5, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineDown(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[996, 5]]);
        });
        it('should not scroll down if the cursor is already at the last line of document', async () => {
            await resetCursor(999, 0);
            await locateCursor(1000, 0, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineDown(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0]);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            await cursorHandler.scrollLineDown(textEditor);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[500, 5, 501, 7]]);
        });
    });
    describe('stopBoxSelection', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
            cursorHandler.setMarkedPosition(textEditor, null);
        });
        it('should discard all empty multi-cursor', async () => {
            await selectRanges([
                [2, 7, 2, 7],
                [3, 7, 3, 7],
                [4, 7, 4, 7]
            ]);

            await cursorHandler.stopBoxSelection(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 7]]);
        });
        it('should convert all non-empty column selection to all empty multi-cursor', async () => {
            await selectRanges([
                [2, 3, 2, 5],
                [3, 3, 3, 5],
                [4, 3, 4, 5]
            ]);

            await cursorHandler.stopBoxSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5], [3, 5], [4, 5]]);
        });
    });
    describe('reverseSelection', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
            cursorHandler.setMarkedPosition(textEditor, null);
        });
        it('should swap the cursor and the anchor of the current selection range (single selection)', async () => {
            await selectRange(4, 1, 8, 7);

            await cursorHandler.reverseSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 7, 4, 1]]);
        });
        it('should do nothing but ratain selection mode if empty selection', async () => {
            await resetCursor(2, 0);
            await cursorHandler.cursorLineEndSelect(textEditor);
            await cursorHandler.cursorLineStartSelect(textEditor);

            await cursorHandler.reverseSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
        });
        it('should reverse the order of multi-cursor', async () => {
            await selectRanges([
                [2, 7, 2, 7],
                [3, 7, 3, 7]
            ]);

            await cursorHandler.reverseSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 7], [2, 7]]);
        });
        it('should reverse in both direction of row and column of a column selection', async () => {
            await selectRanges([
                [2, 3, 2, 5],
                [3, 3, 3, 5],
                [4, 3, 4, 5]
            ]);

            await cursorHandler.reverseSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5, 4, 3], [3, 5, 3, 3], [2, 5, 2, 3]]);
        });
        it('should retain box selection mode even if a single line is selected', async () => {
            await selectRanges([
                [2, 3, 2, 5]
            ]);

            await cursorHandler.reverseSelection(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5, 2, 3]]);
        });
    });
    describe('jumpToBracket', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                'aaaa( bbbb )\n' +
                '{\n' +
                '    { cccc }\n' +
                '}\n'
            );
        });
        it('should move cursor to opposite side of the pair of bracket', async () => {
            await resetCursor(1, 0);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
        });
        it('should jump to the corresponding bracket (inside nested brackets)', async () => {
            await resetCursor(2, 4);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 11]]);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 4]]);
        });
        it('should jump to the closing bracket (from middle of the range)', async () => {
            await resetCursor(2, 0);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
        });
        it('should jump to the nearest bracket (if no bracket around the cursor)', async () => {
            await resetCursor(0, 2);

            await cursorHandler.jumpToBracket(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
        });
    });
    describe('markPosition', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
            cursorHandler.setMarkedPosition(textEditor, null);
        });
        it('should mark current cursor position', async () => {
            await resetCursor(3, 7);

            cursorHandler.markPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 7)), true);
        });
        it('should overwrite the last mark', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(5, 6));

            await resetCursor(7, 2);
            cursorHandler.markPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(7, 2)), true);
        });
        it('should mark the active position of the last selection if multiple selections', async () => {
            await selectRanges([
                [2, 3, 2, 5],
                [3, 3, 3, 5],
                [4, 3, 4, 5]
            ]);

            cursorHandler.markPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(4, 5)), true);
        });
        it('should move marked position if some text inserted before it', async () => {
            await resetCursor(3, 7);
            cursorHandler.markPosition(textEditor);

            await textEditor.edit((edit) => {
                edit.insert(new vscode.Position(2, 9), "222\n333\n");
            });

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(5, 7)), true);
        });
        it('should move marked position if some text deleted at before it', async () => {
            await resetCursor(6, 1);
            cursorHandler.markPosition(textEditor);

            await textEditor.edit((edit) => {
                edit.delete(new vscode.Range(3, 2, 4, 3));
            });

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(5, 1)), true);
        });
        it('should move marked position approximately if some text around the position replaced', async () => {
            await resetCursor(4, 4);
            cursorHandler.markPosition(textEditor);

            await textEditor.edit((edit) => {
                edit.replace(
                    new vscode.Range(3, 0, 5, 10),
                    '3333333333\n4444444444\n5555555555\n6666666666\n7777777777'
                );
            });

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(4, 0)), true);
        });
    });
    describe('cursorLastPosition', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
        });
        beforeEach(async () => {
            cursorHandler.setMarkedPosition(textEditor, null);
        });
        it('should mark current cursor position and move the cursor back to the last marked position', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(4, 5));
            await resetCursor(3, 7);

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 7)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
        });
        it('should not move cursor and should mark current position if no position marked', async () => {
            await resetCursor(2, 9);

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(2, 9)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 9]]);
        });
        it('should work if current selection range is not empty', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await selectRange(2, 3, 4, 8);

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(4, 8)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3, 7, 9]]);
        });
        it('should work if in selection mode', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await resetCursor(3, 6);
            mode.startSelection(textEditor, false);

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 6)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 6, 7, 9]]);
        });
        it('should work if there are multiple selections', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await selectRanges([
                [2, 3, 2, 5],
                [3, 3, 3, 5],
                [4, 3, 4, 5]
            ]);

            await cursorHandler.cursorLastPosition(textEditor);

            assert.strictEqual(mode.inBoxSelection(), false);
            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(4, 5)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3, 7, 9]]);
        });
        it('should scroll to reveal the cursor when it jumped to out of visible area', async () => {
            await resetCursor(3, 0);
            await textEditor.edit((edit) => {
                edit.insert(new vscode.Position(5, 0, 5, 0), '0123456789\n'.repeat(1000));
            });
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(555, 9));

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 0)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[555, 9]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines1.includes(555), true);
        });
        it('should scroll and extend selection when it jumped to out of visible area in selection mode', async () => {
            await selectRange(3, 4, 3, 7);
            await textEditor.edit((edit) => {
                edit.insert(new vscode.Position(5, 0, 5, 0), '0123456789\n'.repeat(1000));
            });
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(555, 8));

            await cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 7)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 555, 8]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(vlines1.includes(555), true);
        });
    });
    describe('getFileNames', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                'hello.txt\n' +
                'include "abc.hpp"'
            );
        });
        it('should extact path-like strings from the cursor line of the document', async () => {
            await resetCursor(0, 3);

            let files = cursorHandler.getFileNames(textEditor);

            assert.deepStrictEqual(files, ['hello.txt']);
        });
        it('should ignore symbols which is unlikely part of a path', async () => {
            await resetCursor(1, 3);

            let files = cursorHandler.getFileNames(textEditor);

            assert.deepStrictEqual(files, ['include', 'abc.hpp']);
        });
    });
    describe('makeTagCandidates', () => {
        it('should make a list of every possible combinations of folders and paths', () => {
            let folders = [
                new vscode.Uri('file', '', '/path/to/folder1', '', ''),
                new vscode.Uri('file', '', '/path/to/folder2', '', '')
            ];
            let files = [ 'hello', 'world' ];
            let list = cursorHandler.makeTagCandidates(folders, files);
            assert.deepStrictEqual(
                list,
                [
                    { folder: folders[0], name: files[0], line: 0 },
                    { folder: folders[1], name: files[0], line: 0 },
                    { folder: folders[0], name: files[1], line: 0 },
                    { folder: folders[1], name: files[1], line: 0 }
                ]
            );
        });
        it('should detect line numbers appear right after file names', () => {
            let folders = [
                new vscode.Uri('file', '', '/path/to/folder1', '', ''),
            ];
            let files = [ 'hello', 'world.txt', '777' ];
            let list = cursorHandler.makeTagCandidates(folders, files);
            assert.deepStrictEqual(
                list,
                [
                    { folder: folders[0], name: files[0], line: 0 },
                    { folder: folders[0], name: files[1], line: 777 },
                    { folder: folders[0], name: files[2], line: 0 }
                ]
            );
        });
    });
    describe('findTagJumpTarget', () => {
        const VALID_FILES = [
            'file:///workspace1/util.h',
            'file:///workspace2/doc/hello.txt'
        ];
        const VALID_DIRS = [
            'file:///workspace1',
            'file:///workspace2',
            'file:///workspace2/doc'
        ];
        const makeStatFunc = function(log) {
            return async function(uri) {
                let str = uri.toString();
                log.push(str);
                if (VALID_FILES.includes(str)) {
                    return { // FileStat
                        type: vscode.FileType.File
                    };
                }
                if (VALID_DIRS.includes(str)) {
                    return { // FileStat
                        type: vscode.FileType.Directory
                    };
                }
                throw undefined; // no entry
            };
        };
        it('should find valid path through testing all combinations of folders and file names (case 1)', async () => {
            const folders = [
                new vscode.Uri('file', '', '/workspace1', '', ''),
                new vscode.Uri('file', '', '/workspace2', '', '')
            ];
            const names = ['#include', 'util.h'];
            const statLog = [];
            let target = await cursorHandler.findTagJumpTarget(
                folders,
                names,
                makeStatFunc(statLog)
            );
            assert.strictEqual(target !== null, true);
            assert.strictEqual(target.uri.toString(), 'file:///workspace1/util.h');
            assert.strictEqual(target.line, 0);
            assert.deepStrictEqual(statLog, [
                'file:///workspace1/%23include',
                'file:///workspace2/%23include',
                'file:///workspace1/util.h'
            ]);
        });
        it('should find valid path through testing all combinations of folders and file names (case 2)', async () => {
            const folders = [
                new vscode.Uri('file', '', '/workspace1', '', ''),
                new vscode.Uri('file', '', '/workspace2', '', '')
            ];
            const names = ['doc/hello.txt', '123', 'chapter', '2'];
            const statLog = [];
            let target = await cursorHandler.findTagJumpTarget(
                folders,
                names,
                makeStatFunc(statLog)
            );
            assert.strictEqual(target !== null, true);
            assert.strictEqual(target.uri.toString(), 'file:///workspace2/doc/hello.txt');
            assert.strictEqual(target.line, 123);
            assert.deepStrictEqual(statLog, [
                'file:///workspace1/doc/hello.txt',
                'file:///workspace2/doc/hello.txt'
            ]);
        });
        it('should fail if no valid path is found', async () => {
            const folders = [
                new vscode.Uri('file', '', '/workspace1', '', ''),
                new vscode.Uri('file', '', '/workspace2', '', '')
            ];
            const names = ['doc', 'hello.txt'];
            const statLog = [];
            let target = await cursorHandler.findTagJumpTarget(
                folders,
                names,
                makeStatFunc(statLog)
            );
            assert.strictEqual(target, null);
            assert.deepStrictEqual(statLog, [
                'file:///workspace1/doc',
                'file:///workspace2/doc',
                'file:///workspace1/hello.txt',
                'file:///workspace2/hello.txt'
            ]);
        });
    });
});
