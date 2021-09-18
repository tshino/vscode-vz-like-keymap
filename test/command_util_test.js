"use strict";
const assert = require('assert');
const CommandUtil = require("./../src/command_util.js");

describe('CommandUtil', function() {
    describe('CommandPrefix', function() {
        it('should be a string', function() {
            assert.strictEqual(typeof CommandUtil.CommandPrefix, 'string');
        });
        it('should end with a dot', function() {
            assert(CommandUtil.CommandPrefix.endsWith('.'));
            assert(2 <= CommandUtil.CommandPrefix.length);
        });
    });
    describe('makeGuardedCommand', function() {
        beforeEach(async () => {
            CommandUtil.setCommandListener(null);
        });
        it('should return a function that calls given function', async () => {
            const logs = [];
            const retval = CommandUtil.makeGuardedCommand(
                'name',
                function() {
                    logs.push('invoked');
                }
            );
            assert.strictEqual(typeof retval, 'function');
            await retval();
            assert.deepStrictEqual(logs, ['invoked']);
        });
        // TODO: add more tests for makeGuardedCommand
    });
    describe('setCommandListener', function() {
        beforeEach(async () => {
            CommandUtil.setCommandListener(null);
        });
        after(async () => {
            CommandUtil.setCommandListener(null);
        });
        it('should set a function to observe what commands have been invoked', async () => {
            const logs = [];
            const cmd1 = CommandUtil.makeGuardedCommand('cmd1', function() {
                logs.push('cmd1 invoked');
            });
            const cmd2 = CommandUtil.makeGuardedCommand('cmd2', function() {
                logs.push('cmd2 invoked');
            });

            CommandUtil.setCommandListener(function(name, func) {
                logs.push([name, func]);
            });
            await cmd2();
            await cmd1();
            await cmd2();

            assert.deepStrictEqual(logs, [
                [CommandUtil.CommandPrefix + 'cmd2', cmd2],
                'cmd2 invoked',
                [CommandUtil.CommandPrefix + 'cmd1', cmd1],
                'cmd1 invoked',
                [CommandUtil.CommandPrefix + 'cmd2', cmd2],
                'cmd2 invoked'
            ]);

            logs.length = 0;
            CommandUtil.setCommandListener(null);
            await cmd1();
            await cmd2();
            assert.deepStrictEqual(logs, [
                'cmd1 invoked',
                'cmd2 invoked'
            ]);
        });
    });
    // TODO: add tests for waitForEndOfGuardedCommand
    // TODO: add tests for makeRegisterTextEditorCommand
});
