# Change Log

All notable changes to the Vz Keymap extension will be documented in this file.

### [Unreleased]
- Added out-of-editor shoftcut keys (Experimental):
  - For list views (e.g. selecting file in the Explorer pane):
    - Ctrl+E/Ctrl+X/Ctrl+R/Ctrl+C to move focus,
    - Ctrl+Q R, Ctrl+Q C to move focus to the first/last item,
    - Ctrl+S/Ctrl+D to collapse/expand tree, and
    - Ctrl+M to select item.
    - These keys are enabled by turning on the 'Vz Keymap: List View Keys' in the Settings.
  - For suggestion widget (IntelliSense):
    - Ctrl+E/Ctrl+X/Ctrl+R/Ctrl+C for to select items,
    - Ctrl+Q R, Ctrl+Q C to select the first/last item, and
    - Ctrl+M to accept selected item.
    - These keys are enabled by turning on the 'Vz Keymap: Suggestion Widget Keys' in the Settings.
  - For settings page:
    - Ctrl+X to move focus from search input to settings list,
    - Ctrl+S to move focus from settings list to table of content, and
    - Ctrl+M to move focus from table of content to settings list.
    - These keys are enabled by turning on the 'Vz Keymap: Settings Page Keys' in the Settings.
  - For parameter hints:
    - Ctrl+E/Ctrl+X to select parameter hints.
    - These keys are enabled by turning on the 'Vz Keymap: Parameter Hint Keys' in the Settings.
- Improved:
  - The 'when' clause of Escape to cancel selection mode.

### [0.14.0] - 2021-01-30
- Added the Japanese version of README.
- Added:
  - Window management shortcuts:
    - Alt+Y for Split editor window.
    - Alt+W for Switch editor window.
  - New options to the Settings:
    - `Vz Keymap: Alt+Y` - on: Split Editor Window (Vz Keymap) / off: unassigned (VS Code)
    - `Vz Keymap: Alt+W` - on: Switch Editor Window (Vz Keymap) / off: Toggle Find Whole Word (VS Code)
    - `Vz Keymap: Ctrl+N` - on: Insert New Line Above (Vz Keymap) / off: New File (VS Code)
    - `Vz Keymap: Shift+F10` - on: Tag Jump (Vz Keymap) / off: Show Editor Context Menu (VS Code)

### [0.13.0] - 2020-11-04
- Added:
  - Ctrl+Q M for Mark current position.
  - Ctrl+Q P for Jump to last marked position.
  - Ctrl+K Y for Clear clipboard and text stack.
  - Selection mode indicator in the status bar.

### [0.12.0] - 2020-10-15
- Added:
  - New set of options to the Settings to enable/disable some key bindings of Vz Keymap.
    - By turning some of these options off you can choose to use the specific keys for the original function of VS Code instead of Vz Keymap's functionality.
    - Here is the full list of key binding options:
    - `Vz Keymap: Ctrl+I` - on: Insert Tab (Vz Keymap) / off: IntelliSense (VS Code)
    - `Vz Keymap: Ctrl+L` - on: Select Word for Find (Vz Keymap) / off: Expand Line Selection (VS Code)
    - `Vz Keymap: Ctrl+W` - on: Scroll Up (Vz Keymap) / off: Close Window (VS Code)
    - `Vz Keymap: Ctrl+Z` - on: Scroll Down (Vz Keymap) / off: Undo (VS Code)
  - Ctrl+Q O for Replace one match.
  - Ctrl+Q U for Transform case.
  - Ctrl+Q N for Insert file path.
  - Shift+PageUp, Shift+PageDown for Scroll up/down one line (same as Ctrl+W, Ctrl+Z).

### [0.11.1] - 2020-09-26
- Improved:
  - The behavior of Undelete (Utrl+U) of a single text inserting into multiple locations with multiple cursors.
  - The behavior of Undelete (Utrl+U) of multiple lines pasting with a single cursor.
  - The behavior of Undelete (Utrl+U) when the selection range is not empty.

### [0.11.0] - 2020-09-06
- Added:
  - The undelete stack which allows Ctrl+U to restore previously deleted characters.

### [0.10.2] - 2020-08-02
- Improved:
  - The behavior of Paste of a text which is from box-selection mode.
  - The behavior of Paste of a text which has been taken from the last line of a document.
  - The behavior of Cut of a single line text by Ctrl+Y with no selection.
  - The behavior of Cut of a long range of text.
  - The behavior of Half-page scroll up and down to be as symmetric as possible.
- Added:
  - Integration tests for almost all commands using vscode-test.

### [0.10.1] - 2020-04-29
- Improved:
  - The behavior of Paste of a text which is from box-selection mode to be more compatible with Vz Editor.
  - The behavior of Delete/Backspace in box-selection mode.
  - The behavior of Escape for cancel box-selection mode.
  - The behavior of Ctrl+Q B (Reverse selection) in box-selection mode.

### [0.10.0] - 2020-04-20
- Added:
  - Added text stack finally! Cut (Ctrl+Y), Copy (Ctrl+K K) and Paste (Ctrl+J) perform now push/pop to the text stack as well as write/read to the clipboard.
  - Added Ctrl+K C for Paste without pop, which is just a repeatable normal paste behavior.
  - Added new option 'Vz Keymap: Text Stack' to the Settings which you can enable/disable the text stack.
  - Added changing the cursor style according to the selection mode status.
- Improved:
  - The behavior of box-selection mode in terms of compatibility with Column Selection Mode.
  - The behavior of Ctrl+K K (copy) in box-selection mode.

### [0.9.1] - 2020-03-07
- Added:
  - Ctrl+Q '[' and Ctrl+Q ']' for Move cursor to start/end of current wrapped line.
- Improved:
  - The behavior of repeated Ctrl+L for Select words to find.
  - The behavior of Ctrl+Q X so that the view does not scroll.
  - The behavior of Ctrl+W.
  - The behavior of Escape key for Close find widget to do cancel selection as well.
  - The behavior of full-size page scroll not to overshoot when the view is at the bottom of a document.

### [0.9.0] - 2020-02-25
- Added:
  - Half-page scroll as optional scroll behavior of PageUp/PageDown (and its shortcut Ctrl+R/Ctrl+C).
  - New option 'Vz Keymap: Scroll Page Size' which you can choose from Full and Half.
- Improved:
  - The behavior of page scroll to preserve the vertical position of the cursor in the view.

### [0.8.2] - 2020-02-12
- Fixed:
  - The suggestion list (IntelliSense) cannot be selected by cursor keys.

### [0.8.1] - 2020-02-08
- Added:
  - Support for HOME path notation (~/) in Tag jump.

### [0.8.0] - 2020-02-03
- Added:
  - Shift+F10 for Tag jump.
- Fixed:
  - Some key bindings are affecting to screens other than text editors.

### [0.7.0] - 2020-01-23
- Added:
  - Ctrl+M for Find next match and Replace one as a correspondence of the default Enter key of VS Code.
  - Ctrl+F for Toggle find/replace widget when the widget has focus (experimental).
  - Ctrl+S, Ctrl+D, Ctrl+B for Close find widget (experimental for ease of use).
  - New 'when' clause context 'vz.inSelectionMode' which is a boolean indicating Vz Keymap is in selection mode.
- Changed:
  - Changed the extension name from VZ Keymap to Vz Keymap.
- Fixed:
  - Ctrl+Q S, Ctrl+Q D (move cursor to start/end of a line) moves cursor differently in selection mode compared to non-selection mode.
  - Selection mode started by Ctrl+B can't be stopped by Escape key when the selection range is empty.

### [0.6.0] - 2020-01-08
- Added:
  - Ctrl+Q E, Ctrl+Q X for Move cursor to top/bottom of current view.
  - Ctrl+Q B for Jump to opposite side of selection range.
- Changed:
  - Changed alternative keys from Ctrl+Q Ctrl+B and Ctrl+Q Ctrl+P to Ctrl+Alt+B and Ctrl+Alt+J respectively.
- Fixed:
  - Box selection range disappears unexpectedly with certain operations.
  - Selection mode implicitly stops unexpectedly with certain operations.
  - Ctrl+B fails to stop box selection mode when selection range is empty.

### [0.5.0] - 2019-12-24
- Changed:
  - Ctrl+W, Ctrl+Z now not only scrolls up/down but also moves the cursor up/down.

### [0.4.2] - 2019-12-18
- Fixed:
  - Possible selection mode status confusion between different editor instances.

### [0.4.1] - 2019-12-14
- Changed:
  - Allowed Ctrl+Q R, Ctrl+Q C to work while find/replace widget has focus.
  - Disabled Ctrl+B, Ctrl+J, Ctrl+M, Ctrl+N, Ctrl+S when the editor has focus but the text doesn't have focus, to avoid misuse of those default functions.

### [0.4.0] - 2019-12-07
- Added:
  - Ctrl+R, PageUp, Ctrl+C, PageDown for Find previous/next match while find widget is visible.
  - Ctrl+E, Ctrl+X for Show previous/next item in history (as same as UpArrow/DownArray) when find or replace input is focussed.
  - 'Alternatives for conflicts' section in README.
  - Ctrl+Q Ctrl+B as an alternative of Ctrl+B for Toggle side bar visibility.
  - Ctrl+Q Ctrl+P as an alternative of Ctrl+J for Toggle panel visibility.
- Changed:
  - Allowed Ctrl+W and Ctrl+Z (scroll one line) to work almost anywhere in an editor including when find/replace widget has focus.
  - Allowed Ctrl+Q F (find) and Ctrl+Q A (replace) to work while find/replace widget has focus.
  - Disabled Ctrl+G, Ctrl+H, Ctrl+T when the editor has focus but the text doesn't have focus, to avoid misuse of those default functions (e.g. Ctrl+H for Replace).
- Fixed:
  - Selection mode stops when moving the cursor by PageUp or PageDown.

### [0.3.0] - 2019-11-28
- Added: Ctrl+K B for Box selection mode.

### [0.2.0] - 2019-11-12
- Added: Ctrl+L for Find.
- Added: Ctrl+Q H for Delete left word.
- Added: Ctrl+Q K for Jump to bracket.

### [0.1.1] - 2019-11-02
- Fixed: Selection mode stops when moving the cursor by cursor keys with no modifier keys.
- Fixed: Selection mode doesn't stop after edit actions (Cut, Copy, Delete,...).

### [0.1.0] - 2019-10-24
- Added: Proper selection mode (toggle with Ctrl+B) implementation.

### [0.0.1] - 2019-10-20
- Initial release
