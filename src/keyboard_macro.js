"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

// EXPERIMENTAL: keyboard macro recording and replay
const KeyboardMacro = function(modeHandler) {
    const mode = modeHandler;
    let recording = false;
    let recordedCommands = [];
    let onStartRecording = null;
    let onStopRecording = null;

    const pushIfRecording = function(command, func, expectedSelections) {
        if (recording) {
            recordedCommands.push([command, func]);
            cursorEventHandler.setExpectedSelections(expectedSelections);
        }
    };
    const startRecording = function(textEditor) {
        if (!recording) {
            recording = true;
            recordedCommands = [];
            cursorEventHandler.reset(textEditor);
            if (onStartRecording) {
                onStartRecording();
            }
            vscode.window.setStatusBarMessage('Recording has been started.', 5000);
            // console.log('recording started');
        }
    };
    const cancelRecording = function() {
        if (recording) {
            recording = false;
            recordedCommands = [];
            cursorEventHandler.reset();
            if (onStopRecording) {
                onStopRecording();
            }
            vscode.window.setStatusBarMessage('Canceled recording.', 3000);
            // console.log('recording canceled');
        }
    };
    const finishRecording = function() {
        if (recording) {
            recording = false;
            cursorEventHandler.reset();
            if (onStopRecording) {
                onStopRecording();
            }
            vscode.window.setStatusBarMessage('Completed recording!', 5000);
            // console.log('recording finished');
        }
    };
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const replay = async function(textEditor) {
        if (!recording) {
            // console.log(recordedCommands);
            for (let i = 0; i < recordedCommands.length; i++) {
                const cmd = recordedCommands[i];
                await cmd[1](textEditor);
                for (let i = 0; i < 10 && !mode.synchronized(); i++) {
                    await sleep(5);
                }
                if (!mode.synchronized()) {
                    mode.sync(textEditor);
                }
            }
        }
    };

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

    const cursorEventHandler = (function() {
        let lastSelections = null;
        let lastTextEditor = null;
        let expectedSelections = null;

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
        const setExpectedSelections = function(expectedSelections_) {
            expectedSelections = expectedSelections_; // can be undefined/null
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
        const recordImplicitMotion = function(expected, current) {
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
                pushIfRecording('<cursor-uniform-motion>', cursorUniformMotion);
                return true;
            }
            return false;
        };
        const detectAndRecordImplicitMotion = function(event) {
            if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                cancelRecording();
            } else if (mode.synchronized()) {
                let current = Array.from(event.selections);
                let ok = recordImplicitMotion(lastSelections, current);
                if (!ok) {
                    // unhandleCount += 1;
                    // console.log('=== unexpected selection change (event) #' + unhandleCount);
                    // printSelectionChangeEventInfo(event);
                }
            } else {
                if (expectedSelections) {
                    let current = Array.from(event.selections);
                    current.sort((a, b) => a.start.compareTo(b.start));
                    let sameSelections = EditUtil.isEqualSelections(expectedSelections, current);
                    if (!sameSelections) {
                        // Here, occurence of this change event was expected but the result is not the expected one.
                        // This is probably a kind of code completion like bracket completion.
                        // e.g. typing '(' would insert '()' and put back the cursor to right before the ')'
                        let ok = recordImplicitMotion(expectedSelections, current);
                        if (!ok) {
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
            reset,
            setExpectedSelections,
            processOnChangeSelections
        };
    })();

    const editEventHandler = (function() {
        // const makeInsertUniformText = function(text) {
        //     return async () => {
        //         await vscode.commands.executeCommand('type', { text: text });
        //     };
        // };
        const makeInsertUniformText2 = function(text, numDeleteLeft, lineAbove) {
            // FIXME: may fail if the text constains any line breaks
            return async (textEditor) => {
                let selections = Array.from(textEditor.selections);
                const bottomToTop = 1 < selections.length && selections[0].start.isAfter(selections[1].start);
                if (bottomToTop) {
                    selections.reverse();
                }
                const numLF = Array.from(text).filter(c => c === '\n').length;
                const lenLastLine = numLF === 0 ? 0 : text.length - (text.lastIndexOf('\n') + 1);
                let lineOffset = 0;
                await textEditor.edit(edit => {
                    for (let i = 0; i < selections.length; i++) {
                        let pos = selections[i].active;
                        if (lineAbove) {
                            let line = Math.max(pos.line - 1, 0);
                            pos = new vscode.Position(
                                line,
                                textEditor.document.lineAt(line).text.length
                            );
                        } else if (0 < numDeleteLeft) {
                            let range = new vscode.Range(
                                pos.translate({ characterDelta: -numDeleteLeft }),
                                pos
                            );
                            edit.delete(range);
                        } else if (!selections[i].isEmpty) {
                            edit.delete(selections[i]);
                            pos = selections[i].start;
                        }
                        edit.insert(pos, text);
                        if (numLF === 0) {
                            pos = pos.translate({ characterDelta: text.length - numDeleteLeft });
                        } else {
                            lineOffset += numLF;
                            pos = new vscode.Position(pos.line + lineOffset, lenLastLine);
                        }
                        selections[i] = new vscode.Selection(pos, pos);
                    }
                });
                if (mode.inSelection()) {
                    mode.resetSelection(textEditor);
                }
                if (bottomToTop) {
                    selections.reverse();
                }
                textEditor.selections = selections;
                if (1 < selections.length) {
                    mode.startSelection(textEditor, true);
                }
            };
        };
        const processOnChangeDocument = function(changes) {
            changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
            // console.log('#changes ' + changes.map(chg => chg.text));
            let selections = vscode.window.activeTextEditor.selections;
            if (0 < changes.length && changes.length === selections.length) {
                selections = Array.from(selections);
                selections.sort((a, b) => a.start.compareTo(b.start));
                let sameRange = changes.every((chg, i) => selections[i].isEqual(chg.range));
                let uniformText = changes.every((chg) => chg.text === changes[0].text);
                if (!uniformText) {
                    // console.log('unhandled edit event (2)');
                    return;
                }
                if (sameRange) {
                    // Pure insertion of a single line of text or,
                    // replacing (possibly multiple) selected range(s) with a text
                    let expectedSelections = changes.map(chg => {
                        let pos = chg.range.start.translate({ characterDelta: chg.text.length });
                        return new vscode.Selection(pos, pos);
                    });
                    const numDeleteLeft = 0;
                    const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft, false);
                    pushIfRecording('<insert-uniform-text>', insertUniformText, expectedSelections);
                    mode.expectSync();
                    return;
                }
                const emptySelection = EditUtil.rangesAllEmpty(selections);
                const uniformRangeLength = changes.every((chg) => chg.rangeLength == changes[0].rangeLength);
                if (!emptySelection || !uniformRangeLength) {
                    // console.log('selections: ' + selectionsToString(selections));
                    // console.log('ranges: ' + rangesToString(changes.map(chg => chg.range)));
                    // console.log('unhandled edit event (3):', emptySelection, uniformRangeLength);
                    return;
                }
                const cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
                if (cursorAtEndOfRange) {
                    // Text insertion/replacement by code completion or maybe IME.
                    // It starts with removing one or more already inserted characters
                    // followed by inserting complete word(s).
                    const numDeleteLeft = changes[0].rangeLength;
                    const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft, false);
                    pushIfRecording('<insert-uniform-text>', insertUniformText);
                    mode.expectSync();
                    return;
                }
                let document = vscode.window.activeTextEditor.document;
                const allEndOfPreviousLine = changes.every((chg,i) => (
                    chg.range.start.line === selections[i].active.line - 1 &&
                    chg.range.start.character === document.lineAt(chg.range.start.line).text.length
                ));
                if (allEndOfPreviousLine) {
                    const insertUniformTextAbove = makeInsertUniformText2(changes[0].text, 0, true);
                    pushIfRecording('<insert-uniform-text-above', insertUniformTextAbove);
                    mode.expectSync();
                    return;
                }
                // console.log('selections: ' + selectionsToString(selections));
                // console.log('ranges: ' + rangesToString(changes.map(chg => chg.range)));
                // console.log('unhandled edit event (4):');
            } else {
                // console.log('unhandled edit event (1)');
            }
        };
        return {
            processOnChangeDocument
        };
    })();

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'startRecording', startRecording);
        registerTextEditorCommand(context, 'cancelRecording', cancelRecording);
        registerTextEditorCommand(context, 'finishRecording', finishRecording);
        registerTextEditorCommand(context, 'replay', replay);
    };

    return {
        pushIfRecording,
        startRecording,
        cancelRecording,
        finishRecording,
        replay,
        getRecordedCommands: function() { return recordedCommands; }, // for testing
        recording: function() { return recording; },
        processOnChangeSelections: cursorEventHandler.processOnChangeSelections,
        processOnChangeDocument: editEventHandler.processOnChangeDocument,
        onStartRecording: function(func) { onStartRecording = func; },
        onStopRecording: function(func) { onStopRecording = func; },
        registerCommands
    };
};

const theInstance = KeyboardMacro(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
