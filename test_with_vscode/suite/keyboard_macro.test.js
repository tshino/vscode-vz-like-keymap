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
    const resetCursor = async (line, character,  revealType=vscode.TextEditorRevealType.Default) => {
        await testUtils.resetCursor(textEditor, mode, line, character, revealType);
    };
    const waitForCursorAt = async (line, character) => {
        while (
            textEditor.selections[0].active.line !== line ||
            textEditor.selections[0].active.character !== character
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
        it('should record and replay commands (down)', async () => {
            kb_macro.record();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.replay();

            await resetCursor(2, 5);
            await kb_macro.replay();
            await waitForCursorAt(3, 5);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 5]]);
        });
        it('should record and replay commands (down x3 left)', async () => {
            kb_macro.record();
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorDown');
            kb_macro.pushIfRecording('vz.cursorLeft');
            kb_macro.replay();

            await resetCursor(2, 5);
            await kb_macro.replay();
            await waitForCursorAt(5, 4);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4]]);
        });
    });
});
