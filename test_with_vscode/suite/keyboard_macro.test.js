"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const keyboard_macro = require("./../../src/keyboard_macro.js");
const edit_commands = require("./../../src/edit_commands.js");
const cursor_commands = require("./../../src/cursor_commands.js");
const EditUtil = require("./../../src/edit_util.js");


describe('KeyboardMacro', () => {
    const mode = mode_handler.getInstance();
    const kb_macro = keyboard_macro.getInstance();
    const editHandler = edit_commands.getInstance();
    const cursorHandler = cursor_commands.getInstance();

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
    const assertDocumentLineCount = async function(expected) {
        // FIXME: This waiting loop should not be needed.
        // if (textEditor.document.lineCount !== expected) {
            // console.log('*** debug: Expected document lineCount change has not yet happened');
        // }
        // for (let i = 0; i < 10 && textEditor.document.lineCount !== expected; i++) {
            // await sleep(5);
        // }
        assert.strictEqual(textEditor.document.lineCount, expected);
    };
    const recordThroughExecution = async function(commands) {
        kb_macro.startRecording(textEditor);
        for (let i = 0; i < commands.length; i++) {
            let cmd = commands[i];
            if (typeof cmd === 'string') {
                await vscode.commands.executeCommand(cmd);
                await sleep(30);
                await editHandler.waitForEndOfGuardedCommand();
            } else if (cmd[0] === 'edit') {
                mode.expectSync();
                await textEditor.edit(cmd[1]);
                for (let i = 0; i < 10 && !mode.synchronized(); i++) {
                    await sleep(5);
                }
                mode.sync(textEditor);
                let newSelections;
                if (typeof cmd[2][0] == 'number') {
                    newSelections = [
                        new vscode.Selection(cmd[2][0], cmd[2][1], cmd[2][0], cmd[2][1])
                    ];
                } else {
                    newSelections = cmd[2].map(
                        r => new vscode.Selection(r[0], r[1], r[2], r[3])
                    );
                }
                if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
                    mode.expectSync();
                    textEditor.selections = newSelections;
                }
            } else {
                await vscode.commands.executeCommand(cmd[0], cmd[1]);
                await sleep(30);
                await editHandler.waitForEndOfGuardedCommand();
            }
            for (let j = 0; j < 10 && !mode.synchronized(); j++) {
                await sleep(10);
            }
            mode.sync(textEditor);
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
            const commands = ['vz.cursorRight'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should move cursor (multiple commands)', async () => {
            await resetCursor(3, 3);
            const commands = [
                'vz.cursorUp',
                'vz.cursorLeft',
                'vz.cursorLeft',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.cursorRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 4]]);
        });
        it('should move cursor to left/right word', async () => {
            await resetCursor(3, 3);
            const commands = [
                'vz.cursorWordStartLeft',
                'vz.cursorWordStartRight',
                'vz.cursorWordStartRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 9]]);
        });
        it('should move cursor to start/end of a logical line', async () => {
            await resetCursor(3, 3);
            const commands = ['vz.cursorLineStart'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to start/end of a wrapped line', async () => {
            await resetCursor(3, 3);
            const commands = ['vz.cursorHome'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should move cursor to top/bottom of a document', async () => {
            await resetCursor(3, 3);
            const commands = ['vz.cursorTop'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should make selection range while moving cursor (*arrow-select)', async () => {
            await resetCursor(3, 3);
            const commands = [
                'vz.cursorLeftSelect',
                'vz.cursorDownSelect',
                'vz.cursorDownSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 7, 4]]);
        });
        it('should make selection range while moving cursor (home/end)', async () => {
            await resetCursor(3, 3);
            const commands = [
                'vz.cursorHomeSelect',
                'vz.cursorEndSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
        it('should move cursor (view-top/bottom)', async () => {
            await resetCursor(0, 3);
            const commands = [
                'vz.cursorViewTop'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
        });
        it('should make selection range while moving cursor (line-start/end-select)', async () => {
            await resetCursor(3, 3);
            const commands = [
                'vz.cursorLineStartSelect',
                'vz.cursorLineEndSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(3, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4, 3, 13]]);
        });
    });
    describe('cursor (special cases)', () => {
        before(async () => {
            await testUtils.resetDocument(
                textEditor,
                '123\n' +
                '123456\n' +
                '    ABCD\n' +
                'ABCD\n' +
                'ABCD' // no new line
            );
        });
        it('should do nothing (cannot move cursor left)', async () => {
            await resetCursor(1, 1);
            const commands = ['vz.cursorLeft'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(0, 0);
            await kb_macro.replay(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
        });
        it('should move to the end of the previous line', async () => {
            await resetCursor(1, 1);
            const commands = ['vz.cursorLeft'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(1, 0);
            await kb_macro.replay(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 3]]);
        });
        it('should no nothing (cannot move cursor to start/end of a logical line)', async () => {
            await resetCursor(1, 4);
            const commands = ['vz.cursorLineStart'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
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
            const commands = [
                'vz.scrollLineDown',
                'vz.scrollLineUp',
                'vz.scrollLineUp'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(7, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4]]);
        });
        it('should stop selection mode and move cursor one line up/down with scroll', async () => {
            await selectRange(5, 1, 5, 7);
            const commands = [
                'vz.scrollLineDownUnselect',
                'vz.scrollLineUpUnselect',
                'vz.scrollLineUpUnselect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = ['vz.toggleSelection'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            await selectRange(1, 1, 1, 3);
            const commands = ['vz.toggleSelection'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode', async () => {
            await selectRanges([[1, 1, 1, 4], [2, 1, 2, 4]]);
            const commands = ['vz.toggleSelection'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([[5, 5, 5, 6], [6, 5, 6, 6]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode (multi-cursor)', async () => {
            await selectRanges([[1, 1, 1, 1], [2, 1, 2, 1]]);
            const commands = ['vz.toggleSelection'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([[5, 5, 5, 5], [6, 5, 6, 5]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should start then cancel selection mode', async () => {
            await resetCursor(1, 1);
            const commands = ['vz.toggleSelection', 'vz.toggleSelection']
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.cursorRight',
                'vz.cursorRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 8]]);
        });
        it('should make a selection range (toggle -> word-start-right)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorWordStartRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 9]]);
        });
        it('should make a selection range (toggle -> line-start)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> home)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorHome'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> top)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorTop'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 0, 0]]);
        });
        it('should make a selection range (toggle -> left-select)', async () => {
            await resetCursor(0, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLeftSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 4]]);
        });
        it('should make a selection range (toggle -> home-select)', async () => {
            await resetCursor(0, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 5, 0]]);
        });
        it('should make a selection range (toggle -> view-top)', async () => {
            await resetCursor(1, 2);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorViewTop'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 0, 5]]);
        });
        it('should make a selection range (toggle -> line-start-select)', async () => {
            await resetCursor(1, 2);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLineStartSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.toggleSelection',
                'vz.scrollLineUp'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5, 4, 5]]);
        });
        it('should start and stop selection mode (toggle -> scroll-line-up-unselect)', async () => {
            await resetCursor(1, 2);
            const commands = [
                'vz.toggleSelection',
                'vz.scrollLineUpUnselect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.cursorDown',
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.cursorRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5, 6, 7]]);
        });
        it('should make a selection range (word-start-left -> toggle -> word-start-right)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorWordStartLeft',
                'vz.toggleSelection',
                'vz.cursorWordStartRight'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 2, 5, 5]]);
        });
        it('should make a selection range (line-end -> toggle -> line-start)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorLineEnd',
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (end -> toggle -> home)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorEnd',
                'vz.toggleSelection',
                'vz.cursorHome'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (top -> toggle -> bottom)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorTop',
                'vz.toggleSelection',
                'vz.cursorBottom'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0, 10, 0]]);
        });
        it('should make a selection range (right-select -> toggle -> left-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorRightSelect',
                'vz.toggleSelection',
                'vz.cursorLeftSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6, 5, 5]]);
        });
        it('should make a selection range (end-select -> toggle -> home-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorEndSelect',
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make a selection range (view-top -> toggle -> view-bottom)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorViewTop',
                'vz.toggleSelection',
                'vz.cursorViewBottom'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5, 10, 0]]);
        });
        it('should make a selection range (line-start-select -> toggle -> line-end-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.cursorLineStartSelect',
                'vz.toggleSelection',
                'vz.cursorLineEndSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.scrollLineUp',
                'vz.toggleSelection',
                'vz.scrollLineDown'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 5, 5, 5]]);
        });
        it('should start and stop selection mode (scroll-line-up-unselect -> toggle -> scroll-line-down-unselect)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.scrollLineUpUnselect',
                'vz.toggleSelection',
                'vz.scrollLineDownUnselect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.toggleSelection',
                'vz.cursorRight',
                'vz.toggleSelection',
                'vz.cursorDown'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 6]]);
        });
        it('should make a selection range and cancel it then move cursor (word-start-left/right)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorWordStartRight',
                'vz.toggleSelection',
                'vz.cursorWordStartLeft'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should make a selection range and cancel it then move cursor (line-start/end)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLineEnd',
                'vz.toggleSelection',
                'vz.cursorLineStart'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (home/end)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorEnd',
                'vz.toggleSelection',
                'vz.cursorHome'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
        });
        it('should make a selection range and cancel it then move cursor (top/bottom)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorTop',
                'vz.toggleSelection',
                'vz.cursorBottom'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should make and cancel a selection range then make another one (left/right-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLeftSelect',
                'vz.toggleSelection',
                'vz.cursorRightSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4, 5, 5]]);
        });
        it('should make and cancel a selection range then make another one (home/end-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorEndSelect',
                'vz.toggleSelection',
                'vz.cursorHomeSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 13, 5, 0]]);
        });
        it('should make and cancel a selection range then move cursor (view-top/bottom)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorViewTop',
                'vz.toggleSelection',
                'vz.cursorViewBottom'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[10, 0]]);
        });
        it('should make and cancel a selection range then make another one (line-start/end-select)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.cursorLineStartSelect',
                'vz.toggleSelection',
                'vz.cursorLineEndSelect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.toggleSelection',
                'vz.scrollLineUp',
                'vz.toggleSelection',
                'vz.scrollLineDown',
                'vz.scrollLineDown'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5]]);
        });
        it('should start and stop selection mode twice and move cursor (scroll-line-up/down-unselect)', async () => {
            await resetCursor(1, 1);
            const commands = [
                'vz.toggleSelection',
                'vz.scrollLineUpUnselect',
                'vz.toggleSelection',
                'vz.scrollLineDownUnselect',
                'vz.scrollLineDownUnselect'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.toggleBoxSelection']);

            await resetCursor(5, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5]]);
        });
        it('should cancel selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.toggleBoxSelection']);

            await selectRange(5, 5, 5, 6);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should cancel box selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.toggleBoxSelection']);

            await selectRanges([[5, 5, 5, 6], [6, 5, 6, 6]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 6]]);
        });
        it('should start then cancel box selection mode', async () => {
            await recordThroughExecution(['vz.toggleBoxSelection', 'vz.toggleBoxSelection']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.toggleBoxSelection', 'vz.toggleBoxSelection'
            ]);

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
            const commands = [
                'vz.toggleBoxSelection',
                'vz.cursorRight',
                'vz.cursorDown',
                'vz.cursorDown'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.stopBoxSelection']);

            await selectRanges([[5, 5, 5, 8], [6, 5, 6, 8]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 8], [6, 8]]);
        });
        it('should cancel multi-cursor', async () => {
            await selectRanges([[1, 4, 1, 4], [2, 4, 2, 4]]);
            await recordThroughExecution(['vz.stopBoxSelection']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.stopBoxSelection']);

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
            const commands = [
                'vz.toggleBoxSelection',
                'vz.cursorRight',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.stopBoxSelection'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(4, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 6], [5, 6], [6, 6]]);
        });
        it('should cancel multi-cursor', async () => {
            await resetCursor(1, 2);
            const commands = [
                'vz.toggleBoxSelection',
                'vz.cursorDown',
                'vz.cursorDown',
                'vz.stopBoxSelection'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

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
            const commands = [
                'vz.reverseSelection'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(2, 0, 6, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4, 2, 0]]);
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
            const commands = [
                'vz.jumpToBracket'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);

            await kb_macro.replay(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
            await kb_macro.replay(textEditor);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
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
            const commands = ['vz.markPosition'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(8, 2);
            await kb_macro.replay(textEditor);
            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.notStrictEqual(pos, null);
            assert.strictEqual(pos.isEqual(new vscode.Position(8, 2)), true);
        });
        it('should move marked position if some text inserted before it', async () => {
            await resetCursor(3, 7);
            await recordThroughExecution([
                'vz.markPosition',
                'vz.cursorUp',
                ['type', { text: 'a' }],
                ['type', { text: '\n' }],
                ['type', { text: 'b' }],
                ['type', { text: '\n' }]
            ]);
            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 5);
            assert.strictEqual(pos.character, 7);

            await resetCursor(7, 7);
            await kb_macro.replay(textEditor);

            pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 9);
            assert.strictEqual(pos.character, 7);
        });
        it('should move marked position if some text deleted at before it', async () => {
            await resetCursor(6, 1);
            await recordThroughExecution([
                'vz.markPosition',
                'vz.cursorUp',
                'vz.toggleSelection',
                'vz.cursorUp',
                'vz.deleteRight'
            ]);
            await sleep(30);
            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 5);
            assert.strictEqual(pos.character, 1);

            await resetCursor(8, 1);
            await kb_macro.replay(textEditor);

            await sleep(30);
            pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 7);
            assert.strictEqual(pos.character, 1);
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
        it('should move cursor to marked position', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(4, 5));
            await resetCursor(3, 7);
            await recordThroughExecution(['vz.cursorLastPosition']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.cursorLastPosition']);

            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(6, 2));
            await resetCursor(8, 3);
            await kb_macro.replay(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 8);
            assert.strictEqual(pos.character, 3);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 2]]);
        });
        it('should return to current position (jump twice)', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(4, 5));
            await resetCursor(3, 7);
            const commands = ['vz.cursorLastPosition', 'vz.cursorLastPosition'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(6, 2));
            await resetCursor(8, 3);
            await kb_macro.replay(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 6);
            assert.strictEqual(pos.character, 2);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 3]]);
        });
        it('should work if current selection range is not empty', async () => {
            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(7, 9));
            await selectRange(2, 3, 4, 8);
            await recordThroughExecution(['vz.cursorLastPosition']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.cursorLastPosition']);

            cursorHandler.setMarkedPosition(textEditor, new vscode.Position(8, 5));
            await selectRange(1, 2, 3, 7);
            await kb_macro.replay(textEditor);

            let pos = cursorHandler.getMarkedPosition(textEditor);
            assert.strictEqual(pos.line, 3);
            assert.strictEqual(pos.character, 7);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2, 8, 5]]);
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
        it('should insert space characters (4TAB by edit)', async () => {
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
        it('should insert space characters at middle of a line (4TAB by edit)', async () => {
            await resetCursor(6, 4);
            await recordThroughExecution([
                ['edit', edit => {
                    edit.insert(textEditor.selections[0].active, '    ');
                }, [6, 8]]
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '    ');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 4]]);
        });
        it('should insert space characters (TAB by command)', async () => {
            await resetCursor(1, 0);
            await recordThroughExecution([
                'tab'
            ]);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            let line = textEditor.document.lineAt(3).text;
            assert.strictEqual(0 < line.length, true);
            assert.strictEqual(Array.from(line).every(ch => ch === ' ' || ch === '\t'), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, line.length]]);
        });
        it('should insert space characters at middle of a line (TAB by command)', async () => {
            await resetCursor(6, 2);
            await recordThroughExecution([
                'tab'
            ]);

            await resetCursor(8, 2);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            let line = textEditor.document.lineAt(8).text;
            assert.strictEqual(5 < line.length, true);
            assert.strictEqual(Array.from(line.slice(2, -3)).every(ch => ch === ' ' || ch === '\t'), true);
            assert.deepStrictEqual(selectionsAsArray(), [[8, line.length - 3]]);
        });
        it('should insert space characters (multi-cursor)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0], [3, 0, 3, 0]]);
            await recordThroughExecution([
                ['type', { text: ' ' }],
                ['type', { text: ' ' }],
                ['type', { text: ' ' }]
            ]);

            await selectRanges([[4, 0, 4, 0], [5, 2, 5, 2], [6, 2, 6, 2]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, '   ');
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'ab   cde');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'ab   cde');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 3], [5, 5], [6, 5]]);
        });
        it('should insert space characters (multi-cursor; 4TAB by edit)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0], [3, 0, 3, 0]]);
            await recordThroughExecution([
                ['edit', edit => {
                    textEditor.selections.forEach(sel => edit.insert(sel.active, '    '));
                }, [[1, 4, 1, 4], [2, 4, 2, 4], [3, 4, 3, 4]]]
            ]);

            await selectRanges([[4, 0, 4, 0], [5, 4, 5, 4], [6, 4, 6, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, '    ');
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'abcd    e');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'abcd    e');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 4], [5, 8], [6, 8]]);
        });
        it('should insert space characters (multi-cursor; TAB by command)', async () => {
            await selectRanges([[1, 0, 1, 0], [2, 0, 2, 0], [3, 0, 3, 0]]);
            await recordThroughExecution([
                'tab'
            ]);

            await selectRanges([[4, 0, 4, 0], [5, 4, 5, 4], [6, 4, 6, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            let line4 = textEditor.document.lineAt(4).text;
            let line5 = textEditor.document.lineAt(5).text;
            let line6 = textEditor.document.lineAt(6).text;
            assert.strictEqual(0 < line4.length, true);
            assert.strictEqual(5 < line5.length, true);
            assert.strictEqual(5 < line6.length, true);
            assert.strictEqual(Array.from(line4).every(ch => ch === ' ' || ch === '\t'), true);
            assert.strictEqual(Array.from(line5.slice(4, -1)).every(ch => ch === ' ' || ch === '\t'), true);
            assert.strictEqual(Array.from(line6.slice(4, -1)).every(ch => ch === ' ' || ch === '\t'), true);
            assert.deepStrictEqual(selectionsAsArray(), [
                [4, line4.length],
                [5, line5.length - 1],
                [6, line6.length - 1]
            ]);
        });
        it('should replace selected range with a space character', async () => {
            await selectRange(5, 2, 5, 4);
            await recordThroughExecution([
                ['type', { text: ' ' }]
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'ab e');

            await selectRange(6, 1, 6, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'a e');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 2]]);
        });
        it('should replace selected range with space characters (4TAB by edit)', async () => {
            await selectRange(5, 0, 5, 2);
            await recordThroughExecution([
                ['edit', edit => {
                    edit.replace(textEditor.selections[0], '    ');
                }, [5, 4]]
            ]);

            await selectRange(6, 4, 6, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'abcd    ');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 8]]);
        });
        it('should replace selected range with space characters (TAB by command)', async () => {
            await selectRange(5, 2, 5, 4);
            await recordThroughExecution([
                'tab'
            ]);

            await selectRange(6, 2, 6, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            let line = textEditor.document.lineAt(6).text;
            assert.strictEqual(3 < line.length, true);
            assert.strictEqual(Array.from(line.slice(2, -1)).every(ch => ch === ' ' || ch === '\t'), true);
            assert.deepStrictEqual(selectionsAsArray(), [[6, line.length - 1]]);
        });
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
        it('should insert a line break with possible auto indent', async () => {
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
        it('should insert a line break with possible auto indent (multi-cursor)', async () => {
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
    describe('insertLineBefore', () => {
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
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
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
        it('should insert new lines before the current line', async () => {
            await resetCursor(1, 2);
            const commands = [
                'vz.insertLineBefore',
                'vz.insertLineBefore',
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'abc');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);

            await resetCursor(8, 3);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(9).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(10).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(11).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[8, 0]]);
        });
        it('should insert new lines before each line of multi-cursor', async () => {
            await selectRanges([[1, 2, 1, 2], [2, 2, 2, 2]]);
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'abc');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'abc');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0], [3, 0]]);

            await selectRanges([[7, 2, 7, 2], [8, 2, 8, 2]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0], [9, 0]]);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'abcde');
            assert.deepStrictEqual(textEditor.document.lineAt(9).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(10).text, 'abcde');
        });
        it('should insert a new line before the line of cursor (with selection range)', async () => {
            await selectRange(6, 2, 6, 4);
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 0]]);

            await selectRange(8, 2, 8, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[8, 0]]);
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(9).text, 'abcde');
        });
        it('should insert new lines before each line of cursor (with selection ranges)', async () => {
            await selectRanges([[6, 2, 6, 4], [7, 2, 7, 4]]);
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'abcde');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(9).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 0], [8, 0]]);

            await selectRanges([[1, 0, 1, 2], [2, 0, 2, 2]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0], [3, 0]]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, 'abc');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(4).text, 'abc');
        });
        it('should insert a new line with possible auto indent', async () => {
            await resetCursor(11, 6);
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            const autoIndent = textEditor.document.lineAt(11).text === '    ';
            if (!autoIndent) {
                console.log('.. skipped tests for auto indent');
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[11, 4]]);

                await resetCursor(13, 3);
                await kb_macro.replay(textEditor);
                assert.strictEqual(mode.inSelection(), false);
                assert.deepStrictEqual(textEditor.document.lineAt(13).text, '    ');
                assert.deepStrictEqual(textEditor.document.lineAt(14).text, '    1234');
                assert.deepStrictEqual(selectionsAsArray(), [[13, 4]]);
            }
        });
        it('should insert new lines with possible auto indent (multi-cursor)', async () => {
            await selectRanges([[11, 3, 11, 3], [12, 4, 12, 4]]);
            const commands = [
                'vz.insertLineBefore'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            const autoIndent = textEditor.document.lineAt(11).text === '    ';
            if (!autoIndent) {
                console.log('.. skipped tests for auto indent');
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[11, 4], [13, 4]]);

                await selectRanges([[14, 6, 14, 6], [15, 4, 15, 4]]);
                await kb_macro.replay(textEditor);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
                assert.deepStrictEqual(textEditor.document.lineAt(14).text, '    ');
                assert.deepStrictEqual(textEditor.document.lineAt(15).text, '    1234');
                assert.deepStrictEqual(textEditor.document.lineAt(16).text, '    ');
                assert.deepStrictEqual(textEditor.document.lineAt(17).text, '    1234');
                assert.deepStrictEqual(selectionsAsArray(), [[14, 4], [16, 4]]);
            }
        });
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
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
            mode.initialize(textEditor);
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');
            await sleep(60);

            await resetCursor(5, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            await sleep(60);
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');
            await sleep(60);

            await selectRanges([[5, 0, 5, 0], [6, 0, 6, 0]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1], [6, 1]]);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, '愛123 ');
            await sleep(60);
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
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                '<insert-uniform-text>',
                '<insert-uniform-text>',
                '<insert-uniform-text>'
            ]);
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '愛');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '愛');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 1], [2, 1]]);
            await sleep(60);

            await resetCursor(5, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, '愛123 ');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 1]]);
            await sleep(60);
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
    describe('clipboardCutAndPush', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
        });
        it('should delete selected part of document', async () => {
            await selectRange(2, 3, 3, 1);
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(0, 3, 1, 7);
            await assertDocumentLineCount(6);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(5);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123890');
            assert.deepStrictEqual(selectionsAsArray(), [[0, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            await selectRange(0, 3, 1, 7);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardCutAndPush');
            let p2 = vscode.commands.executeCommand('vz.clipboardCutAndPush');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardCutAndPush'
            ]);

            await selectRange(1, 3, 2, 2);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(5);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'de\nfg');
        });
        it('should delete an entire line when selection is empty', async () => {
            await resetCursor(2, 3);
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(6);

            await resetCursor(4, 2);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(5);
            assert.strictEqual(textEditor.document.lineAt(4).text, '67890');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '12345\n');
        });
        it('should delete the line but leave empty line there when in box-selection mode', async () => {
            await selectRanges([[0, 3, 0, 3]]); // box-selection mode
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await selectRanges([[2, 3, 2, 3]]); // box-selection mode
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(2).text, '');
            if (selectionsAsArray()[0][1] === 0) {
                assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
            }
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde');
        });
        it('should delete multiple selection ranges when in box-selection mode', async () => {
            await selectRanges([
                [3, 1, 3, 4],
                [4, 0, 4, 0],
                [5, 1, 5, 4]
            ]);
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([
                [1, 2, 1, 5],
                [2, 2, 2, 5],
                [3, 2, 3, 2]
            ]);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(1).text, '1267890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'ab');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fj');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '345\ncde\n\n');
        });
        it('should delete multiple lines and leave empty line there when in box-selection mode', async () => {
            await selectRanges([
                [3, 2, 3, 2],
                [4, 0, 4, 0],
                [5, 2, 5, 2]
            ]);
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([
                [1, 2, 1, 2],
                [2, 2, 2, 2],
                [3, 0, 3, 0]
            ]);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(1).text, '');
            assert.strictEqual(textEditor.document.lineAt(2).text, '');
            assert.strictEqual(textEditor.document.lineAt(3).text, '');
            if (selectionsAsArray()[0][1] === 0) {
                assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);
            }
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '1234567890\nabcde\n\n');
        });
        it('should reveal the cursor after a cut even if it is a long range', async () => {
            await textEditor.edit((edit) => {
                edit.insert(
                    new vscode.Position(4, 0),
                    Array(100).fill('xxxxxyyyyyzzzzz').join('\n') + '\n'
                );
            });
            await selectRange(4, 0, 104, 0);
            textEditor.revealRange(new vscode.Range(104, 0, 104, 0), vscode.TextEditorRevealType.Default);
            while (await sleep(1), !EditUtil.enumVisibleLines(textEditor).includes(104)) {}
            await assertDocumentLineCount(107);
            const commands = ['vz.clipboardCutAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await textEditor.edit((edit) => {
                edit.insert(
                    new vscode.Position(3, 0),
                    Array(100).fill('xxxxxyyyyyzzzzz').join('\n') + '\n'
                );
            });
            await selectRange(3, 0, 103, 0);
            textEditor.revealRange(new vscode.Range(103, 0, 103, 0), vscode.TextEditorRevealType.Default);
            while (await sleep(1), !EditUtil.enumVisibleLines(textEditor).includes(103)) {}
            await assertDocumentLineCount(107);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
            assert.strictEqual(EditUtil.enumVisibleLines(textEditor).includes(3), true);
        });
    });
    describe('clipboardCut', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
        });
        it('should delete selected part of document', async () => {
            await selectRange(2, 3, 3, 1);
            const commands = ['vz.clipboardCut'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(0, 3, 1, 7);
            await assertDocumentLineCount(6);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(5);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123890');
            assert.deepStrictEqual(selectionsAsArray(), [[0, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            await selectRange(0, 3, 1, 7);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardCut');
            let p2 = vscode.commands.executeCommand('vz.clipboardCut');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardCut'
            ]);

            await selectRange(1, 3, 2, 2);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(5);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'de\nfg');
        });
    });
    describe('clipboardCopyAndPush', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
        });
        it('should copy selected part of document', async () => {
            await selectRange(2, 3, 3, 1);
            const commands = ['vz.clipboardCopyAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(0, 3, 1, 7);
            await assertDocumentLineCount(7);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            await selectRange(0, 3, 1, 7);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardCopyAndPush');
            let p2 = vscode.commands.executeCommand('vz.clipboardCopyAndPush');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardCopyAndPush'
            ]);

            await selectRange(2, 3, 3, 2);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'de\nfg');
        });
        it('should copy an entire line when selection is empty', async () => {
            await resetCursor(2, 3);
            const commands = ['vz.clipboardCopyAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await resetCursor(3, 3);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'fghij\n');
        });
        it('should copy the line when in box-selection mode', async () => {
            await selectRanges([[0, 3, 0, 3]]); // box-selection mode
            const commands = ['vz.clipboardCopyAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await selectRanges([[2, 3, 2, 3]]); // box-selection mode
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde');
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            await selectRanges([
                [3, 1, 3, 4],
                [4, 0, 4, 0],
                [5, 1, 5, 4]
            ]);
            const commands = ['vz.clipboardCopyAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await selectRanges([
                [1, 2, 1, 7],
                [2, 2, 2, 5],
                [3, 2, 3, 5]
            ]);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '34567\ncde\nhij\n');
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            await selectRanges([
                [3, 2, 3, 2],
                [4, 0, 4, 0],
                [5, 2, 5, 2]
            ]);
            const commands = ['vz.clipboardCopyAndPush'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(7);

            await selectRanges([
                [1, 7, 1, 7],
                [2, 5, 2, 5],
                [3, 5, 3, 5]
            ]);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '1234567890\nabcde\nfghij\n');
        });
    });
    describe('clipboardCopy', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
        });
        it('should copy selected part of document', async () => {
            await selectRange(2, 3, 3, 1);
            const commands = ['vz.clipboardCopy'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(0, 3, 1, 7);
            await assertDocumentLineCount(7);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            await selectRange(0, 3, 1, 7);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardCopy');
            let p2 = vscode.commands.executeCommand('vz.clipboardCopy');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardCopy'
            ]);

            await selectRange(2, 3, 3, 2);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'de\nfg');
        });
    });
    describe('clipboardPopAndPaste', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should pop a text from the text stack and paste it', async () => {
            await selectRange(2, 1, 2, 4);
            const commands = ['vz.clipboardCutAndPush', 'vz.cursorRight', 'vz.clipboardPopAndPaste'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(1, 1, 1, 9);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1023456789');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 10]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should prevent reentry', async () => {
            await resetCursor(1, 1);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardPopAndPaste');
            let p2 = vscode.commands.executeCommand('vz.clipboardPopAndPaste');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardPopAndPaste'
            ]);

            await resetCursor(1, 1);
            await assertDocumentLineCount(7);
            await editHandler.clipboardCutAndPush(textEditor);
            await editHandler.clipboardCutAndPush(textEditor);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(6);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
        });
        it('should paste a single text into each position of multiple cursors', async () => {
            await selectRange(5, 0, 5, 5);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.toggleBoxSelection',
                'vz.cursorDown',
                'vz.clipboardPopAndPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(1, 0, 1, 5);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890');
            assert.strictEqual(textEditor.document.lineAt(2).text, '12345abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5], [2, 5]]);
        });
        it('should insert a single line if the text is from line mode cut or copy', async () => {
            await resetCursor(3, 2);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.cursorUp',
                'vz.clipboardPopAndPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(5, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(4).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(5).text, '');
            assert.strictEqual(textEditor.document.lineAt(6).text, '67890');
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0]]);
        });
        it('should insert multiple lines that are from multiple cuts', async () => {
            await resetCursor(2, 2);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.clipboardCutAndPush',
                'vz.clipboardCutAndPush',
                'vz.clipboardPopAndPaste',
                'vz.clipboardPopAndPaste',
                'vz.clipboardPopAndPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(3, 2);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
            assert.strictEqual(textEditor.document.lineAt(5).text, '12345');
            if (selectionsAsArray()[0][1] === 0) {
                assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
            } else {
                assert.deepStrictEqual(selectionsAsArray(), [[3, 2]]);
            }
        });
        it('should insert multiple lines of inline text into at multiple cursors', async () => {
            await selectRanges([
                [2, 0, 2, 3],
                [3, 0, 3, 3]
            ]);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.cursorRight',
                'vz.cursorRight',
                'vz.toggleBoxSelection',
                'vz.cursorDown',
                'vz.clipboardPopAndPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([
                [1, 2, 1, 5],
                [2, 2, 2, 5]
            ]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1267345890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'de  abc');
            // assert.deepStrictEqual(selectionsAsArray(), [[1, 7], [2, 5]]);
        });
        it('should insert multiple lines of inline text into lines below the cursor', async () => {
            await selectRanges([
                [2, 0, 2, 3],
                [3, 0, 3, 3]
            ]);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.cursorRight',
                'vz.cursorRight',
                'vz.clipboardPopAndPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([
                [1, 2, 1, 5],
                [2, 2, 2, 5]
            ]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1267345890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'de  abc');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
        });
    });
    describe('clipboardPaste', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should retain the text stack', async () => {
            await selectRange(2, 1, 2, 4);
            const commands = ['vz.clipboardCutAndPush', 'vz.cursorRight', 'vz.clipboardPaste'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRange(1, 1, 1, 9);
            await kb_macro.replay(textEditor);
            assert.strictEqual(await vscode.env.clipboard.readText(), '23456789');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1023456789');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 10]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should prevent reentry', async () => {
            await resetCursor(1, 1);
            kb_macro.startRecording(textEditor);
            let p1 = vscode.commands.executeCommand('vz.clipboardPaste');
            let p2 = vscode.commands.executeCommand('vz.clipboardPaste');
            await p1;
            await p2;
            await editHandler.waitForEndOfGuardedCommand();
            kb_macro.finishRecording();
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [
                'vz.clipboardPaste'
            ]);

            await resetCursor(1, 1);
            await assertDocumentLineCount(7);
            await editHandler.clipboardCutAndPush(textEditor);
            await editHandler.clipboardCutAndPush(textEditor);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(6);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(7);
        });
        it('should repeat inserting a single line', async () => {
            await resetCursor(3, 2);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.cursorUp',
                'vz.clipboardPaste',
                'vz.clipboardPaste',
                'vz.clipboardPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
            await assertDocumentLineCount(9);

            await resetCursor(7, 0);
            await kb_macro.replay(textEditor);
            await assertDocumentLineCount(11);
            assert.strictEqual(textEditor.document.lineAt(6).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(7).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(8).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(9).text, '');
            assert.strictEqual(textEditor.document.lineAt(10).text, '67890');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 0]]);
        });
        it('should repeat inserting multiple lines of inline text (paste)', async () => {
            await selectRanges([
                [2, 0, 2, 3],
                [3, 0, 3, 3]
            ]);
            const commands = [
                'vz.clipboardCutAndPush',
                'vz.clipboardPaste',
                'vz.clipboardPaste',
                'vz.clipboardPaste'
            ];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await selectRanges([
                [5, 1, 5, 4],
                [6, 1, 6, 4]
            ]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, '12342342345');
            assert.strictEqual(textEditor.document.lineAt(6).text, '67897897890');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 10]]);
        });
    });
    describe('clearStack', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
        });
        it('should clear text stack and clipboard', async () => {
            const commands = ['vz.clipboardClearStack'];
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);

            await resetCursor(1, 1);
            await editHandler.clipboardCutAndPush(textEditor);
            await editHandler.clipboardCutAndPush(textEditor);
            await assertDocumentLineCount(5);

            await kb_macro.replay(textEditor);

            assert.strictEqual(editHandler.getTextStackLength(), 0);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '');

            await editHandler.clipboardPopAndPaste(textEditor);
            await editHandler.clipboardPopAndPaste(textEditor);
            await assertDocumentLineCount(5);
        });
    });
    describe('deleteXXX', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '11 22 33\n'.repeat(5) +
                'aaa bbb ccc\n'.repeat(5)
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            mode.initialize(textEditor);
        });
        const recordAt = async function(line, character, commands) {
            await resetCursor(line, character);
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
        };
        const testReplayAt = async function(line, character, resultText, resultSel, resultStack) {
            editHandler.clearUndeleteStack();
            await resetCursor(line, character);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(line).text, resultText);
            assert.deepStrictEqual(selectionsAsArray(), resultSel);
            assert.deepStrictEqual(editHandler.getUndeleteStack(), resultStack);
        };
        it('should delete a character (deleteLeft)', async () => {
            await recordAt(0, 8, ['vz.deleteLeft']);
            await testReplayAt(5, 11, 'aaa bbb cc', [[5, 10]], [
                [{ isLeftward: true, text: 'c' }]
            ]);
        });
        it('should delete characters (deleteLeft 3-time)', async () => {
            await recordAt(0, 8, ['vz.deleteLeft', 'vz.deleteLeft', 'vz.deleteLeft']);
            await testReplayAt(5, 11, 'aaa bbb ', [[5, 8]], [
                [{ isLeftward: true, text: 'c' }],
                [{ isLeftward: true, text: 'c' }],
                [{ isLeftward: true, text: 'c' }]
            ]);
        });
        it('should delete a character (deleteRight)', async () => {
            await recordAt(0, 6, ['vz.deleteRight']);
            await testReplayAt(5, 3, 'aaabbb ccc', [[5, 3]], [
                [{ isLeftward: false, text: ' ' }]
            ]);
        });
        it('should delete characters (deleteRight 3-time)', async () => {
            await recordAt(0, 6, ['vz.deleteRight', 'vz.deleteRight', 'vz.deleteRight']);
            await testReplayAt(5, 6, 'aaa bbcc', [[5, 6]], [
                [{ isLeftward: false, text: 'b' }],
                [{ isLeftward: false, text: ' ' }],
                [{ isLeftward: false, text: 'c' }]
            ]);
        });
        it('should delete a word (deleteWordLeft)', async () => {
            await recordAt(0, 2, ['vz.deleteWordLeft']);
            await testReplayAt(5, 3, ' bbb ccc', [[5, 0]], [
                [{ isLeftward: true, text: 'aaa' }]
            ]);
        });
        it('should delete words (deleteWordLeft 3-time)', async () => {
            await recordAt(2, 3, ['vz.deleteWordLeft', 'vz.deleteWordLeft', 'vz.deleteWordLeft']);
            await testReplayAt(5, 9, 'cc', [[5, 0]], [
                [{ isLeftward: true, text: 'c' }],
                [{ isLeftward: true, text: 'bbb ' }],
                [{ isLeftward: true, text: 'aaa ' }]
            ]);
        });
        it('should delete a word (deleteWordRight)', async () => {
            await recordAt(0, 3, ['vz.deleteWordRight']);
            await testReplayAt(5, 3, 'aaa ccc', [[5, 3]], [
                [{ isLeftward: false, text: ' bbb' }]
            ]);
        });
        it('should delete words (deleteWordRight 3-time)', async () => {
            await recordAt(0, 0, ['vz.deleteWordRight', 'vz.deleteWordRight', 'vz.deleteWordRight']);
            await testReplayAt(5, 1, 'a', [[5, 1]], [
                [{ isLeftward: false, text: 'aa' }],
                [{ isLeftward: false, text: ' bbb' }],
                [{ isLeftward: false, text: ' ccc' }]
            ]);
        });
        it('should delete left half of a line (deleteAllLeft)', async () => {
            await recordAt(0, 3, ['vz.deleteAllLeft']);
            await testReplayAt(5, 4, 'bbb ccc', [[5, 0]], [
                [{ isLeftward: true, text: 'aaa ' }]
            ]);
        });
        it('should delete left half of a line and another line (deleteAllLeft 3-time)', async () => {
            await recordAt(1, 3, ['vz.deleteAllLeft', 'vz.deleteAllLeft', 'vz.deleteAllLeft']);
            await testReplayAt(7, 5, 'aaa bbb ccc', [[6, 0]], [
                [{ isLeftward: true, text: 'aaa b' }],
                [{ isLeftward: true, text: '\n' }],
                [{ isLeftward: true, text: 'aaa bbb ccc' }]
            ]);
        });
        it('should delete right half of a line (deleteAllRight)', async () => {
            await recordAt(0, 3, ['vz.deleteAllRight']);
            await testReplayAt(5, 4, 'aaa ', [[5, 4]], [
                [{ isLeftward: false, text: 'bbb ccc' }]
            ]);
        });
        it('should delete right half of a line and another line (deleteAllRight 3-time)', async () => {
            await recordAt(1, 3, ['vz.deleteAllRight', 'vz.deleteAllRight', 'vz.deleteAllRight']);
            await testReplayAt(5, 4, 'aaa ', [[5, 4]], [
                [{ isLeftward: false, text: 'bbb ccc' }],
                [{ isLeftward: false, text: '\n' }],
                [{ isLeftward: false, text: 'aaa bbb ccc' }]
            ]);
        });
    });
    describe('deleteXXX (with multi-cursor)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '11 22 33\n'.repeat(5) +
                'aaa bbb ccc\n'.repeat(5)
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            mode.initialize(textEditor);
        });
        const recordAt = async function(cursors, commands) {
            await selectRanges(cursors.map(pos => [pos[0], pos[1], pos[0], pos[1]]));
            await recordThroughExecution(commands);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), commands);
        };
        const testReplayAt = async function(cursors, resultTexts, resultSel, resultStack) {
            editHandler.clearUndeleteStack();
            await selectRanges(cursors.map(pos => [pos[0], pos[1], pos[0], pos[1]]));
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(
                cursors.map(pos => textEditor.document.lineAt(pos[0]).text),
                resultTexts
            );
            assert.deepStrictEqual(selectionsAsArray(), resultSel);
            assert.deepStrictEqual(editHandler.getUndeleteStack(), resultStack);
        };
        it('should delete characters (deleteLeft)', async () => {
            await recordAt([[0, 8], [1, 8]], ['vz.deleteLeft']);
            await testReplayAt([[5, 11], [6, 11]], ['aaa bbb cc', 'aaa bbb cc'], [[5, 10], [6, 10]], [
                [{ isLeftward: true, text: 'c' }, { isLeftward: true, text: 'c' }]
            ]);
        });
        it('should delete characters (deleteRight)', async () => {
            await recordAt([[0, 3], [1, 3]], ['vz.deleteRight']);
            await testReplayAt([[5, 4], [6, 4]], ['aaa bb ccc', 'aaa bb ccc'], [[5, 4], [6, 4]], [
                [{ isLeftward: false, text: 'b' }, { isLeftward: false, text: 'b' }]
            ]);
        });
        it('should delete words (deleteWordLeft)', async () => {
            await recordAt([[0, 5], [1, 5]], ['vz.deleteWordLeft']);
            await testReplayAt([[5, 4], [6, 4]], ['bbb ccc', 'bbb ccc'], [[5, 0], [6, 0]], [
                [{ isLeftward: true, text: 'aaa ' }, { isLeftward: true, text: 'aaa ' }]
            ]);
        });
        it('should delete words (deleteWordRight)', async () => {
            await recordAt([[0, 8], [1, 8]], ['vz.deleteWordRight']);
            await testReplayAt([[5, 4], [6, 4]], ['aaa  ccc', 'aaa  ccc'], [[5, 4], [6, 4]], [
                [{ isLeftward: false, text: 'bbb' }, { isLeftward: false, text: 'bbb' }]
            ]);
        });
        it('should delete words (deleteAllLeft)', async () => {
            await recordAt([[0, 5], [1, 5]], ['vz.deleteAllLeft']);
            await testReplayAt([[5, 7], [6, 7]], [' ccc', ' ccc'], [[5, 0], [6, 0]], [
                [{ isLeftward: true, text: 'aaa bbb' }, { isLeftward: true, text: 'aaa bbb' }]
            ]);
        });
        it('should delete words (deleteAllRight)', async () => {
            await recordAt([[0, 6], [1, 6]], ['vz.deleteAllRight']);
            await testReplayAt([[5, 4], [6, 4]], ['aaa ', 'aaa '], [[5, 4], [6, 4]], [
                [{ isLeftward: false, text: 'bbb ccc' }, { isLeftward: false, text: 'bbb ccc' }]
            ]);
        });
    });
    describe('deleteXXX (with a selected range)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '11 22 33\n'.repeat(5) +
                'aaa bbb ccc\n'.repeat(5)
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            mode.initialize(textEditor);
        });
        const recordWithSelectedRange = async function(cmd) {
            await selectRange(0, 3, 0, 6);
            await recordThroughExecution([cmd]);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [cmd]);
        };
        const testPureDeletingOfSelectedRange = async function() {
            await selectRange(5, 4, 5, 8);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'aaa ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'bbb ' }
            ]);
        };
        const testPureDeletingOfSelectedReversedRange = async function() {
            await selectRange(6, 8, 6, 4);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'aaa ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: 'bbb ' }
            ]);
        };
        it('should delete selected characters (deleteLeft)', async () => {
            await recordWithSelectedRange('vz.deleteLeft');
            await testPureDeletingOfSelectedRange();
            await testPureDeletingOfSelectedReversedRange();
        });
        it('should delete selected characters (deleteRight)', async () => {
            await recordWithSelectedRange('vz.deleteRight');
            await testPureDeletingOfSelectedRange();
            await testPureDeletingOfSelectedReversedRange();
        });
        it('should delete selected characters (deleteWordLeft)', async () => {
            await recordWithSelectedRange('vz.deleteWordLeft');
            await testPureDeletingOfSelectedRange();
            await testPureDeletingOfSelectedReversedRange();
        });
        it('should delete selected characters (deleteWordRight)', async () => {
            await recordWithSelectedRange('vz.deleteWordRight');
            await testPureDeletingOfSelectedRange();
            await testPureDeletingOfSelectedReversedRange();
        });
        it('should delete selected characters and left half of a line (deleteAllLeft)', async () => {
            // This inconsistent behavior is just a given one for us.
            // We test it as is just to keep the acceptable result.
            await recordWithSelectedRange('vz.deleteAllLeft');

            await selectRange(5, 4, 5, 8);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'aaa bbb ' }
            ]);

            await selectRange(7, 8, 7, 4); // reversed
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'aaa bbb ' }
            ]);
        });
        it('should delete selected characters (deleteAllRight)', async () => {
            await recordWithSelectedRange('vz.deleteAllRight');
            await testPureDeletingOfSelectedRange();
            await testPureDeletingOfSelectedReversedRange();
        });
    });
    describe('deleteXXX (with multiple selected ranges)', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '11 22 33\n'.repeat(5) +
                'aaa bbb ccc\n'.repeat(5)
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            mode.initialize(textEditor);
        });
        const recordWithSelectedRanges = async function(cmd) {
            await selectRanges([[0, 3, 0, 6], [1, 3, 1, 6]]);
            await recordThroughExecution([cmd]);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [cmd]);
        };
        const testPureDeletingOfSelectedRanges = async function() {
            await selectRanges([[5, 4, 5, 8], [6, 4, 6, 8]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'aaa ccc');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'aaa ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4], [6, 4]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'bbb ' },
                { isLeftward: true, text: 'bbb ' }
            ]);
        };
        const testPureDeletingOfSelectedReversedRanges = async function() {
            await selectRanges([[7, 8, 7, 4], [8, 8, 8, 4]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'aaa ccc');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'aaa ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 4], [8, 4]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: 'bbb ' },
                { isLeftward: false, text: 'bbb ' }
            ]);
        };
        it('should delete selected characters (deleteLeft)', async () => {
            await recordWithSelectedRanges('vz.deleteLeft');
            await testPureDeletingOfSelectedRanges();
            await testPureDeletingOfSelectedReversedRanges();
        });
        it('should delete selected characters (deleteRight)', async () => {
            await recordWithSelectedRanges('vz.deleteRight');
            await testPureDeletingOfSelectedRanges();
            await testPureDeletingOfSelectedReversedRanges();
        });
        it('should delete selected characters (deleteWordLeft)', async () => {
            await recordWithSelectedRanges('vz.deleteWordLeft');
            await testPureDeletingOfSelectedRanges();
            await testPureDeletingOfSelectedReversedRanges();
        });
        it('should delete selected characters (deleteWordRight)', async () => {
            await recordWithSelectedRanges('vz.deleteWordRight');
            await testPureDeletingOfSelectedRanges();
            await testPureDeletingOfSelectedReversedRanges();
        });
        it('should delete selected characters and left half of lines (deleteAllLeft)', async () => {
            // This inconsistent behavior is just a given one for us.
            // We test it as is just to keep the acceptable result.
            await recordWithSelectedRanges('vz.deleteAllLeft');

            await selectRanges([[5, 4, 5, 8], [6, 4, 6, 8]]);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(5).text, 'ccc');
            assert.deepStrictEqual(textEditor.document.lineAt(6).text, 'ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 0], [6, 0]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'aaa bbb ' },
                { isLeftward: true, text: 'aaa bbb ' }
            ]);

            await selectRanges([[7, 8, 7, 4], [8, 8, 8, 4]]); // reversed
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(textEditor.document.lineAt(7).text, 'ccc');
            assert.deepStrictEqual(textEditor.document.lineAt(8).text, 'ccc');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0], [8, 0]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'aaa bbb ' },
                { isLeftward: true, text: 'aaa bbb ' }
            ]);
        });
        it('should delete selected characters (deleteAllRight)', async () => {
            await recordWithSelectedRanges('vz.deleteAllRight');
            await testPureDeletingOfSelectedRanges();
            await testPureDeletingOfSelectedReversedRanges();
        });
    });
    describe('undelete', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(textEditor,
                '11 22 33\n'.repeat(5) +
                'aaa bbb ccc\n'.repeat(5)
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            mode.initialize(textEditor);
        });
        const recordDeleteAndUndelete = async function(line, character, cmd) {
            await resetCursor(line, character);
            await recordThroughExecution([cmd, 'vz.undelete']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), [cmd, 'vz.undelete']);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        };
        const testReplayAt = async function(line, character) {
            let prevText = textEditor.document.lineAt(line).text;
            await resetCursor(line, character);
            await kb_macro.replay(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(line).text, prevText);
            assert.deepStrictEqual(selectionsAsArray(), [[line, character]]);
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        };
        it('should restore deleted characters (deleteLeft)', async () => {
            await recordDeleteAndUndelete(0, 8, 'vz.deleteLeft');
            await testReplayAt(5, 11);
            await testReplayAt(2, 1);
            await testReplayAt(3, 0);
            await testReplayAt(0, 0);
        });
        it('should restore deleted characters (deleteRight)', async () => {
            await recordDeleteAndUndelete(0, 3, 'vz.deleteRight');
            await testReplayAt(5, 8);
            await testReplayAt(5, 11);
            await testReplayAt(2, 7);
            await testReplayAt(3, 0);
            await testReplayAt(10, 0); // end of document
        });
        it('should restore deleted characters (deleteWordLeft)', async () => {
            await recordDeleteAndUndelete(0, 3, 'vz.deleteWordLeft');
            await testReplayAt(5, 4);
            await testReplayAt(6, 3);
            await testReplayAt(2, 8);
            await testReplayAt(3, 0);
            await testReplayAt(0, 0);
        });
        it('should restore deleted characters (deleteWordRight)', async () => {
            await recordDeleteAndUndelete(0, 3, 'vz.deleteWordRight');
            await testReplayAt(5, 4);
            await testReplayAt(6, 3);
            await testReplayAt(2, 8);
            await testReplayAt(3, 0);
            await testReplayAt(10, 0); // end of document
        });
        it('should restore deleted characters (deleteAllLeft)', async () => {
            await recordDeleteAndUndelete(0, 3, 'vz.deleteAllLeft');
            await testReplayAt(5, 4);
            await testReplayAt(6, 3);
            await testReplayAt(2, 8);
            await testReplayAt(3, 0);
            await testReplayAt(0, 0);
        });
        it('should restore deleted characters (deleteAllRight)', async () => {
            await recordDeleteAndUndelete(0, 3, 'vz.deleteAllRight');
            await testReplayAt(5, 4);
            await testReplayAt(6, 3);
            await testReplayAt(2, 8);
            await testReplayAt(3, 0);
            await testReplayAt(10, 0); // end of document
        });
    });
    describe('copyLinesDown', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                '123456\n' +
                'abcde\n' +
                'fghijklmno\n' +
                'pqrst', // no new line
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should duplicate the line the cursor is on', async () => {
            await resetCursor(0, 0);
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);

            await resetCursor(3, 0);
            await kb_macro.replay(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0]]);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghijklmno');
            assert.strictEqual(textEditor.document.lineAt(4).text, 'fghijklmno');
            await assertDocumentLineCount(6);
        });
        it('should duplicate the last line of the document even if it has no new line', async () => {
            await resetCursor(3, 0); // the last line of document
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);
        });
        it('should duplicate single line if entire line is selected', async () => {
            await selectRange(0, 0, 0, 6);
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);
        });
        it('should duplicate single line if entire line including the new line character is selected', async () => {
            await selectRange(0, 0, 1, 0);
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);
        });
        it('should duplicate multiple lines that are selected', async () => {
            await selectRange(0, 0, 1, 5);
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);
        });
        it('should duplicate each lines of multi cursor', async () => {
            await selectRanges([[1, 5, 1, 5], [2, 5, 2, 5]]);
            await recordThroughExecution(['vz.copyLinesDown']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.copyLinesDown']);
        });
    });
    describe('transformCase', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                'abcdefg hijklmn opqrstu vwxyz\n' +
                'abcdefg hijklmn opqrstu vwxyz\n',
                vscode.EndOfLine.CRLF
            );
        });
        it('should switch case of a word between lower, upper and title case', async () => {
            await resetCursor(0, 8);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');

            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg Hijklmn opqrstu vwxyz');
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');
        });
        it('should switch case of words (replay with various selections)', async () => {
            await resetCursor(0, 0);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG hijklmn opqrstu vwxyz');

            await resetCursor(0, 10);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG HIJKLMN opqrstu vwxyz');
            await selectRange(0, 16, 0, 23);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG HIJKLMN OPQRSTU vwxyz');
            await resetCursor(0, 29);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG HIJKLMN OPQRSTU VWXYZ');
        });
        it('should switch case of words (record with various selections)', async () => {
            await resetCursor(0, 7);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);

            await selectRange(0, 8, 0, 15);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);

            await selectRanges([[0, 15, 0, 15], [1, 15, 1, 15]]);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);

            await selectRanges([[0, 8, 0, 15], [1, 8, 1, 15]]);
            await recordThroughExecution(['vz.transformCase']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.transformCase']);
        });
    });
    describe('insertPath', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdefg\n' +
                    '\n' +
                    '0123456\n' +
                    'ABCDEFG'
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should insert the file path of current document', async () => {
            await resetCursor(0, 0);
            await recordThroughExecution(['vz.insertPath']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.insertPath']);

            await resetCursor(1, 0);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, textEditor.document.fileName);
        });
        it('should replace selection range with the file path of current document', async () => {
            await selectRange(0, 0, 0, 1);
            await recordThroughExecution(['vz.insertPath']);
            assert.deepStrictEqual(kb_macro.getRecordedCommandNames(), ['vz.insertPath']);

            await selectRange(1, 0, 2, 7);
            await kb_macro.replay(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, textEditor.document.fileName);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'ABCDEFG');
        });
    });
});
