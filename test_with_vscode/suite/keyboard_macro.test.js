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
        kb_macro.startRecording(textEditor);
        for (let i = 0; i < commands.length; i++) {
            let cmd = commands[i];
            if (typeof cmd === 'string') {
                await vscode.commands.executeCommand(cmd);
            } else if (cmd[0] === 'edit') {
                await textEditor.edit(cmd[1]);
                if (typeof cmd[2][0] == 'number') {
                    textEditor.selections = [
                        new vscode.Selection(cmd[2][0], cmd[2][1], cmd[2][0], cmd[2][1])
                    ];
                } else {
                    textEditor.selections = cmd[2].map(
                        r => new vscode.Selection(r[0], r[1], r[2], r[3])
                    );
                }
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
            kb_macro.startRecording(textEditor);
            assert.strictEqual(kb_macro.recording(), true);
            kb_macro.finishRecording();
            assert.strictEqual(kb_macro.recording(), false);
        });
        it('should start and cancel recording', async () => {
            kb_macro.startRecording(textEditor);
            kb_macro.cancelRecording();
            assert.strictEqual(kb_macro.recording(), false);
        });
        it('should record and replay a single command', async () => {
            kb_macro.startRecording(textEditor);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), [
                ['vz.cursorDown', funcA]
            ]);
        });
        it('should record and replay a series of commands', async () => {
            kb_macro.startRecording(textEditor);
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
            kb_macro.startRecording(textEditor);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            kb_macro.startRecording(textEditor);
            kb_macro.finishRecording();  // clear the above sequence

            assert.deepStrictEqual(kb_macro.getRecordedCommands(), []);
        });
        it('should clear previously recorded sequence by canceling recording', async () => {
            kb_macro.startRecording(textEditor);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.pushIfRecording('vz.cursorDown', funcA);
            kb_macro.finishRecording();

            kb_macro.startRecording(textEditor);
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
        it('should make selection range while moving cursor (*arrow-select)', async () => {
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
            await resetCursor(1, 1);
            await recordThroughExecution(['vz.toggleSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            await selectRange(1, 1, 1, 3);
            await recordThroughExecution(['vz.toggleSelection']);

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode', async () => {
            await selectRanges([[1, 1, 1, 4], [2, 1, 2, 4]]);
            await recordThroughExecution(['vz.toggleSelection']);

            await selectRanges([[5, 5, 5, 6], [6, 5, 6, 6]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode (multi-cursor)', async () => {
            await selectRanges([[1, 1, 1, 1], [2, 1, 2, 1]]);
            await recordThroughExecution(['vz.toggleSelection']);

            await selectRanges([[5, 5, 5, 5], [6, 5, 6, 5]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should start then cancel selection mode', async () => {
            await resetCursor(1, 1);
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
    describe('reverseSelection', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                'abcde\n'.repeat(5)
            );
        });
        it('should reverse current selection', async () => {
            await selectRange(1, 0, 5, 3);
            await recordThroughExecution([
                'vz.reverseSelection'
            ]);

            await selectRange(2, 0, 6, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4, 2, 0]]);
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
        it('should insert single character at each of multi-cursor', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0]]);
            await recordThroughExecution([
                ['type', { text: 'a' }]
            ]);

            await selectRanges([[3, 0, 3, 0], [4, 0, 4, 0]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, 'a');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'a');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 1], [4, 1]]);
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
    describe('type (space/TAB)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                'abcde\n'.repeat(5)
            );
        });
        it('should insert space characters', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: ' ' }],
                ['type', { text: ' ' }],
                ['type', { text: ' ' }]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '   ');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3]]);
        });
        it('should insert space characters (4TAB)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['edit', edit => {
                    edit.insert(textEditor.selections[0].active, '    ');
                }, [1, 4]]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '    ');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4]]);
        });
        it('should insert space characters (TAB)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                'tab'
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            let line = textEditor.document.lineAt(3).text;
            assert.strictEqual(Array.from(line).every(ch => ch === ' ' || ch === '\t'), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, line.length]]);
        });
        // TODO: add tests for cases with multi-cursor
        // TODO: add tests for cases with selections
        // TODO: add tests for inserting TAB into middle of a line
    });
    describe('type (Enter)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                'abc\n'.repeat(5) +
                'abcde\n'.repeat(5) +
                '    1234\n'.repeat(5)
            );
        });
        it('should insert a line break', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'ab');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'c');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);

            await resetCursor(6, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'abc');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'de');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0]]);
        });
        it('should insert line breaks', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                ['type', { text: '\n' }],
                ['type', { text: '\n' }],
                ['type', { text: '\n' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'ab');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'c');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0]]);

            await resetCursor(8, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'abc');
            assert.deepStrictEqual(textEditor.document.lineAt(11).text, 'de');
            assert.deepStrictEqual(selectionsAsArray(), [[11, 0]]);
        });
        it('should insert line breaks (with multi-cursor)', async () => {
            await selectRanges([[1, 1, 1, 1], [2, 1, 2, 1]]);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'bc');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'bc');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0], [4, 0]]);

            await selectRanges([[7, 3, 7, 3], [8, 3, 8, 3]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'de');
            assert.deepStrictEqual(textEditor.document.lineAt(10).text, 'de');
            assert.deepStrictEqual(selectionsAsArray(), [[8, 0], [10, 0]]);
        });
        it('should insert line breaks (with a selected range)', async () => {
            await selectRange(1, 1, 1, 2);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'a');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'c');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);

            await selectRange(7, 2, 7, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'ab');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'e');
            assert.deepStrictEqual(selectionsAsArray(), [[8, 0]]);
        });
        it('should insert line breaks (with selected ranges)', async () => {
            await selectRanges([[1, 1, 1, 2], [2, 1, 2, 2]]);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'a');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'c');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0], [4, 0]]);

            await selectRanges([[7, 2, 7, 4], [8, 2, 8, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'ab');
            assert.deepStrictEqual(textEditor.document.lineAt(10).text, 'e');
            assert.deepStrictEqual(selectionsAsArray(), [[8, 0], [10, 0]]);
        });
        it('should insert a line break and possible auto indent', async () => {
            await resetCursor(10, 8);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            const autoIndent = textEditor.document.lineAt(11).text === '    ';
            if (!autoIndent) {
                console.log('.. skipped tests for auto indent');
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[11, 4]]);

                await resetCursor(12, 8);
                await kb_macro.replay(textEditor);
                assert.strictEqual(mode.inSelection(), false);
                assert.deepStrictEqual(textEditor.document.lineAt(13).text, '    ');
                assert.deepStrictEqual(selectionsAsArray(), [[13, 4]]);
            }
        });
        it('should insert a line break and possible auto indent (multi-cursor)', async () => {
            await selectRanges([[10, 8, 10, 8], [11, 8, 11, 8]]);
            await recordThroughExecution([
                ['type', { text: '\n' }]
            ]);
            const autoIndent = textEditor.document.lineAt(11).text === '    ';
            if (!autoIndent) {
                console.log('.. skipped tests for auto indent');
            } else {
                assert.strictEqual(textEditor.document.lineAt(13).text, '    ');
                assert.deepStrictEqual(selectionsAsArray(), [[11, 4], [13, 4]]);

                await selectRanges([[14, 8, 14, 8], [15, 8, 15, 8]]);
                await kb_macro.replay(textEditor);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
                assert.deepStrictEqual(textEditor.document.lineAt(15).text, '    ');
                assert.deepStrictEqual(textEditor.document.lineAt(17).text, '    ');
                assert.deepStrictEqual(selectionsAsArray(), [[15, 4], [17, 4]]);
            }
        });
    });
    describe('type (Ctrl+N)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                'abc\n'.repeat(5) +
                'abcde\n'.repeat(5) +
                '    1234\n'.repeat(5)
            );
        });
        it('should insert a new line before the current line', async () => {
            await resetCursor(1, 2);
            await recordThroughExecution([
                'editor.action.insertLineBefore'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'abc');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);

            await resetCursor(6, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 0]]);
        });
        // TODO: add tests more
    });
    describe('type + code completion', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                '123 \n'.repeat(5)
            );
        });
        it('should insert some text (code completion)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'a' }],
                ['type', { text: 'b' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), 'abcde');
                }, [1, 5]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'abcde');

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
        it('should insert some text (code completion) (record with single-cusror, replay with multi-cursor)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'a' }],
                ['type', { text: 'b' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), 'abcde');
                }, [1, 5]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'abcde');

            await selectRanges([[5, 4, 5, 4], [6, 4, 6, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 abcde');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '123 abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9], [6, 9]]);
        });
        it('should insert some text (code completion) (record with multi-cursor, replay with single-cursor)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0]]);
            await recordThroughExecution([
                ['type', { text: 'a' }],
                ['type', { text: 'b' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), 'abcde');
                    edit.replace(new vscode.Selection(2, 0, 2, 2), 'abcde');
                }, [[1, 5, 1, 5], [2, 5, 2, 5]]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, 'abcde');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5], [2, 5]]);

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
    });
    describe('type + IME', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                '123 \n'.repeat(5)
            );
        });
        it('should insert some text (IME)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'あ' }],
                ['type', { text: 'い' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), '愛');
                }, [1, 1]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');

            await resetCursor(5, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);
        });
        it('should insert some text (IME) (record with single-cursor, replay with multi-cursor)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'あ' }],
                ['type', { text: 'い' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), '愛');
                }, [1, 1]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');

            await selectRanges([[5, 0, 5, 0], [6, 0, 6, 0]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '愛123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1], [6, 1]]);
        });
        it('should insert some text (IME) (record with multi-cursor, replay with single-cursor)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0]]);
            await recordThroughExecution([
                ['type', { text: 'あ' }],
                ['type', { text: 'い' }],
                ['edit', edit => {
                    edit.replace(new vscode.Selection(1, 0, 1, 2), '愛');
                    edit.replace(new vscode.Selection(2, 0, 2, 2), '愛');
                }, [[1, 1, 1, 1], [2, 1, 2, 1]]]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '愛');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 1], [2, 1]]);

            await resetCursor(5, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);
        });
    });
    describe('type + bracket completion', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                '123 \n'.repeat(5)
            );
        });
        it('should insert some text and locate cursor some where (bracket completion)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 1]]);

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should insert some text and locate cursor some where (bracket completion) (rec single, replay multi)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 1]]);

            await selectRanges([[5, 4, 5, 4], [6, 4, 6, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5], [6, 5]]);
        });
        it('should insert some text and locate cursor some where (bracket completion) (rec multi, replay single)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0]]);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 1], [2, 1]]);

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should just move cursor forward when typing a closing bracket explicitly', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: '(' }], // => '(|)'
                ['type', { text: ')' }]  // => '()|'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should just move cursor forward when typing a closing bracket explicitly (rec single, replay multi)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: '(' }], // => '(|)'
                ['type', { text: ')' }]  // => '()|'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);

            await selectRanges([[5, 4, 5, 4], [6, 4, 6, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6], [6, 6]]);
        });
        it('should just move cursor forward when typing a closing bracket explicitly (rec multi, replay single)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0]]);
            await recordThroughExecution([
                ['type', { text: '(' }], // => '(|)'
                ['type', { text: ')' }]  // => '()|'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '()');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '()');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2], [2, 2]]);

            await resetCursor(5, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '123 ()');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should insert just an opening bracket (no bracket completion)', async () => {
            await resetCursor(5, 0);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '(123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);

            await resetCursor(2, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '(');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 1]]);
        });
        it('should insert just an opening bracket (no bracket completion) (rec single, replay multi)', async () => {
            await resetCursor(5, 0);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '(123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);

            await selectRanges([[2, 0, 2, 0], [3, 0, 3, 0]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '(');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '(');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 1], [3, 1]]);
        });
        it('should insert just an opening bracket (no bracket completion) (rec multi, replay single)', async () => {
            await selectRanges([[5, 0, 5, 0], [6, 0, 6, 0]]);
            await recordThroughExecution([
                ['type', { text: '(' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '(123 ');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '(123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1], [6, 1]]);

            await resetCursor(2, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '(');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 1]]);
        });
    });
    describe('type + cursor', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '\n'.repeat(5) +
                'abcde\n'.repeat(5)
            );
        });
        it('should write some text (type + curosr...)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'B' }],
                'vz.cursorLeft',
                ['type', { text: 'A' }],
                'vz.cursorDown',
                ['type', { text: 'C' }]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, 'AB');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'C');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 1]]);
        });
        it('should write some text (type + selection...)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                ['type', { text: 'A' }],
                ['type', { text: 'B' }],
                'vz.cursorLineStartSelect',
                ['type', { text: 'C' }]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, 'C');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 1]]);
        });
        it('should write some text (type + box-selection...)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                'vz.toggleBoxSelection',
                'vz.cursorDown',
                'vz.cursorDown',
                ['type', { text: '1' }],
                ['type', { text: '2' }]
            ]);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'abcde12');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'abcde12');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'abcde12');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 7], [6, 7], [7, 7]]);
        });
        it('should write some text (type + box-selection... / bottom to top)', async () => {
            await resetCursor(2, 0);
            await recordThroughExecution([
                'vz.toggleBoxSelection',
                'vz.cursorUp',
                'vz.cursorUp',
                ['type', { text: '1' }],
                ['type', { text: '2' }]
            ]);

            await resetCursor(8, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'abc12de');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'abc12de');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'abc12de');
            assert.deepStrictEqual(selectionsAsArray(), [[8, 5], [7, 5], [6, 5]]);
        });
    });
});
