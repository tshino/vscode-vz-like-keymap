# Change Log

All notable changes to the Vz Keymap extension will be documented in this file.

### [Unreleased]
- Added:
  - Changing the cursor style according to the selection mode status.
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
  - New option 'Scroll Page Size' which you can choose from Full and Half.
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
