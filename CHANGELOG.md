# Changelog

## Unreleased

### Fixed

- Continue held mining when dragging across the gaps between blocks in the active mine face (#9).

## [v0.2.0] - 2026-07-12

### Added

- Add explicit Continue/resume intent so the game does not open a play session without interaction (#6).
- Add click, hold, and drag-across active mining interactions (#9).
- Add miner's chests, chest inventory, batch opening, and TNT rewards (#13).
- Add functional TNT detonation for the visible active-mining face (#14).

### Changed

- Rework the mobile header layout for narrow screens (#5).
- Make the active-mining face and controls fit narrow mobile viewports (#10).
- Replace active-mining rhythm and time multipliers with manual strikes (#11).
- Add progressive cracks, crumble/broken states, resource visuals, and chest-found feedback to active mining (#12).

### Fixed

- Fix Restore to device feedback and restore action state (#4).
- Fix the Welcome back timer calculation after restoring a backup (#7).
- Prevent repeated mobile mining taps from zooming the page (#8).
- Replace native alert, confirm, and prompt flows with shared application modals (#15).

## [v0.1.0] - 2026-07-10

### Fixed

- Hide the Inventory “Filtered Value” summary and reflow the All view’s remaining totals (#1).
- Style the Inventory sort selector and ensure its menu text is legible (#2).
- Make Inventory’s All But 1 control a one-shot calculation that preserves manual sell amounts (#3).
