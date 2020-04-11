"use strict";
const assert = require('assert');
const PositionMock = require('./position_mock.js');

const SelectionMock = (function() {
    return function(anchor, active = anchor) {
        return {
            isEmpty: anchor.isEqual(active),
            anchor: anchor,
            active: active
        };
    };
})();

module.exports = SelectionMock;

describe('SelectionMock', function() {
    it('should have properties anchor, active and isEmpty', function() {
        let sel = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
        assert('anchor' in sel);
        assert('active' in sel);
        assert('isEmpty' in sel);
    });
    it('should be able to be constructed with one position argument', function() {
        let sel = SelectionMock(PositionMock(5, 7));
        assert.equal(sel.isEmpty, true);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(5, 7)));
    });
    it('should be able to be constructed with two position arguments', function() {
        let sel = SelectionMock(PositionMock(5, 7), PositionMock(10, 0));
        assert.equal(sel.isEmpty, false);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(10, 0)));
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
