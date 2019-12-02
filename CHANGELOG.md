# Change Log

All notable changes to the "vz-like-keymap" extension will be documented in this file.

## [Unreleased]
### Added
- Ctrl+R, PageUp, Ctrl+C, PageDown for Find previous / next match.
- Ctrl+E, Ctrl+X for Show previous / next item in history (as same as UpArrow / DownArray) when find input is focussed.
- 'Alternatives for conflicts' section in README.
### Changed
- Allow Ctrl+W and Ctrl+Z (scroll one line) to work almost anywhere in an editor including when find/replace widget has a focus.
- Disable Ctrl+G, Ctrl+H, Ctrl+T when the editor has focus but the text input doesn't have focus, to avoid misuse of those default functions.
### Fixed
- Selection mode stops when moving the cursor by PageUp or PageDown.

## [0.3.0] - 2019-11-28
### Added
- Ctrl+K B for Box selection mode.

## [0.2.0] - 2019-11-12
### Added
- Ctrl+L for Find.
- Ctrl+Q H for Delete left word.
- Ctrl+Q K for Jump to bracket.

## [0.1.1] - 2019-11-02
### Fixed
- Selection mode stops when moving the cursor by cursor keys with no modifier keys.
- Selection mode doesn't stop after edit actions (Cut, Copy, Delete,...).

## [0.1.0] - 2019-10-24
### Added
- Proper selection mode (toggle with Ctrl+B) implementation.

## [0.0.1] - 2019-10-20
- Initial release
