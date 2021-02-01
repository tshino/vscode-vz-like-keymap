"use strict";
const assert = require('assert');
const mode_handler = require('../src/mode_handler.js');
const PositionMock = require('./position_mock.js');
const SelectionMock = require('./selection_mock.js');

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

describe('TextEditorMock', function() {
    it('should have properties selection and selections', function() {
        let te = TextEditorMock();
        assert('selection' in te);
        assert('selections' in te);
    });
    it('should have an empty selection if it is constructed with no argument', function() {
        let te = TextEditorMock();
        assert.strictEqual(te.selections.length, 1);
        assert.strictEqual(te.selection.isEmpty, true);
        assert.strictEqual(te.selections[0].isEmpty, true);
    });
    it('should have selections if it is constructed with selections argument', function() {
        let te = TextEditorMock([
            SelectionMock(PositionMock(0, 0), PositionMock(3, 4))
        ]);
        assert.strictEqual(te.selections.length, 1);
        assert.strictEqual(te.selection.isEmpty, false);
        assert.strictEqual(te.selections[0].isEmpty, false);
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
            assert.strictEqual(mode.inSelection(), false);
            assert.strictEqual(mode.inBoxSelection(), false);
        });
        describe('startSelection', function() {
            it('should turn on selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onStartSelection(function() {
                    count++;
                });
                mode.startSelection(te, false);
                assert.strictEqual(count, 1);
            });
        });
        describe('resetSelection', function() {
            it('should turn off selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, false);
                mode.resetSelection(te);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                mode = mode_handler.ModeHandler();
                mode.startSelection(te, true);
                mode.resetSelection(te);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
            it('should invoke event handler if set', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                let count = 0;
                mode.onResetSelection(function() {
                    count++;
                });
                mode.resetSelection(te);
                assert.strictEqual(count, 1);
            });
        });
        describe('resetBoxSelection', function() {
            it('should turn off box selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();
                mode.startSelection(te, true);
                mode.resetBoxSelection();
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
            it('should do nothing if not in box selection mode', function() {
                let mode = mode_handler.ModeHandler();
                let te = TextEditorMock();

                mode.startSelection(te, false);
                mode.resetBoxSelection();
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                mode.resetSelection(te);
                mode.resetBoxSelection();
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
        });
        describe('initialize', function() {
            it('should ensure the state to be consistent with given TextEditor', function() {
                let mode = mode_handler.ModeHandler();

                // A --> [1]
                mode.initialize(TextEditorMock());
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // A --> [1]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0))
                ]));
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // B --> [2]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
                ]));
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // C --> [3]
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 0), PositionMock(6, 10))
                ]));
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should invoke at least one callback function', function() {
                let mode = mode_handler.ModeHandler();
                let countStart, countReset;
                mode.onStartSelection(function() { countStart++; });
                mode.onResetSelection(function() { countReset++; });

                // A --> [1]
                countStart = countReset = 0;
                mode.initialize(TextEditorMock());
                assert( 0 < countReset );

                // A --> [1]
                countStart = countReset = 0;
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0))
                ]));
                assert( 0 < countReset );

                // B --> [2]
                countStart = countReset = 0;
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10))
                ]));
                assert( 0 < countStart );

                // C --> [3]
                countStart = countReset = 0;
                mode.initialize(TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 0), PositionMock(6, 10))
                ]));
                assert( 0 < countStart );
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
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A1]
                const empty = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A2]
                mode.initialize(empty);
                mode.startSelection(empty, false);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A3]
                mode.initialize(empty);
                mode.startSelection(empty, true);
                countStart = countReset = 0;
                mode.sync(empty);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B2]
                const single = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(10, 0))
                ]);
                mode.initialize(single);
                countStart = countReset = 0;
                mode.sync(single);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B3]
                mode.initialize(empty);
                mode.startSelection(single, true);
                countStart = countReset = 0;
                mode.sync(single);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3]
                const multi = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);
                mode.initialize(multi);
                countStart = countReset = 0;
                mode.sync(multi);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should do nothing if cursor moved in non-selection mode', function() {
                const cursor_pos1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const cursor_pos2 = TextEditorMock([SelectionMock(PositionMock(5, 6))]);
                const cursor_pos3 = TextEditorMock([SelectionMock(PositionMock(6, 0))]);

                // [A1] -> [A1']
                mode.initialize(cursor_pos1);
                countStart = countReset = 0;
                mode.sync(cursor_pos2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A1'] -> [A1'']
                mode.initialize(cursor_pos2);
                countStart = countReset = 0;
                mode.sync(cursor_pos3);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);
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
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B2] -> [B2']
                countStart = countReset = 0;
                mode.sync(single2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B2'] -> [B2'']
                countStart = countReset = 0;
                mode.sync(single3);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B2''] -> [A2]
                countStart = countReset = 0;
                mode.sync(empty1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
            it('should do nothing when cursor moved in box-selection mode', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 6))]);
                const single2 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(6, 5))]);
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5)),
                    SelectionMock(PositionMock(6, 5))
                ]);
                const multi2 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);

                // [A3] -> [B3]
                mode.initialize(empty1);
                mode.startSelection(empty1, true);
                countStart = countReset = 0;
                mode.sync(single1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B3] -> [B3']
                countStart = countReset = 0;
                mode.sync(single2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B3'] -> [C3]
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3] -> [C3']
                countStart = countReset = 0;
                mode.sync(multi2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3'] -> [B3]
                countStart = countReset = 0;
                mode.sync(single1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B3] -> [A3]
                countStart = countReset = 0;
                mode.sync(empty1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [A3] -> [C3]
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3] -> [A3]
                countStart = countReset = 0;
                mode.sync(empty1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
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
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B2] -> [B2']
                mode.initialize(single1);
                mode.startSelection(single1, false);
                countStart = countReset = 0;
                mode.sync(single2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
            it('should keep box-selection mode even when anchor moved unless selection is empty', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 10))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);
                const single2 = TextEditorMock([SelectionMock(PositionMock(5, 0), PositionMock(5, 10))]);
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);
                const multi2 = TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 0)),
                    SelectionMock(PositionMock(6, 0), PositionMock(6, 0))
                ]);
                const multi3 = TextEditorMock([
                    SelectionMock(PositionMock(5, 1), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 1), PositionMock(6, 10))
                ]);

                // [A3] -> [B3]
                mode.initialize(empty1);
                mode.startSelection(empty1, true);
                countStart = countReset = 0;
                mode.sync(single1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B3] -> [B3']
                countStart = countReset = 0;
                mode.sync(single2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B3'] -> [C3]
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3] -> [C3']
                countStart = countReset = 0;
                mode.sync(multi2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3'] -> [C3'']
                countStart = countReset = 0;
                mode.sync(multi3);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [C3''] -> [B3]
                countStart = countReset = 0;
                mode.sync(single1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [A3] -> [C3]
                mode.initialize(empty1);
                mode.startSelection(empty1, true);
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should keep box-selection mode when anchor moved and then selection became empty', function() {
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5)),
                    SelectionMock(PositionMock(6, 5))
                ]);
                const multi2 = TextEditorMock([
                    SelectionMock(PositionMock(5, 6)),
                    SelectionMock(PositionMock(6, 6))
                ]);
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 6))]);

                // [C3] -> [C3'] -> [A3]
                mode.initialize(multi1);
                mode.startSelection(multi1, true);
                countStart = countReset = 0;
                mode.sync(multi2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                countStart = countReset = 0;
                mode.sync(empty1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should stop selection mode when anchor moved and new selection is empty', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const empty2 = TextEditorMock([SelectionMock(PositionMock(5, 10))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 0), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 0), PositionMock(6, 10))
                ]);

                // [A2] -> [A1]
                mode.initialize(empty1);
                mode.startSelection(empty1, false);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 1);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A3] -> [A1]
                mode.initialize(empty1);
                mode.startSelection(empty1, true);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 1);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B2] -> [A1]
                mode.initialize(single1);
                mode.startSelection(single1, false);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 1);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [B3] -> [A1]
                mode.initialize(single1);
                mode.startSelection(single1, true);
                countStart = countReset = 0;
                mode.sync(empty2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 1);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [C3] -> [A1]
                mode.initialize(multi1);
                mode.startSelection(multi1, true);
                countStart = countReset = 0;
                mode.sync(empty1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 1);
                assert.strictEqual(mode.inSelection(), false);
                assert.strictEqual(mode.inBoxSelection(), false);
            });
            it('should start selection mode if selection became non-empty', function() {
                const empty = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const single = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 10))]);
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5)),
                    SelectionMock(PositionMock(6, 5))
                ]);
                const multi2 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);

                // [A1] -> [B2]
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(single);
                assert.strictEqual(countStart, 1);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), false);

                // [A1] -> [C3]
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 1);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [A1] -> [C3']
                mode.initialize(empty);
                countStart = countReset = 0;
                mode.sync(multi2);
                assert.strictEqual(countStart, 1);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
            it('should promote to box-selection mode if multi-line selection turns out', function() {
                const empty1 = TextEditorMock([SelectionMock(PositionMock(5, 5))]);
                const single1 = TextEditorMock([SelectionMock(PositionMock(5, 5), PositionMock(5, 6))]);
                const multi1 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5)),
                    SelectionMock(PositionMock(6, 5))
                ]);
                const multi2 = TextEditorMock([
                    SelectionMock(PositionMock(5, 5), PositionMock(5, 10)),
                    SelectionMock(PositionMock(6, 5), PositionMock(6, 10))
                ]);

                // [A2] -> [C3]
                mode.initialize(empty1);
                mode.startSelection(empty1, false);
                countStart = countReset = 0;
                mode.sync(multi1);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);

                // [B2] -> [C3]
                mode.initialize(single1);
                mode.startSelection(single1, false);
                countStart = countReset = 0;
                mode.sync(multi2);
                assert.strictEqual(countStart, 0);
                assert.strictEqual(countReset, 0);
                assert.strictEqual(mode.inSelection(), true);
                assert.strictEqual(mode.inBoxSelection(), true);
            });
        });
    });
    describe('getInstance', function() {
        it('should return the global instance of ModeHandler', function() {
            let mode1 = mode_handler.getInstance();
            assert('inSelection' in mode1);
            assert('inBoxSelection' in mode1);
            let mode2 = mode_handler.getInstance();
            assert.strictEqual(mode1 === mode2, true);
        });
    });
});
