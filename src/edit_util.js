"use strict";

const EditUtil = {};

EditUtil.enumVisibleLines = function(textEditor) {
    const lines = [];
    for (const vrange of textEditor.visibleRanges) {
        const start = vrange.start.line;
        const end = vrange.end.line;
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
    const vlines = EditUtil.enumVisibleLines(textEditor);
    const lineCount = textEditor.document.lineCount;
    return vlines[vlines.length - 1] === lineCount - 1;
};

EditUtil.isCursorAtEndOfLine = function(textEditor) {
    const cursor = textEditor.selection.active;
    const lineLen = textEditor.document.lineAt(cursor.line).range.end.character;
    return lineLen <= cursor.character;
};

EditUtil.rangesAllEmpty = function(ranges) {
    return ranges.every((range) => range.isEmpty);
};

EditUtil.sortRangesInAscending = function(ranges) {
    if (1 < ranges.length && ranges[0].start.isAfter(ranges[1].start)) {
        ranges.reverse();
    }
};

EditUtil.isEqualSelections = function(selections1, selections2) {
    return (
        selections1.length === selections2.length &&
        selections1.every(
            (sel, i) => (
                sel.anchor.isEqual(selections2[i].anchor) &&
                sel.active.isEqual(selections2[i].active)
            )
        )
    );
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

EditUtil.calculateWidth = function(text, tabSize) {
    let x = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\t') {
            x += tabSize;
            x -= x % tabSize;
        } else {
            x += 1;
        }
    }
    return x;
};

EditUtil.locateHorizontalPosition = function(text, target, tabSize) {
    let i = 0, x = 0;
    for (; i < text.length; i++) {
        if (x === target) {
            break;
        }
        let next;
        if (text[i] === '\t') {
            next = (x + tabSize) - (x + tabSize) % tabSize;
        } else {
            next = x + 1;
        }
        if (next > target) {
            break;
        }
        x = next;
    }
    return { x, character: i };
};

module.exports = EditUtil;
