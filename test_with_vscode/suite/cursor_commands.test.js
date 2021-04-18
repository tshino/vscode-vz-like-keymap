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
    const waitForReveal = async () => await testUtils.waitForReveal(textEditor);
    const waitForStartSelection = async () => await testUtils.waitForStartSelection(mode);
    const waitForEndSelection = async () => await testUtils.waitForEndSelection(mode);
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
    const waitForScroll = async (prevTop) => {
        while (EditUtil.enumVisibleLines(textEditor)[0] === prevTop) {
            await sleep(10);
        }
    };
    const waitForCursor = async (prevLine, prevCharacter) => {
        while (
            textEditor.selections[textEditor.selections.length - 1].active.line === prevLine &&
            textEditor.selections[textEditor.selections.length - 1].active.character === prevCharacter
        ) {
            await sleep(1);
        }
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

            cursorHandler.moveCursorTo(textEditor, 8, 7, false);
            await waitForReveal();

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

            cursorHandler.moveCursorTo(textEditor, 8, 7, true);
            await waitForReveal();
            await waitForStartSelection();
            await waitForCursor(5, 5);

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

            cursorHandler.moveCursorTo(textEditor, 8, 7, true);
            await waitForReveal();
            await waitForStartSelection();
            await waitForCursor(6, 6);

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

            cursorHandler.moveCursorTo(textEditor, 8, 7, false);
            await waitForReveal();
            await waitForEndSelection();

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

            cursorHandler.moveCursorTo(textEditor, 999, 0, false);
            await waitForReveal();

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

            cursorHandler.moveCursorTo(textEditor, 7, 3, false);
            await waitForReveal();

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

            cursorHandler.moveCursorToWithoutScroll(textEditor, 7, 3, false);
            await sleep(10);
            await sleep(10);
            await sleep(10);

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

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForCursor(cursor, 0);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(EditUtil.enumVisibleLines(textEditor)[0], 0);
        });
        it('should extend existing selection', async () => {
            await selectRange(50, 5, 30, 3);

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForCursor(30, 3);

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

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForCursor(52, 8);

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

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForCursor(cursor, 0);
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

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForCursor(70, 3);

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

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForCursor(52, 8);

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

            cursorHandler.cursorHalfPageUpSelect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);
            await waitForStartSelection();

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

            cursorHandler.cursorHalfPageDownSelect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);
            await waitForStartSelection();

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

            cursorHandler.cursorFullPageUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorFullPageUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(503, 7);

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

            cursorHandler.cursorFullPageDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);

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
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorFullPageDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(503, 7);

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

            cursorHandler.cursorFullPageDown(textEditor);
            await waitForCursor(cursor, 0);
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

            cursorHandler.cursorFullPageUpSelect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);
            await waitForStartSelection();

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

            cursorHandler.cursorFullPageDownSelect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(cursor, 5);
            await waitForStartSelection();

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

            cursorHandler.cursorViewTop(textEditor);
            await waitForCursor(500, 5);

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

            cursorHandler.cursorViewTop(textEditor);
            await waitForCursor(500, 10);

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

            cursorHandler.cursorViewTop(textEditor);
            await waitForCursor(cursor, 5);

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

            cursorHandler.cursorViewBottom(textEditor);
            await waitForCursor(500, 5);

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

            cursorHandler.cursorViewBottom(textEditor);
            await waitForCursor(500, 10);

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

            cursorHandler.cursorViewBottom(textEditor);
            await waitForCursor(cursor, 5);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 5]]);
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

            vscode.commands.executeCommand('vz.cursorLineStart');
            await waitForCursor(7, 5);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            vscode.commands.executeCommand('vz.cursorLineStart');
            await waitForCursor(4, 5);

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

            vscode.commands.executeCommand('vz.cursorLineEnd');
            await waitForCursor(7, 5);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 10]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            vscode.commands.executeCommand('vz.cursorLineEnd');
            await waitForCursor(4, 5);

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

            cursorHandler.cursorLineStartSelect(textEditor);
            await waitForCursor(7, 5);
            await waitForStartSelection();

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            cursorHandler.cursorLineStartSelect(textEditor);
            await waitForCursor(4, 5);
            await waitForStartSelection();

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

            cursorHandler.cursorLineEndSelect(textEditor);
            await waitForCursor(7, 5);
            await waitForStartSelection();

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 10]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            cursorHandler.cursorLineEndSelect(textEditor);
            await waitForCursor(4, 5);
            await waitForStartSelection();

            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 10]]);
        });
    });
    // todo: add tests for cursorUp, cursorDown
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
    describe('scrollLineUp', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up and move cursor up one line', async () => {
            await resetCursor(500, 5);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 5);

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

            cursorHandler.scrollLineUp(textEditor);
            await waitForCursor(1, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0]);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5]]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);

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

            cursorHandler.scrollLineDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 5]]);
        });
        it('should scroll down one line even if the last line of document is already visible', async () => {
            await resetCursor(1000, 0);
            await locateCursor(995, 5, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(995, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[996, 5]]);
        });
        it('should not scroll down if the cursor is already at the last line of document', async () => {
            await resetCursor(999, 0);
            await locateCursor(1000, 0, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDown(textEditor);
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

            cursorHandler.scrollLineDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[500, 5, 501, 7]]);
        });
    });
    describe('scrollLineUpUnselect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll up and move cursor up one line', async () => {
            await resetCursor(500, 5);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUpUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[499, 5]]);
        });
        it('should cancel selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUpUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);
            await waitForEndSelection();

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[499, 7]]);
        });
    });
    describe('scrollLineDownUnselect', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor, '0123456789\n'.repeat(1000));
        });
        it('should scroll down and move cursor down one line', async () => {
            await resetCursor(500, 5);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDownUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 5]]);
        });
        it('should cancel selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDownUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);
            await waitForEndSelection();

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 7]]);
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

            cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(3, 7)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
        });
        it('should not move cursor and should mark current position if no position marked', async () => {
            await resetCursor(2, 9);

            cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(2, 9)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 9]]);
        });
        it('should work if current selection range is not empty', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await selectRange(2, 3, 4, 8);

            cursorHandler.cursorLastPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(4, 8)), true);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3, 7, 9]]);
        });
        it('should work if in selection mode', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await resetCursor(3, 6);
            mode.startSelection(textEditor, false);

            cursorHandler.cursorLastPosition(textEditor);

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

            cursorHandler.cursorLastPosition(textEditor);

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
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorLastPosition(textEditor);
            await waitForScroll(vlines0[0]);

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
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorLastPosition(textEditor);
            await waitForScroll(vlines0[0]);

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
});
