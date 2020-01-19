# VZ-like Keymap Extension for VS Code

This extension provides a keymap similar to VZ Editor.

Almost all cursor movement keys and editing keys are supported.
See the table below for the detail.

Note that, since each shortcut key is mapped to the corresponding functionality of VS Code, the behavior may be different than VZ Editor.
For example, Ctrl+F moves the cursor to the next word while the word border is defined differently in VS Code and VZ Editor.

For the compatible experience, every two-stroke shortcuts provided by this extension allow you either to press the Ctrl key or not when pressing the second stroke.
(e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)

The selection mode of VZ Editor is something a little unique feature, which can be toggled by Ctrl+B, allowing you to make a selection range using un-modified cursor keys.
You can use a context variable 'vz.inSelectionMode' in the 'when' clause in your keybindings.json to determine whether it is in selection mode or not.
The difference between standard 'editorHasSelection' and 'vz.inSelectionMode' is whether it includes the state in which the selection range is empty.

This extension does not provide any two-stroke shortcut keys starting from ESC key, such as ESC S to save the document, to avoid breaking existing functionalities of ESC key that are single-stroke.
Instead, it is recommended to use acceleration keys such as Alt+F S to save the document.

## Supported keys

### Cursor, Scroll, Selection, Jump

| Key | Function |
| --- | -------- |
| Ctrl+S, Ctrl+D, Ctrl+E, Ctrl+X  | Move cursor left/right/up/down |
| Ctrl+A, Ctrl+F | Move cursor to left/right start of a word |
| Ctrl+R, PageUp, Ctrl+C, PageDown | Move cursor up/down one page |
| Ctrl+W, Ctrl+Z | Scroll up/down one line |
| Ctrl+Q S, Ctrl+Q D | Move cursor to start/end of a line |
| Ctrl+Q E, Ctrl+Q X | Move cursor to top/bottom of a view |
| Ctrl+Q R, Ctrl+Q C | Move cursor to start/end of a file |
| Ctrl+B | Toggle selection mode |
| Ctrl+K B | Toggle box selection mode |
| Ctrl+Q B | Jump to opposite side of selection range |
| Ctrl+Q K | Jump to bracket |
| Ctrl+Q J | Jump by line number |

### Delete, Insert, Clipboard

| Key | Function |
| --- | -------- |
| Ctrl+H, Ctrl+G | Delete left/right charactor |
| Ctrl+Q H, Ctrl+T | Delete left/right word |
| Ctrl+Q T, Ctrl+Q Y | Delete left/right half of a line |
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
| Ctrl+R, PageUp, Ctrl+C, PageDown | Find previous/next match |
| Ctrl+M | Find next match/Replace one |

## Alternatives for conflicts

| Key | VS Code default key | Function |
| --- | ------------------- | -------- |
| Ctrl+Q Ctrl+Q | Ctrl+Q | Quick open view |
| Ctrl+Alt+B | Ctrl+B | Toggle side bar visibility |
| Ctrl+Alt+J | Ctrl+J | Toggle panel visibility |
