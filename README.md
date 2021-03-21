([The English version](#english) is below the Japanese version)

# Vz Keymap for VS Code

[![Node.js CI](https://github.com/tshino/vscode-vz-like-keymap/actions/workflows/node.js.yml/badge.svg)](https://github.com/tshino/vscode-vz-like-keymap/actions/workflows/node.js.yml)
[![CodeQL](https://github.com/tshino/vscode-vz-like-keymap/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/tshino/vscode-vz-like-keymap/actions/workflows/codeql-analysis.yml)

Vz KeymapはVZエディタのキーバインドを再現するVisual Studio Code拡張です。

- 50以上のショートカットキーに対応し、VZとほぼ同等の基本操作を実現。
- 寛容な2ストロークキー。VZと同様に2文字目でCTRLキーを押しても離してもOK。例えばCTRL+Q CTRL+XとCTRL+Q Xは同じ扱い。
- テキストスタック機能に対応。カット、コピー、ペーストでクリップボードにPUSH、POPできる。
- 選択モード（CTRL+B）と矩形選択モード（CTRL+K B）も再現。
- 削除文字スタック機能もあり、DeleteやBackspaceで消した文字をCTRL+Uで取り出せる。
- 半画面スクロールも可能（設定で切り替え）。
- タグジャンプ機能（SHIFT+F10）。
- リスト操作でもVZ風のキーが使用可能（EXPLORERのファイル選択、推測入力の候補リストなど）。
- いくつか設定オプションあり。設定で "vz" を検索してみてください。

## 対応キー一覧

### カーソル移動、スクロール、選択、ジャンプ

| キー | 機能 |
| ---- | ---- |
| CTRL+S, CTRL+D, CTRL+E, CTRL+X | カーソルを左（右,上,下）へ一文字移動 |
| CTRL+A, CTRL+F | カーソルを左（右）の単語へ移動 |
| CTRL+R, PageUp, CTRL+C, PageDown | 上（下）へ1画面または半画面スクロール |
| CTRL+W, SHIFT+PageUp, CTRL+Z, SHIFT+PageDown | 上（下）へ1行スクロール |
| CTRL+Q S, CTRL+Q D | 論理行の先頭（末尾）へ移動 |
| CTRL+Q [, CTRL+Q ] | 表示行の先頭（末尾）へ移動 |
| CTRL+Q E, CTRL+Q X | 画面内の上端（下端）へ移動 |
| CTRL+Q R, CTRL+Q C | ファイルの先頭（末尾）へ移動 |
| CTRL+B | 選択モード切り替え |
| CTRL+K B | 矩形選択モード切り替え |
| CTRL+Q B | 選択範囲の反対側へジャンプ |
| CTRL+Q K | 対応括弧へジャンプ |
| CTRL+Q J | 行番号指定でジャンプ |
| CTRL+Q M | 現在位置をマーク |
| CTRL+Q P | マークした位置へジャンプ |
| SHIFT+F10 | タグジャンプ |

### 削除、挿入、編集、クリップボード

| キー | 機能 |
| ---- | ---- |
| CTRL+H, CTRL+G | 左（右）の文字を削除 |
| CTRL+Q H, CTRL+T | 左（右）の単語を削除 |
| CTRL+Q T, CTRL+Q Y | カーソルより左側（右側）を削除 |
| CTRL+U | 削除した文字を復元 |
| CTRL+I | タブ挿入 |
| CTRL+M | 改行 |
| CTRL+N | 上に空行を挿入 |
| CTRL+K D | 行または選択範囲を複製 |
| CTRL+Q N | ファイルパスを挿入 |
| CTRL+Q U | 大文字小文字変換 |
| CTRL+Y | カット（テキストスタックにPUSH） |
| CTRL+J | ペースト（テキストスタックからPOP） |
| CTRL+K K | コピー（テキストスタックにPUSH） |
| CTRL+K C | ペースト（テキストスタックを保持） |
| CTRL+K Y | クリップボードとテキストスタックをクリア |

### 履歴操作

| キー | 機能 |
| ---- | ---- |
| CTRL+K U, ALT+Backspace | 元に戻す（Undo） |
| SHIFT+ALT+Backspace | やり直し（Redo） |

### 検索、置換

| キー | 機能 |
| ---- | ---- |
| CTRL+Q F | 検索 |
| CTRL+Q A | 置換 |
| CTRL+L | 選択して検索 |
| CTRL+R, PageUp, CTRL+C, PageDown | 前方（後方）の検索結果へ移動 |
| CTRL+M | 次の検索結果へ移動、または置換を1つ実行 |
| CTRL+Q O | 置換を1つ実行 |

### ウィンドウ操作

| キー | 機能 |
| ---- | ---- |
| ALT+Y | ウィンドウを分割 |
| ALT+W | ウィンドウを切り替え |

### 被ったキーの代替

| 被ったキー | Vz Keymapが提供する代替キー | 機能 |
| ---------- | --------------------------- | ---- |
| CTRL+Q | CTRL+Q CTRL+Q | Quick Open View |
| CTRL+B | CTRL+ALT+B | Toggle Side Bar Visibility |
| CTRL+J | CTRL+ALT+J | Toggle Panel Visibility |

### 被ったキーの元からある代替操作（ご参考）

| 被ったキー | VS Codeに元からある代替操作 | 機能 |
| ---------- | ------------------------- | ---- |
| CTRL+A | 4回クリック | 全選択 |
| CTRL+N | ALT+F N (File > New File) | 新規ファイル |
| CTRL+S | ALT+F S (File > Save) | ファイルを保存 |
| CTRL+W | CTRL+F4 | タブを閉じる |
| CTRL+I | CTRL+Space | 補完候補を表示（IntelliSense） |
| CTRL+K CTRL+C | CTRL+/ | 行コメントの切り替え |

## 再現性の詳細

Vz KeymapではVZエディタと同様に2ストロークキーの2文字目でCTRLキーを押すか離すかを区別しません。VS Codeのキー定義ではこれが区別されるため、Vz Keymapはすべての2ストロークキーを2通りずつ登録しています。

VZエディタの選択モードはちょっと特殊な機能で、単純なキー割り当てでは実現できません。CTRL+Bで選択モードを開始したあとは、普通の（SHIFTキーなしの）カーソルキーで範囲選択ができる必要があるからです。
このため、Vz Keymapでは内部で選択モード状態を保持してカーソルキーの動作を変えています。
また、keybindings.json の'when'節では、Vz Keymapが選択モード中かどうかを判定する 'vz.inSelectionMode' という変数が使えるようにしてあります。
元からある変数 'editorHasSelection' と 'vz.inSelectionMode' は、選択範囲が空（選択モードを開始した直後）でも真になるかどうか、という違いがあります。

いくつかのショートカットキーはVS Codeの対応する機能に直接割り当てられますが、その挙動はVZエディタと異なる場合があります。
例えば次の単語へカーソルを移動するCTRL+Fは、VS CodeとVZエディタで単語境界の判定が異なるため、動きも異なります。

このVS Code拡張では、VZエディタのESCキーで始まる2ストロークキー（例えばESC Sで保存など）は定義しません。これはVS Codeに元からある短押しの（普通の）ESCキーの機能を壊さないようにするためです。
代わりに、ALT+F Sで保存（メインメニューのFile > Save）のようにアクセラレータキーで代用することをお薦めします。


#### English
# Vz Keymap for VS Code

This is a Visual Studio Code extension which provides a keymap similar to good old VZ Editor.

- More than 50 shortcuts to provide basic experience which is almost identical to VZ Editor
- Permissive two-stroke keys (e.g. Ctrl+Q Ctrl+X is equivalent to Ctrl+Q X)
- Text stack (push/pop to the clibboard) is supported for actions Cut, Copy and Paste
- Selection mode (toggle by Ctrl+B) and Column selection mode (toggle by Ctrk+K B)
- Undelete stack (Ctrl+U to restore deleted characters)
- Half-page scroll as an option
- Tag jump (Shift+F10)
- List view operation with VZ-style cursor keys (e.g. selecting files on Explorer, selecting Suggestion)
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

### Window Management

| Key | Function |
| --- | -------- |
| Alt+Y | Split editor window |
| Alt+W | Switch editor window |

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

The selection mode of VZ Editor is something a little unique feature. Once you start it by Ctrl+B, you can make a selection range using cursor keys without the Shift key.
To emulate that behavior on VS Code, this extension holds the selection mode status internally.
You can use a context variable 'vz.inSelectionMode' in the 'when' clause in your keybindings.json to determine whether it is in selection mode or not.
The difference between standard 'editorHasSelection' and 'vz.inSelectionMode' is whether it includes the state in which the selection range is empty.

Note that, since some shortcut keys are mapped to the corresponding functionality of the VS Code directly, the behavior may be different than on VZ Editor.
For example, the result of Ctrl+F which moves the cursor to the next word may differ since word borders are defined differently in VS Code and VZ Editor.

This extension does not provide any two-stroke shortcut keys starting from ESC key, such as ESC S to save the document, to avoid breaking existing functionalities of ESC key that are single-stroke.
Instead, it is recommended to use acceleration keys such as Alt+F S to save the document.
