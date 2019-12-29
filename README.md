# VZ-like Keymap Extension for VS Code

This extension provides a keymap similar to VZ Editor.

 - The focus is only on shortcut keys in the text editor.
 - The second key of a two-stroke key is allowed to be pressed with or without CTRL.
   (e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)


## Supported keys

### Cursor, Scroll, Selection, Jump

| Key | Function |
| --- | -------- |
| Ctrl+S, Ctrl+D, Ctrl+E, Ctrl+X  | Move cursor left / right / up / down |
| Ctrl+A, Ctrl+F | Move cursor to left / right start of a word |
| Ctrl+R, PageUp, Ctrl+C, PageDown | Move cursor up / down one page |
| Ctrl+W, Ctrl+Z | Scroll up / down one line |
| Ctrl+Q S, Ctrl+Q D | Move cursor to start / end of a line |
| Ctrl+Q E, Ctrl+Q X | Move cursor to start / end of a view |
| Ctrl+Q R, Ctrl+Q C | Move cursor to start / end of a file |
| Ctrl+B | Toggle selection mode |
| Ctrl+K B | Toggle box selection mode |
| Ctrl+Q K | Jump to bracket |
| Ctrl+Q J | Jump by line number |

### Delete, Insert, Clipboard

| Key | Function |
| --- | -------- |
| Ctrl+H, Ctrl+G | Delete left / right charactor |
| Ctrl+Q H, Ctrl+T | Delete left / right word |
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
| Ctrl+Q F, Ctrl+L | Find |
| Ctrl+Q A | Replace |
| Ctrl+R, PageUp, Ctrl+C, PageDown | Find previous / next match |

## Alternatives for conflicts

| Key | VS Code default key | Function |
| --- | ------------------- | -------- |
| Ctrl+Q Ctrl+Q | Ctrl+Q | Quick open view |
| Ctrl+Alt+B | Ctrl+B | Toggle side bar visibility |
| Ctrl+Alt+J | Ctrl+J | Toggle panel visibility |
