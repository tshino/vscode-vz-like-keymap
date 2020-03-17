"use strict";
const assert = require('assert');
const mode_handler = require('../src/mode_handler.js');

const PositionMock = (function() {
    let proto = {};
    proto.isEqual = function(other) {
        return (
            this.line === other.line &&
            this.character == other.character
        );
    };
    return function(line, col) {
        return {
            line: line,
            character: col,
            __proto__: proto
        };
    };
})();

const SelectionMock = (function() {
    return function(anchor, active) {
        return {
            isEmpty: anchor.isEqual(active),
            anchor: anchor,
            active: active
        };
    };
})();

const TextEditorMock = (function() {
    let sels = [
        SelectionMock(PositionMock(0, 0), PositionMock(0, 0))
    ];
    return function() {
        return {
            selection: sels[0],
            selections: sels
        };
    };
})();

describe('PositionMock', function() {
    it('should have properties line and character', function() {
        let pos = PositionMock(3, 4);
        assert.equal(pos.line, 3);
        assert.equal(pos.character, 4);
    });
    describe('isEqual', function() {
        it('should return true iff two positions are equal', function() {
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(3, 4)), true);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(1, 2)), false);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(3, 0)), false);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(0, 4)), false);
        });
    });
});

describe('SelectionMock', function() {
    it('should have properties anchor, active and isEmpty', function() {
        let sel = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
        assert('anchor' in sel);
        assert('active' in sel);
        assert('isEmpty' in sel);
    });
    describe('isEmpty', function() {
        it('should be true iff anchor and active are equal', function() {
            let sel1 = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
            let sel2 = SelectionMock(PositionMock(1, 2), PositionMock(1, 2));
            assert.equal(sel1.isEmpty, false);
            assert.equal(sel2.isEmpty, true);
        });
    });
});

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
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onStartSelection(function() {
                    count++;
                });
                mode.startSelection(te, false);
                assert.equal(count, 1);
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
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onResetSelection(function() {
                    count++;
                });
                mode.resetSelection(te);
                assert.equal(count, 1);
            });
        });
        describe('resetBoxSelection', function() {
            it('should turn off box selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, true);
                mode.resetBoxSelection();
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);
            });
        });
    });
});
