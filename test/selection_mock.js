"use strict";
const assert = require('assert');
const PositionMock = require('./position_mock.js');

const SelectionMock = (function() {
    return function(anchor, active = anchor) {
        let start = anchor, end = active;
        if (start.isAfter(end)) {
            [start, end] = [end, start];
        }
        return {
            isEmpty: anchor.isEqual(active),
            anchor: anchor,
            active: active,
            start: start,
            end: end
        };
    };
})();

module.exports = SelectionMock;

describe('SelectionMock', function() {
    it('should have properties anchor, active, start, end and isEmpty', function() {
        let sel = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
        assert('anchor' in sel);
        assert('active' in sel);
        assert('start' in sel);
        assert('end' in sel);
        assert('isEmpty' in sel);
    });
    it('should be able to be constructed with one position argument', function() {
        let sel = SelectionMock(PositionMock(5, 7));
        assert.equal(sel.isEmpty, true);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(5, 7)));
        assert(sel.start.isEqual(PositionMock(5, 7)));
        assert(sel.end.isEqual(PositionMock(5, 7)));
    });
    it('should be able to be constructed with two position arguments', function() {
        let sel = SelectionMock(PositionMock(5, 7), PositionMock(10, 0));
        assert.equal(sel.isEmpty, false);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(10, 0)));
        assert(sel.start.isEqual(PositionMock(5, 7)));
        assert(sel.end.isEqual(PositionMock(10, 0)));
    });
    describe('start and end', function() {
        it('should be ordered so that start is before or equal to end', function() {
            let sel = SelectionMock(PositionMock(10, 0), PositionMock(5, 0));
            assert(sel.start.isEqual(PositionMock(5, 0)));
            assert(sel.end.isEqual(PositionMock(10, 0)));
        });
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
