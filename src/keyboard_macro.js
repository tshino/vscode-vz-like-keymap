"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");

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
    const startRecording = function() {
        if (!recording) {
            recording = true;
            recordedCommands = [];
            cursorEventHandler.reset();
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

        const reset = function() {
            lastSelections = null;
            lastTextEditor = null;
            expectedSelections = null;
        };
        const setExpectedSelections = function(expectedSelections_) {
            expectedSelections = expectedSelections_; // can be undefined/null
        }
        const detectAndRecordImplicitMotion = function(event) {
            if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                cancelRecording();
            } else if (mode.synchronized()) {
                // unhandleCount += 1;
                // console.log('=== unexpected selection change (event) #' + unhandleCount);
                // printSelectionChangeEventInfo(event);
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
                        let delta = current[0].start.character - expectedSelections[0].start.character;
                        let isUniformCursorMotion = (
                            expectedSelections.length === current.length &&
                            expectedSelections.every(sel => sel.isEmpty) &&
                            current.every(sel => sel.isEmpty) &&
                            expectedSelections.every((sel,i) => sel.start.line === current[i].start.line) &&
                            expectedSelections.every((sel,i) => current[i].start.character - sel.start.character === delta)
                        );
                        if (isUniformCursorMotion) {
                            pushIfRecording('<uniform-cursor-motion>', (textEditor) => {
                                let selections = textEditor.selections.map(sel => {
                                    let pos = sel.active.translate({ characterDelta: delta });
                                    return new vscode.Selection(pos, pos);
                                });
                                textEditor.selections = selections;
                            });
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
            reset,
            setExpectedSelections,
            processOnChangeSelections
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
        onStartRecording: function(func) { onStartRecording = func; },
        onStopRecording: function(func) { onStopRecording = func; },
        registerCommands
    };
};

const theInstance = KeyboardMacro(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
