# Active Mining Minigame

## Core Idea

Active mining should become Evermarch's first signature active-lane loop: a face-on block grid where the player breaks every visible block to dig deeper, uncover ore density spikes, and occasionally find active-only tools like TNT.

The goal is to capture the calm, almost mindless pleasure of clearing out a large mining space in Minecraft while keeping it lightweight enough for web, mobile taps/holds, and future Steam/mobile builds.

This is not a 3D look-around mining game. It is a static, square, block-face board with simple breaking feedback.

## Player Fantasy

The player is digging layer by layer into a mine shaft. Each meter of depth is one cleared layer of visible block faces.

- Break blocks.
- Collect whatever materials are inside them.
- Clear the full face to reach the next meter.
- Watch the depth counter climb.
- Hit veins, pockets, hazards, and rare active-only finds.
- Decide whether to keep digging through slower/harder layers because the next vein or TNT cache might be close.

## First Screen Shape

Simple early mining face:

```text
[stone] [stone]
[coal ] [stone]
```

Harder or deeper mining face:

```text
[stone ] [iron ] [stone]
[gravel] [stone] [coal ]
[stone ] [stone] [stone]
```

The active panel should pair this with:

- `24m deep` counter.
- Scrollable/vertical depth meter beside the mine face.
- Current target ore and expected yield.
- Tool/action affordance.
- Inventory/resource gain feedback.
- TNT or active-only item quick slot when available.

## Board Rules

### Layer

A layer is the current visible mine face. The player must break all blocks in the layer to advance by one meter.

Layer size can scale by task/tier:

- Early ores: `2x2`.
- Mid ores: `3x3`.
- Late ores: `4x4` or special layouts only if it stays tappable on mobile.

Layer size should not be treated as raw difficulty by itself. Difficulty primarily comes from block hardness, density, and blockers.

### Block

Each block has:

- `type`: stone, gravel, coal, copper, iron, rare ore, empty pocket, TNT, etc.
- `hardness`: amount of active work required to break it.
- `remainingDurability`: current break progress.
- `drops`: resources granted when broken.
- `revealedState`: visible from the start for now; hidden variants can come later.
- `specialEffect`: optional effect such as TNT.

### Break Input

Desktop:

- Click breaks or damages a block.
- Holding mouse can repeatedly damage the selected block at a controlled cadence.

Mobile:

- Tap damages a block.
- Press-and-hold repeatedly damages the selected block.
- Blocks must remain large enough for fingers.

Keyboard/controller later:

- Optional directional selection plus action key.

### Layer Completion

When every block in the face is broken:

1. Grant any layer completion bonuses.
2. Increment active mining depth by `1m`.
3. Generate the next layer.
4. Update the depth meter.

## Depth

Depth is the active mining long-tail identity.

- `activeMiningDepthMeters` tracks deepest current active dig path or lifetime best; decide exact save shape in implementation.
- Every cleared layer is one meter.
- Depth should be visible during play and in progression/stat views.
- Depth can influence material table, vein chance, rare find chance, and hardness.

Depth should feel like "how far I personally dug", not just mining XP.

## Mining History Graph

Evermarch should eventually show a history view for the days the player actively mined. This should look less like a normal line chart and more like a side-on mine shaft record: surface at the top, a small player marker near the entrance, and a stepped vertical shaft profile dropping through the ground with depth labels.

Reference shape:

```text
surface ------------------------------------------------
            |
            |
            |____ 100m
                 |
                 |
                 |____ 160m
                      |
                      |____ 180m
```

The graph should answer:

- Which days did I mine?
- How deep did I get on each day?
- Where did I hit meaningful depth milestones?
- Which days had notable veins, TNT finds, rare blocks, or best-depth pushes?

### View Concepts

1. **Daily shaft profile**
   - Each mined day can render as its own vertical shaft silhouette.
   - The shaft shows the day's deepest depth and major turns/milestones.
   - Labels like `70m`, `120m`, `180m` sit beside meaningful ledges or endpoints.

2. **All-days strip**
   - A horizontally scrollable timeline of mined days.
   - Each day is a narrow shaft column or thumbnail.
   - Selecting a day expands its detailed shaft profile.

3. **Lifetime mine map**
   - A larger composite view can show best-depth paths over time.
   - It should still feel like a mine cross-section, not a generic analytics graph.

### Data To Track

Do not store every mined block forever just to draw history. Track compressed daily summaries.

Likely daily summary shape:

```ts
interface ActiveMiningDailySummary {
  localDate: string
  metersDug: number
  startDepthMeters: number
  endDepthMeters: number
  bestDepthMeters: number
  shaftSegments: ActiveMiningShaftSegment[]
  oreTotals: Record<string, number>
  notableFinds: ActiveMiningNotableFind[]
}

interface ActiveMiningShaftSegment {
  fromDepthMeters: number
  toDepthMeters: number
  horizontalOffset: number
  reason: 'dig' | 'vein' | 'tnt' | 'milestone'
}
```

`shaftSegments` should be enough to draw the stepped silhouette without replaying the whole minigame.

### Visual Requirements

- Surface strip at the top, with sky/grass/dirt material language.
- Mine void/background below the surface.
- Shaft outline rendered as hard blocky steps.
- Depth labels attached to segment endpoints and major milestones.
- Best-depth day should be visually distinct.
- TNT-blasted segments can use a wider or cracked shaft shape.
- Vein segments can tint the shaft wall or add small ore marks.
- The view should work on mobile as a scrollable vertical/horizontal panel.

This graph is important because it turns active mining into a personal record. The player is not just accumulating ore; they are building a visible history of how far they dug.

## Rewards

### Normal Blocks

Stone/gravel can grant low-value materials or nothing. They are the friction that makes ore discoveries feel good.

### Target Ore

The selected mining task influences ore tables. If the player is actively mining Iron Ore, iron should appear often enough to feel purposeful, but not every block is iron.

### Off-Target Materials

Coal, stone, gravel, and lower-tier ores can appear in the grid. This makes active mining feel like a real vein face instead of a disguised button.

### Veins

Sometimes a layer or short run of layers should have higher target ore density.

Vein examples:

- `Coal seam`: several coal blocks in one face.
- `Iron vein`: target ore appears in clusters for 2-5 meters.
- `Mixed pocket`: higher total material yield, lower target purity.

Veins should create the "keep digging, this spot is hot" feeling.

### Active-Only Finds

Active play should occasionally produce items that idle lanes do not.

Early candidates:

- TNT charge: one-time use that breaks a small region or multiple layers.
- Reinforced pick head: temporary hardness reduction.
- Survey marker: previews the next layer's ore density.
- Minecart cache: bonus ore bundle.

These should be exciting but not mandatory for normal progression.

## TNT

TNT is the first special item to plan around.

Possible first behavior:

- TNT appears as a rare block in active mining layers.
- Breaking or collecting it adds one TNT charge.
- The player can spend a charge to instantly clear a `2x2` region or blast through `4` simple layers.

Design notes:

- TNT should be generous enough to tempt continued active play through harder layers.
- TNT should not invalidate deeper ore hardness; use it as a burst, not a permanent skip.
- UI should preview what will be affected before use.
- Save data must track TNT charges separately from ordinary inventory if it is active-lane-only.

## Hardness And Pacing

The minigame should stay mindless, not stressful.

- Early stone breaks quickly.
- Harder ore takes longer but gives better reward.
- Gravel can be softer but lower value.
- High-tier ore can require sustained hold or multiple taps.
- Active pace multipliers can become mining speed, not just abstract rate.

Avoid making every block a single click at higher tiers; the pleasant loop comes from varied resistance.

## Generation Principles

Layer generation should be deterministic enough to save/resume and fair enough to debug.

Inputs:

- Mining task/ore tier.
- Current depth.
- Player mining level.
- Active minigame state seed.
- Active-only modifiers.

Outputs:

- Grid size.
- Block list.
- Hardness per block.
- Drop table per block.
- Vein state.
- Special finds.

Implementation should keep generation in the engine/data layer, not inside Vue components.

## Save-State Guidance

The minigame needs resumable state. It should not reset every render.

Likely save shape:

```ts
interface ActiveMiningState {
  taskId: string
  depthMeters: number
  bestDepthMeters: number
  dailySummaries: Record<string, ActiveMiningDailySummary>
  layerSeed: string
  layerIndex: number
  gridWidth: number
  gridHeight: number
  blocks: ActiveMiningBlockState[]
  tntCharges: number
  activeVein: ActiveMiningVeinState | null
}
```

Keep this serializable and versionable like the rest of the save system.

## UI Requirements

- Face-on square block board, not 3D camera.
- Blocks are textured/material tiles with clear cracked/breaking overlay.
- Broken blocks should visually clear or darken.
- Current depth is prominent: `24m deep`.
- Depth meter sits beside the mine face and can scroll or compress at high depth.
- A separate mining history view should show daily shaft profiles for all days mined.
- The board should fit mobile in portrait.
- Tapping and holding must be comfortable.
- The active lane should still display core idle stats: rate, XP, mastery, blockers.

## Animation

Keep animation cheap:

- Crack overlay stages via CSS classes or small sprites.
- Brief block pop/fade when broken.
- Small gain toast or resource chip flyout.
- TNT blast flash/shake only within the mine panel.

Avoid particle-heavy or canvas-only implementation until profiling says it is needed.

## Integration With Current Lanes

Mining should be the first active minigame. Other active skills can later receive their own tactile boards:

- Woodcutting: tree/log face or chopping nodes.
- Fishing: fishing spots/timing/current.
- Farming: plot tending.
- Smithing/crafting: workbench slots.

Do not force every skill to copy mining. Mining establishes the active-lane standard: concrete verbs, tactile loop, unique active rewards, and resumable depth/progress.

## MVP Slice

First buildable slice:

1. Add serializable `activeMining` state to the game store/save.
2. Generate a `2x2` mining face for current active mining task.
3. Support click/tap to damage and break blocks.
4. Clear all blocks to advance depth by `1m`.
5. Grant drops through existing inventory/stat systems.
6. Show `Xm deep` and a simple depth meter.
7. Persist and reload the current layer.
8. Keep existing active action button as fallback for non-mining skills.

Second slice:

1. Add `3x3` deeper/harder layers.
2. Add block hardness and hold-to-mine.
3. Add ore density/vein generation.
4. Add TNT charges and one simple blast behavior.

Third slice:

1. Add active-only finds.
2. Add progression stats and best-depth display.
3. Add balancing data per ore tier.
4. Add mobile polish and accessibility controls.

Fourth slice:

1. Track compressed daily mining summaries.
2. Render the first daily shaft profile graph.
3. Add all-days timeline selection.
4. Mark best-depth, TNT, vein, and rare-find days.

## Open Design Questions

- Should depth reset when changing mining tasks, or should each mining task have its own shaft?
- Should best depth be global, per skill, or per ore/task?
- Should daily history group by local date only, or by play session when sessions cross midnight?
- Should the shaft graph show the exact dig path, a compressed readable silhouette, or both behind a detail toggle?
- Should TNT be an inventory resource, active-mining-only charge, or both?
- Should stone/gravel become real inventory materials before the minigame ships?
- Should active mining yield more total resources than idle, or mainly different resources and better bursts?
- How much offline progress, if any, should apply to the active mining face? Current design bias: none; active depth is earned while playing.

## Design Commitment

This minigame is the clearest path to making Evermarch more than "Melvor Idle plus." It should be treated as a core gameplay direction for the active lane, starting with mining and expanding only after mining feels good.
