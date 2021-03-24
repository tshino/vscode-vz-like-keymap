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
    const record = function() {
        if (!recording) {
            recording = true;
            recordedCommands = [];
            if (onStartRecording) {
                onStartRecording();
            }
            // console.log('recording started');
        } else {
            recording = false;
            recordedCommands = [];
            if (onStopRecording) {
                onStopRecording();
            }
            // console.log('recording canceled');
        }
    };
    const replay = async function() {
        if (recording) {
            recording = false;
            if (onStopRecording) {
                onStopRecording();
            }
            // console.log('recording finished');
        } else {
            // console.log(recordedCommands);
            for (let i = 0; i < recordedCommands.length; i++) {
                await vscode.commands.executeCommand(recordedCommands[i]);
            }
        }
    };

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'record', record);
        registerTextEditorCommand(context, 'replay', replay);
    };

    return {
        pushIfRecording,
        record,
        replay,
        onStartRecording: function(func) { onStartRecording = func; },
        onStopRecording: function(func) { onStopRecording = func; },
        registerCommands
    };
};

const theInstance = KeyboardMacro();
exports.getInstance = function() {
    return theInstance;
};
