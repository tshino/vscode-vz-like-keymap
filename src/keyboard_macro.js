"use strict";
const vscode = require("vscode");
const mode_handler = require("./mode_handler.js");
const CommandUtil = require("./command_util.js");
const CursorEventHandler = require("./cursor_event_handler.js");
const EditEventHandler = require("./edit_event_handler.js");

// Keyboard macro recording and replay
const KeyboardMacro = function(modeHandler) {
    const mode = modeHandler;
    let recording = false;
    let recordedCommands = [];
    let onStartRecording = null;
    let onStopRecording = null;

    const cursorEventHandler = CursorEventHandler(mode);
    const editEventHandler = EditEventHandler(mode);

    const registerTextEditorCommand = CommandUtil.makeRegisterTextEditorCommand(vscode);
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
    let reentryGuard = null;
    const replay = async function(textEditor) {
        if (!recording) {
            if (reentryGuard === 'replay') {
                return;
            }
            reentryGuard = 'replay';
            for (let i = 0; i < recordedCommands.length; i++) {
                const cmd = recordedCommands[i];
                try {
                    await cmd[1](textEditor);
                    await mode.waitForSyncTimeout(200).catch(() => {});
                } catch (error) {
                    console.log('*** debug: unhandled exception in execution of command ' + cmd[0], error);
                }
                if (!mode.synchronized()) {
                    console.log('*** debug: Missing expected selection change in command ' + cmd[0]);
                    mode.sync(textEditor);
                }
            }
            reentryGuard = null;
        }
    };

    cursorEventHandler.onDetectCursorMotion(pushIfRecording);
    editEventHandler.onDetectEdit(pushIfRecording);

    const processOnChangeSelections = function(event) {
        if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
            cancelRecording();
        } else {
            cursorEventHandler.processOnChangeSelections(event);
        }
    };

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'startRecording', startRecording);
        registerTextEditorCommand(context, 'cancelRecording', cancelRecording);
        registerTextEditorCommand(context, 'finishRecording', finishRecording);
        registerTextEditorCommand(context, 'replay', replay);

        CommandUtil.setCommandListener(pushIfRecording);
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
        processOnChangeSelections,
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
