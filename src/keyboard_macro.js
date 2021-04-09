"use strict";
const vscode = require("vscode");

const exec = function(commands, index = 0) {
    if (typeof commands === 'string') {
        commands = [ commands ];
    }
    let res = vscode.commands.executeCommand(commands[index]);
    if (index + 1 < commands.length) {
        res.then(function() { exec(commands, index + 1); });
    }
};

const registerTextEditorCommand = function(context, name, func) {
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('vz.' + name, func)
    );
};

// EXPERIMENTAL: keyboard macro recording and replay
const KeyboardMacro = function() {
    let recording = false;
    let recordedCommands = [];
    let onStartRecording = null;
    let onStopRecording = null;

    const pushIfRecording = function(command) {
        if (recording) {
            recordedCommands.push(command);
        }
    };
    const startRecording = function() {
        if (!recording) {
            recording = true;
            recordedCommands = [];
            if (onStartRecording) {
                onStartRecording();
            }
            // console.log('recording started');
        }
    };
    const cancelRecording = function() {
        if (recording) {
            recording = false;
            recordedCommands = [];
            if (onStopRecording) {
                onStopRecording();
            }
            // console.log('recording canceled');
        }
    };
    const finishRecording = function() {
        if (recording) {
            recording = false;
            if (onStopRecording) {
                onStopRecording();
            }
            // console.log('recording finished');
        }
    };
    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const replay = async function() {
        if (!recording) {
            // console.log(recordedCommands);
            for (let i = 0; i < recordedCommands.length; i++) {
                const cmd = recordedCommands[i];
                const needsYield = (
                    cmd === 'vz.toggleSelection'
                );
                if (needsYield) {
                    await sleep(50);
                }
                await vscode.commands.executeCommand(cmd);
                if (needsYield) {
                    await sleep(50);
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
        getRecordedCommands: function() { return recordedCommands; }, // for testing
        onStartRecording: function(func) { onStartRecording = func; },
        onStopRecording: function(func) { onStopRecording = func; },
        registerCommands
    };
};

const theInstance = KeyboardMacro();
exports.getInstance = function() {
    return theInstance;
};