# Changelog

## Unreleased

## [v0.4.0] - 2026-07-13

### Fixed

- Calibrate active-mining chest generation to average one chest-bearing layer every 5-6 layers while preserving fair deterministic rolls across both mine grid sizes (#21).
- Replace the chest placeholder UI with dedicated art, move quantity selection into the inventory detail panel, support unbounded batch opening, and show chest blocks directly in active mining (#22).
- Replace placeholder TNT labels with original explosive art and a layered fuse, blast, shockwave, debris, and mining-board shake sequence (#23).

## [v0.3.0] - 2026-07-12

### Fixed

- Continue held mining when dragging across the gaps between blocks in the active mine face (#9).
- Keep a held mining action active while it moves to another block, even after the first block breaks (#9).
- Make active-mining break feedback visibly spread from block centres and leave block rubble behind (#12).
- Replace rotational mining crack paths with three staged, square-chip damage patterns (#12).
- Keep the save-selection header on one usable mobile row with an icon-only back link (#5).
- Prevent browser touch gestures from activating through any part of the active mine face (#8).
- Cap active-mining strike cadence and balance its XP at 2.5 times routine pace (#16).
- Align the mobile mining depth rail with the square mine face and restore its readable labels (#10).
- Give the Welcome Back modal's sticky Continue action an opaque, clearly separated background (#20).

### Added

- Add a character-selection refresh control that reloads local and cloud save information (#17).
- Add a warning before a device save can supersede an available cloud backup, with danger styling for higher cloud progress (#18).
- Add a blocking loading state while a selected character opens (#19).
- Expand the mobile mine face, compress its depth rail, and remove the redundant mining-mode card (#10).

### Changed

- Move the character-selection refresh action from the header to immediately before the save cards (#17).

### Unconfirmed / untested pending live verification

- #8 — Verify on the affected iPhone that taps on broken blocks and grid gaps do not trigger browser zoom or recentering.
- #18 — Verify on a live cloud account that continuing a local save warns before cloud overwrite and escalates when cloud progress is ahead.
- #19 — Verify on a slow mobile device with cloud state that the blocking save-opening feedback remains visible until the character loads.

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
