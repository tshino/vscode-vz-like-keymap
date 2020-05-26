"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const edit_commands = require("./../../src/edit_commands.js");

describe('EditHandler', () => {
    vscode.window.showInformationMessage('Started test for EditHandler.');
    const mode = mode_handler.getInstance();
    const editHandler = edit_commands.getInstance();
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

    let textEditor;
    before(async () => {
        textEditor = await testUtils.setupTextEditor({ content: '' });
        mode.initialize(textEditor);
    });
    describe('singleLineRange', () => {
        it('makes a single line range', () => {
            let range = editHandler.singleLineRange(5);
            assert.equal(5, range.start.line);
            assert.equal(0, range.start.character);
            assert.equal(6, range.end.line);
            assert.equal(0, range.end.character);
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
            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(1, 10, 1, 10) ));

            textEditor.selections = [ new vscode.Selection(1, 0, 2, 5) ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(2, 5, 2, 5) ));
        });
        it('should cancel multiple selection range and locate cursor at the start of the topmost selection', () => {
            textEditor.selections = [
                new vscode.Selection(1, 0, 1, 5),
                new vscode.Selection(2, 0, 2, 5),
                new vscode.Selection(3, 0, 3, 5)
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(1, 0, 1, 0) ));

            textEditor.selections = [
                new vscode.Selection(3, 0, 3, 5),
                new vscode.Selection(2, 0, 2, 5),
                new vscode.Selection(1, 0, 1, 5)
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(1, 0, 1, 0) ));

            textEditor.selections = [
                new vscode.Selection(3, 5, 3, 0),
                new vscode.Selection(2, 5, 2, 0),
                new vscode.Selection(1, 5, 1, 0),
            ];
            mode.initialize(textEditor);
            editHandler.cancelSelection(textEditor);
            assert.equal(mode.inSelection(), false);
            assert.equal(textEditor.selections.length, 1);
            assert(textEditor.selections[0].isEqual( new vscode.Selection(1, 0, 1, 0) ));
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
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(1, 3, 1, 7) ]),
                '4567'
            );
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 0, 10) ]),
                '1234567890'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.CRLF);
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 1, 0) ]),
                '1234567890\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.LF);
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(0, 0, 1, 0) ]),
                '1234567890\n'
            );
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(0, 5, 1, 5) ]),
                '67890\n12345'
            );
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(0, 10, 1, 0) ]),
                '\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.CRLF);
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(3, 0, 6, 0) ]),
                'fghij\n\n12345\n'
            );
            await testUtils.setEndOfLine(textEditor, vscode.EndOfLine.LF);
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(3, 0, 6, 0) ]),
                'fghij\n\n12345\n'
            );
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(6, 0, 7, 0) ]),
                '67890' // no new line (end of document)
            );
        });
        it('should extract text from document (empty range)', () => {
            mode.initialize(textEditor);
            assert.equal(
                editHandler.readText(textEditor, [ new vscode.Range(1, 3, 1, 3) ]),
                ''
            );
        });
        it('should extract text from document (multiple ranges)', () => {
            mode.initialize(textEditor);
            assert.equal(
                editHandler.readText(textEditor, [
                    new vscode.Range(0, 5, 0, 8),
                    new vscode.Range(1, 5, 1, 8)
                ]),
                '678\n678\n'
            );
            assert.equal(
                editHandler.readText(textEditor, [
                    new vscode.Range(0, 0, 0, 10),
                    new vscode.Range(1, 0, 1, 10)
                ]),
                '1234567890\n1234567890\n'
            );
            assert.equal(
                editHandler.readText(textEditor, [
                    new vscode.Range(3, 0, 3, 5),
                    new vscode.Range(2, 0, 2, 5)
                ]),
                'abcde\nfghij\n'
            );
            assert.equal(
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
            assert.equal(textEditor.document.lineAt(0).text, '1234590');
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(1, 5, 2, 2) ]);
            });
            assert.equal(textEditor.document.lineAt(1).text, '12345cde');
        });
        it('should delete texts in specified ranges (multiple ranges)', async () => {
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [
                    new vscode.Range(0, 5, 0, 8),
                    new vscode.Range(1, 5, 1, 8)
                ]);
            });
            assert.equal(textEditor.document.lineAt(0).text, '1234590');
            assert.equal(textEditor.document.lineAt(1).text, '1234590');
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [
                    new vscode.Range(2, 1, 2, 2),
                    new vscode.Range(2, 3, 2, 4)
                ]);
            });
            assert.equal(textEditor.document.lineAt(2).text, 'ace');
        });
        it('should concatenate two lines when deleting a new line', async () => {
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(2, 5, 3, 0) ]);
            });
            assert.equal(textEditor.document.lineAt(2).text, 'abcdefghij');
        });
        it('should decrement lineCount when deleting a single line', async () => {
            assert.equal(textEditor.document.lineCount, 7);
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(3, 0, 4, 0) ]);
            });
            assert.equal(textEditor.document.lineCount, 6);
        });
        it('should retain lineCount when deleting the last line which has no new line', async () => {
            assert.equal(textEditor.document.lineCount, 7);
            await textEditor.edit(edit => {
                editHandler.deleteRanges(edit, [ new vscode.Range(6, 0, 7, 0) ]);
            });
            assert.equal(textEditor.document.lineCount, 7);
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
                assert.equal(ranges.length, 1);
                assert.equal(ranges[0].isEqual(new vscode.Range(0, 0, 1, 0)), true);
                assert.equal(isLineMode, false);
            }
            {
                textEditor.selections = [ new vscode.Selection(2, 3, 0, 5) ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.equal(ranges.length, 1);
                assert.equal(ranges[0].isEqual(new vscode.Range(0, 5, 2, 3)), true);
                assert.equal(isLineMode, false);
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
                assert.equal(ranges.length, 2);
                assert.equal(ranges[0].isEqual(new vscode.Range(0, 0, 0, 7)), true);
                assert.equal(ranges[1].isEqual(new vscode.Range(1, 0, 1, 7)), true);
                assert.equal(isLineMode, false);
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
                assert.equal(ranges.length, 3);
                assert.equal(ranges[0].isEqual(new vscode.Range(0, 5, 0, 8)), true);
                assert.equal(ranges[1].isEqual(new vscode.Range(1, 5, 1, 8)), true);
                assert.equal(ranges[2].isEqual(new vscode.Range(2, 5, 2, 5)), true);
                assert.equal(isLineMode, false);
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
                assert.equal(ranges.length, 3);
                assert.equal(ranges[0].isEqual(new vscode.Range(1, 2, 1, 5)), true);
                assert.equal(ranges[2].isEqual(new vscode.Range(3, 2, 3, 5)), true);
                assert.equal(isLineMode, false);
            }
            {
                textEditor.selections = [
                    new vscode.Selection(1, 8, 1, 10),
                    new vscode.Selection(1, 0, 1, 2),
                    new vscode.Selection(0, 0, 0, 2)
                ];
                mode.initialize(textEditor);
                let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
                assert.equal(ranges.length, 3);
                assert.equal(ranges[0].isEqual(new vscode.Range(0, 0, 0, 2)), true);
                assert.equal(ranges[2].isEqual(new vscode.Range(1, 8, 1, 10)), true);
                assert.equal(isLineMode, false);
            }
        });
        it('should make a single-line range when the selection is empty (Line mode)', () => {
            textEditor.selections = [ new vscode.Selection(1, 4, 1, 4) ];
            mode.initialize(textEditor);
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.equal(ranges.length, 1);
            assert.equal(ranges[0].isEqual(new vscode.Range(1, 0, 2, 0)), true);
            assert.equal(isLineMode, true);
        });
        it('should make a single-line, but excluding new line character, range when the selection is empty and is in box-selection mode', () => {
            textEditor.selections = [ new vscode.Selection(1, 4, 1, 4) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.equal(ranges.length, 1);
            assert.equal(ranges[0].isEqual(new vscode.Range(1, 0, 1, 10)), true);
            assert.equal(isLineMode, true);
        });
        it('should make multiple single-line, but excluding new line character, ranges when the selections are all empty', () => {
            textEditor.selections = [
                new vscode.Selection(3, 3, 3, 3),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 3, 5, 3)
            ];
            mode.initialize(textEditor);
            let [ranges, isLineMode] = editHandler.makeCutCopyRanges(textEditor);
            assert.equal(ranges.length, 3);
            assert.equal(ranges[0].isEqual(new vscode.Range(3, 0, 3, 5)), true);
            assert.equal(ranges[1].isEqual(new vscode.Range(4, 0, 4, 0)), true);
            assert.equal(ranges[2].isEqual(new vscode.Range(5, 0, 5, 5)), true);
            assert.equal(isLineMode, true);
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
            assert.equal(ranges.length, 3);
            assert.equal(ranges[0].isEqual(new vscode.Range(1, 0, 1, 10)), true);
            assert.equal(ranges[1].isEqual(new vscode.Range(2, 0, 2, 5)), true);
            assert.equal(ranges[2].isEqual(new vscode.Range(3, 0, 3, 5)), true);
            assert.equal(isLineMode, true);
        });
    });
    describe('vz.clipboardCut', () => {
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
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCut');
            assert.equal(textEditor.document.lineCount, 6);
            assert.equal(textEditor.document.lineAt(0).text, '123890');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(0, 3, 0, 3)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, '4567890\n1234567');
        });
        it('should delete an entire line when selection is empty', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCut');
            assert.equal(textEditor.document.lineCount, 6);
            assert.equal(textEditor.document.lineAt(2).text, 'fghij');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 0, 2, 0)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'abcde\n');
        });
        it('should delete the line but leave empty line there when in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCut');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(2).text, '');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 0, 2, 0)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'abcde');
        });
        it('should delete multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            while (await sleep(1), !mode.inBoxSelection()) {} // ensure all handlers get invoked
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCut');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(3).text, 'fj');
            assert.equal(textEditor.document.lineAt(4).text, '');
            assert.equal(textEditor.document.lineAt(5).text, '15');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(3, 1, 3, 1)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'ghi\n\n234\n');
        });
        it('should delete multiple lines and leave empty line there when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCut');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(3).text, '');
            assert.equal(textEditor.document.lineAt(4).text, '');
            assert.equal(textEditor.document.lineAt(5).text, '');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(3, 0, 3, 0)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'fghij\n\n12345\n');
        });
    });
    describe('vz.clipboardCopy', () => {
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
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(0).text, '1234567890');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(1, 7, 1, 7)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, '4567890\n1234567');
        });
        it('should copy an entire line when selection is empty', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(2).text, 'abcde');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 3, 2, 3)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'abcde\n');
        });
        it('should copy the line when in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(2).text, 'abcde');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 3, 2, 3)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'abcde');
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(3).text, 'fghij');
            assert.equal(textEditor.document.lineAt(4).text, '');
            assert.equal(textEditor.document.lineAt(5).text, '12345');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(3, 1, 3, 1)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'ghi\n\n234\n');
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(3).text, 'fghij');
            assert.equal(textEditor.document.lineAt(4).text, '');
            assert.equal(textEditor.document.lineAt(5).text, '12345');
            assert.equal(textEditor.selections.length, 1);
            assert.equal(textEditor.selections[0].isEmpty, true);
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(3, 2, 3, 2)), true);
            assert.equal(mode.inSelection(), false);
            let clipboard = await vscode.env.clipboard.readText();
            assert.equal(clipboard, 'fghij\n\n12345\n');
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
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '4567890\n1234567');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '4567890\n1234567');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should read the last copied/cut line with empty selection', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'abcde\n');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, false);
        });
        it('should read the last copied/cut line in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'abcde');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, true);
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'ghi\n\n234\n');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, true);
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'fghij\n\n12345\n');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, true);
        });
        it('should return clipboard text if it does not match the last copied/cut text', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            await vscode.env.clipboard.writeText('unknown text');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'unknown text');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text (multi)', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            await vscode.env.clipboard.writeText('diff\nerent\ntext');
            let [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'diff\nerent\ntext');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), 'diff\nerent\ntext');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'diff\nerent\ntext');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
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
            assert.equal(text, 'clipboard');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should return empty string if text stack is empty', async () => {
            await vscode.env.clipboard.writeText('');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), '');
        });
        it('should read the last copied/cut part of document', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, '4567890\n1234567');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should read the last copied/cut line with empty selection', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'abcde\n');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should read the last copied/cut line in box-selection mode', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            mode.initialize(textEditor);
            mode.startSelection(textEditor, true); // box-selection mode
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'abcde');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, true);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should copy multiple selection ranges when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 1, 3, 4),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 1, 5, 4)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'ghi\n\n234\n');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, true);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should copy multiple lines when in box-selection mode', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'fghij\n\n12345\n');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, true);
            assert.equal(await vscode.env.clipboard.readText(), '');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text', async () => {
            textEditor.selections = [ new vscode.Selection(0, 3, 1, 7) ];
            mode.initialize(textEditor);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            await vscode.env.clipboard.writeText('unknown text');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'unknown text');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), '4567890\n1234567');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, '4567890\n1234567');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
        });
        it('should return clipboard text if it does not match the last copied/cut text (multi)', async () => {
            textEditor.selections = [
                new vscode.Selection(3, 2, 3, 2),
                new vscode.Selection(4, 0, 4, 0),
                new vscode.Selection(5, 2, 5, 2)
            ];
            mode.initialize(textEditor);
            assert.equal(textEditor.document.lineCount, 7);
            await vscode.commands.executeCommand('vz.clipboardCopy');
            await vscode.env.clipboard.writeText('diff\nerent\ntext');
            let [text, isLineMode, isBoxMode] = await editHandler.popTextStack();
            assert.equal(text, 'diff\nerent\ntext');
            assert.equal(isLineMode, false);
            assert.equal(isBoxMode, false);
            assert.equal(await vscode.env.clipboard.readText(), 'fghij\n\n12345\n');
            [text, isLineMode, isBoxMode] = await editHandler.peekTextStack();
            assert.equal(text, 'fghij\n\n12345\n');
            assert.equal(isLineMode, true);
            assert.equal(isBoxMode, true);
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
        });
        it('should insert a single line into the document', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!\n');
            assert.equal(textEditor.document.lineCount, 8);
            assert.equal(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.equal(textEditor.document.lineAt(3).text, 'abcde');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 3, 2, 3)), true);
        });
        it('should insert multiple lines into the document', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!\nHave a nice day!\n');
            assert.equal(textEditor.document.lineCount, 9);
            assert.equal(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.equal(textEditor.document.lineAt(3).text, 'Have a nice day!');
            assert.equal(textEditor.document.lineAt(4).text, 'abcde');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 3, 2, 3)), true);
        });
        it('should insert a single line even if it has no new line', async () => {
            textEditor.selections = [ new vscode.Selection(5, 3, 5, 3) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.equal(textEditor.document.lineCount, 8);
            assert.equal(textEditor.document.lineAt(5).text, 'Hello, world!');
            assert.equal(textEditor.document.lineAt(6).text, '12345');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(5, 3, 5, 3)), true);
        });
        it('should insert a single line even if both the text and the current line of the document have no new line', async () => {
            textEditor.selections = [ new vscode.Selection(6, 3, 6, 3) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.equal(textEditor.document.lineCount, 8);
            assert.equal(textEditor.document.lineAt(6).text, 'Hello, world!');
            assert.equal(textEditor.document.lineAt(7).text, '67890');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(6, 3, 6, 3)), true);
        });
        it('should insert a text without new line into the last line of doc if the text has no new line and the last line is empty', async () => {
            await textEditor.edit((edit) => {
                edit.insert(new vscode.Position(6, 5), '\n');
            });
            textEditor.selections = [ new vscode.Selection(7, 0, 7, 0) ];
            assert.equal(textEditor.document.lineCount, 8);
            await editHandler.pasteLines(textEditor, 'Hello, world!');
            assert.equal(textEditor.document.lineCount, 8);
            assert.equal(textEditor.document.lineAt(7).text, 'Hello, world!');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(7, 0, 7, 0)), true);
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
        });
        it('should insert a text inline', async () => {
            textEditor.selections = [ new vscode.Selection(2, 3, 2, 3) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(2).text, 'abcHello, world!de');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 16, 2, 16)), true);
        });
        it('should replace the current selection range with a text', async () => {
            textEditor.selections = [ new vscode.Selection(2, 1, 2, 4) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!');
            assert.equal(textEditor.document.lineCount, 7);
            assert.equal(textEditor.document.lineAt(2).text, 'aHello, world!e');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 14, 2, 14)), true);
        });
        it('should replace multiple lines of current selection range with a text', async () => {
            textEditor.selections = [ new vscode.Selection(2, 0, 4, 0) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello, world!\n');
            assert.equal(textEditor.document.lineCount, 6);
            assert.equal(textEditor.document.lineAt(2).text, 'Hello, world!');
            assert.equal(textEditor.document.lineAt(3).text, '');
            assert.equal(textEditor.document.lineAt(4).text, '12345');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(3, 0, 3, 0)), true);
        });
        it('should insert a text inline even if it contains new lines', async () => {
            textEditor.selections = [ new vscode.Selection(1, 5, 1, 5) ];
            assert.equal(textEditor.document.lineCount, 7);
            await editHandler.pasteInlineText('Hello,\nworld!');
            assert.equal(textEditor.document.lineCount, 8);
            assert.equal(textEditor.document.lineAt(1).text, '12345Hello,');
            assert.equal(textEditor.document.lineAt(2).text, 'world!67890');
            assert.equal(textEditor.selections[0].isEqual(new vscode.Selection(2, 6, 2, 6)), true);
        });
    });
});
