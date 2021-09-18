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
            let log = [];
            const retval = CommandUtil.makeGuardedCommand(
                'name',
                function() {
                    log.push('invoked');
                }
            );
            assert.strictEqual(typeof retval, 'function');
            await retval();
            assert.deepStrictEqual(log, ['invoked']);
        });
        // TODO: add more tests for makeGuardedCommand
    });
    // TODO: add tests for setCommandListener
    // TODO: add tests for waitForEndOfGuardedCommand
    // TODO: add tests for makeRegisterTextEditorCommand
});
