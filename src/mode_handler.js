"use strict";

const ModeHandler = function() {
    const MODE_NORMAL = 0;
    const MODE_SELECTION = 1;
    const MODE_BOX_SELECTION = 2;
    let mode = MODE_NORMAL;
    let lastSelectionAnchor = null;
    let onStartSelection = null;
    let onResetSelection = null;
    const startSelection = function(textEditor, box) {
        mode = box ? MODE_BOX_SELECTION : MODE_SELECTION;
        lastSelectionAnchor = textEditor.selection.anchor;
        if (onStartSelection) {
            onStartSelection(textEditor);
        }
    };
    const resetSelection = function(textEditor) {
        mode = MODE_NORMAL;
        lastSelectionAnchor = null;
        if (onResetSelection) {
            onResetSelection(textEditor);
        }
    };
    const resetBoxSelection = function() {
        if (mode === MODE_BOX_SELECTION) {
            mode = MODE_SELECTION;
        }
    };
    const sync = function(textEditor) {
        if (mode === MODE_NORMAL &&
            (!textEditor.selection.isEmpty || 1 < textEditor.selections.length)) {
            startSelection(textEditor, 1 < textEditor.selections.length);
        }
        if (mode === MODE_SELECTION &&
            1 < textEditor.selections.length) {
            mode = MODE_BOX_SELECTION;
            lastSelectionAnchor = textEditor.selection.anchor;
        }
        if (mode !== MODE_NORMAL && textEditor.selection.isEmpty &&
            1 === textEditor.selections.length &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            resetSelection(textEditor);
        }
    };
    const initialize = function(textEditor) {
        resetSelection(textEditor);
        sync(textEditor);
    };
    return {
        inSelection: function() { return mode !== MODE_NORMAL; },
        inBoxSelection: function() { return mode === MODE_BOX_SELECTION; },
        onStartSelection: function(func) { onStartSelection = func; },
        onResetSelection: function(func) { onResetSelection = func; },
        startSelection: startSelection,
        resetSelection: resetSelection,
        resetBoxSelection: resetBoxSelection,
        sync: sync,
        initialize: initialize,
    };
};

exports.ModeHandler = ModeHandler;
