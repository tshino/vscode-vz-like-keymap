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
});
