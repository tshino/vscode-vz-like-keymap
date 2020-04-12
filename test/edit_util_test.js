"use strict";
const assert = require('assert');
const EditUtil = require('../src/edit_util.js');
const PositionMock = require('./position_mock.js');
const SelectionMock = require('./selection_mock.js');
const RangeMock = SelectionMock;

describe('EditUtil', function() {
    describe('rangesAllEmpty', function() {
        it('should return true if all ranges are empty', function() {
            const empty = [
                RangeMock(PositionMock(5, 0))
            ];
            const singleLine = [
                RangeMock(PositionMock(5, 0), PositionMock(5, 10))
            ];
            const multi1 = [
                RangeMock(PositionMock(5, 0)),
                RangeMock(PositionMock(6, 0))
            ];
            const multi2 = [
                RangeMock(PositionMock(5, 0)),
                RangeMock(PositionMock(6, 0), PositionMock(6, 10))
            ];
            assert.equal(EditUtil.rangesAllEmpty(empty), true);
            assert.equal(EditUtil.rangesAllEmpty(singleLine), false);
            assert.equal(EditUtil.rangesAllEmpty(multi1), true);
            assert.equal(EditUtil.rangesAllEmpty(multi2), false);
        });
    });
    describe('sortRangesInAscending', function() {
        it('should make the range ascending order', function() {
            const ranges1 = [
                RangeMock(PositionMock(5, 0), PositionMock(5, 5)),
                RangeMock(PositionMock(6, 0), PositionMock(6, 5))
            ];
            const ranges2 = [
                RangeMock(PositionMock(6, 0), PositionMock(6, 5)),
                RangeMock(PositionMock(5, 0), PositionMock(5, 5))
            ];
            EditUtil.sortRangesInAscending(ranges1);
            assert(ranges1[0].start.isEqual(PositionMock(5, 0)));
            EditUtil.sortRangesInAscending(ranges2);
            assert(ranges2[0].start.isEqual(PositionMock(5, 0)));
        });
    });
    describe('topmostSelection', function() {
        it('should find the topmost selection from passed selection array which is ordered in either ascending or descending', function() {
            const empty = [
                SelectionMock(PositionMock(5, 0))
            ];
            const single = [
                SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
            ];
            const multi1 = [
                SelectionMock(PositionMock(5, 0), PositionMock(5, 10)),
                SelectionMock(PositionMock(6, 0), PositionMock(6, 5)),
                SelectionMock(PositionMock(7, 0), PositionMock(7, 0))
            ];
            const multi2 = [
                SelectionMock(PositionMock(7, 0), PositionMock(7, 0)),
                SelectionMock(PositionMock(6, 0), PositionMock(6, 5)),
                SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
            ];
            const multi3 = [
                SelectionMock(PositionMock(6, 80), PositionMock(6, 90)),
                SelectionMock(PositionMock(6, 0), PositionMock(6, 10)),
                SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
            ];
            assert(EditUtil.topmostSelection(empty).start.isEqual(PositionMock(5,0)));
            assert(EditUtil.topmostSelection(single).start.isEqual(PositionMock(5,0)));
            assert(EditUtil.topmostSelection(multi1).start.isEqual(PositionMock(5,0)));
            assert(EditUtil.topmostSelection(multi2).start.isEqual(PositionMock(5,0)));
            assert(EditUtil.topmostSelection(multi3).start.isEqual(PositionMock(5,0)));
        });
    });
    describe('getUniqueLineNumbersOfRanges', function() {
        it('should remove duplicate line numbers in ranges', function() {
            const ranges1 = [
                RangeMock(PositionMock(5, 0), PositionMock(5, 10)),
                RangeMock(PositionMock(6, 0), PositionMock(6, 10)),
                RangeMock(PositionMock(6, 80), PositionMock(6, 85)),
                RangeMock(PositionMock(7, 0), PositionMock(7, 10))
            ];
            const lines1 = EditUtil.getUniqueLineNumbersOfRanges(ranges1);
            assert.deepStrictEqual(lines1, [5, 6, 7]);
        });
    });
});
