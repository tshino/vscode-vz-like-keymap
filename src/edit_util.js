"use strict";

const EditUtil = {};

EditUtil.rangesAllEmpty = function(ranges) {
    return ranges.every((range) => range.isEmpty);
};

EditUtil.sortRangesInAscending = function(ranges) {
    if (1 < ranges.length && ranges[0].start.isAfter(ranges[1].start)) {
        ranges.reverse();
    }
};

EditUtil.topmostSelection = function(selections) {
    if (1 < selections.length && selections[0].start.isAfter(selections[1].start)) {
        return selections[selections.length - 1];
    } else {
        return selections[0];
    }
};

EditUtil.getUniqueLineNumbersOfRanges = function(ranges) {
    let lines = ranges.map((range) => range.start.line);
    lines = [...new Set(lines)];
    return lines;
};

EditUtil.normalizeEOL = function(text) {
    return text.replace(/\r\n/g, '\n');
};

module.exports = EditUtil;
