"use strict";

const CommandUtil = (function() {
    let reentryGuard = null;
    const commandQueue = [];
    const MaxQueueLength = 1;
    let commandListener = null;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const CommandPrefix = 'vz.';
    const setCommandListener = function(listener) {
        commandListener = listener;
    };
    const makeGuardedCommand = function(name, func) {
        const commandName = CommandPrefix + name;
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard !== null) {
                if (commandQueue.length >= MaxQueueLength) {
                    return;
                }
                await new Promise(resolve => {
                    commandQueue.push(resolve);
                });
            } else {
                reentryGuard = name;
            }
            try {
                if (commandListener) {
                    commandListener(commandName, guardedCommand);
                }
                await func(textEditor, edit);
            } catch (error) {
                console.log('*** debug: unhandled exception in execution of command ' + commandName, error);
            }
            if (0 < commandQueue.length) {
                const resolve = commandQueue[0];
                commandQueue.splice(0, 1);
                resolve();
            } else {
                reentryGuard = null;
            }
        };
        return guardedCommand;
    };
    const waitForEndOfGuardedCommand = async function() {
        for (let i = 0; i < 5 && reentryGuard !== null; i++) {
            await sleep(10);
        }
        for (let i = 0; i < 10 && reentryGuard !== null; i++) {
            await sleep(40*(i+1));
        }
        if (reentryGuard !== null) {
            console.log('*** debug: Guarded command still be running unexpectedly')
        }
    };
    const makeRegisterTextEditorCommand = function(vscode) {
        return function(context, name, func) {
            context.subscriptions.push(
                vscode.commands.registerTextEditorCommand(CommandPrefix + name, func)
            );
        };
    };

    return {
        CommandPrefix,
        setCommandListener,
        makeGuardedCommand,
        waitForEndOfGuardedCommand, // test purpose only
        makeRegisterTextEditorCommand
    }
})();

module.exports = CommandUtil;
