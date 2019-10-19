# VZ-like Keymap Extension for VS Code

This extension provides a keymap similar to VZ Editor.

 - The focus is only on shortcut keys in the text editor.
 - The second key of a two-stroke key is allowed to be with CTRL.
   (e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)
 - Ctrl+B (start selection) moves the cursor right since it seems to be required to select at least one character.

## Supported keys

### Cursor, Scroll, Selection, Jump

| Key | Function |
| --- | -------- |
| Ctrl+S, Ctrl+D, Ctrl+E, Ctrl+X  | Move cursor left / right / up / down |
| Ctrl+A, Ctrl+F | Move cursor to left / right start of a word |
| Ctrl+R, Ctrl+C | Move cursor up / down one page |
| Ctrl+W, Ctrl+Z | Scroll up / down one line |
| Ctrl+Q S, Ctrl+Q D | Move cursor to start / end of a line |
| Ctrl+Q R, Ctrl+Q C | Move cursor to start / end of a file |
| Ctrl+B | Toggle selection mode |
| Ctrl+Q J | Jump by line number |

### Delete, Insert, Clipboard

| Key | Function |
| --- | -------- |
| Ctrl+H, Ctrl+G | Delete left / right charactor |
| Ctrl+T | Delete right word |
| Ctrl+Q T, Ctrl+Q Y | Delete left / right half of a line |
| Ctrl+I | Tab |
| Ctrl+M | Insert line break |
| Ctrl+N | Insert new line above |
| Ctrl+K D | Duplicate lines |
| Ctrl+Y | Cut |
| Ctrl+K K | Copy |
| Ctrl+J | Paste |

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
