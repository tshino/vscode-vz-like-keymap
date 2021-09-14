"use strict";
const keyboard_macro = require("./keyboard_macro.js");

const kbMacroHandler = keyboard_macro.getInstance();

const CommandUtil = (function() {
    let reentryGuard = null;

    const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
    const makeGuardedCommand = function(name, func) {
        const guardedCommand = async function(textEditor, edit) {
            if (reentryGuard === name) {
                return;
            }
            reentryGuard = name;
            try {
                kbMacroHandler.pushIfRecording('vz.' + name, guardedCommand);
                await func(textEditor, edit);
            } catch (error) {
                console.log('*** debug: unhandled exception in execution of command vz.' + name, error);
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

    return {
        makeGuardedCommand,
        waitForEndOfGuardedCommand // test purpose only
    }
})();

module.exports = CommandUtil;
