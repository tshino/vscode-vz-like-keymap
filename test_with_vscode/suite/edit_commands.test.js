"use strict";
const assert = require('assert');
const vscode = require('vscode');
const testUtils = require("./testUtils.js");
const mode_handler = require("./../../src/mode_handler.js");
const edit_commands = require("./../../src/edit_commands.js");

describe('EditHandler', () => {
    vscode.window.showInformationMessage('Started test for EditHandler.');
    const mode = mode_handler.ModeHandler();
    const editHandler = edit_commands.EditHandler(mode);

    let textEditor;
    before(async () => {
        textEditor = await testUtils.setupTextEditor({ content: '' });
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
});
