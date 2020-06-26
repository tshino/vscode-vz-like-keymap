"use strict";

const EditUtil = {};

EditUtil.enumVisibleLines = function(textEditor) {
    let vranges = textEditor.visibleRanges;
    let lines = [];
    for (let i = 0; i < vranges.length; i++) {
        let start = vranges[i].start.line;
        let end = vranges[i].end.line;
        for (let j = start; j <= end; j++) {
            lines.push(j);
        }
    }
    return lines;
};

EditUtil.getLowerBoundLineIndex = function(lines, line) {
    for (let i = 0; i < lines.length; i++) {
        if (line <= lines[i]) {
            return i;
        }
    }
    return lines.length;
};

EditUtil.isLastLineVisible = function(textEditor) {
    let vlines = EditUtil.enumVisibleLines(textEditor);
    let lineCount = textEditor.document.lineCount;
    return vlines[vlines.length - 1] === lineCount - 1;
};

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
