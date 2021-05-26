"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const edit_commands = require("./../../src/edit_commands.js");
const EditUtil = require("./../../src/edit_util.js");

describe('EditHandler', () => {
    const mode = mode_handler.getInstance();
    const editHandler = edit_commands.getInstance();

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
        vscode.window.showInformationMessage('Started test for EditHandler.');
        textEditor = await testUtils.setupTextEditor({ content: '' });
        mode.initialize(textEditor);
    });
    describe('singleLineRange', () => {
        it('makes a single line range', () => {
            let range = editHandler.singleLineRange(5);
            assert.strictEqual(5, range.start.line);
            assert.strictEqual(0, range.start.character);
            assert.strictEqual(6, range.end.line);
            assert.strictEqual(0, range.end.character);
        });
    });
    describe('cancelSelection', () => {
        before(async () => {
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
                )
            );
        });
        it('should cancel single selection range and retain cursor position', () => {
            textEditor.selections = [ new vscode.Selection(1, 0, 1, 10) ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 10]]);

            textEditor.selections = [ new vscode.Selection(1, 0, 2, 5) ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5]]);
        });
        it('should cancel multiple selection range and locate cursor at the start of the topmost selection', () => {
            textEditor.selections = [
                new vscode.Selection(1, 0, 1, 5),
                new vscode.Selection(2, 0, 2, 5),
                new vscode.Selection(3, 0, 3, 5)
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);

            textEditor.selections = [
                new vscode.Selection(3, 0, 3, 5),
                new vscode.Selection(2, 0, 2, 5),
                new vscode.Selection(1, 0, 1, 5)
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);

            textEditor.selections = [
                new vscode.Selection(3, 5, 3, 0),
                new vscode.Selection(2, 5, 2, 0),
                new vscode.Selection(1, 5, 1, 0),
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
        });
    });
    describe('readText', () => {
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
                vscode.EndOfLine.LF
            );
        });
        it('should extract text from document (single range)', async () => {
            mode.initialize(textEditor);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(1, 3, 1, 7) ]),
                '4567'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 0, 10) ]),
                '1234567890'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.CRLF);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 1, 0) ]),
                '1234567890\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.LF);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 1, 0) ]),
                '1234567890\n'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(0, 5, 1, 5) ]),
                '67890\n12345'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(0, 10, 1, 0) ]),
                '\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.CRLF);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(3, 0, 6, 0) ]),
                'fghij\n\n12345\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.LF);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(3, 0, 6, 0) ]),
                'fghij\n\n12345\n'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(6, 0, 7, 0) ]),
                '67890' // no new line (end of document)
            );
        });
        it('should extract text from document (empty range)', () => {
            mode.initialize(textEditor);
            assert.strictEqual(
                editHandler.readText(textEditor, [ new vscode.Range(1, 3, 1, 3) ]),
                ''
            );
        });
        it('should extract text from document (multiple ranges)', () => {
            mode.initialize(textEditor);
            assert.strictEqual(
                editHandler.readText(textEditor, [
                    new vscode.Range(0, 5, 0, 8),
                    new vscode.Range(1, 5, 1, 8)
                ]),
                '678\n678\n'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [
                    new vscode.Range(0, 0, 0, 10),
                    new vscode.Range(1, 0, 1, 10)
                ]),
                '1234567890\n1234567890\n'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [
                    new vscode.Range(3, 0, 3, 5),
                    new vscode.Range(2, 0, 2, 5)
                ]),
                'abcde\nfghij\n'
            );
            assert.strictEqual(
                editHandler.readText(textEditor, [
                    new vscode.Range(5, 0, 5, 5),
                    new vscode.Range(6, 0, 6, 5)
                ]),
                '12345\n67890\n'    // added new line
            );
        });
    });
    describe('deleteRanges', () => {
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
                vscode.EndOfLine.LF
            );
        });
        it('should delete texts in specified ranges (single range)', async () => {
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(0, 5, 0, 8) ]);
            });
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234590');
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(1, 5, 2, 2) ]);
            });
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345cde');
        });
        it('should delete texts in specified ranges (multiple ranges)', async () => {
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [
                    new vscode.Range(0, 5, 0, 8),
                    new vscode.Range(1, 5, 1, 8)
                ]);
            });
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234590');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234590');
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [
                    new vscode.Range(2, 1, 2, 2),
                    new vscode.Range(2, 3, 2, 4)
                ]);
            });
            assert.strictEqual(textEditor.document.lineAt(2).text, 'ace');
        });
        it('should concatenate two lines when deleting a new line', async () => {
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(2, 5, 3, 0) ]);
            });
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcdefghij');
        });
        it('should decrement lineCount when deleting a single line', async () => {
            assert.strictEqual(textEditor.document.lineCount, 7);
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(3, 0, 4, 0) ]);
            });
            assert.strictEqual(textEditor.document.lineCount, 6);
        });
        it('should retain lineCount when deleting the last line which has no new line', async () => {
            assert.strictEqual(textEditor.document.lineCount, 7);
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(6, 0, 7, 0) ]);
            });
            assert.strictEqual(textEditor.document.lineCount, 7);
        });
    });
    describe('makeCutCopyRanges', () => {
        before(async () => {
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
                vscode.EndOfLine.LF
            );
        });
        it('should make a range array corresponding to current selection (single)', () => {
            {
                textEditor.selections = [ new vscode.Selection(0, 0, 1, 0) ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 1);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(0, 0, 1, 0)), true);
                assert.strictEqual(isLineMode, false);
            }
            {
                textEditor.selections = [ new vscode.Selection(2, 3, 0, 5) ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 1);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(0, 5, 2, 3)), true);
                assert.strictEqual(isLineMode, false);
            }
        });
        it('should make a range array corresponding to current selection (multiple)', () => {
            {
                textEditor.selections = [
                    new vscode.Selection(0, 0, 0, 7),
                    new vscode.Selection(1, 0, 1, 7)
                ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 2);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(0, 0, 0, 7)), true);
                assert.strictEqual(ranges[1].isEqual(new vscode.Range(1, 0, 1, 7)), true);
                assert.strictEqual(isLineMode, false);
            }
        });
        it('should retain ranges even if the selections contain empty ranges', () => {
            {
                textEditor.selections = [
                    new vscode.Selection(0, 5, 0, 8),
                    new vscode.Selection(1, 5, 1, 8),
                    new vscode.Selection(2, 5, 2, 5)
                ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 3);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(0, 5, 0, 8)), true);
                assert.strictEqual(ranges[1].isEqual(new vscode.Range(1, 5, 1, 8)), true);
                assert.strictEqual(ranges[2].isEqual(new vscode.Range(2, 5, 2, 5)), true);
                assert.strictEqual(isLineMode, false);
            }
        });
        it('should reverse the range array to make it ascending order', () => {
            {
                textEditor.selections = [
                    new vscode.Selection(3, 2, 3, 5),
                    new vscode.Selection(2, 2, 2, 5),
                    new vscode.Selection(1, 2, 1, 5)
                ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 3);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(1, 2, 1, 5)), true);
                assert.strictEqual(ranges[2].isEqual(new vscode.Range(3, 2, 3, 5)), true);
                assert.strictEqual(isLineMode, false);
            }
            {
                textEditor.selections = [
                    new vscode.Selection(1, 8, 1, 10),
                    new vscode.Selection(1, 0, 1, 2),
                    new vscode.Selection(0, 0, 0, 2)
                ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.strictEqual(ranges.length, 3);
                assert.strictEqual(ranges[0].isEqual(new vscode.Range(0, 0, 0, 2)), true);
                assert.strictEqual(ranges[2].isEqual(new vscode.Range(1, 8, 1, 10)), true);
                assert.strictEqual(isLineMode, false);
            }
        });
        it('should make a single-line range when the selection is empty (Line mode)', () => {
            textEditor.selections = [ new vscode.Selection(1, 4, 1, 4) ];
            mode.initialize(textEditor);
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].isEqual(new vscode.Range(1, 0, 2, 0)), true);
            assert.strictEqual(isLineMode, true);
        });
        it('should make a single-line, but excluding new line character, range when the selection is empty and is in box-selection mode', () => {
            textEditor.selections = [ new vscode.Selection(1, 4, 1, 4) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.strictEqual(ranges.length, 1);
            assert.strictEqual(ranges[0].isEqual(new vscode.Range(1, 0, 1, 10)), true);
            assert.strictEqual(isLineMode, true);
        });
        it('should make multiple single-line, but excluding new line character, ranges when the selections are all empty', () => {
            textEditor.selections = [
                new vscode.Selection(3, 3, 3, 3),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 3, 5, 3)
            ];
            mode.initialize(textEditor);
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.strictEqual(ranges.length, 3);
            assert.strictEqual(ranges[0].isEqual(new vscode.Range(3, 0, 3, 5)), true);
            assert.strictEqual(ranges[1].isEqual(new vscode.Range(4, 0, 4, 0)), true);
            assert.strictEqual(ranges[2].isEqual(new vscode.Range(5, 0, 5, 5)), true);
            assert.strictEqual(isLineMode, true);
        });
        it('should remove duplicate lines from the resulting multiple single-line ranges', () => {
            textEditor.selections = [
                new vscode.Selection(1, 3, 1, 3),
                new vscode.Selection(1, 9, 1, 9), // can happen if the line is wrapped
                new vscode.Selection(2, 3, 2, 3),
                new vscode.Selection(3, 3, 3, 3)
            ];
            mode.initialize(textEditor);
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.strictEqual(ranges.length, 3);
            assert.strictEqual(ranges[0].isEqual(new vscode.Range(1, 0, 1, 10)), true);
            assert.strictEqual(ranges[1].isEqual(new vscode.Range(2, 0, 2, 5)), true);
            assert.strictEqual(ranges[2].isEqual(new vscode.Range(3, 0, 3, 5)), true);
            assert.strictEqual(isLineMode, true);
        });
    });
    describe('cutAndPushImpl', () => {
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
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 6);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123890');
            assert.deepStrictEqual(selectionsAsArray(), [[0, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            let p1 = editHandler.cutAndPushImpl(textEditor);
            let p2 = editHandler.cutAndPushImpl(textEditor);
            await Promise.all([p1, p2]);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should delete an entire line when selection is empty', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 6);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde\n');
        });
        it('should delete the line but leave empty line there when in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde');
        });
        it('should delete multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fj');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
            assert.strictEqual(textEditor.document.lineAt(5).text, '15');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 1]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'ghi\n\n234\n');
        });
        it('should delete multiple lines and leave empty line there when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(3).text, '');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
            assert.strictEqual(textEditor.document.lineAt(5).text, '');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'fghij\n\n12345\n');
        });
        it('should reveal the cursor after a cut even if it is a long range', async () => {
            await textEditor.edit((edit) => {
                edit.insert(
                    new vscode.Position(4, 0),
                    Array(100).fill('xxxxxyyyyyzzzzz').join('\n') + '\n'
                );
            });
            textEditor.selections = [ new vscode.Selection(4, 0, 104, 0) ];
            mode.initialize(textEditor);
            textEditor.revealRange(new vscode.Range(104, 0, 104, 0), vscode.TextEditorRevealType.Default);
            while (await sleep(1), !EditUtil.enumVisibleLines(textEditor).includes(104)) {}
            assert.strictEqual(textEditor.document.lineCount, 107);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0]]);
            assert.strictEqual(EditUtil.enumVisibleLines(textEditor).includes(4), true);
        });
    });
    describe('copyAndPushImpl', () => {
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
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 7]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should prevent reentry', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            let p1 = editHandler.copyAndPushImpl(textEditor);
            let p2 = editHandler.copyAndPushImpl(textEditor);
            await Promise.all([p1, p2]);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '4567890\n1234567');
        });
        it('should copy an entire line when selection is empty', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde\n');
        });
        it('should copy the line when in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'abcde');
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
            assert.strictEqual(textEditor.document.lineAt(5).text, '12345');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 1]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'ghi\n\n234\n');
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
            assert.strictEqual(textEditor.document.lineAt(5).text, '12345');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 2]]);
            assert.strictEqual(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, 'fghij\n\n12345\n');
        });
    });
    describe('peekTextStack', () => {
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
        it('should read the last copied/cut part of document', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '4567890\n1234567');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '4567890\n1234567');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should read the last copied/cut line with empty selection', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'abcde\n');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, false);
        });
        it('should read the last copied/cut line in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'abcde');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, true);
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'ghi\n\n234\n');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, true);
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'fghij\n\n12345\n');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, true);
        });
        it('should return clipboard text if it does not match the last copied/cut text', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await editHandler.copyAndPushImpl(textEditor);
            await vscode.env.clipboard.writeText('unknown text');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'unknown text');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text (multi)', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            await vscode.env.clipboard.writeText('diff\nerent\ntext');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'diff\nerent\ntext');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), 'diff\nerent\ntext');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'diff\nerent\ntext');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
    });
    describe('popTextStack', () => {
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
        it('should return clipboard text if text stack is empty', async () => {
            await vscode.env.clipboard.writeText('clipboard');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'clipboard');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should return empty string if text stack is empty', async () => {
            await vscode.env.clipboard.writeText('');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
        });
        it('should read the last copied/cut part of document', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, '4567890\n1234567');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should read the last copied/cut line with empty selection', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'abcde\n');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should read the last copied/cut line in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'abcde');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, true);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'ghi\n\n234\n');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, true);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'fghij\n\n12345\n');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, true);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await editHandler.copyAndPushImpl(textEditor);
            await vscode.env.clipboard.writeText('unknown text');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'unknown text');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '4567890\n1234567');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, '4567890\n1234567');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text (multi)', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.copyAndPushImpl(textEditor);
            await vscode.env.clipboard.writeText('diff\nerent\ntext');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.strictEqual(text, 'diff\nerent\ntext');
            assert.strictEqual(isLineMode, false);
            assert.strictEqual(isBoxMode, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), 'fghij\n\n12345\n');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.strictEqual(text, 'fghij\n\n12345\n');
            assert.strictEqual(isLineMode, true);
            assert.strictEqual(isBoxMode, true);
        });
    });
    describe('pasteLines', () => {
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
        it('should insert a single line into the document', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!\n');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
        });
        it('should insert multiple lines into the document', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!\nHave a nice day!\n');
            assert.strictEqual(textEditor.document.lineCount, 9);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'Have a nice day!');
            assert.strictEqual(textEditor.document.lineAt(4).text, 'abcde');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 3]]);
        });
        it('should insert a single line even if it has no new line', async () => {
            textEditor.selections = [ new vscode.Selection(5, 3, 5, 3) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineAt(6).text, '12345');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 3]]);
        });
        it('should insert a single line even if both the text and the current line of the document have no new line', async () => {
            textEditor.selections = [ new vscode.Selection(6, 3, 6, 3) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineAt(7).text, '67890');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 3]]);
        });
        it('should insert a text without new line into the last line of doc if the text has no new line and the last line is empty', async () => {
            await textEditor.edit((edit) => {
                edit.insert(new vscode.Position(6, 5), '\n');
            });
            textEditor.selections = [ new vscode.Selection(7, 0, 7, 0) ];
            assert.strictEqual(textEditor.document.lineCount, 8);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(7).text, 'Hello, world!');
            assert.deepStrictEqual(selectionsAsArray(), [[7, 0]]);
        });
    });
    describe('pasteInlineText', () => {
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
        it('should insert a text inline', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!');
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcHello, world!de');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 16]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should replace the current selection range with a text', async () => {
            textEditor.selections = [ new vscode.Selection(2, 1, 2, 4) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!');
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'aHello, world!e');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 14]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should replace multiple lines of current selection range with a text', async () => {
            textEditor.selections = [ new vscode.Selection(2, 0, 4, 0) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!\n');
            assert.strictEqual(textEditor.document.lineCount, 6);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.strictEqual(textEditor.document.lineAt(3).text, '');
            assert.strictEqual(textEditor.document.lineAt(4).text, '12345');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 0]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should insert a text inline even if it contains new lines', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello,\nworld!');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345Hello,');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'world!67890');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 6]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should insert a text into each position of current cursors', async () => {
            textEditor.selections = [
                new vscode.Selection(2, 1, 2, 1), new vscode.Selection(3, 1, 3, 1),
            ];
            await editHandler.pasteInlineText('_____');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'a_____bcde');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'f_____ghij');
            assert.strictEqual(textEditor.selections.length, 2);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 6], [3, 6]]);
        });
    });
    describe('pasteBoxText', () => {
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
        it('should insert multiple lines of text into existing lines', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.\n');
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345One,67890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcdeTwo,');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghijThree.');
            assert.deepStrictEqual(selectionsAsArray(), [[1, 9]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should insert additional spaces to align the position to paste lines', async () => {
            textEditor.selections = [ new vscode.Selection(3, 5, 3, 5) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.\n');
            assert.strictEqual(textEditor.document.lineCount, 7);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghijOne,');
            assert.strictEqual(textEditor.document.lineAt(4).text, '     Two,');
            assert.strictEqual(textEditor.document.lineAt(5).text, '12345Three.');
            assert.deepStrictEqual(selectionsAsArray(), [[3, 9]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should extend the document when inserting a text at near the end of doc', async () => {
            textEditor.selections = [ new vscode.Selection(5, 0, 5, 0) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.\n');
            assert.strictEqual(textEditor.document.lineCount, 8);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'One,12345');
            assert.strictEqual(textEditor.document.lineAt(6).text, 'Two,67890');
            assert.strictEqual(textEditor.document.lineAt(7).text, 'Three.');
            assert.deepStrictEqual(selectionsAsArray(), [[5, 4]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should extend the document when inserting a text at near the end of doc', async () => {
            textEditor.selections = [ new vscode.Selection(6, 0, 6, 0) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.\n');
            assert.strictEqual(textEditor.document.lineCount, 9);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'One,67890');
            assert.strictEqual(textEditor.document.lineAt(7).text, 'Two,');
            assert.strictEqual(textEditor.document.lineAt(8).text, 'Three.');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should ignore the new line character at the end of the pasting text', async () => {
            textEditor.selections = [ new vscode.Selection(6, 0, 6, 0) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.');
            assert.strictEqual(textEditor.document.lineCount, 9);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'One,67890');
            assert.strictEqual(textEditor.document.lineAt(7).text, 'Two,');
            assert.strictEqual(textEditor.document.lineAt(8).text, 'Three.');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 4]]);
            assert.strictEqual(mode.inSelection(), false);
        });
        it('should insert additional lines and spaces to paste lines of text', async () => {
            textEditor.selections = [ new vscode.Selection(6, 5, 6, 5) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.pasteBoxText(textEditor, 'One,\nTwo,\nThree.');
            assert.strictEqual(textEditor.document.lineCount, 9);
            assert.strictEqual(textEditor.document.lineAt(6).text, '67890One,');
            assert.strictEqual(textEditor.document.lineAt(7).text, '     Two,');
            assert.strictEqual(textEditor.document.lineAt(8).text, '     Three.');
            assert.deepStrictEqual(selectionsAsArray(), [[6, 9]]);
            assert.strictEqual(mode.inSelection(), false);
        });
    });
    describe('popAndPasteImpl', () => {
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
            textEditor.selections = [ new vscode.Selection(1, 1, 1, 9) ];
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [ new vscode.Selection(1, 2, 1, 2) ];
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1023456789');
        });
        it('should prevent reentry', async () => {
            textEditor.selections = [ new vscode.Selection(1, 1, 1, 1) ];
            assert.strictEqual(textEditor.document.lineCount, 7);
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.cutAndPushImpl(textEditor);
            let p1 = editHandler.popAndPasteImpl(textEditor, false);
            let p2 = editHandler.popAndPasteImpl(textEditor, false);
            await Promise.all([p1, p2]);
            assert.strictEqual(textEditor.document.lineCount, 6);
        });
        it('should retain the text stack if the second argument is true', async () => {
            textEditor.selections = [ new vscode.Selection(1, 1, 1, 9) ];
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [ new vscode.Selection(1, 2, 1, 2) ];
            await editHandler.popAndPasteImpl(textEditor, true);
            assert.strictEqual(await vscode.env.clipboard.readText(), '23456789');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1023456789');
        });
        it('should paste a single text into each position of multiple cursors', async () => {
            textEditor.selections = [ new vscode.Selection(2, 0, 2, 5) ];
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [
                new vscode.Selection(0, 3, 0, 3),
                new vscode.Selection(1, 3, 1, 3)
            ];
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(0).text, '123abcde4567890');
            assert.strictEqual(textEditor.document.lineAt(1).text, '123abcde4567890');
        });
        it('should insert a single line if the text is from line mode cut or copy', async () => {
            textEditor.selections = [ new vscode.Selection(3, 2, 3, 2) ];
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [ new vscode.Selection(2, 2, 2, 2) ];
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
        });
        it('should repeat inserting a single line', async () => {
            textEditor.selections = [ new vscode.Selection(3, 2, 3, 2) ];
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [ new vscode.Selection(2, 2, 2, 2) ];
            assert.strictEqual(textEditor.document.lineCount, 6);
            await editHandler.popAndPasteImpl(textEditor, true);
            await editHandler.popAndPasteImpl(textEditor, true);
            await editHandler.popAndPasteImpl(textEditor, true);
            assert.strictEqual(textEditor.document.lineCount, 9);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(4).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'abcde');
        });
        it('should insert multiple lines that are from multiple cuts', async () => {
            textEditor.selections = [ new vscode.Selection(2, 2, 2, 2) ];
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.popAndPasteImpl(textEditor, false);
            await editHandler.popAndPasteImpl(textEditor, false);
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghij');
            assert.strictEqual(textEditor.document.lineAt(4).text, '');
        });
        it('should insert multiple lines of inline text into at multiple cursors', async () => {
            textEditor.selections = [
                new vscode.Selection(2, 0, 2, 3),
                new vscode.Selection(3, 0, 3, 3)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [
                new vscode.Selection(2, 2, 2, 2),
                new vscode.Selection(3, 2, 3, 2)
            ];
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'deabc');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'ijfgh');
        });
        it('should insert multiple lines of inline text into lines below the cursor', async () => {
            textEditor.selections = [
                new vscode.Selection(2, 0, 2, 3),
                new vscode.Selection(3, 0, 3, 3)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            await editHandler.cutAndPushImpl(textEditor);
            textEditor.selections = [
                new vscode.Selection(2, 2, 2, 2)
            ];
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(await vscode.env.clipboard.readText(), '');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'deabc');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'ijfgh');
        });
        it('should repeat inserting multiple lines of inline text', async () => {
            textEditor.selections = [
                new vscode.Selection(2, 0, 2, 3),
                new vscode.Selection(3, 0, 3, 3)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.popAndPasteImpl(textEditor, true);
            await editHandler.popAndPasteImpl(textEditor, true);
            await editHandler.popAndPasteImpl(textEditor, true);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcabcabcde');
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghfghfghij');
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
            textEditor.selections = [ new vscode.Selection(1, 1, 1, 1) ];
            await editHandler.cutAndPushImpl(textEditor);
            await editHandler.cutAndPushImpl(textEditor);
            assert.strictEqual(textEditor.document.lineCount, 5);

            await editHandler.clearStack(textEditor);

            assert.strictEqual(editHandler.getTextStackLength(), 0);
            let clipboard = await vscode.env.clipboard.readText();
            assert.strictEqual(clipboard, '');

            await editHandler.popAndPasteImpl(textEditor, false);
            await editHandler.popAndPasteImpl(textEditor, false);
            assert.strictEqual(textEditor.document.lineCount, 5);
        });
    });
    describe('deleteLeft', () => {
        const TAB_SIZE = vscode.workspace.getConfiguration('editor').get('tabSize');
        const INDENT = ' '.repeat(TAB_SIZE);
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    INDENT + '12345\n' +
                    INDENT + INDENT + '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete the character before the cursor', async () => {
            await resetCursor(1, 5);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 4]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123467890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '5' }
            ]);
        });
        it('should delete one level of indent before the cursor', async () => {
            await resetCursor(6, TAB_SIZE * 2);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, TAB_SIZE]]);
            assert.strictEqual(textEditor.document.lineAt(6).text, INDENT + '67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: INDENT }
            ]);
        });
        it('should remove one new line character', async () => {
            await resetCursor(2, 0);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 10]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890abcde');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '\n' }
            ]);
        });
        it('should do nothing if the cursor is at the beginning of the document', async () => {
            await resetCursor(0, 0);

            await editHandler.deleteLeft(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should delete the selected range', async () => {
            await selectRange(1, 3, 1, 7);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '4567' }
            ]);
        });
        it('should delete one character for each of multiple cursors', async () => {
            await selectRanges([[1, 3, 1, 3], [2, 3, 2, 3]]);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2], [2, 2]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '124567890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abde');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '3' },
                { isLeftward: true, text: 'c' }
            ]);
        });
        it('should delete one for each of multiple cursors excluding the beginning of the document', async () => {
            await selectRanges([[0, 0, 0, 0], [1, 0, 1, 0]]);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0], [0, 10]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '12345678901234567890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '' },
                { isLeftward: true, text: '\n' }
            ]);
        });
        it('should delete the selected multiple ranges', async () => {
            await selectRanges([[1, 3, 1, 7], [2, 3, 2, 5]]);

            await editHandler.deleteLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3], [2, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abc');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '4567' },
                { isLeftward: true, text: 'de' }
            ]);
        });
    });
    describe('deleteRight', () => {
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
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete the character at the cursor', async () => {
            await resetCursor(1, 5);

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123457890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '6' }
            ]);
        });
        it('should remove one new line character', async () => {
            await resetCursor(2, 5);

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 5]]);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcdefghij');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '\n' }
            ]);
        });
        it('should do nothing if the cursor is at the end of the document', async () => {
            await resetCursor(6, 5);

            await editHandler.deleteRight(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[6, 5]]);
            assert.strictEqual(textEditor.document.lineAt(6).text, '67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should delete the selected range', async () => {
            await selectRange(1, 3, 1, 7);

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '4567' }
            ]);
        });
        it('should delete one character for each of multiple cursors', async () => {
            await selectRanges([[1, 3, 1, 3], [2, 3, 2, 3]]);

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3], [2, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123567890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abce');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '4' },
                { isLeftward: false, text: 'd' }
            ]);
        });
        it('should delete one for each of multiple cursors excluding the end of the document', async () => {
            await selectRanges([[5, 5, 5, 5], [6, 5, 6, 5]]); // (6, 5): end of document

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[5, 5], [5, 10]]);
            assert.strictEqual(textEditor.document.lineAt(5).text, '1234567890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '\n' },
                { isLeftward: true, text: '' }
            ]);
        });
        it('should delete the selected multiple ranges', async () => {
            await selectRanges([[1, 3, 1, 7], [2, 3, 2, 5]]);

            await editHandler.deleteRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3], [2, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '123890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abc');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '4567' },
                { isLeftward: true, text: 'de' }
            ]);
        });
    });
    describe('deleteWordLeft', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '123 456 789\n' +
                    'hello world\n' +
                    '   foo()   \n' +
                    '\n' +
                    '    1234' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete one word to the left of the cursor', async () => {
            await resetCursor(0, 8);

            await editHandler.deleteWordLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '456 ' }
            ]);
        });
        it('should delete one word to the left of each cursors', async () => {
            await selectRanges([[0, 11, 0, 11], [1, 11, 1, 11]]);

            await editHandler.deleteWordLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 8], [1, 6]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 456 ');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'hello ');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '789' },
                { isLeftward: true, text: 'world' }
            ]);
        });
        it('should remove one new line character', async () => {
            await resetCursor(3, 0);

            await editHandler.deleteWordLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 11]]);
            assert.strictEqual(textEditor.document.lineAt(2).text, '   foo()   ');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '\n' }
            ]);
        });
        it('should do nothing if the cursor is at the beginning of the document', async () => {
            await resetCursor(0, 0);

            await editHandler.deleteWordLeft(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 456 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
    });
    describe('deleteWordRight', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '123 456 789\n' +
                    'hello world\n' +
                    '   foo()   \n' +
                    '\n' +
                    '    1234' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete one word to the right of the cursor', async () => {
            await resetCursor(0, 3);

            await editHandler.deleteWordRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 3]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: ' 456' }
            ]);
        });
        it('should delete one word to the right of each cursors', async () => {
            await selectRanges([[0, 0, 0, 0], [1, 0, 1, 0]]);

            await editHandler.deleteWordRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0], [1, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, ' 456 789');
            assert.strictEqual(textEditor.document.lineAt(1).text, ' world');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '123' },
                { isLeftward: false, text: 'hello' }
            ]);
        });
        it('should remove one new line character plus indent', async () => {
            await resetCursor(1, 11);

            await editHandler.deleteWordRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 11]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'hello worldfoo()   ');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '\n   ' }
            ]);
        });
        it('should do nothing if the cursor is at the end of the document', async () => {
            await resetCursor(4, 8);

            await editHandler.deleteWordRight(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 8]]);
            assert.strictEqual(textEditor.document.lineAt(4).text, '    1234');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
    });
    describe('deleteAllLeft', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '123 456 789\n' +
                    'hello world\n' +
                    'foo()\n' +
                    '\n' +
                    '    1234' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete the left half of the line', async () => {
            await resetCursor(1, 6);

            await editHandler.deleteAllLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 0]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'world');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: 'hello ' }
            ]);
        });
        it('should remove one new line character', async () => {
            await resetCursor(1, 0);

            await editHandler.deleteAllLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 11]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 456 789hello world');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '\n' }
            ]);
        });
        it('should delete the left half of each line (multi-cursor)', async () => {
            await selectRanges([[0, 6, 0, 6], [1, 6, 1, 6]]);

            await editHandler.deleteAllLeft(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0], [1, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '6 789');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'world');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '123 45' },
                { isLeftward: true, text: 'hello ' }
            ]);
        });
        it('should do nothing if the cursor is at the beginning of the document', async () => {
            await resetCursor(0, 0);

            await editHandler.deleteAllLeft(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 456 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should delete the left half of the line with selected range (single selection range)', async () => {
            await selectRange(0, 4, 0, 7);

            await editHandler.deleteAllLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, ' 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '123 456' }
            ]);
        });
        it('should delete the left half of the line with selected range (single selection range reversed)', async () => {
            await selectRange(0, 7, 0, 4);

            await editHandler.deleteAllLeft(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, ' 789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '123 456' }
            ]);
        });
    });
    describe('deleteAllRight', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '123 456 789\n' +
                    'hello world\n' +
                    'foo()\n' +
                    '\n' +
                    '    1234' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should delete the right half of the line', async () => {
            await resetCursor(1, 6);

            await editHandler.deleteAllRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'hello ');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: 'world' }
            ]);
        });
        it('should remove one new line character', async () => {
            await resetCursor(0, 11);

            await editHandler.deleteAllRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 11]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 456 789hello world');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '\n' }
            ]);
        });
        it('should delete the right half of each line', async () => {
            await selectRanges([[0, 6, 0, 6], [1, 6, 1, 6]]);

            await editHandler.deleteAllRight(textEditor);

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 6], [1, 6]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123 45');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'hello ');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '6 789' },
                { isLeftward: false, text: 'world' }
            ]);
        });
        it('should do nothing if the cursor is at the end of the document', async () => {
            await resetCursor(4, 8);

            await editHandler.deleteAllRight(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 8]]);
            assert.strictEqual(textEditor.document.lineAt(4).text, '    1234');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should delete the selected range (single selection range)', async () => {
            await selectRange(0, 4, 0, 7);

            await editHandler.deleteAllRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123  789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: true, text: '456' }
            ]);
        });
        it('should delete the selected range (single selection range reversed)', async () => {
            await selectRange(0, 7, 0, 4);

            await editHandler.deleteAllRight(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 4]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '123  789');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), [
                { isLeftward: false, text: '456' }
            ]);
        });
    });
    describe('undelete', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '1234567890\n' +
                    '1234567890\n' +
                    'abcde\n' +
                    'fghij\n' +
                    '\n' +
                    '\n' +
                    '12345\n' +
                    '67890' // <= no new line
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should insert the deleted characters to the left of the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'a' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 6]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345a67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert the deleted characters to the right of the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'a' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345a67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should remove selected range and insert characters to the left of it', async () => {
            textEditor.selections = [ new vscode.Selection(1, 2, 1, 7) ];
            while (await sleep(1), !mode.inSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'a' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 3]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12a890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should remove selected range and insert characters to the right of it', async () => {
            textEditor.selections = [ new vscode.Selection(1, 2, 1, 7) ];
            while (await sleep(1), !mode.inSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'a' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 2]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12a890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert a line break to the left of the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: '\n' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(2).text, '67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert a line break to the right of the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: '\n' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345');
            assert.strictEqual(textEditor.document.lineAt(2).text, '67890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the left of multiple-cursors', async () => {
            textEditor.selections = [
                new vscode.Selection(1, 5, 1, 5),
                new vscode.Selection(2, 5, 2, 5)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'abc' },
                { isLeftward: true, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 8], [2, 8]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345abc67890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcdefgh');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the right of multiple-cursors', async () => {
            textEditor.selections = [
                new vscode.Selection(1, 5, 1, 5),
                new vscode.Selection(2, 5, 2, 5)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'abc' },
                { isLeftward: false, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(1).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5], [2, 5]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345abc67890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcdefgh');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should do nothing if the stack is empty', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];

            await editHandler.undelete(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(selectionsAsArray(), [[1, 5]]);
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert deleted single line to the left of each cursor repeatedly', async () => {
            textEditor.selections = [
                new vscode.Selection(0, 10, 0, 10),
                new vscode.Selection(1, 10, 1, 10)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'abc' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(0).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 13], [1, 13]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890abc');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890abc');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert deleted single line to the right of each cursor repeatedly', async () => {
            textEditor.selections = [
                new vscode.Selection(0, 10, 0, 10),
                new vscode.Selection(1, 10, 1, 10)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'abc' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(0).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 10], [1, 10]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '1234567890abc');
            assert.strictEqual(textEditor.document.lineAt(1).text, '1234567890abc');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should leave the rest empty if the number of deleted lines is less than cursors (left)', async () => {
            textEditor.selections = [
                new vscode.Selection(0, 5, 0, 5),
                new vscode.Selection(1, 5, 1, 5),
                new vscode.Selection(2, 5, 2, 5)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'abc' },
                { isLeftward: true, text: 'def' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(0).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 8], [1, 8], [2, 5]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '12345abc67890');
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345def67890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should leave the rest empty if the number of deleted lines is less than cursors (right)', async () => {
            textEditor.selections = [
                new vscode.Selection(0, 5, 0, 5),
                new vscode.Selection(1, 5, 1, 5),
                new vscode.Selection(2, 5, 2, 5)
            ];
            while (await sleep(1), !mode.inSelection()) {}
            while (await sleep(1), !mode.inBoxSelection()) {}
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'abc' },
                { isLeftward: false, text: 'def' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(0).text.length === 10) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[0, 5], [1, 5], [2, 5]]);
            assert.strictEqual(textEditor.document.lineAt(0).text, '12345abc67890');
            assert.strictEqual(textEditor.document.lineAt(1).text, '12345def67890');
            assert.strictEqual(textEditor.document.lineAt(2).text, 'abcde');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the left of lines below the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(4, 0, 4, 0) ];
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'abc' },
                { isLeftward: true, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(4).text.length === 0) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 3], [5, 3]]);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'abc');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'fgh');
            assert.strictEqual(textEditor.document.lineAt(6).text, '12345');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the right of lines below the cursor', async () => {
            textEditor.selections = [ new vscode.Selection(4, 0, 4, 0) ];
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'abc' },
                { isLeftward: false, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(4).text.length === 0) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[4, 0], [5, 0]]);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'abc');
            assert.strictEqual(textEditor.document.lineAt(5).text, 'fgh');
            assert.strictEqual(textEditor.document.lineAt(6).text, '12345');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the left of lines below the cursor with aligned indent', async () => {
            textEditor.selections = [ new vscode.Selection(3, 5, 3, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: true, text: 'abc' },
                { isLeftward: true, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(4).text.length === 0) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 8], [4, 8]]);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghijabc');
            assert.strictEqual(textEditor.document.lineAt(4).text, '     fgh');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
        it('should insert multiple-texts to the right of lines below the cursor with aligned indent', async () => {
            textEditor.selections = [ new vscode.Selection(3, 5, 3, 5) ];
            editHandler.pushUndeleteStack([
                { isLeftward: false, text: 'abc' },
                { isLeftward: false, text: 'fgh' }
            ]);

            await editHandler.undelete(textEditor);
            while (await sleep(1), textEditor.document.lineAt(4).text.length === 0) {}

            assert.strictEqual(mode.inSelection(), true);
            assert.strictEqual(mode.inBoxSelection(), true);
            assert.deepStrictEqual(selectionsAsArray(), [[3, 5], [4, 5]]);
            assert.strictEqual(textEditor.document.lineAt(3).text, 'fghijabc');
            assert.strictEqual(textEditor.document.lineAt(4).text, '     fgh');
            assert.deepStrictEqual(editHandler.readUndeleteStack(), []);
        });
    });
    describe('insertLineBefore', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    '123456\n' +
                    '1234\n' +
                    '1234\n' +
                    '    abcde\n' +
                    '    fghijklmno\n'
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should insert a new line before the current line', async () => {
            await resetCursor(2, 2);

            await editHandler.insertLineBefore(textEditor);

            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '1234');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
        });
        it('should insert a new line and cancel selection range if exists', async () => {
            await selectRange(2, 2, 2, 4);

            await editHandler.insertLineBefore(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '1234');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
        });
        it('should insert a new line and cancel selection range even if anchor retains after edits', async () => {
            await selectRange(2, 0, 2, 4);

            await editHandler.insertLineBefore(textEditor);

            assert.strictEqual(mode.inSelection(), false);
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '1234');
            assert.deepStrictEqual(selectionsAsArray(), [[2, 0]]);
        });
        it('should insert new lines before each cursor (multi-cursor)', async () => {
            await selectRanges([[0, 3, 0, 3], [1, 3, 1, 3]]);

            await editHandler.insertLineBefore(textEditor);

            assert.deepStrictEqual(textEditor.document.lineAt(0).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(1).text, '123456');
            assert.deepStrictEqual(textEditor.document.lineAt(2).text, '');
            assert.deepStrictEqual(textEditor.document.lineAt(3).text, '1234');
            assert.deepStrictEqual(selectionsAsArray(), [[0, 0], [2, 0]]);
        });
    });
    describe('transformCase', () => {
        beforeEach(async () => {
            await testUtils.resetDocument(
                textEditor,
                (
                    'abcdefg hijklmn opqrstu vwxyz\n' +
                    'Abcdefg Hijklmn Opqrstu Vwxyz\n' +
                    '    abcd efgh ijkl\n' +
                    '123 abc def\n' +
                    'ａｂｃｄ ＡＢＣＤ\n' +
                    'αβγδ ΑΒΓΔ\n' +
                    'I have a pen\n'
                ),
                vscode.EndOfLine.CRLF
            );
            editHandler.clearTextStack();
            editHandler.clearUndeleteStack();
            textEditor.selections = [ new vscode.Selection(0, 0, 0, 0) ];
            mode.initialize(textEditor);
        });
        it('should switch case of a word between lower, upper and title case', async () => {
            textEditor.selections = [ new vscode.Selection(0, 8, 0, 8) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg Hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');
        });
        it('should work even if the cursor is at middle of a word', async () => {
            textEditor.selections = [ new vscode.Selection(0, 10, 0, 10) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg Hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN opqrstu vwxyz');
        });
        it('should detect an existing title case word that starts at the cursor position', async () => {
            textEditor.selections = [ new vscode.Selection(1, 8, 1, 8) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg HIJKLMN Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg Hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn Opqrstu Vwxyz');
        });
        it('should detect title case words also when the cursor is at middle of the word', async () => {
            textEditor.selections = [ new vscode.Selection(1, 10, 1, 10) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg HIJKLMN Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg Hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn Opqrstu Vwxyz');
        });
        it('should toggle case of single-letter words', async () => {
            textEditor.selections = [ new vscode.Selection(6, 7, 6, 7) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I have A pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I have a pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I have A pen');
        });
        it('should work with non-ASCII alphabets', async () => {
            textEditor.selections = [ new vscode.Selection(4, 0, 4, 0) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'ＡＢＣＤ ＡＢＣＤ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'Ａｂｃｄ ＡＢＣＤ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'ａｂｃｄ ＡＢＣＤ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(4).text, 'ＡＢＣＤ ＡＢＣＤ');
        });
        it('should work with non-English alphabets', async () => {
            textEditor.selections = [ new vscode.Selection(5, 0, 5, 0) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ ΑΒΓΔ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'Αβγδ ΑΒΓΔ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'αβγδ ΑΒΓΔ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ ΑΒΓΔ');

            textEditor.selections = [ new vscode.Selection(5, 5, 5, 5) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ Αβγδ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ αβγδ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ ΑΒΓΔ');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(5).text, 'ΑΒΓΔ Αβγδ');
        });
        it('should switch case of words in the selection range', async () => {
            textEditor.selections = [ new vscode.Selection(0, 8, 0, 24) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN OPQRSTU vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg Hijklmn Opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN OPQRSTU vwxyz');
        });
        it('should detect existing title case in the selection range', async () => {
            textEditor.selections = [ new vscode.Selection(1, 8, 1, 24) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg HIJKLMN OPQRSTU Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg Hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn opqrstu Vwxyz');
        });
        it('should toggle case of a single-letter word in selection range', async () => {
            textEditor.selections = [ new vscode.Selection(6, 0, 6, 2) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'i have a pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I have a pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'i have a pen');
        });
        it('should switch case of words in selection range even if it starts with a single-letter word', async () => {
            textEditor.selections = [ new vscode.Selection(6, 0, 6, 12) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I HAVE A PEN');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I Have A Pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'i have a pen');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(6).text, 'I HAVE A PEN');
        });
        it('should work even if the selection range starts with non-alphabet characters', async () => {
            textEditor.selections = [ new vscode.Selection(3, 0, 3, 8) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 ABC def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 Abc def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 abc def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 ABC def');
        });
        it('should work even if the selection range starts with multiple spaces', async () => {
            textEditor.selections = [ new vscode.Selection(2, 0, 2, 14) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    ABCD EFGH ijkl');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    Abcd Efgh ijkl');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    abcd efgh ijkl');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    ABCD EFGH ijkl');
        });
        it('should check the character immediately before the cursor if non-alphabet character', async () => {
            textEditor.selections = [ new vscode.Selection(0, 7, 0, 7) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'Abcdefg hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'ABCDEFG hijklmn opqrstu vwxyz');
        });
        it('should check the character immediately before the cursor if at EOL', async () => {
            textEditor.selections = [ new vscode.Selection(0, 29, 0, 29) ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu VWXYZ');
        });
        it('should do nothing if no alphabet character', async () => {
            textEditor.selections = [ new vscode.Selection(3, 0, 3, 0) ];

            await editHandler.transformCase(textEditor);
            await sleep(20);
            await sleep(20);
            await sleep(20);

            assert.strictEqual(textEditor.document.lineAt(3).text, '123 abc def');
        });
        it('should work with multiple selection ranges', async () => {
            textEditor.selections = [
                new vscode.Selection(0, 8, 0, 24),
                new vscode.Selection(1, 8, 1, 24)
            ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN OPQRSTU vwxyz');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg HIJKLMN OPQRSTU Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg Hijklmn Opqrstu vwxyz');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg Hijklmn Opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg hijklmn opqrstu vwxyz');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg hijklmn opqrstu Vwxyz');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(0).text, 'abcdefg HIJKLMN OPQRSTU vwxyz');
            assert.strictEqual(textEditor.document.lineAt(1).text, 'Abcdefg HIJKLMN OPQRSTU Vwxyz');
        });
        it('should work with multiple selection ranges even if the first one contains no alphabets', async () => {
            textEditor.selections = [
                new vscode.Selection(2, 0, 2, 4),
                new vscode.Selection(3, 0, 3, 7)
            ];

            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    abcd efgh ijkl');
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 ABC def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    abcd efgh ijkl');
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 Abc def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    abcd efgh ijkl');
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 abc def');
            await editHandler.transformCase(textEditor);
            assert.strictEqual(textEditor.document.lineAt(2).text, '    abcd efgh ijkl');
            assert.strictEqual(textEditor.document.lineAt(3).text, '123 ABC def');
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
            await resetCursor(1, 0);

            await editHandler.insertPath(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, textEditor.document.fileName);
        });
        it('should replace selection range with the file path of current document', async () => {
            await selectRange(1, 0, 2, 7);

            await editHandler.insertPath(textEditor);
            assert.strictEqual(textEditor.document.lineAt(1).text, textEditor.document.fileName);
            assert.strictEqual(textEditor.document.lineAt(2).text, 'ABCDEFG');
        });
    });
});
