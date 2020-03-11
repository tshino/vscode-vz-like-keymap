"use strict";
const assert = require('assert');
const mode_handler = require('../src/mode_handler.js');

describe('mode_handler', function() {
    describe('ModeHandler', function() {
        it('should be normal (non-selection) state when it is initialized', function() {
            let mode = mode_handler.ModeHandler();
            assert.equal(mode.inSelection(), false);
            assert.equal(mode.inBoxSelection(), false);
        });
    });
});
