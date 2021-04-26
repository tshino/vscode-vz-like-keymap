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
    // const waitForStartSelection = async () => await testUtils.waitForStartSelection(mode);
    // const waitForEndSelection = async () => await testUtils.waitForEndSelection(mode);
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.resetCursor(textEditor, mode, line, character, revealType);
    };
    const selectRange = async (l1, c1, l2, c2) => {
        await testUtils.selectRange(textEditor, mode, l1, c1, l2, c2);
    };
    const selectRanges = async (ranges) => {
        await testUtils.selectRanges(textEditor, mode, ranges);
    };
    /*const waitForCursorAt = async (line, character) => {
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
    };*/
    const selectionsAsArray = function() {
        return testUtils.selectionsToArray(textEditor.selections);
    };
    const recordThroughExecution = async function(commands) {
        kb_macro.startRecording();
        for (let i = 0; i < commands.length; i++) {
            let cmd = commands[i];
            if (typeof cmd === 'string') {
                await vscode.commands.executeCommand(cmd);
            } else {
                await vscode.commands.executeCommand(cmd[0], cmd[1]);
            }
            await sleep(30);
        }
        kb_macro.finishRecording();
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
        const funcA = function() {};
        const funcB = function() {};
        it('should start and finish recording', async () => {
            assert.strictEqual(kb_macro.recording(), false);
            kb_macro.startRecording();
            assert.strictEqual(kb_macro.recording(), true);
            kb_macro.finishRecording();
            assert.strictEqual(kb_macro.recording(), false);
        });
        it('should start and cancel recording', async () => {
            kb_macro.startRecording();
            kb_macro.cancelRecording();
            assert.strictEqual(kb_macro.recording(), false);
        });
        it('should record and replay a single command', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), [
                ['vz.cursorDown', funcA]
            ]);
        });
        it('should record and replay a series of commands', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorLeft', funcB);
            kb_macro.finishRecording();

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), [
                ['vz.cursorDown', funcA],
                ['vz.cursorDown', funcA],
                ['vz.cursorDown', funcA],
                ['vz.cursorLeft', funcB]
            ]);
        });
        it('should clear previously recorded sequence by finishing recording immediately', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.finishRecording();  // clear the above sequence

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), []);
        });
        it('should clear previously recorded sequence by canceling recording', async () => {
            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            kb_macro.startRecording();
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
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
            await recordThroughExecution([
                'vz.cursorRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should move cursor (multiple commands)', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorUp',
                'vz.cursorLeft',
                'vz.cursorLeft',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.cursorRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 4]]);
        });
        it('should move cursor to left/right word', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorWordStartLeft',
                'vz.cursorWordStartRight',
                'vz.cursorWordStartRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
        it('should move cursor to start/end of a logical line', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorLineStart'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to start/end of a wrapped line', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorHome'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to top/bottom of a document', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorTop'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should make selection range while moving cursor (arrow)', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorLeftSelect',
                'vz.cursorDownSelect',
                'vz.cursorDownSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 7, 4]]);
        });
        it('should make selection range while moving cursor (home/end)', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorHomeSelect',
                'vz.cursorEndSelect'
            ]);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
        it('should move cursor (view-top/bottom)', async () => {
            await resetCursor(0, 3);
            await recordThroughExecution([
                'vz.cursorViewTop'
            ]);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
        });
        it('should make selection range while moving cursor (line-start/end-select)', async () => {
            await resetCursor(3, 3);
            await recordThroughExecution([
                'vz.cursorLineStartSelect',
                'vz.cursorLineEndSelect'
            ]);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
    });
    describe('scroll', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should move cursor one line up/down with scroll', async () => {
            await resetCursor(5, 1);
            await recordThroughExecution([
                'vz.scrollLineDown',
                'vz.scrollLineUp',
                'vz.scrollLineUp'
            ]);

            await resetCursor(7, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4]]);
        });
        it('should stop selection mode and move cursor one line up/down with scroll', async () => {
            await selectRange(5, 1, 5, 7);
            await recordThroughExecution([
                'vz.scrollLineDownUnselect',
                'vz.scrollLineUpUnselect',
                'vz.scrollLineUpUnselect'
            ]);

            await selectRange(7, 4, 7, 7);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 7]]);
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
            await recordThroughExecution(['vz.toggleSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            await recordThroughExecution(['vz.toggleSelection']);

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode', async () => {
            await recordThroughExecution(['vz.toggleSelection']);

            await selectRanges([[5, 5, 5, 6], [6, 5, 6, 6]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should start then cancel selection mode', async () => {
            await recordThroughExecution(['vz.toggleSelection', 'vz.toggleSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
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
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.cursorRight',
                'vz.cursorRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 8]]);
        });
        it('should make a selection range (toggle -> word-start-right)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorWordStartRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 9]]);
        });
        it('should make a selection range (toggle -> line-start)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> home)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorHome'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> top)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorTop'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 0, 0]]);
        });
        it('should make a selection range (toggle -> left-select)', async () => {
            await resetCursor(0, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLeftSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 4]]);
        });
        it('should make a selection range (toggle -> home-select)', async () => {
            await resetCursor(0, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> view-top)', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorViewTop'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 0, 5]]);
        });
        it('should make a selection range (toggle -> line-start-select)', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLineStartSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
    });
    describe('toggleSelection and scroll (toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a selection range (toggle -> scroll-line-up)', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.scrollLineUp'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 4, 5]]);
        });
        it('should start and stop selection mode (toggle -> scroll-line-up-unselect)', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.scrollLineUpUnselect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
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
            await recordThroughExecution([
                'vz.cursorDown',
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.cursorRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5, 6, 7]]);
        });
        it('should make a selection range (word-start-left -> toggle -> word-start-right)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorWordStartLeft',
                'vz.toggleSelection',
                'vz.cursorWordStartRight'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 2, 5, 5]]);
        });
        it('should make a selection range (line-end -> toggle -> line-start)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorLineEnd',
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (end -> toggle -> home)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorEnd',
                'vz.toggleSelection',
                'vz.cursorHome'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (top -> toggle -> bottom)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorTop',
                'vz.toggleSelection',
                'vz.cursorBottom'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 10, 0]]);
        });
        it('should make a selection range (right-select -> toggle -> left-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorRightSelect',
                'vz.toggleSelection',
                'vz.cursorLeftSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6, 5, 5]]);
        });
        it('should make a selection range (end-select -> toggle -> home-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorEndSelect',
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (view-top -> toggle -> view-bottom)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorViewTop',
                'vz.toggleSelection',
                'vz.cursorViewBottom'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5, 10, 0]]);
        });
        it('should make a selection range (line-start-select -> toggle -> line-end-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.cursorLineStartSelect',
                'vz.toggleSelection',
                'vz.cursorLineEndSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0, 5, 13]]);
        });
    });
    describe('toggleSelection and scroll (* -> toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a selection range (scroll-line-up -> toggle -> scroll-line-down)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.scrollLineUp',
                'vz.toggleSelection',
                'vz.scrollLineDown'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5, 5, 5]]);
        });
        it('should start and stop selection mode (scroll-line-up-unselect -> toggle -> scroll-line-down-unselect)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.scrollLineUpUnselect',
                'vz.toggleSelection',
                'vz.scrollLineDownUnselect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
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
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.toggleSelection',
                'vz.cursorDown'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 6]]);
        });
        it('should make a selection range and cancel it then move cursor (word-start-left/right)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorWordStartRight',
                'vz.toggleSelection',
                'vz.cursorWordStartLeft'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should make a selection range and cancel it then move cursor (line-start/end)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLineEnd',
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (home/end)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorEnd',
                'vz.toggleSelection',
                'vz.cursorHome'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (top/bottom)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorTop',
                'vz.toggleSelection',
                'vz.cursorBottom'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should make and cancel a selection range then make another one (left/right-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLeftSelect',
                'vz.toggleSelection',
                'vz.cursorRightSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4, 5, 5]]);
        });
        it('should make and cancel a selection range then make another one (home/end-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorEndSelect',
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make and cancel a selection range then move cursor (view-top/bottom)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorViewTop',
                'vz.toggleSelection',
                'vz.cursorViewBottom'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should make and cancel a selection range then make another one (line-start/end-select)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.cursorLineStartSelect',
                'vz.toggleSelection',
                'vz.cursorLineEndSelect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0, 5, 13]]);
        });
    });
    describe('toggleSelection and scroll (toggle -> * -> toggle -> *)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make and cancel a selection range then move cursor (scroll-line-up/down)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.scrollLineUp',
                'vz.toggleSelection',
                'vz.scrollLineDown',
                'vz.scrollLineDown'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5]]);
        });
        it('should start and stop selection mode twice and move cursor (scroll-line-up/down-unselect)', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleSelection',
                'vz.scrollLineUpUnselect',
                'vz.toggleSelection',
                'vz.scrollLineDownUnselect',
                'vz.scrollLineDownUnselect'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5]]);
        });
    });
    describe('toggleBoxSelection', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should start box selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection']);

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection']);

            await selectRanges([[5, 5, 5, 6], [6, 5, 6, 6]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should start then cancel box selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection', 'vz.toggleBoxSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
    });
    describe('toggleBoxSelection + cursor', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should make a box selection', async () => {
            await resetCursor(1, 1);
            await recordThroughExecution([
                'vz.toggleBoxSelection',
                'vz.cursorRight',
                'vz.cursorDown',
                'vz.cursorDown'
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 6], [6, 5, 6, 6], [7, 5, 7, 6]]);
        });
    });
    describe('stopBoxSelection', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should convert column selection to multi-cursor', async () => {
            await selectRanges([[1, 1, 1, 4], [2, 1, 2, 4]]);
            await recordThroughExecution(['vz.stopBoxSelection']);

            await selectRanges([[5, 5, 5, 8], [6, 5, 6, 8]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 8], [6, 8]]);
        });
        it('should cancel multi-cursor', async () => {
            await selectRanges([[1, 4, 1, 4], [2, 4, 2, 4]]);
            await recordThroughExecution(['vz.stopBoxSelection']);

            await selectRanges([[5, 8, 5, 8], [6, 8, 6, 8]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 8]]);
        });
    });
    describe('toggleBoxSelection + stopBoxSelection', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '0 12 345 6789\n'.repeat(10)
            );
        });
        it('should convert column selection to multi-cursor', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleBoxSelection',
                'vz.cursorRight',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.stopBoxSelection'
            ]);

            await resetCursor(4, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 6], [5, 6], [6, 6]]);
        });
        it('should cancel multi-cursor', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'vz.toggleBoxSelection',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.stopBoxSelection'
            ]);

            await resetCursor(4, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5]]);
        });
    });
    describe('type', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                'abcde\n'.repeat(5)
            );
        });
        it('should insert single character', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'a' }]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, 'a');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 1]]);
        });
        it('should insert multiple character', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'a' }],
                ['type', { text: 'b' }],
                ['type', { text: 'c' }]
            ]);

            await resetCursor(4, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'abc');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 3]]);
        });
        it('should replace single selection with a text', async () => {
            await selectRange(5, 0, 5, 3);
            await recordThroughExecution([
                ['type', { text: 'C' }]
            ]);

            await selectRange(6, 0, 6, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'Cde');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 1]]);
        });
        it('should replace multiple selections each with a text', async () => {
            await selectRanges([[5, 0, 5, 3], [6, 0, 6, 3]]);
            await recordThroughExecution([
                ['type', { text: 'X' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'Xde');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'Xde');

            await selectRanges([[7, 1, 7, 3], [8, 1, 8, 3]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'aXde');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'aXde');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 2], [8, 2]]);
        });
    });
});
