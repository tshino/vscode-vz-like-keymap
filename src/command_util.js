"use strict";
const vscode = require("vscode");

const CommandUtil = (function() {
    let reentryGuard = null;
    let commandListener = null;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const setCommandListener = function(listener) {
        commandListener = listener;
    };
    const makeGuardedCommand = function(name, func) {
        const commandName = 'vz.' + name;
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            try {
                if (commandListener) {
                    commandListener(commandName, guardedCommand);
                }
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
        setCommandListener,
        makeGuardedCommand,
        waitForEndOfGuardedCommand, // test purpose only
        registerTextEditorCommand
    }
})();

module.exports = CommandUtil;
