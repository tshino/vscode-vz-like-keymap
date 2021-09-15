"use strict";
const vscode = require("vscode");
const keyboard_macro = require("./keyboard_macro.js");

const kbMacroHandler = keyboard_macro.getInstance();

const CommandUtil = (function() {
    let reentryGuard = null;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const makeGuardedCommand = function(name, func) {
        const commandName = 'vz.' + name;
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            try {
                kbMacroHandler.pushIfRecording(commandName, guardedCommand);
                await func(textEditor, edit);
            } catch (error) {
                console.log('*** debug: unhandled exception in execution of command ' + commandName, error);
            }
            reentryGuard = null;
        };
        return guardedCommand;
    };
    const waitForEndOfGuardedCommand = async function() {
        for (let i = 0; i < 50 && reentryGuard !== null; i++) {
            await sleep(10);
        }
        if (reentryGuard !== null) {
            console.log('*** debug: Guarded command still be running unexpectedly')
        }
    };
    const registerTextEditorCommand = function(context, name, func) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('vz.' + name, func)
        );
    };

    return {
        makeGuardedCommand,
        waitForEndOfGuardedCommand, // test purpose only
        registerTextEditorCommand
    }
})();

module.exports = CommandUtil;
