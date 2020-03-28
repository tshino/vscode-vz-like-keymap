"use strict";
const assert = require('assert');
const mode_handler = require('../src/mode_handler.js');

const PositionMock = (function() {
    const proto = {};
    proto.isEqual = function(other) {
        return (
            this.line === other.line &&
            this.character == other.character
        );
    };
    return function(line, col) {
        return {
            line: line,
            character: col,
            __proto__: proto
        };
    };
})();

const SelectionMock = (function() {
    return function(anchor, active = anchor) {
        return {
            isEmpty: anchor.isEqual(active),
            anchor: anchor,
            active: active
        };
    };
})();

const TextEditorMock = (function() {
    let emptySelections = [
        SelectionMock(PositionMock(0, 0), PositionMock(0, 0))
    ];
    return function(selections = emptySelections) {
        return {
            selection: selections[0],
            selections: selections
        };
    };
})();

describe('PositionMock', function() {
    it('should have properties line and character', function() {
        let pos = PositionMock(3, 4);
        assert.equal(pos.line, 3);
        assert.equal(pos.character, 4);
    });
    describe('isEqual', function() {
        it('should return true iff two positions are equal', function() {
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(3, 4)), true);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(1, 2)), false);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(3, 0)), false);
            assert.equal(PositionMock(3, 4).isEqual(PositionMock(0, 4)), false);
        });
    });
});

describe('SelectionMock', function() {
    it('should have properties anchor, active and isEmpty', function() {
        let sel = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
        assert('anchor' in sel);
        assert('active' in sel);
        assert('isEmpty' in sel);
    });
    it('should be able to be constructed with one position argument', function() {
        let sel = SelectionMock(PositionMock(5, 7));
        assert.equal(sel.isEmpty, true);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(5, 7)));
    });
    it('should be able to be constructed with two position arguments', function() {
        let sel = SelectionMock(PositionMock(5, 7), PositionMock(10, 0));
        assert.equal(sel.isEmpty, false);
        assert(sel.anchor.isEqual(PositionMock(5, 7)));
        assert(sel.active.isEqual(PositionMock(10, 0)));
    });
    describe('isEmpty', function() {
        it('should be true iff anchor and active are equal', function() {
            let sel1 = SelectionMock(PositionMock(1, 2), PositionMock(3, 4));
            let sel2 = SelectionMock(PositionMock(1, 2), PositionMock(1, 2));
            assert.equal(sel1.isEmpty, false);
            assert.equal(sel2.isEmpty, true);
        });
    });
});

describe('TextEditorMock', function() {
    it('should have properties selection and selections', function() {
        let te = TextEditorMock();
        assert('selection' in te);
        assert('selections' in te);
    });
    it('should have an empty selection if it is constructed with no argument', function() {
        let te = TextEditorMock();
        assert.equal(te.selections.length, 1);
        assert.equal(te.selection.isEmpty, true);
        assert.equal(te.selections[0].isEmpty, true);
    });
    it('should have selections if it is constructed with selections argument', function() {
        let te = TextEditorMock([
            SelectionMock(PositionMock(0, 0), PositionMock(3, 4))
        ]);
        assert.equal(te.selections.length, 1);
        assert.equal(te.selection.isEmpty, false);
        assert.equal(te.selections[0].isEmpty, false);
    });
});

describe('mode_handler', function() {
    describe('ModeHandler', function() {
        /* Selection state and selection mode:

            [A1] Empty selection - non-selection mode
            [A2] Empty selection - selection mode
            [A3] Empty selection - box selection mode

            [B1] Single selection - non-selection mode (INCONSISTENT)
            [B2] Single selection - selection mode
            [B3] Single selection - box selection mode

            [C1] Multi selections - non-selection mode (INCONSISTENT)
            [C2] Multi selections - selection mode (INCONSISTENT)
            [C3] Multi selections - box selection mode
        */
       it('should be non-selection mode just after constrution', function() {
            let mode = mode_handler.ModeHandler();
            assert.equal(mode.inSelection(), false);
            assert.equal(mode.inBoxSelection(), false);
        });
        describe('startSelection', function() {
            it('should turn on selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);
            });
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onStartSelection(function() {
                    count++;
                });
                mode.startSelection(te, false);
                assert.equal(count, 1);
            });
        });
        describe('resetSelection', function() {
            it('should turn off selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                mode.resetSelection(te);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                mode.resetSelection(te);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onResetSelection(function() {
                    count++;
                });
                mode.resetSelection(te);
                assert.equal(count, 1);
            });
        });
        describe('resetBoxSelection', function() {
            it('should turn off box selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, true);
                mode.resetBoxSelection();
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should do nothing if not in box selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();

                mode.startSelection(te, false);
                mode.resetBoxSelection();
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                mode.resetSelection(te);
                mode.resetBoxSelection();
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);
            });
        });
        describe('initialize', function() {
            it('should ensure the state to be consistent with given TextEditor', function() {
                let mode = mode_handler.ModeHandler();

                // A --> [1]
                mode.initialize(TextEditorMock());
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // A --> [1]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0))
                ]));
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // B --> [2]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
                ]));
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // C --> [3]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 0), PositionMock(6, 10))
                ]));
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);
            });
        });
        describe('sync', function() {
            let mode;
            let countStart, countReset;
            beforeEach(function() {
                mode = mode_handler.ModeHandler();
                mode.onStartSelection(function() { countStart++; });
                mode.onResetSelection(function() { countReset++; });
                countStart = countReset = 0;
            });
            it('should do nothing if the state did not change', function() {
                // [A1]
                mode.initialize(TextEditorMock());
                countStart = countReset = 0;
                mode.sync(TextEditorMock());
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // [A1]
                const empty = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // [A2]
                mode.initialize(empty);
                mode.startSelection(empty, false);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [A3]
                mode.initialize(empty);
                mode.startSelection(empty, true);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);

                // [B2]
                const single = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(10, 0))
                ]);
                mode.initialize(single);
                countStart = countReset = 0;
                mode.sync(single);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [B3]
                mode.initialize(empty);
                mode.startSelection(single, true);
                countStart = countReset = 0;
                mode.sync(single);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);

                // [C3]
                const multi = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);
                mode.initialize(multi);
                countStart = countReset = 0;
                mode.sync(multi);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);
            });
            it('should do nothing if cursor moved in non-selection mode', function() {
                const cursor_pos1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const cursor_pos2 = TextEditorMock([SelectionMock(PositionMock(5, 6))]);
                const cursor_pos3 = TextEditorMock([SelectionMock(PositionMock(6, 0))]);

                // [A1] -> [A1']
                mode.initialize(cursor_pos1);
                countStart = countReset = 0;
                mode.sync(cursor_pos2);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // [A1'] -> [A1'']
                mode.initialize(cursor_pos2);
                countStart = countReset = 0;
                mode.sync(cursor_pos3);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should do nothing when cursor moved in selection mode', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 6))]);
                const single2 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(6, 5))]);
                const single3 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(4, 0))]);

                // [A2] -> [B2]
                mode.initialize(empty1);
                mode.startSelection(empty1, false);
                countStart = countReset = 0;
                mode.sync(single1);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [B2] -> [B2']
                countStart = countReset = 0;
                mode.sync(single2);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [B2'] -> [B2'']
                countStart = countReset = 0;
                mode.sync(single3);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [B2''] -> [A2]
                countStart = countReset = 0;
                mode.sync(empty1);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should keep selection mode even when anchor moved unless selection is empty', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 10))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);
                const single2 = TextEditorMock([SelectionMock(PositionMock(5, 0), PositionMock(5, 10))]);

                // [A2] -> [B2]
                mode.initialize(empty1);
                mode.startSelection(empty1, false);
                countStart = countReset = 0;
                mode.sync(single1);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [B2] -> [B2']
                mode.initialize(single1);
                mode.startSelection(single1, false);
                countStart = countReset = 0;
                mode.sync(single2);
                assert.equal(countStart, 0);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should stop selection mode when anchor moved and new selection is empty', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const empty2 = TextEditorMock([SelectionMock(PositionMock(5, 10))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);

                // [A2] -> [A1]
                mode.initialize(empty1);
                mode.startSelection(empty1, false);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.equal(countStart, 0);
                assert.equal(countReset, 1);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);

                // [B2] -> [A1]
                mode.initialize(single1);
                mode.startSelection(single1, false);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.equal(countStart, 0);
                assert.equal(countReset, 1);
                assert.equal(mode.inSelection(), false);
                assert.equal(mode.inBoxSelection(), false);
            });
            it('should start selection mode if selection became non-empty', function() {
                const empty = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const single = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);
                const multi = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);

                // [A1] -> [B2]
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(single);
                assert.equal(countStart, 1);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), false);

                // [A1] -> [C3]
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(multi);
                assert.equal(countStart, 1);
                assert.equal(countReset, 0);
                assert.equal(mode.inSelection(), true);
                assert.equal(mode.inBoxSelection(), true);
            });
        });
    });
});
