"use strict";

const ModeHandler = function() {
    let inSelectionMode = false;
    let inBoxSelectionMode = false;
    let lastSelectionAnchor = null;
    let onStartSelection = null;
    let onResetSelection = null;
    const startSelection = function(textEditor, box) {
        inSelectionMode = true;
        inBoxSelectionMode = box;
        lastSelectionAnchor = textEditor.selection.anchor;
        if (onStartSelection) {
            onStartSelection(textEditor);
        }
    };
    const resetSelection = function(textEditor) {
        inSelectionMode = false;
        inBoxSelectionMode = false;
        lastSelectionAnchor = null;
        if (onResetSelection) {
            onResetSelection(textEditor);
        }
    };
    const resetBoxSelection = function() {
        inBoxSelectionMode = false;
    };
    const sync = function(textEditor) {
        if (!inSelectionMode &&
            (!textEditor.selection.isEmpty || 1 < textEditor.selections.length)) {
            startSelection(textEditor, 1 < textEditor.selections.length);
        }
        if (inSelectionMode && textEditor.selection.isEmpty &&
            !lastSelectionAnchor.isEqual(textEditor.selection.anchor)) {
            resetSelection(textEditor);
        }
    };
    return {
        inSelection: function() { return inSelectionMode; },
        inBoxSelection: function() { return inBoxSelectionMode; },
        onStartSelection: function(func) { onStartSelection = func; },
        onResetSelection: function(func) { onResetSelection = func; },
        startSelection: startSelection,
        resetSelection: resetSelection,
        resetBoxSelection: resetBoxSelection,
        sync: sync,
    };
};

exports.ModeHandler = ModeHandler;
