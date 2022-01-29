"use_strict";
const vscode = require("vscode");
const EditUtil = require("./edit_util.js");

const EditEventHandler = function(mode) {
    let onDetectEditCallback = null;
    const onDetectEdit = function(callback) {
        onDetectEditCallback = callback;
    };

    // const makeInsertUniformText = function(text) {
    //     return async () => {
    //         await vscode.commands.executeCommand('type', { text: text });
    //     };
    // };
    const makeInsertUniformText2 = function(text, numDeleteLeft) {
        return async (textEditor) => {
            const selections = Array.from(textEditor.selections);
            const bottomToTop = 1 < selections.length && selections[0].start.isAfter(selections[1].start);
            if (bottomToTop) {
                selections.reverse();
            }
            const numLF = Array.from(text).filter(c => c === '\n').length;
            const lenLastLine = numLF === 0 ? 0 : text.length - (text.lastIndexOf('\n') + 1);
            let lineOffset = 0;
            const newSelections = [];
            await textEditor.edit(edit => {
                for (const selection of selections) {
                    let pos = selection.active;
                    let removedLineCount = 0;
                    if (0 < numDeleteLeft) {
                        const range = new vscode.Range(
                            new vscode.Position(
                                pos.line,
                                Math.max(0, pos.character - numDeleteLeft)
                            ),
                            pos
                        );
                        edit.delete(range);
                    } else if (!selection.isEmpty) {
                        edit.delete(selection);
                        pos = selection.start;
                        removedLineCount = selection.end.line - selection.start.line;
                    }
                    edit.insert(pos, text);
                    lineOffset += numLF;
                    if (numLF === 0) {
                        pos = new vscode.Position(
                            pos.line + lineOffset,
                            Math.max(0, pos.character - numDeleteLeft) + text.length
                        );
                    } else {
                        pos = new vscode.Position(pos.line + lineOffset, lenLastLine);
                    }
                    lineOffset -= removedLineCount;
                    newSelections.push(new vscode.Selection(pos, pos));
                }
            });
            if (mode.inSelection()) {
                mode.resetSelection(textEditor);
            }
            if (bottomToTop) {
                newSelections.reverse();
            }
            if (!EditUtil.isEqualSelections(textEditor.selections, newSelections)) {
                mode.expectSync();
                textEditor.selections = newSelections;
                if (1 < newSelections.length) {
                    mode.startSelection(textEditor, true);
                }
                await mode.waitForSyncTimeout(200).catch(() => {});
            } else {
                if (1 < newSelections.length) {
                    mode.startSelection(textEditor, true);
                }
            }
        };
    };
    const isIndentOrOutdent = function(changes) {
        if (changes.length === 0) {
            return false;
        }
        const allChangesAtLineStart = changes.every(chg => chg.range.start.character === 0);
        if (!allChangesAtLineStart) {
            return false;
        }
        const allChangesSingleLine = changes.every(chg => (
            chg.range.start.line === chg.range.end.line
        ));
        if (!allChangesSingleLine) {
            return false;
        }
        const editDelta = changes[0].text.length - changes[0].rangeLength;
        const isUniformEditDelta = changes.every(chg => (
            chg.text.length - chg.rangeLength === editDelta
        ));
        if (!isUniformEditDelta) {
            return false;
        }
        if (0 < editDelta) {
            const text = changes[0].text.slice(0, editDelta);
            const isWhiteSpace = Array.from(text).every(c => (c === ' ' || c === '\t'));
            if (!isWhiteSpace) {
                return false;
            }
            const isUniformText = changes.every(chg => (
                chg.text.slice(0, editDelta) === text
            ));
            if (!isUniformText) {
                return false;
            }
            return 'indent';
        } else if (0 > editDelta) {
            // FIXME: The deleted text should consist of only white spaces.
            return 'outdent';
        }
        return false;
    };
    const isBracketCompletionWithSelection = function(selections, changes) {
        if (changes.length === 0) {
            return false;
        }
        let uniformPairedText = changes.every(
            (chg,i) => chg.text === changes[i % 2].text
        );
        return (
            uniformPairedText &&
            selections.length * 2 === changes.length &&
            changes.every(chg => chg.range.isEmpty) &&
            selections.every((sel,i) => (
                sel.start.isEqual(changes[i * 2].range.start) &&
                sel.end.isEqual(changes[i * 2 + 1].range.start)
            )) &&
            changes.every(chg => chg.text.length === 1)
        );
    };
    const processOnChangeDocument = function(changes) {
        changes.sort((a, b) => a.rangeOffset - b.rangeOffset);
        // console.log('#changes ' + changes.map(chg => chg.text));
        let selections = Array.from(vscode.window.activeTextEditor.selections);
        selections.sort((a, b) => a.start.compareTo(b.start));
        const uniformText = changes.every((chg) => chg.text === changes[0].text);
        if (0 < changes.length && changes.length === selections.length && uniformText) {
            let sameRange = changes.every((chg, i) => selections[i].isEqual(chg.range));
            if (sameRange) {
                // Pure insertion of a single line of text or,
                // replacing (possibly multiple) selected range(s) with a text
                let expectedSelections = (() => {
                    let sels = [], lineOffset = 0;
                    for (let i = 0; i < changes.length; i++) {
                        let chg = changes[i];
                        let pos = chg.range.start.translate({
                            lineDelta: lineOffset,
                            characterDelta: chg.text.length
                        });
                        // lineOffset += Array.from(chg.text).filter(c => c === '\n').length;
                        lineOffset -= chg.range.end.line - chg.range.start.line;
                        sels[i] = new vscode.Selection(pos, pos);
                    }
                    return sels;
                })();
                const numDeleteLeft = 0;
                const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                if (onDetectEditCallback) {
                    onDetectEditCallback('<insert-uniform-text>', insertUniformText, expectedSelections);
                }
                mode.expectSync();
                return;
            }
            const emptySelection = EditUtil.rangesAllEmpty(selections);
            const uniformRangeLength = changes.every((chg) => chg.rangeLength === changes[0].rangeLength);
            if (emptySelection && uniformRangeLength) {
                const cursorAtEndOfRange = selections.every((sel, i) => sel.active.isEqual(changes[i].range.end));
                if (cursorAtEndOfRange) {
                    // Text insertion/replacement by code completion or maybe IME.
                    // It starts with removing one or more already inserted characters
                    // followed by inserting complete word(s).
                    const numDeleteLeft = changes[0].rangeLength;
                    const insertUniformText = makeInsertUniformText2(changes[0].text, numDeleteLeft);
                    if (onDetectEditCallback) {
                        onDetectEditCallback('<insert-uniform-text>', insertUniformText);
                    }
                    mode.expectSync();
                    return;
                }
            }
        }
        if (isBracketCompletionWithSelection(selections, changes)) {
            // Possibility: typing an opening bracket with a range of text selected,
            // caused brack completion around the selected text
            let text = changes[0].text;
            if (onDetectEditCallback) {
                onDetectEditCallback(
                    '<default-type>',
                    async function(_textEditor, _edit) {
                        await vscode.commands.executeCommand('default:type', { text: text });
                    }
                );
            }
            mode.expectSync();
            return;
        }
        const indentOrOutdent = isIndentOrOutdent(changes);
        if (indentOrOutdent !== false) {
            if (indentOrOutdent === 'indent') {
                if (onDetectEditCallback) {
                    onDetectEditCallback(
                        '<indent>',
                        async function(_textEditor, _edit) {
                            await vscode.commands.executeCommand('editor.action.indentLines');
                        }
                    );
                }
                mode.expectSync();
            } else {
                if (onDetectEditCallback) {
                    onDetectEditCallback(
                        '<outdent>',
                        async function(_textEditor, _edit) {
                            await vscode.commands.executeCommand('editor.action.outdentLines');
                        }
                    );
                }
                mode.expectSync();
            }
            return;
        }
        // console.log('*** unhandled edit event (1)');
        // console.log('selections: ' + selectionsToString(selections));
        // console.log('changes ' + changes.map(chg => chg.text));
        // console.log('ranges: ' + rangesToString(changes.map(chg => chg.range)));
    };
    return {
        onDetectEdit,
        processOnChangeDocument
    };
};

module.exports = EditEventHandler;
