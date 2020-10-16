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
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

    let textEditor;
    const isCursorVisible = () => {
        let cursorLine = textEditor.selections[0].active.line;
        return EditUtil.enumVisibleLines(textEditor).includes(cursorLine);
    };
    const waitForReveal = async () => {
        while (await sleep(1), !isCursorVisible()) {}
    };
    const waitForStartSelection = async () => {
        while (await sleep(1), !mode.inSelection()) {}
    };
    const waitForEndSelection = async () => {
        while (await sleep(1), mode.inSelection()) {}
    };
    const revealCursor = async (revealType=undefined) => {
        let cursor = textEditor.selections[0].active;
        textEditor.revealRange(new vscode.Range(cursor, cursor), revealType);
        await waitForReveal();
    };
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        let anotherLine = line === 0 ? 1 : 0;
        if (textEditor.selections[0].active.line !== anotherLine) {
            mode.expectSync();
            textEditor.selections = [ new vscode.Selection(anotherLine, 0, anotherLine, 0) ];
            while (await sleep(1), !mode.synchronized()) {}
        }
        textEditor.selections = [ new vscode.Selection(line, character, line, character) ];
        mode.initialize(textEditor);
        if (revealType !== null) {
            await revealCursor(revealType);
        }
        while (await sleep(1),
            !mode.synchronized() ||
            textEditor.selections[0].active.line !== line ||
            textEditor.selections[0].active.character !== character
        ) {}
    };
    const locateCursor = async (line, character, revealType=vscode.TextEditorRevealType.Default) => {
        mode.expectSync();
        textEditor.selections = [ new vscode.Selection(line, character, line, character) ];
        if (revealType !== null) {
            await revealCursor(revealType);
        }
        while (await sleep(1), !mode.synchronized()) {}
    };
    const selectRange = async (l1, c1, l2, c2) => {
        await resetCursor(l1, c1);
        mode.expectSync();
        textEditor.selections = [ new vscode.Selection(l1, c1, l2, c2) ];
        await revealCursor();
        while (await sleep(1), !mode.synchronized()) {}
    };
    const selectRanges = async (ranges) => {
        await resetCursor(ranges[0][0], ranges[0][1]);
        mode.expectSync();
        textEditor.selections = ranges.map(
            r => new vscode.Selection(r[0], r[1], r[2], r[3])
        );
        await revealCursor();
        while (await sleep(1), !mode.synchronized()) {}
    };
    const waitForScroll = async (prevTop) => {
        while (EditUtil.enumVisibleLines(textEditor)[0] === prevTop) {
            await sleep(10);
        }
    };
    const waitForCursor = async (prevLine, prevCharacter) => {
        while (
            textEditor.selections[0].active.line === prevLine &&
            textEditor.selections[0].active.character === prevCharacter
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
    describe('makeCursorTo', () => {
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
            assert.equal(visibleLines0.includes(8), true);

            cursorHandler.moveCursorTo(textEditor, 8, 7, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 7]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should start selection if the argument select=true', async () => {
            await resetCursor(5, 5);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(8), true);

            cursorHandler.moveCursorTo(textEditor, 8, 7, true);
            await waitForReveal();
            await waitForStartSelection();
            await waitForCursor(5, 5);

            assert.equal(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 8, 7]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should expand selection range if the argument select=true', async () => {
            await selectRange(5, 5, 6, 6);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(8), true);

            cursorHandler.moveCursorTo(textEditor, 8, 7, true);
            await waitForReveal();
            await waitForStartSelection();
            await waitForCursor(6, 6);

            assert.equal(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 8, 7]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should cancel selection if the argument select=false', async () => {
            await selectRange(5, 5, 6, 6);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(8), true);

            cursorHandler.moveCursorTo(textEditor, 8, 7, false);
            await waitForReveal();
            await waitForEndSelection();

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 7]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should reveal the location of the cursor after it moved (1)', async () => {
            await resetCursor(5, 5);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(999), false);

            cursorHandler.moveCursorTo(textEditor, 999, 0, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[999, 0]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notEqual(visibleLines0[0], visibleLines1[0]);
        });
        it('should reveal the location of the cursor after it moved (2)', async () => {
            await resetCursor(1234, 0);
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(7), false);

            cursorHandler.moveCursorTo(textEditor, 7, 3, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 3]]);
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notEqual(visibleLines0[0], visibleLines1[0]);
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
            assert.equal(visibleLines0.includes(7), false);

            cursorHandler.moveCursorToWithoutScroll(textEditor, 7, 3, false);
            await sleep(10);
            await sleep(10);
            await sleep(10);

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 3]]);
            assert.equal(isCursorVisible(), false);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0[0], visibleLines1[0]);
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

            assert.equal(mode.inSelection(), false);
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
            assert.equal(mode.inSelection(), false);
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

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.equal(EditUtil.enumVisibleLines(textEditor)[0], 0);
        });
        it('should extend existing selection', async () => {
            await selectRange(50, 5, 30, 3);

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForCursor(30, 3);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].anchor.line, 50);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 30);
            assert.equal(textEditor.selections[0].active.character, 3);
        });
        it('should stop box-selection and continue selection mode', async () => {
            await selectRanges([
                [50, 5, 50, 8],
                [51, 5, 51, 8],
                [52, 5, 52, 8]
            ]);

            cursorHandler.cursorHalfPageUp(textEditor);
            await waitForCursor(50, 8);

            assert.equal(mode.inSelection(), true);
            assert.equal(mode.inBoxSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].anchor.line, 50);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 50);
            assert.equal(textEditor.selections[0].active.character, 8);
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

            assert.equal(mode.inSelection(), false);
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

            assert.equal(mode.inSelection(), false);
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

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert(vlines1.includes(1000));
            assert.equal(vlines1[0], vlines0[0]);
        });
        it('should extend existing selection', async () => {
            await selectRange(50, 5, 70, 3);

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForCursor(70, 3);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].anchor.line, 50);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 70);
            assert.equal(textEditor.selections[0].active.character, 3);
        });
        it('should stop box-selection and continue selection mode', async () => {
            await selectRanges([
                [50, 5, 50, 8],
                [51, 5, 51, 8],
                [52, 5, 52, 8]
            ]);

            cursorHandler.cursorHalfPageDown(textEditor);
            await waitForCursor(50, 8);

            assert.equal(mode.inSelection(), true);
            assert.equal(mode.inBoxSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].anchor.line, 50);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 52);
            assert.equal(textEditor.selections[0].active.character, 8);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
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

            assert.equal(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(cursor - current.line));
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.equal(pos1, pos0);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 503, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorFullPageUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(503, 7);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections[0].anchor.line, 500);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line < 503);
            assert.equal(textEditor.selections[0].active.character, 7);
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

            assert.equal(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(current.line - cursor));
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.equal(pos1, pos0);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 503, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorFullPageDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(503, 7);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections[0].anchor.line, 500);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            assert(textEditor.selections[0].active.line > 503);
            assert.equal(textEditor.selections[0].active.character, 7);
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

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert(vlines1.includes(1000));
            assert.equal(vlines1[0], vlines0[0]);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(cursor - current.line));
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.equal(pos1, pos0);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
            let current = textEditor.selections[0].active;
            assert([fullPage - 1, fullPage, fullPage + 1].includes(current.line - cursor));
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            let pos1 = EditUtil.getLowerBoundLineIndex(vlines1, current.line);
            assert.equal(pos1, pos0);
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

            assert.equal(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert(current.line < 500);
            assert(vlines0[0] <= current.line);
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], vlines1[0]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 10);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorViewTop(textEditor);
            await waitForCursor(500, 10);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections[0].anchor.line, 500);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            let current = textEditor.selections[0].active;
            assert(current.line < 500);
            assert(vlines0[0] <= current.line);
            assert.equal(current.character, 10);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], vlines1[0]);
        });
        it('should move cursor to top of document if it is already visible', async () => {
            await resetCursor(0, 5, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let cursor = vlines0.length >> 1;
            await locateCursor(cursor, 5, null);

            cursorHandler.cursorViewTop(textEditor);
            await waitForCursor(cursor, 5);

            assert.equal(mode.inSelection(), false);
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

            assert.equal(mode.inSelection(), false);
            let current = textEditor.selections[0].active;
            assert(500 < current.line);
            assert(current.line <= vlines0[vlines0.length - 1]);
            assert.equal(current.character, 5);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], vlines1[0]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 10);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.cursorViewBottom(textEditor);
            await waitForCursor(500, 10);

            assert.equal(mode.inSelection(), true);
            assert.equal(textEditor.selections[0].anchor.line, 500);
            assert.equal(textEditor.selections[0].anchor.character, 5);
            let current = textEditor.selections[0].active;
            assert(500 < current.line);
            assert(current.line <= vlines0[vlines0.length - 1]);
            assert.equal(current.character, 10);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], vlines1[0]);
        });
        it('should move cursor to bottom of document if it is already visible', async () => {
            await resetCursor(1000, 0, vscode.TextEditorRevealType.InCenter);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            let cursor = 1000 - (vlines0.length >> 1);
            await locateCursor(cursor, 5, null);

            cursorHandler.cursorViewBottom(textEditor);
            await waitForCursor(cursor, 5);

            assert.equal(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 5]]);
            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], vlines1[0]);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            cursorHandler.cursorLineStartSelect(textEditor);
            await waitForCursor(4, 5);
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
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
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 7, 10]]);
        });
        it('should extend selection', async () => {
            await selectRange(7, 5, 4, 5);

            cursorHandler.cursorLineEndSelect(textEditor);
            await waitForCursor(4, 5);
            while (await sleep(1), !mode.inSelection()) {}

            assert.equal(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 5, 4, 10]]);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[499, 5]]);
        });
        it('should only move cursor if the top of document is already visible', async () => {
            await resetCursor(0, 5);
            await locateCursor(1, 5, null);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(vlines0[0], 0);

            cursorHandler.scrollLineUp(textEditor);
            await waitForCursor(1, 5);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0]);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5]]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUp(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(mode.inSelection(), true);
            assert.equal(vlines1[0], vlines0[0] - 1);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] + 1);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] + 1);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0]);
            assert.deepStrictEqual(selectionsAsArray(), [[1000, 0]]);
        });
        it('should extend selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDown(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(mode.inSelection(), true);
            assert.equal(vlines1[0], vlines0[0] + 1);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] - 1);
            assert.deepStrictEqual(selectionsAsArray(), [[499, 5]]);
        });
        it('should cancel selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineUpUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);
            while (await sleep(1), mode.inSelection()) {}

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] - 1);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 5]]);
        });
        it('should cancel selection', async () => {
            await selectRange(500, 5, 500, 7);
            let vlines0 = EditUtil.enumVisibleLines(textEditor);

            cursorHandler.scrollLineDownUnselect(textEditor);
            await waitForScroll(vlines0[0]);
            await waitForCursor(500, 7);
            while (await sleep(1), mode.inSelection()) {}

            let vlines1 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(vlines1[0], vlines0[0] + 1);
            assert.deepStrictEqual(selectionsAsArray(), [[501, 7]]);
        });
    });
    describe('markPosition', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
        });
        beforeEach(async () => {
            cursorHandler.setMarkedPosition(null);
        });
        it('should mark cursor position', async () => {
            await resetCursor(3, 7);

            cursorHandler.markPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition();
            assert(pos !== null);
            assert(pos.isEqual(new vscode.Position(3, 7)));
        });
        it('should overwrite the last mark', async () => {
            cursorHandler.setMarkedPosition(new vscode.Position(5, 6));

            await resetCursor(7, 2);
            cursorHandler.markPosition(textEditor);

            let pos = cursorHandler.getMarkedPosition();
            assert(pos !== null);
            assert(pos.isEqual(new vscode.Position(7, 2)));
        });
    });
    describe('cursorLastPosition', () => {
        before(async () => {
            await testUtils.resetDocument(textEditor,
                '0123456789\n'.repeat(10)
            );
        });
        beforeEach(async () => {
            cursorHandler.setMarkedPosition(null);
        });
        it('should move the cursor to the last position', async () => {
            await resetCursor(3, 7);
            cursorHandler.setMarkedPosition(new vscode.Position(4, 5));

            cursorHandler.cursorLastPosition(textEditor);

            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
        });
        it('should do nothing if no position was marked', async () => {
            await resetCursor(2, 9);

            cursorHandler.cursorLastPosition(textEditor);

            assert.deepStrictEqual(selectionsAsArray(), [[2, 9]]);
        });
    });
});
