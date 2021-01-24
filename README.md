# Vz Keymap for VS Code

[![Node.js CI](https://github.com/tshino/vscode-vz-like-keymap/workflows/Node.js%20CI/badge.svg)](https://github.com/tshino/vscode-vz-like-keymap/actions?query=workflow%3A%22Node.js+CI%22)

This is a Visual Studio Code extension which provides a keymap similar to good old Vz Editor.

- More than 50 shortcuts to provide basic experience which is almost identical to Vz Editor
- Permissive two-stroke keys (e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)
- Text stack (push/pop to the clibboard) is supported for actions Cut, Copy and Paste
- Selection mode (toggle by Ctrl+B) and Column selection mode (toggle by Ctrk+K B)
- Undelete stack (Ctrl+U to restore deleted characters)
- Half-page scroll as an option
- Tag jump (Shift+F10)
- Some options are available (search for 'vz' in the Settings)

## Supported keys

### Cursor, Scroll, Selection, Jump

| Key | Function |
| --- | -------- |
| Ctrl+S, Ctrl+D, Ctrl+E, Ctrl+X  | Move cursor left/right/up/down |
| Ctrl+A, Ctrl+F | Move cursor to left/right start of a word |
| Ctrl+R, PageUp, Ctrl+C, PageDown | Scroll up/down one/half page |
| Ctrl+W, Shift+PageUp, Ctrl+Z, Shift+PageDown | Scroll up/down one line |
| Ctrl+Q S, Ctrl+Q D | Move cursor to start/end of a logical line |
| Ctrl+Q [, Ctrl+Q ] | Move cursor to start/end of a wrapped line |
| Ctrl+Q E, Ctrl+Q X | Move cursor to top/bottom of a view |
| Ctrl+Q R, Ctrl+Q C | Move cursor to start/end of a file |
| Ctrl+B | Toggle selection mode |
| Ctrl+K B | Toggle box selection mode |
| Ctrl+Q B | Jump to opposite side of selection range |
| Ctrl+Q K | Jump to bracket |
| Ctrl+Q J | Jump by line number |
| Ctrl+Q M | Mark current position |
| Ctrl+Q P | Jump to last marked position |
| Shift+F10 | Tag jump |

### Delete, Insert, Edit, Clipboard

| Key | Function |
| --- | -------- |
| Ctrl+H, Ctrl+G | Delete left/right charactor |
| Ctrl+Q H, Ctrl+T | Delete left/right word |
| Ctrl+Q T, Ctrl+Q Y | Delete left/right half of a line |
| Ctrl+U | Restore deleted characters |
| Ctrl+I | Tab |
| Ctrl+M | Insert line break |
| Ctrl+N | Insert new line above |
| Ctrl+K D | Duplicate lines |
| Ctrl+Q N | Insert file path |
| Ctrl+Q U | Transform case |
| Ctrl+Y | Cut (push to text stack) |
| Ctrl+J | Paste (pop from text stack) |
| Ctrl+K K | Copy (push to text stack) |
| Ctrl+K C | Paste (keep text stack) |
| Ctrl+K Y | Clear clipboard and text stack |

### Undo, Redo

| Key | Function |
| --- | -------- |
| Ctrl+K U, Alt+Backspace | Undo |
| Shift+Alt+Backspace | Redo |

### Search

| Key | Function |
| --- | -------- |
| Ctrl+Q F | Find |
| Ctrl+Q A | Replace |
| Ctrl+L | Select word to find |
| Ctrl+R, PageUp, Ctrl+C, PageDown | Find previous/next match |
| Ctrl+M | Find next match/Replace one match |
| Ctrl+Q O | Replace one match |

### Window

| Key | Function |
| --- | -------- |
| Alt+Y | Split editor window |

### Alternatives for conflicts

| Key with conflict | Alternative key provided by Vz Keymap | Function |
| ----------------- | ------------------------------------- | -------- |
| Ctrl+Q | Ctrl+Q Ctrl+Q | Quick open view |
| Ctrl+B | Ctrl+Alt+B | Toggle side bar visibility |
| Ctrl+J | Ctrl+Alt+J | Toggle panel visibility |

### Existing alternatives (Just for your information)

| Key with conflict | Alternative way existing in VS Code | Function |
| ----------------- | ----------------------------------- | -------- |
| Ctrl+A | Quadrupled click | Select all |
| Ctrl+N | Alt+F N (File > New File) | New untitled file |
| Ctrl+S | Alt+F S (File > Save) | Save file |
| Ctrl+W | Ctrl+F4 | Close editor tab |
| Ctrl+I | Ctrl+Space | Trigger suggest (IntelliSense) |
| Ctrl+K Ctrl+C | Ctrl+/ | Single line comment |

## Compatibility in detail

For basic compatibility, every two-stroke shortcuts provided by this extension allow you either to press the Ctrl key or not when pressing the second stroke.
(e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)

The selection mode of Vz Editor is something a little unique feature. Once you start it by Ctrl+B, you can make a selection range using cursor keys without the Shift key.
You can use a context variable 'vz.inSelectionMode' in the 'when' clause in your keybindings.json to determine whether it is in selection mode or not.
The difference between standard 'editorHasSelection' and 'vz.inSelectionMode' is whether it includes the state in which the selection range is empty.

Note that, since some shortcut keys are mapped to the corresponding functionality of the VS Code directly, the behavior may be different than on Vz Editor.
For example, the result of Ctrl+F which moves the cursor to the next word may differ since word borders are defined differently in VS Code and Vz Editor.

This extension does not provide any two-stroke shortcut keys starting from ESC key, such as ESC S to save the document, to avoid breaking existing functionalities of ESC key that are single-stroke.
Instead, it is recommended to use acceleration keys such as Alt+F S to save the document.
