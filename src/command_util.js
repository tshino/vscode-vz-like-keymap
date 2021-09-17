"use strict";

const CommandUtil = (function() {
    let reentryGuard = null;
    let commandListener = null;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const CommandPrefix = 'vz.';
    const setCommandListener = function(listener) {
        commandListener = listener;
    };
    const makeGuardedCommand = function(name, func) {
        const commandName = CommandPrefix + name;
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
