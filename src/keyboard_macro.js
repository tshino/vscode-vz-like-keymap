"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");
const edit_commands = require("./edit_commands.js");

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

    const cursorEventHandler = (function() {
        let lastSelections = null;
        let lastTextEditor = null;
        let expectedSelections = null;

        // let unhandleCount = 0;
        // const selectionsToString = (selections) => selections.map(
        //     sel => [sel.anchor, sel.active].map(
        //         pos => [pos.line, pos.character].join(',')
        //     ).join('-')
        // ).join(' ');
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
                    let pos = sel.active.translate({ characterDelta: delta });
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
                    let sameSelections = (
                        expectedSelections.length === current.length &&
                        expectedSelections.every((sel, i) => {
                            return sel.isEqual(current[i]);
                        })
                    );
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
        const makeInsertUniformText2 = function(text, numDeleteLeft) {
            // FIXME: may fail if the text constains any line breaks
            return async (textEditor) => {
                let selections = Array.from(textEditor.selections);
                await textEditor.edit(edit => {
                    for (let i = 0; i < selections.length; i++) {
                        let pos = selections[i].active;
                        if (0 < numDeleteLeft) {
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
                        pos = pos.translate({ characterDelta: text.length - numDeleteLeft });
                        selections[i] = new vscode.Selection(pos, pos);
                    }
                });
                if (mode.inSelection()) {
                    mode.resetSelection(textEditor);
                }
                textEditor.selections = selections;
                if (1 < selections.length) {
                    mode.startSelection(textEditor, true);
                }
            };
        };
        const processOnChangeDocument = function(changes) {
            changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
            let selections = vscode.window.activeTextEditor.selections;
            if (0 < changes.length && changes.length === selections.length) {
                selections = Array.from(selections);
                selections.sort((a, b) => a.start.compareTo(b.start));
                let sameRange = changes.every((chg, i) => selections[i].isEqual(chg.range));
                let sameText = changes.every((chg) => chg.text === changes[0].text);
                if (sameRange && sameText) {
                    // Pure insertion of a single line of text or,
                    // replacing (possibly multiple) selected range(s) with a text
                    let expectedSelections = changes.map(chg => {
                        let pos = chg.range.start.translate({ characterDelta: chg.text.length });
                        return new vscode.Selection(pos, pos);
                    });
                    const numDeleteLeft = 0;
                    const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                    pushIfRecording('<insert-uniform-text>', insertUniformText, expectedSelections);
                    mode.expectSync();
                } else if (sameText) {
                    let emptySelection = EditUtil.rangesAllEmpty(selections);
                    let cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
                    let sameLength = changes.every((chg) => chg.rangeLength == changes[0].rangeLength);
                    if (emptySelection && cursorAtEndOfRange && sameLength) {
                        // Text insertion/replacement by code completion or maybe IME.
                        // It starts with removing one or more already inserted characters
                        // followed by inserting complete word(s).
                        const numDeleteLeft = changes[0].rangeLength;
                        const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                        pushIfRecording('<insert-uniform-text>', insertUniformText);
                        mode.expectSync();
                    } else {
                        // console.log('unhandled edit event (1):', emptySelection, cursorAtEndOfRange, sameLength);
                    }
                } else {
                    // console.log('unhandled edit event (2)');
                }
            } else {
                // console.log('unhandled edit event (3)');
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
