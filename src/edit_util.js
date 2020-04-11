"use strict";

const edit_util = {};

edit_util.rangesAllEmpty = function(ranges) {
    return ranges.every((range) => range.isEmpty);
};

edit_util.sortRangesInAscending = function(ranges) {
    if (1 < ranges.length && ranges[0].start.isAfter(ranges[1].start)) {
        ranges.reverse();
    }
};

edit_util.topmostSelection = function(selections) {
    if (1 < selections.length && selections[0].start.isAfter(selections[1].start)) {
        return selections[selections.length - 1];
    } else {
        return selections[0];
    }
};

module.exports = edit_util;
