"use strict";
const assert = require('assert');
const vscode = require('vscode');
const mode_handler = require("./../../src/mode_handler.js");
const edit_commands = require("./../../src/edit_commands.js");

suite('EditHandler', () => {
    vscode.window.showInformationMessage('Start all tests.');
    const mode = mode_handler.ModeHandler();
    const editHandler = edit_commands.EditHandler(mode);

    test('singleLineRange', () => {
        test('makes a single line range', () => {
            let range = editHandler.singleLineRange(5);
            assert.equal(5, range.start.line);
            assert.equal(0, range.start.character);
            assert.equal(6, range.end.line);
            assert.equal(0, range.end.character);
        });
    });
});
