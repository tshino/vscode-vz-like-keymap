"use strict";
const assert = require('assert');
const mode_handler = require('../src/mode_handler.js');

const TextEditorMock = (function() {
    let sels = [
        {
            isEmpty: true,
            anchor: {
                line: 0,
                character: 0,
                isEqual: function(other) {
                    return (
                        line === other.line &&
                        character == other.character
                    );
                }
            },
        }
    ];
    return function() {
        return {
            selection: sels[0],
            selections: sels
        };
    };
})();

describe('mode_handler', function() {
    describe('ModeHandler', function() {
        it('should be normal (non-selection) state when it is initialized', function() {
            let mode = mode_handler.ModeHandler();
            assert.equal(mode.inSelection(), false);
            assert.equal(mode.inBoxSelection(), false);
        });
        describe('startSelection', function() {
            it('should turn on selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);
            });
        });
        describe('resetSelection', function() {
            it('should turn off selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                mode.resetSelection(te);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                mode.resetSelection(te);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);
            });
        });
    });
});
