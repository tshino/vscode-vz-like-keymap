"use strict";
const assert = require('assert');

const PositionMock = (function() {
    const proto = {};
    proto.isEqual = function(other) {
        return (
            this.line === other.line &&
            this.character == other.character
        );
    };
    proto.isAfter = function(other) {
        return (
            this.line > other.line ||
            (this.line === other.line && this.character > other.character)
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

module.exports = PositionMock;

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
    describe('isAfter', function() {
        it('should return true iff this position is on a greater line or on the same line on a greater character', function() {
            assert.equal(PositionMock(0, 0).isAfter(PositionMock(0, 0)), false);
            assert.equal(PositionMock(1, 0).isAfter(PositionMock(0, 0)), true);
            assert.equal(PositionMock(0, 1).isAfter(PositionMock(0, 0)), true);
            assert.equal(PositionMock(5, 5).isAfter(PositionMock(5, 10)), false);
            assert.equal(PositionMock(5, 5).isAfter(PositionMock(5, 5)), false);
            assert.equal(PositionMock(5, 5).isAfter(PositionMock(5, 3)), true);
            assert.equal(PositionMock(4, 7).isAfter(PositionMock(5, 5)), false);
            assert.equal(PositionMock(6, 3).isAfter(PositionMock(5, 5)), true);
        });
    });
});
