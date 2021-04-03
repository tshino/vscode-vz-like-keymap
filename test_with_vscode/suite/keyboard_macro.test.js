"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const keyboard_macro = require("./../../src/keyboard_macro.js");


describe('KeyboardMacro', () => {
    const mode = mode_handler.getInstance();
    const kb_macro = keyboard_macro.getInstance();

    let textEditor;
    const sleep = testUtils.sleep;
    const waitForStartSelection = async () => await testUtils.waitForStartSelection(mode);
    const waitForEndSelection = async () => await testUtils.waitForEndSelection(mode);
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.resetCursor(textEditor, mode, line, character, revealType);
    };
    const selectRange = async (l1, c1, l2, c2) => {
        await testUtils.selectRange(textEditor, mode, l1, c1, l2, c2);
    };
    const waitForCursorAt = async (line, character) => {
        while (
            textEditor.selections[0].active.line !== line ||
            textEditor.selections[0].active.character !== character
        ) {
            await sleep(1);
        }
    };
    const waitForEmptySelection = async () => {
        while (
            textEditor.selections[0].active.line !== textEditor.selections[0].anchor.line ||
            textEditor.selections[0].active.character !== textEditor.selections[0].anchor.character
        ) {
            await sleep(1);
        }
    };
    const selectionsAsArray = function() {
        return testUtils.selectionsToArray(textEditor.selections);
    };
    before(async () => {
        vscode.window.showInformationMessage('Started test for KeyboardMacro.');
        textEditor = await testUtils.setupTextEditor({ content: '' });
        mode.initialize(textEditor);
    });
    describe('basicSenario', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0123456789\n'.repeat(10)
            );
        });
        it('should record and replay a single command', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.finishRecording();

            await resetCursor(2, 5);
            await kb_macro.replay();
            await waitForCursorAt(3, 5);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 5]]);
        });
        it('should record and replay a series of commands', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorLeft');
            kb_macro.finishRecording();

            await resetCursor(2, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4]]);
        });
        it('should clear previously recorded sequence by finishing recording immediately', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.finishRecording();  // clear the above sequence

            await resetCursor(2, 5);
            await kb_macro.replay();
            await sleep(30);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5]]);
        });
        it('should clear previously recorded sequence by canceling recording', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.cancelRecording();  // clear the above sequence

            await resetCursor(2, 5);
            await kb_macro.replay();
            await sleep(30);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5]]);
        });
    });
    describe('cursor', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should move cursor', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorUp');
            kb_macro.pushIfRecording('vz.cursorLeft');
            kb_macro.pushIfRecording('vz.cursorLeft');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(7, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 4]]);
        });
        it('should move cursor to left/right word', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorWordStartLeft');
            kb_macro.pushIfRecording('vz.cursorWordStartRight');
            kb_macro.pushIfRecording('vz.cursorWordStartRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 9);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
        it('should move cursor to start/end of a logical line', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorLineStart');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to start/end of a wrapped line', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorHome');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to top/bottom of a document', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorTop');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(0, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should make selection range while moving cursor', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorLeftSelect');
            kb_macro.pushIfRecording('vz.cursorDownSelect');
            kb_macro.pushIfRecording('vz.cursorDownSelect');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(7, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 7, 4]]);
        });
        it('should make selection range while moving cursor (home/end)', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorHomeSelect');
            kb_macro.pushIfRecording('vz.cursorEndSelect');
            kb_macro.finishRecording();

            await resetCursor(3, 4);
            await kb_macro.replay();
            await waitForCursorAt(3, 13);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
    });
    describe('toggleSelection and cursor', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should start selection mode', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.toggleSelection');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.toggleSelection');
            kb_macro.finishRecording();

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForEmptySelection();
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should start then cancel selection mode', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.toggleSelection');
            kb_macro.pushIfRecording('vz.toggleSelection');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
    });
});
