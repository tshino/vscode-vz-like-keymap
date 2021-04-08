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
    describe('recording functions', () => {
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

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), [
                'vz.cursorDown'
            ]);
        });
        it('should record and replay a series of commands', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorLeft');
            kb_macro.finishRecording();

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), [
                'vz.cursorDown', 'vz.cursorDown', 'vz.cursorDown', 'vz.cursorLeft'
            ]);
        });
        it('should clear previously recorded sequence by finishing recording immediately', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.finishRecording();  // clear the above sequence

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), []);
        });
        it('should clear previously recorded sequence by canceling recording', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.cancelRecording();  // clear the above sequence

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), []);
        });
    });
    describe('cursor', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should move cursor (single command)', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 6);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should move cursor (multiple commands)', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorUp');
            vscode.commands.executeCommand('vz.cursorLeft');
            vscode.commands.executeCommand('vz.cursorLeft');
            vscode.commands.executeCommand('vz.cursorDown');
            vscode.commands.executeCommand('vz.cursorDown');
            vscode.commands.executeCommand('vz.cursorDown');
            vscode.commands.executeCommand('vz.cursorRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(7, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 4]]);
        });
        it('should move cursor to left/right word', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorWordStartLeft');
            vscode.commands.executeCommand('vz.cursorWordStartRight');
            vscode.commands.executeCommand('vz.cursorWordStartRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 9);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
        it('should move cursor to start/end of a logical line', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorLineStart');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to start/end of a wrapped line', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorHome');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to top/bottom of a document', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorTop');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(0, 0);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should make selection range while moving cursor', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorLeftSelect');
            vscode.commands.executeCommand('vz.cursorDownSelect');
            vscode.commands.executeCommand('vz.cursorDownSelect');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForCursorAt(7, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 7, 4]]);
        });
        it('should make selection range while moving cursor (home/end)', async () => {
            await resetCursor(3, 3);
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorHomeSelect');
            vscode.commands.executeCommand('vz.cursorEndSelect');
            kb_macro.finishRecording();

            await resetCursor(3, 4);
            await kb_macro.replay();
            await waitForCursorAt(3, 13);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
    });
    describe('toggleSelection', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should start selection mode', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
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
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.toggleSelection');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
    });
    describe('toggleSelection and cursor (toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a selection range (toggle -> arrow)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorRight');
            vscode.commands.executeCommand('vz.cursorRight');
            vscode.commands.executeCommand('vz.cursorRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 8);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 8]]);
        });
        it('should make a selection range (toggle -> word-start-right)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorWordStartRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 9);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 9]]);
        });
        it('should make a selection range (toggle -> line-start)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLineStart');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> home)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorHome');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> top)', async () => {
            kb_macro.startRecording();
            await vscode.commands.executeCommand('vz.toggleSelection');
            await vscode.commands.executeCommand('vz.cursorTop');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(0, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 0, 0]]);
        });
        it('should make a selection range (toggle -> left-select)', async () => {
            await resetCursor(0, 1);
            kb_macro.startRecording();
            await vscode.commands.executeCommand('vz.toggleSelection');
            await vscode.commands.executeCommand('vz.cursorLeftSelect');
            kb_macro.finishRecording();
            await waitForCursorAt(0, 0);

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 4);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 4]]);
        });
    });
    describe('toggleSelection and cursor (* -> toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a selection range (arrow -> toggle -> arrow)', async () => {
            await resetCursor(0, 0);
            kb_macro.startRecording();
            await vscode.commands.executeCommand('vz.cursorDown');
            await vscode.commands.executeCommand('vz.toggleSelection');
            await vscode.commands.executeCommand('vz.cursorRight');
            await vscode.commands.executeCommand('vz.cursorRight');
            kb_macro.finishRecording();
            await waitForCursorAt(1, 2);

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(6, 7);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5, 6, 7]]);
        });
        it('should make a selection range (word-start-left -> toggle -> word-start-right)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorWordStartLeft');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorWordStartRight');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 5);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 2, 5, 5]]);
        });
        it('should make a selection range (line-end -> toggle -> line-start)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorLineEnd');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLineStart');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (end -> toggle -> home)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorEnd');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorHome');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (top -> toggle -> bottom)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorTop');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorBottom');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(10, 0);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 10, 0]]);
        });
        it('should make a selection range (right-select -> toggle -> left-select)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.cursorRightSelect');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLeftSelect');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 5);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6, 5, 5]]);
        });
    });
    describe('toggleSelection and cursor (toggle -> * -> toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a selection range and cancel it then move cursor (arrow)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorRight');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorDown');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForCursorAt(6, 6);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 6]]);
        });
        it('should make a selection range and cancel it then move cursor (word-start-left/right)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorWordStartRight');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorWordStartLeft');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForCursorAt(5, 5);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should make a selection range and cancel it then move cursor (line-start/end)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLineEnd');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLineStart');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (home/end)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorEnd');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorHome');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForCursorAt(5, 0);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (top/bottom)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorTop');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorBottom');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForEndSelection();
            await waitForCursorAt(10, 0);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should make and cancel a selection range then make another one (left/right-select)', async () => {
            kb_macro.startRecording();
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorLeftSelect');
            vscode.commands.executeCommand('vz.toggleSelection');
            vscode.commands.executeCommand('vz.cursorRightSelect');
            kb_macro.finishRecording();

            await resetCursor(5, 5);
            await kb_macro.replay();
            await waitForStartSelection();
            await waitForCursorAt(5, 5);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4, 5, 5]]);
        });
    });
});
