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
    let expectedSelections = null;

    const pushIfRecording = function(command, func, expectedSelections_) {
        if (recording) {
            recordedCommands.push([command, func]);
            expectedSelections = expectedSelections_;
        }
    };
    const startRecording = function() {
        if (!recording) {
            recording = true;
            expectedSelections = null;
            recordedCommands = [];
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
            expectedSelections = null;
            recordedCommands = [];
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
            expectedSelections = null;
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
        getExpectedSelections: function() { return expectedSelections; },
        getRecordedCommands: function() { return recordedCommands; }, // for testing
        recording: function() { return recording; },
        onStartRecording: function(func) { onStartRecording = func; },
        onStopRecording: function(func) { onStopRecording = func; },
        registerCommands
    };
};

const theInstance = KeyboardMacro(mode_handler.getInstance());
exports.getInstance = function() {
    return theInstance;
};
