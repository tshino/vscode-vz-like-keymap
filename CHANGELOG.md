# Change Log

All notable changes to the "vz-like-keymap" extension will be documented in this file.

### [Unreleased]
- Added:
  - Ctrl+Q E, Ctrl+Q X for Move cursor to top / bottom of current view.
  - Ctrl+Q B for Jump to opposite side of selection range.
- Changed:
  - Changed alternative keys from Ctrl+Q Ctrl+B and Ctrl+Q Ctrl+P to Ctrl+Alt+B and Ctrl+Alt+J respectively.
- Fixed:
  - Box selection range disappears unexpectedly with certain operations.
  - Selection mode implicitly stops unexpectedly with certain operations.
  - Ctrl+B fails to stop box selection mode when selection range is empty.

### [0.5.0] - 2019-12-24
- Changed:
  - Ctrl+W, Ctrl+Z now not only scrolls up / down but also moves the cursor up / down.

### [0.4.2] - 2019-12-18
- Fixed:
  - Possible selection mode status confusion between different editor instances.

### [0.4.1] - 2019-12-14
- Changed:
  - Allowed Ctrl+Q R, Ctrl+Q C to work while find / replace widget has focus.
  - Disabled Ctrl+B, Ctrl+J, Ctrl+M, Ctrl+N, Ctrl+S when the editor has focus but the text doesn't have focus, to avoid misuse of those default functions.

### [0.4.0] - 2019-12-07
- Added:
  - Ctrl+R, PageUp, Ctrl+C, PageDown for Find previous / next match while find widget is visible.
  - Ctrl+E, Ctrl+X for Show previous / next item in history (as same as UpArrow / DownArray) when find or replace input is focussed.
  - 'Alternatives for conflicts' section in README.
  - Ctrl+Q Ctrl+B as an alternative of Ctrl+B for Toggle side bar visibility.
  - Ctrl+Q Ctrl+P as an alternative of Ctrl+J for Toggle panel visibility.
- Changed:
  - Allowed Ctrl+W and Ctrl+Z (scroll one line) to work almost anywhere in an editor including when find / replace widget has focus.
  - Allowed Ctrl+Q F (find) and Ctrl+Q A (replace) to work while find / replace widget has focus.
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
