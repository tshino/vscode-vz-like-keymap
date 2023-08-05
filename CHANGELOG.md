# Change Log

All notable changes to the Vz Keymap extension will be documented in this file.

### [Unreleased]
- 新規:
    - Searchビューで使う操作に対応しました。 [#181](https://github.com/tshino/vscode-vz-like-keymap/pull/181)
        - CTRL+W, CTRL+Z で検索入力と検索結果の間でフォーカスを移動。
        - CTRL+M で検索結果にフォーカスがあるとき選択されたファイルを開く。
        - これらは設定の 'Vz Keymap: Search Viewlet Keys' で有効化できます。デフォルトで有効です。
    - Statusバー上でフォーカスを移動する操作に対応しました。 [#182](https://github.com/tshino/vscode-vz-like-keymap/pull/182)
        - CTRL+S, CTRL+D, CTRL+A, CTRL+F, CTRL+Q S, CTRL+Q D でフォーカスを移動。
        - これらは設定の 'Vz Keymap: Status Bar Keys' で有効化できます。デフォルトで有効です。
- 改善:
    - UndoとRedoのキーバインド（ALT+BACKSPACEなど）をエディタ内以外でも使えるようにしました。 [#183](https://github.com/tshino/vscode-vz-like-keymap/issues/183)
    - リストビューで使うキー定義にスクロール操作を追加。 [#187](https://github.com/tshino/vscode-vz-like-keymap/pull/187)
        - CTRL+W, CTRL+Z でスクロール。
- New:
    - Added navigation keys support in Search viewlet. [#181](https://github.com/tshino/vscode-vz-like-keymap/pull/181)
        - Ctrl+W, Ctrl+Z to move focus between the search input box and search result.
        - Ctrl+M to open the selected file in search result.
        - These keys are enabled by turning on the 'Vz Keymap: Search Viewlet Keys' in the Settings.
    - Added navigation keys to move focus on Status bar. [#182](https://github.com/tshino/vscode-vz-like-keymap/pull/182)
        - Ctrl+S, Ctrl+D, Ctrl+A, Ctrl+F, Ctrl+Q S, Ctrl+Q D to move focus on the Status bar.
        - These keys are enabled by turning on the 'Vz Keymap: Status Bar Keys' in the Settings.
- Improved:
    - Made Undo and Redo keys (e.g. Alt+Backspace) available everywhere not only in editors. [#183](https://github.com/tshino/vscode-vz-like-keymap/issues/183)
    - Added scroll keys for list views. [#187](https://github.com/tshino/vscode-vz-like-keymap/pull/187)
        - Ctrl+W, Ctrl+Z to scroll the list view.

### [0.19.8] - 2023-07-13
- 新規:
    - パンくずリストの操作に対応しました。 [#176](https://github.com/tshino/vscode-vz-like-keymap/pull/176)
        - CTRL+E, CTRL+X, CTRL+S, CTRL+D でリスト操作。
        - CTRL+A, CTRL+F で列移動。
        - これらは設定の 'Vz Keymap: Breadcrumbs Keys' で有効化できます。デフォルトで有効です。
- 修正:
    - リストビューで使うキー定義を更新。 [#173](https://github.com/tshino/vscode-vz-like-keymap/pull/173)
    - 補完候補リストの操作で使うキー定義を更新。 [#175](https://github.com/tshino/vscode-vz-like-keymap/pull/175)
    - 補完候補リストが非選択状態で表示されているときのCTRL+MとENTERの動作を修正。 [#178](https://github.com/tshino/vscode-vz-like-keymap/pull/178)
- New:
    - Added navigation keys support on Breadcrumbds. [#176](https://github.com/tshino/vscode-vz-like-keymap/pull/176)
        - Ctrl+E, Ctrl+X, Ctrl+S, Ctrl+D to mvoe focus on the list view.
        - Ctrl+A, Ctrl+F to move across columns.
        - These keys are enabled by turning on the 'Vz Keymap: Breadcrumbs Keys' in the Settings.
- Fixed:
    - Updated key definitions for list views. [#173](https://github.com/tshino/vscode-vz-like-keymap/pull/173)
    - Updated key definitions for suggestion widgets. [#175](https://github.com/tshino/vscode-vz-like-keymap/pull/175)
    - Fixed the behavior of Ctrl+M/Enter when the suggestion list is visible with no focused item. [#178](https://github.com/tshino/vscode-vz-like-keymap/pull/178)


### [0.19.7] - 2023-06-28
- 新規:
    - Interactive Playgroundページのスクロール操作に対応しました。 [#171](https://github.com/tshino/vscode-vz-like-keymap/pull/171)
        - CTRL+E, CTRL+X, CTRL+R, CTRL+C でスクロール。
        - これらは設定の 'Vz Keymap: Interactive Playground Keys' で有効化できます。デフォルトで有効です。
    - Editor Hover領域のスクロール操作に対応しました。 [#172](https://github.com/tshino/vscode-vz-like-keymap/pull/172)
        - CTRL+E, CTRL+X, CTRL+S, CTRL+D, CTRL+R, CTRL+C, CTRL+Q R, CTRL+Q C でスクロール。
        - これらは設定の 'Vz Keymap: Editor Hover Keys' で有効化できます。デフォルトで有効です。
- 修正:
    - Settings画面で使うキー定義を更新。 [#160](https://github.com/tshino/vscode-vz-like-keymap/pull/160)
- New:
    - Added scroll keys support in Interactive Playground pages. [#171](https://github.com/tshino/vscode-vz-like-keymap/pull/171)
        - Ctrl+E, Ctrl+X, Ctrl+R, Ctrl+C to scroll.
        - These keys are enabled by turning on the 'Vz Keymap: Interactive Playground Keys' in the Settings.
    - Added scroll keys support in Editor Hovers. [#172](https://github.com/tshino/vscode-vz-like-keymap/pull/172)
        - Ctrl+E, Ctrl+X, Ctrl+S, Ctrl+D, Ctrl+R, Ctrl+C, Ctrl+Q R, Ctrl+Q C to scroll.
        - These keys are enabled by turning on the 'Vz Keymap: Editor Hover Keys' in the Settings.
- Fixed:
    - Updated key definitions for the Settings page. [#160](https://github.com/tshino/vscode-vz-like-keymap/pull/160)

### [0.19.6] - 2023-02-19
- 修正:
    - 一部のカーソル移動コマンドを繰り返したときの動作が遅い問題を修正しました。 [#125](https://github.com/tshino/vscode-vz-like-keymap/issues/125)
- Fixed:
    - Some cursor commands were taking a long time when repeated. [#125](https://github.com/tshino/vscode-vz-like-keymap/issues/125)

### [0.19.5] - 2023-02-16
- 修正:
  - CTRL+U（削除した文字を復元）で出力される文字の方向が逆になる問題が VS Code 1.75.0 以降で発生していたのを修正しました。 [#121](https://github.com/tshino/vscode-vz-like-keymap/issues/121)
- Fixed:
  - Ctrl+U (Restore deleted characters) was producing characters in the wrong direction from VS Code 1.75.0. [#121](https://github.com/tshino/vscode-vz-like-keymap/issues/121)

### [0.19.4] - 2022-12-22
- 新規:
  - Code Action（Quick Fix）メニューの操作に対応しました。 [#115](https://github.com/tshino/vscode-vz-like-keymap/pull/115)
    - CTRL+E, CTRL+Xで上下選択
    - CTRL+Mで決定
    - これらは設定の 'Vz Keymap: Code Action Keys' で有効化できます。
- New:
  - Added Code Action menu keys. [#115](https://github.com/tshino/vscode-vz-like-keymap/pull/115)
    - Ctrl+E, Ctrl+X to select action,
    - Ctrl+M to accept selected action.
    - These keys are enabled by turning on the 'Vz Keymap: Code Action Keys' in the Settings.

### [0.19.3] - 2022-11-27
- 修正:
  - CTRL+EとCTRL+Xによる検索履歴の選択が効かなくなっているのを修正しました。 [#108](https://github.com/tshino/vscode-vz-like-keymap/issues/108)
- 内部:
  - Dependabotによるgitbub-actionsのバージョン更新を有効化しました。
- Fixed:
  - History navigation on search input box by Ctrl+E and Ctrl+X was not working. [#108](https://github.com/tshino/vscode-vz-like-keymap/issues/108)
- Internal:
  - Enabled github-actions version updates with Dependabot.

### [0.19.2] - 2022-05-25
- 改善:
  - 最終行でCTRL+C（またはPageDown）した直後に他のキーの反応が0.5秒くらい遅れる問題を修正しました。 [#79](https://github.com/tshino/vscode-vz-like-keymap/issues/79)
  - 拡張の起動条件（`activationEvents`）を変更して、VS Codeの起動速度に与える影響を軽減しました。 [#81](https://github.com/tshino/vscode-vz-like-keymap/issues/81)
- 内部:
  - 新規: 自動テストにコードカバレッジの計測を追加しました。 [#75](https://github.com/tshino/vscode-vz-like-keymap/issues/75)
  - 修正: `vz.jumpToBracket` コマンドのテストがVS Code 1.67.0で失敗するのを修正しました。 [#74](https://github.com/tshino/vscode-vz-like-keymap/pull/74)
- Improved:
  - Fixed pressing Ctrl+C (or PageDown) at the last line of the document was causing a half-second of delay for the subsequent keys. [#79](https://github.com/tshino/vscode-vz-like-keymap/issues/79)
  - Changed the loading timing of this extension (`activationEvents`) to mitigate the effect on the startup speed of VS Code. [#81](https://github.com/tshino/vscode-vz-like-keymap/issues/81)
- Internal:
  - New: Added code coverage measurement on testing. [#75](https://github.com/tshino/vscode-vz-like-keymap/issues/75)
  - Fixed: Tests for `vz.jumpToBracket` is failing with VS Code 1.67.0. [#74](https://github.com/tshino/vscode-vz-like-keymap/pull/74)

### [0.19.1] - 2022-05-05
- 新規:
  - (internal) 自動テストにeslintの実行を追加。 [#69](https://github.com/tshino/vscode-vz-like-keymap/pull/69)
- 修正:
  - 検索操作の直後に他のタブへ行って戻ると選択モードになっている問題を修正しました。 [#67](https://github.com/tshino/vscode-vz-like-keymap/issues/67)
- New:
  - (internal) Added eslint to run before test. [#69](https://github.com/tshino/vscode-vz-like-keymap/pull/69)
- Fixed:
  - Switching to and back from other tabs right after searching operations was causing an unexpected selection mode. [#67](https://github.com/tshino/vscode-vz-like-keymap/issues/67)

### [0.19.0] - 2022-04-19
- 改善:
  - CTRL+L（カーソル位置の文字列を選択して検索）でフォーカスが検索ウィジェットに移動しないようにしました。VZエディタの挙動に近づけています。 [#54](https://github.com/tshino/vscode-vz-like-keymap/issues/54)
  - CTRL+Lで検索文字列を設定した直後にカーソルを移動した場合、常にCTRL+Lを押す直前のカーソル位置が起点となるようにしました。VZエディタの挙動に近づけています。 [#64](https://github.com/tshino/vscode-vz-like-keymap/issues/64)
  - CTRL+Lで複数行の文字列を検索文字列に設定できるようにしました。複数行の文字列を検索できるVS Codeの機能を活用するため、VZエディタとは異なる動作にしています。 [#62](https://github.com/tshino/vscode-vz-like-keymap/issues/62)
- 修正:
  - VS Codeの設定によってCTRL+Lが効かない場合がある問題を修正しました。 [#57](https://github.com/tshino/vscode-vz-like-keymap/issues/57)
  - (internal) 自動テストのたびにエディタのタブが増えて遅くなる問題を修正。
- Improved:
  - Changed Ctrl+L (Select word to find) to keep the focus on the document and not move the focus to the find widget. It simulates a similar behavior as the original VZ Editor. [#54](https://github.com/tshino/vscode-vz-like-keymap/issues/54)
  - Changed Ctrl+L to move the cursor starting from the last position when the cursor is moved right after setting the search word by Ctrl+L. It simulates a similar behavior as the original VZ Editor. [#64](https://github.com/tshino/vscode-vz-like-keymap/issues/64)
  - Extended Ctrl+L to support seeding multiple-line search strings. This is intentionally different behavior from the original VZ Editor to utilize the feature of VS Code which supports multiple-line search strings. [#62](https://github.com/tshino/vscode-vz-like-keymap/issues/62)
- Fixed:
  - Ctrl+L was not working depending on the VS Code settings. [#57](https://github.com/tshino/vscode-vz-like-keymap/issues/57)
  - (internal) Editor tabs remain open after testing and that slows down the test runs.

### [0.18.3] - 2022-01-25
- 修正:
  - vscode拡張 [Keyboard Macro Beta](https://marketplace.visualstudio.com/items?itemName=tshino.kb-macro)との組み合わせで、同じショートカットキーが2回以上続く操作のマクロが正しく再生されない場合がある問題を修正しました。[#44](https://github.com/tshino/vscode-vz-like-keymap/issues/44)
- Fixed:
  - When combined with [Keyboard Macro Beta](https://marketplace.visualstudio.com/items?itemName=tshino.kb-macro), a macro that contains two or more times repeat of the same shortcut key was not being correctly reproduced during the playback. [#44](https://github.com/tshino/vscode-vz-like-keymap/issues/44)

### [0.18.2] - 2022-01-22
- 新規:
  - 「次の論理行頭へのカーソル移動」コマンドを追加しました。[#43](https://github.com/tshino/vscode-vz-like-keymap/issues/43)
    - キー割り当てはありません。
    - このコマンドはVZエディタの上書きモード時のENTERキーに近い動作を提供します。
    - コマンドIDは`vz.cursorNextLineStart`です。補助コマンド`vz.findStartCursorNextLineStart`もあります。
- New:
  - Added new command that moves the cursor to the beginning of the next line. [#43](https://github.com/tshino/vscode-vz-like-keymap/issues/43)
    - It has no keybinding.
    - It provides a similar behavior to that of the Enter key in overwrite mode of VZ Editor.
    - The command ID is `vz.cursorNextLineStart`. Supplementary command `vz.findStartCursorNextLineStart` is also available.

### [0.18.1] - 2022-01-15
- 修正:
  - vscode上の一部の操作（Gitなど）によりVz Keymapのエラーが表示される問題を修正しました。 [#41](https://github.com/tshino/vscode-vz-like-keymap/issues/41)
- Fixed:
  - By some operations on vscode (such as git related), Vz Keymap was displaying error messages. [#41](https://github.com/tshino/vscode-vz-like-keymap/issues/41)

### [0.18.0] - 2021-10-03
- 新規:
  - Visual Studio Code Web（ブラウザで動くVS Code）に対応しました。 [#14](https://github.com/tshino/vscode-vz-like-keymap/issues/14)
- 修正:
  - キーボードマクロで改行（CTRL+MまたはENTER）が記録されない場合がある問題を修正しました。
  - 検索モード中の改行（CTRL+MまたはENTER）で検索でマッチした文字列が削除されないようにしました。
  - 検索ウィジェット上のCTRL+E（前履歴）およびCTRL+X（次履歴）が効かなくなっていたのを修正しました。
- New:
  - Added support of Web Extension (VS Code on browsers). [#14](https://github.com/tshino/vscode-vz-like-keymap/issues/14)
- Fixed:
  - Keyboard macro recording was failing to record New Line (Ctrl+M or Enter) in some situations.
  - In finding mode, New Line (Ctrl+M or Enter) was deleting the matched string.
  - On the find widget, Ctrl+E (Previous in History) and Ctrl+X (Next in History) were not working.

### [0.17.0] - 2021-09-10
- 検索と置換のキーバインドと挙動を改善しました。 [#13](https://github.com/tshino/vscode-vz-like-keymap/issues/13)
  - 新しい操作方法の詳細はREADMEの「検索と置換の操作について」を参照してください。
  - CTRL+R（前候補）またはCTR+C（次候補）でジャンプした直後のカーソル位置を検索文字列の末尾から先頭に変更しました。VZエディタの挙動に近づけています。
  - CTRL+Q F（検索）およびCTRL+Q A（置換）によりキーボードフォーカスを検索ウィジェットとドキュメントの間で切り替えられるようにしました。
- Updated Find and Replace key bindings and behaviors to improve usability: [#13](https://github.com/tshino/vscode-vz-like-keymap/issues/13)
  - See 'How to use Find and Replace' in the README for the details of the new behavior.
  - Changed the cursor position after the jump by Ctrl+R (Previous match) or Ctrl+C (Next match) from the end of the match to the beginning of one. It simulates a similar behavior as the original VZ Editor.
  - With Ctrl+Q F (Find) and Ctrl+Q A (Replace), now you can switch the keyboard focus between the find widget and the document.


### [0.16.0] - 2021-08-17
- ついにキーボードマクロ機能を実現しました。 [#8](https://github.com/tshino/vscode-vz-like-keymap/issues/8)
  - CTRL+_でキー操作の記録開始またはキャンセルします。
  - CTRL+^でキー操作の記録を終了し、さらに同じキーで記録した操作を再生できます。
- 改善:
  - ESC（矩形選択モードの解除）のwhen節の不備を直しました。
  - 範囲選択してCTRL+Q T（カーソルより左側を削除）したときのCTRL+U（削除した文字の復元）の動作を直しました。
- 変更:
  - クリップボード系コマンドの動作を以下のように整理しました。
    - `vz.clipboardCutAndPush` ... 設定`vzKeymap.textStack`に依らず常にテキストスタックを使用するようにしました.
    - `vz.clipboardCut` ... カットした文字列をクリップボードに書くとともにテキストスタックのトップに保持（上書き）します。
    - `vz.clipboardCopyAndPush` ... 設定`vzKeymap.textStack`に依らず常にテキストスタックを使用するようにしました.
    - `vz.clipboardCopy` ... コピーした文字列をクリップボードに書くとともにテキストスタックのトップに保持（上書き）します。
    - `vz.clipboardPopAndPaste` ... 設定`vzKeymap.textStack`に依らず常にテキストスタックを使用するようにしました.
    - `vz.clipboardPaste` ... 常にクリップボードの文字列をペーストします。

- Added the Keyboard Macro function which is the final big piece of this extension: [#8](https://github.com/tshino/vscode-vz-like-keymap/issues/8)
  - Ctrl+_ for start or cancel recording keyboard sequence.
  - Ctrl+^ for finish recording or replay the recorded sequence.
- Improved:
  - The 'when' clause of Escape to cancel box-selection mode.
  - The behavior of Undelete (Utrl+U) of Delete left half of line with non-empty selection range.
- Changed:
  - Arranged the behavior of clipboard commands slightly as described below:
    - `vz.clipboardCutAndPush` ... always uses the Text Stack regardless the setting `vzKeymap.textStack`.
    - `vz.clipboardCut` ... does cut a text and write it to the clipboard and also to top of the Text Stack.
    - `vz.clipboardCopyAndPush` ... always uses the Text Stack regardless the setting `vzKeymap.textStack`.
    - `vz.clipboardCopy` ... does copy a text and write it to the clipboard and also to top of the Text Stack.
    - `vz.clipboardPopAndPaste` ... always uses the Text Stack regardless the setting `vzKeymap.textStack`.
    - `vz.clipboardPaste` ... always pastes the text in the clipboard.


### [0.15.0] - 2021-02-18
- Added out-of-editor shortcut keys:
  - For list views (e.g. selecting file in the Explorer):
    - Ctrl+E, Ctrl+X, Ctrl+R, Ctrl+C to move focus,
    - Ctrl+Q R, Ctrl+Q C to move focus to the first/last item,
    - Ctrl+S, Ctrl+D to collapse/expand tree, and
    - Ctrl+M to select item.
    - These keys are enabled by turning on the 'Vz Keymap: List View Keys' in the Settings.
  - For Suggestion widget (IntelliSense):
    - Ctrl+E, Ctrl+X, Ctrl+R, Ctrl+C for to select items,
    - Ctrl+Q R, Ctrl+Q C to select the first/last item, and
    - Ctrl+M to accept selected item.
    - These keys are enabled by turning on the 'Vz Keymap: Suggestion Widget Keys' in the Settings.
  - For the Settings page:
    - Ctrl+X to move focus from search input to settings list,
    - Ctrl+S to move focus from settings list to table of content, and
    - Ctrl+M to move focus from table of content to settings list.
    - These keys are enabled by turning on the 'Vz Keymap: Settings Page Keys' in the Settings.
  - For parameter hints:
    - Ctrl+E, Ctrl+X to select parameter hints.
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
