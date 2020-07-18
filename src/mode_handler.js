"use strict";

const ModeHandler = function() {
    const MODE_NORMAL = 0;
    const MODE_SELECTION = 1;
    const MODE_BOX_SELECTION = 2;
    let mode = MODE_NORMAL;
    let lastSelectionAnchor = null;
    let onStartSelection = null;
    let onResetSelection = null;
    let synchronized = false;
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
        if (mode !== MODE_NORMAL && 1 < textEditor.selections.length) {
            mode = MODE_BOX_SELECTION;
            lastSelectionAnchor = textEditor.selection.anchor;
        }
        if (mode !== MODE_NORMAL && textEditor.selection.isEmpty &&
            1 === textEditor.selections.length &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            resetSelection(textEditor);
        }
        synchronized = true;
    };
    const initialize = function(textEditor) {
        resetSelection(textEditor);
        sync(textEditor);
        synchronized = false;
    };
    const expectSync = function() {
        synchronized = false;
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
        expectSync,
        synchronized: function() { return synchronized; },
    };
};

exports.ModeHandler = ModeHandler;

const theInstance = ModeHandler();
exports.getInstance = function() {
    return theInstance;
};
