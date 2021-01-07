"use strict";
const assert = require('assert');
const EditUtil = require('../src/edit_util.js');
const PositionMock = require('./position_mock.js');
const SelectionMock = require('./selection_mock.js');
const RangeMock = SelectionMock;

describe('EditUtil', function() {
    describe('enumVisibleLines', () => {
        it('should return array of line numbers in current visible ranges', () => {
            assert.deepStrictEqual(
                EditUtil.enumVisibleLines({ visibleRanges: [
                    SelectionMock(PositionMock(3, 0), PositionMock(20, 10))
                ] }),
                [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
            );
            assert.deepStrictEqual(
                EditUtil.enumVisibleLines({ visibleRanges: [
                    SelectionMock(PositionMock(0, 0), PositionMock(5, 0)),
                    SelectionMock(PositionMock(10, 0), PositionMock(12, 0))
                ] }),
                [0, 1, 2, 3, 4, 5, 10, 11, 12]
            );
        });
    });
    describe('getLowerBoundLineIndex', () => {
        it('should return index of smallest number which is greater than or equal to number in query', () => {
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 0), 0);
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 1), 0);
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 2), 1);
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 3), 2);
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 5), 2);
            assert.strictEqual(EditUtil.getLowerBoundLineIndex([1, 2, 5], 6), 3);
        });
    });
    describe('isLastLineVisible', () => {
        it('should return true if the last line of the document is visible', () => {
            let textEditorMock = {
                visibleRanges: [ SelectionMock(PositionMock(3, 0), PositionMock(20, 10)) ],
                document: { lineCount: 0 }
            };
            textEditorMock.document.lineCount = 100;
            assert.strictEqual(EditUtil.isLastLineVisible(textEditorMock), false);
            textEditorMock.document.lineCount = 22;
            assert.strictEqual(EditUtil.isLastLineVisible(textEditorMock), false);
            textEditorMock.document.lineCount = 21;
            assert.strictEqual(EditUtil.isLastLineVisible(textEditorMock), true);
        });
    });
    describe('isCursorAtEndOfLine', () => {
        it('should return true if the cursor is at the end of a line', () => {
            let textEditorMock = {
                document: {
                    lineAt: (line) => ({
                        range: RangeMock(
                            PositionMock(line, 0),
                            PositionMock(line, line <= 4 ? 5 : 0)
                        )
                    })
                }
            };
            textEditorMock.selection = SelectionMock(PositionMock(3, 0), PositionMock(3, 0));
            assert.strictEqual(EditUtil.isCursorAtEndOfLine(textEditorMock), false);
            textEditorMock.selection = SelectionMock(PositionMock(3, 5), PositionMock(3, 5));
            assert.strictEqual(EditUtil.isCursorAtEndOfLine(textEditorMock), true);
            textEditorMock.selection = SelectionMock(PositionMock(2, 3), PositionMock(2, 5));
            assert.strictEqual(EditUtil.isCursorAtEndOfLine(textEditorMock), true);
            textEditorMock.selection = SelectionMock(PositionMock(2, 5), PositionMock(2, 2));
            assert.strictEqual(EditUtil.isCursorAtEndOfLine(textEditorMock), false);
            textEditorMock.selection = SelectionMock(PositionMock(10, 0), PositionMock(10, 0));
            assert.strictEqual(EditUtil.isCursorAtEndOfLine(textEditorMock), true);
        });
    });
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
            assert.strictEqual(EditUtil.rangesAllEmpty(empty), true);
            assert.strictEqual(EditUtil.rangesAllEmpty(singleLine), false);
            assert.strictEqual(EditUtil.rangesAllEmpty(multi1), true);
            assert.strictEqual(EditUtil.rangesAllEmpty(multi2), false);
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
    describe('normalizeEOL', function() {
        it('should replace every CRLF to LF', function() {
            assert.strictEqual(
                EditUtil.normalizeEOL('hogehoge\r\n'),
                'hogehoge\n'
            );
            assert.strictEqual(
                EditUtil.normalizeEOL('hogehoge'),
                'hogehoge'
            );
            assert.strictEqual(
                EditUtil.normalizeEOL('\r\nhogehoge'),
                '\nhogehoge'
            );
            assert.strictEqual(
                EditUtil.normalizeEOL('hoge\r\nhoge\r\n'),
                'hoge\nhoge\n'
            );
            assert.strictEqual(
                EditUtil.normalizeEOL('hoge\nhoge\n'),
                'hoge\nhoge\n'
            );
        });
    });
});
