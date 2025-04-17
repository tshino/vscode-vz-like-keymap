"use strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");

// const selectionsToString = (selections) => selections.map(
//     sel => [sel.anchor, sel.active].map(
//         pos => [pos.line, pos.character].join(',')
//     ).join('-')
// ).join(' ');
// const rangesToString = (ranges) => ranges.map(
//     r => [r.start, r.end].map(
//         pos => [pos.line, pos.character].join(',')
//     ).join('-')
// ).join(' ');

const CursorEventHandler = function(mode) {
    let lastSelections = null;
    let lastTextEditor = null;
    let expectedSelections = null;
    let onDetectCursorMotionCallback = null;
    const onDetectCursorMotion = function(callback) {
        onDetectCursorMotionCallback = callback;
    };
    const notifyDetectedMotion = function(motion) {
        if (onDetectCursorMotionCallback) {
            onDetectCursorMotionCallback('<cursor-uniform-motion>', motion);
        }
    };
    // let unhandleCount = 0;
    // const printSelectionChangeEventInfo = function(event) {
    //     console.log('selections: ' +
    //         selectionsToString(lastSelections) + ' -> ' +
    //         selectionsToString(event.selections));
    //     console.log('kind', event.kind);
    // };
    const reset = function(textEditor) {
        lastSelections = textEditor ? textEditor.selections : null;
        lastTextEditor = textEditor || null;
        expectedSelections = null;
    };
    const setExpectedSelections = function(expected) {
        expectedSelections = expected || null;
    };
    const makeCursorUniformMotion = function(delta) {
        return function(textEditor) {
            let selections = textEditor.selections.map(sel => {
                let pos = sel.active;
                pos = new vscode.Position(
                    pos.line,
                    Math.max(0, pos.character + delta)
                );
                return new vscode.Selection(pos, pos);
            });
            textEditor.selections = selections;
        };
    };
    const detectImplicitMotion = function(expected, current) {
        let delta = current[0].start.character - expected[0].start.character;
        let isUniformCursorMotion = (
            expected.length === current.length &&
            expected.every(sel => sel.isEmpty) &&
            current.every(sel => sel.isEmpty) &&
            expected.every((sel,i) => sel.start.line === current[i].start.line) &&
            expected.every((sel,i) => current[i].start.character - sel.start.character === delta)
        );
        if (isUniformCursorMotion) {
            const cursorUniformMotion = makeCursorUniformMotion(delta);
            // console.log('<<< cursor-uniform-motion (' + delta + ') >>>');
            // console.log('expected: ' + selectionsToString(expected));
            // console.log('current: ' + selectionsToString(current));
            return cursorUniformMotion;
        }
        return undefined;
    };
    const detectAndRecordImplicitMotion = function(event) {
        if (mode.synchronized()) {
            const current = Array.from(event.selections);
            const motion = detectImplicitMotion(lastSelections, current);
            if (motion) {
                notifyDetectedMotion(motion);
            } else {
                // unhandleCount += 1;
                // console.log('=== unexpected selection change (event) #' + unhandleCount);
                // printSelectionChangeEventInfo(event);
            }
        } else {
            if (expectedSelections) {
                const current = Array.from(event.selections);
                current.sort((a, b) => a.start.compareTo(b.start));
                const sameSelections = EditUtil.isEqualSelections(expectedSelections, current);
                if (!sameSelections) {
                    // Here, occurence of this change event was expected but the result is not the expected one.
                    // This is probably a kind of code completion like bracket completion.
                    // e.g. typing '(' would insert '()' and put back the cursor to right before the ')'
                    const motion = detectImplicitMotion(expectedSelections, current);
                    if (motion) {
                        notifyDetectedMotion(motion);
                    } else {
                        // unhandleCount += 1;
                        // console.log('=== unexpected selection change (selections) #' + unhandleCount);
                        // console.log('expectation: ' + selectionsToString(expectedSelections));
                        // printSelectionChangeEventInfo(event);
                    }
                } else {
                    // console.log('... exactly expected selection change');
                    // printSelectionChangeEventInfo(event);
                }
            }
        }
    };
    const processOnChangeSelections = function(event) {
        if (lastTextEditor !== event.textEditor) {
            lastTextEditor = event.textEditor;
            lastSelections = event.selections;
        }
        detectAndRecordImplicitMotion(event);
        lastSelections = event.selections;
    };
    return {
        onDetectCursorMotion,
        reset,
        setExpectedSelections,
        processOnChangeSelections
    };
};

module.exports = CursorEventHandler;
