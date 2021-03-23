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

    const pushIfRecording = function(command) {
        if (recording) {
            recordedCommands.push(command);
        }
    };
    const record = function() {
        if (!recording) {
            recording = true;
            recordedCommands = [];
            // console.log('recording started');
        } else {
            recording = false;
            recordedCommands = [];
            // console.log('recording canceled');
        }
    };
    const replay = function() {
        if (recording) {
            recording = false;
            // console.log('recording finished');
        } else {
            // console.log(recordedCommands);
            exec(recordedCommands);
        }
    };

    const registerCommands = function(context) {
        registerTextEditorCommand(context, 'record', record);
        registerTextEditorCommand(context, 'replay', replay);
    };

    return {
        pushIfRecording: pushIfRecording,
        registerCommands
    };
};

const theInstance = KeyboardMacro();
exports.getInstance = function() {
    return theInstance;
};
