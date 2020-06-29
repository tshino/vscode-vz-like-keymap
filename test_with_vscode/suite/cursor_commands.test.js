"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const cursor_commands = require("./../../src/cursor_commands.js");
const EditUtil = require("./../../src/edit_util.js");

describe('CursorHandler', () => {
    vscode.window.showInformationMessage('Started test for EditHandler.');
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
    const revealCursor = async () => {
        let cursor = textEditor.selections[0].active;
        textEditor.revealRange(new vscode.Range(cursor, cursor));
        await waitForReveal();
    };
    before(async () => {
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
            textEditor.selections = [ new vscode.Selection(5, 5, 5, 5) ];
            mode.initialize(textEditor);
            await waitForReveal();
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(8), true);

            cursorHandler.moveCursorTo(textEditor, 8, 7, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(8, 7, 8, 7) ));
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.deepStrictEqual(visibleLines0, visibleLines1);
        });
        it('should reveal the location of the cursor after it moved', async () => {
            textEditor.selections = [ new vscode.Selection(5, 5, 5, 5) ];
            mode.initialize(textEditor);
            await revealCursor();
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(999), false);

            cursorHandler.moveCursorTo(textEditor, 999, 0, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(999, 0, 999, 0) ));
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notEqual(visibleLines0[0], visibleLines1[0]);
        });
        it('should reveal the location of the cursor after it moved', async () => {
            textEditor.selections = [ new vscode.Selection(1234, 0, 1234, 0) ];
            mode.initialize(textEditor);
            await revealCursor();
            let visibleLines0 = EditUtil.enumVisibleLines(textEditor);
            assert.equal(visibleLines0.includes(7), false);

            cursorHandler.moveCursorTo(textEditor, 7, 3, false);
            await waitForReveal();

            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(7, 3, 7, 3) ));
            assert.equal(isCursorVisible(), true);
            let visibleLines1 = EditUtil.enumVisibleLines(textEditor);
            assert.notEqual(visibleLines0[0], visibleLines1[0]);
        });
    });
});
