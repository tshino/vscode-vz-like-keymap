"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const EditUtil = require("./edit_util.js");

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

// Keyboard macro recording and replay
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
            vscode.window.setStatusBarMessage('Recording started!', 3000);
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
            vscode.window.setStatusBarMessage('Canceled.', 3000);
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
            vscode.window.setStatusBarMessage('Finished!', 3000);
            // console.log('recording finished');
        }
    };
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    let reentryGuard = null;
    const replay = async function(textEditor) {
        if (!recording) {
            if (reentryGuard === 'replay') {
                return;
            }
            reentryGuard = 'replay';
            for (let i = 0; i < recordedCommands.length; i++) {
                const cmd = recordedCommands[i];
                await cmd[1](textEditor);
                for (let i = 0; i < 10 && !mode.synchronized(); i++) {
                    await sleep(5);
                }
                if (!mode.synchronized()) {
                    console.log('*** debug: Missing expected selection change')
                    mode.sync(textEditor);
                }
            }
            reentryGuard = null;
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
                // console.log('<<< cursor-uniform-motion (' + delta + ') >>>');
                // console.log('expected: ' + selectionsToString(expected));
                // console.log('current: ' + selectionsToString(current));
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
        const makeInsertUniformText2 = function(text, numDeleteLeft) {
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
                        let removedLineCount = 0;
                        if (0 < numDeleteLeft) {
                            let range = new vscode.Range(
                                new vscode.Position(
                                    pos.line,
                                    Math.max(0, pos.character - numDeleteLeft)
                                ),
                                pos
                            );
                            edit.delete(range);
                        } else if (!selections[i].isEmpty) {
                            edit.delete(selections[i]);
                            pos = selections[i].start;
                            removedLineCount = selections[i].end.line - selections[i].start.line;
                        }
                        edit.insert(pos, text);
                        lineOffset += numLF;
                        if (numLF === 0) {
                            pos = new vscode.Position(
                                pos.line + lineOffset,
                                Math.max(0, pos.character - numDeleteLeft) + text.length
                            );
                        } else {
                            pos = new vscode.Position(pos.line + lineOffset, lenLastLine);
                        }
                        lineOffset -= removedLineCount;
                        selections[i] = new vscode.Selection(pos, pos);
                    }
                });
                if (mode.inSelection()) {
                    mode.resetSelection(textEditor);
                }
                if (bottomToTop) {
                    selections.reverse();
                }
                if (!EditUtil.isEqualSelections(textEditor.selections, selections)) {
                    mode.expectSync();
                    textEditor.selections = selections;
                    if (1 < selections.length) {
                        mode.startSelection(textEditor, true);
                    }
                    for (let i = 0; i < 10 && !mode.synchronized(); i++) {
                        await sleep(5);
                    }
                } else {
                    if (1 < selections.length) {
                        mode.startSelection(textEditor, true);
                    }
                }
            };
        };
        const isIndentOrOutdent = function(changes) {
            if (changes.length === 0) {
                return false;
            }
            const allChangesAtLineStart = changes.every(chg => chg.range.start.character === 0);
            if (!allChangesAtLineStart) {
                return false;
            }
            const allChangesSingleLine = changes.every(chg => (
                chg.range.start.line === chg.range.end.line
            ));
            if (!allChangesSingleLine) {
                return false;
            }
            const editDelta = changes[0].text.length - changes[0].rangeLength;
            const isUniformEditDelta = changes.every(chg => (
                chg.text.length - chg.rangeLength === editDelta
            ));
            if (!isUniformEditDelta) {
                return false;
            }
            if (0 < editDelta) {
                const text = changes[0].text.slice(0, editDelta);
                const isWhiteSpace = Array.from(text).every(c => (c === ' ' || c === '\t'));
                if (!isWhiteSpace) {
                    return false;
                }
                const isUniformText = changes.every(chg => (
                    chg.text.slice(0, editDelta) === text
                ));
                if (!isUniformText) {
                    return false;
                }
                return 'indent';
            } else if (0 > editDelta) {
                // FIXME: The deleted text should consist of only white spaces.
                return 'outdent';
            }
            return false;
        };
        const isBracketCompletionWithSelection = function(selections, changes) {
            if (changes.length === 0) {
                return false;
            }
            let uniformPairedText = changes.every(
                (chg,i) => chg.text === changes[i % 2].text
            );
            return (
                uniformPairedText &&
                selections.length * 2 === changes.length &&
                changes.every(chg => chg.range.isEmpty) &&
                selections.every((sel,i) => (
                    sel.start.isEqual(changes[i * 2].range.start) &&
                    sel.end.isEqual(changes[i * 2 + 1].range.start)
                )) &&
                changes.every(chg => chg.text.length === 1)
            );
        };
        const processOnChangeDocument = function(changes) {
            changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
            // console.log('#changes ' + changes.map(chg => chg.text));
            let selections = Array.from(vscode.window.activeTextEditor.selections);
            selections.sort((a, b) => a.start.compareTo(b.start));
            const uniformText = changes.every((chg) => chg.text === changes[0].text);
            if (0 < changes.length && changes.length === selections.length && uniformText) {
                let sameRange = changes.every((chg, i) => selections[i].isEqual(chg.range));
                if (sameRange) {
                    // Pure insertion of a single line of text or,
                    // replacing (possibly multiple) selected range(s) with a text
                    let expectedSelections = (() => {
                        let sels = [], lineOffset = 0;
                        for (let i = 0; i < changes.length; i++) {
                            let chg = changes[i];
                            let pos = chg.range.start.translate({
                                lineDelta: lineOffset,
                                characterDelta: chg.text.length
                            });
                            // lineOffset += Array.from(chg.text).filter(c => c === '\n').length;
                            lineOffset -= chg.range.end.line - chg.range.start.line;
                            sels[i] = new vscode.Selection(pos, pos);
                        }
                        return sels;
                    })();
                    const numDeleteLeft = 0;
                    const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                    pushIfRecording('<insert-uniform-text>', insertUniformText, expectedSelections);
                    mode.expectSync();
                    return;
                }
                const emptySelection = EditUtil.rangesAllEmpty(selections);
                const uniformRangeLength = changes.every((chg) => chg.rangeLength === changes[0].rangeLength);
                if (emptySelection && uniformRangeLength) {
                    const cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
                    if (cursorAtEndOfRange) {
                        // Text insertion/replacement by code completion or maybe IME.
                        // It starts with removing one or more already inserted characters
                        // followed by inserting complete word(s).
                        const numDeleteLeft = changes[0].rangeLength;
                        const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                        pushIfRecording('<insert-uniform-text>', insertUniformText);
                        mode.expectSync();
                        return;
                    }
                }
            }
            if (isBracketCompletionWithSelection(selections, changes)) {
                // Possibility: typing an opening bracket with a range of text selected,
                // caused brack completion around the selected text
                let text = changes[0].text;
                pushIfRecording(
                    '<default-type>',
                    async function(_textEditor, _edit) {
                        await vscode.commands.executeCommand('default:type', { text: text });
                    }
                );
                mode.expectSync();
                return;
            }
            const indentOrOutdent = isIndentOrOutdent(changes);
            if (indentOrOutdent !== false) {
                if (indentOrOutdent === 'indent') {
                    pushIfRecording(
                        '<indent>',
                        async function(_textEditor, _edit) {
                            await vscode.commands.executeCommand('editor.action.indentLines');
                        }
                    );
                    mode.expectSync();
                } else {
                    pushIfRecording(
                        '<outdent>',
                        async function(_textEditor, _edit) {
                            await vscode.commands.executeCommand('editor.action.outdentLines');
                        }
                    );
                    mode.expectSync();
                }
                return;
            }
            // console.log('*** unhandled edit event (1)');
            // console.log('selections: ' + selectionsToString(selections));
            // console.log('changes ' + changes.map(chg => chg.text));
            // console.log('ranges: ' + rangesToString(changes.map(chg => chg.range)));
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
        getRecordedCommandNames: function() { return recordedCommands.map(x => x[0]); }, // for testing
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
