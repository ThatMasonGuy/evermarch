# Evermarch Voxel Design Direction

## North Star

Evermarch should feel like a living block-based resource world compressed into a dense idle RPG cockpit: Minecraft-adjacent materiality, Melvor Idle readability, and active play that borrows the feel of mining, chopping, fishing, crafting, and tending.

This is not pixel art. The target is chunky, voxel/block-adjacent, tactile, and readable at small sizes. Materials should feel physical and cubic, while the interface stays efficient enough for long idle-game sessions.

## Positioning Guardrails

- Use Minecraft as inspiration for blocky material language, player verbs, and survival-resource familiarity.
- Do not copy Minecraft textures, sprites, UI layout, mobs, item silhouettes that are distinctive to Minecraft, names, sounds, or trade dress.
- Prefer CC0, owned, or commissioned art with source and license recorded in the repo.
- Keep fantasy naming and progression uniquely Evermarch: routes, lanes, mastery, material chains, and world unlocks should feel native to this game.

## Design Pillars

1. **A world made of materials**
   - Resource stacks should look like things pulled from a block world: ore chunks, logs, fish, seeds, cooked food, tools, planks, runes, fittings.
   - UI panels should use hard edges, layered borders, inset ledges, and block-grid textures rather than glowing fantasy cards.

2. **Active actions feel physical**
   - The active lane is the hero surface. It should feel like the player is performing a concrete action, not just pressing a generic button.
   - Use tool sprites, pressed states, rhythm feedback, short material bursts, and action-specific copy: Mine, Chop, Fish, Kindle, Cook, Forge, Grow, Shape, Craft, Bind.

3. **Idle lanes feel like routes and machines**
   - Routine and background lanes should read like automated routes through the world.
   - The player should quickly understand what is being produced, what is blocked, and what material chain it feeds.

4. **Melvor-like density, block-world clarity**
   - Preserve compact, repeatable idle-game workflows: skill grids, inventory filters, sell controls, mastery, unlocks, and rates.
   - Avoid turning the app into a landing-page composition or oversized illustrative view. The game screen is the product.

5. **Portable asset pipeline**
   - Runtime art should be lightweight PNG/WebP sprites, sprite atlases, or simple CSS textures.
   - Prefer a single documented source per asset family, then curate subsets into the repo.
   - Keep future mobile and Steam builds in mind: predictable paths, small files, no remote runtime dependency on asset CDNs.

## Visual Language

### Shape

- Corners: mostly square or 2-8 px radius.
- Surfaces: bordered blocks with top highlights and bottom shadows.
- Buttons: pressed state should move down 1-2 px or flip shadow direction.
- Progress bars: straight block meters, not pill-shaped sci-fi meters.
- Repeated items: card-like blocks are fine, but avoid nested decorative cards.

### Color

Use a material palette with multiple families rather than a single green fantasy hue:

- Sky: `#8ecae6`, `#d7f3ff`
- Grass/leaves: `#4f9f45`, `#8bc34a`
- Dirt/wood: `#8a5a2b`, `#c47a3c`
- Stone: `#6f7670`, `#a9b0a6`
- Ore/gold: `#e4b84a`, `#f6d36b`
- Water: `#2f80b7`
- Night UI base: `#15100a`, `#21160d`, `#2d2115`

The UI can remain dark for idle-game focus, but it should be warmed by earth, stone, sky, and grass accents.

### Typography

- Keep body text clean and readable. Do not use pixel fonts for dense UI.
- Display headings may become chunkier later, but must remain legible at dashboard sizes.
- Avoid negative letter spacing. Use font weight, border, and shadow for emphasis.

### Motion

- Active click feedback should be crisp and short.
- Idle progress should feel mechanical and reliable.
- Avoid constant magical glow. Use motion for state changes, not decoration.

## Gameplay Design Goals

### Active Lane

The active lane should eventually support a small action scene or tool-focused block:

- Current task sprite or material tile
- Tool sprite for the action
- Pace meter tied to active rhythm
- Short feedback when an action lands
- Clear blocker state when materials are missing

### Routine Lane

Routine is the player's chosen automated work route. It should make output rate, mastery, and next upgrade obvious.

### Background Lane

Background is slower, steadier world growth. Farming, long crafts, or future settlement systems should feel like they continue while the player focuses elsewhere.

### Inventory

Inventory should become the strongest early proof of the art direction:

- Resource sprites for stacks
- Category swatches by material type
- Dense sorting and selling controls
- Item details tied to producer and consumer routes

### World

The world view should evolve from route summaries into a block-map planning board:

- Resource biomes and material routes
- Skill unlock bands
- Production chains shown as blocky steps
- Future settlement or expedition nodes

## Asset Pipeline

Current committed seed assets:

- `src/games/evermarch/assets/vendor/kenney-voxel/`
- Source: Kenney Voxel Pack via OpenGameArt
- License: CC0, license file included in the vendor folder
- Included: curated item sprites, material tiles, and item/tile spritesheets for future atlas work

Preferred intake process:

1. Confirm the license on the source page and in the downloaded package.
2. Copy only useful, lightweight source files into a vendor subfolder.
3. Include the original license file and a local README with source URL and intake notes.
4. Use transparent PNGs for quick UI integration.
5. Move to spritesheets or generated atlases when runtime draw counts matter.
6. Record larger candidate packs in `docs/design/asset-candidates.md` before importing.

## Platform And Persistence Posture

Firebase and Firestore are acceptable while they stay free and fit the current scale. The design change should not force a backend migration.

Keep the option open by preserving boundaries:

- Game logic stays under `src/games/evermarch`.
- Shared auth and cloud-save integration stays under `src/platform`.
- Save data should remain serializable and portable.
- Avoid making UI or engine code depend directly on Firestore document shapes.
- Revisit backend options only when revenue, live operations, multiplayer/social features, analytics, or cost patterns justify it.

Possible future migration candidates can include a hosted Postgres stack, a custom Node service, or platform-native storage for mobile/Steam, but only after the app has a clear need and budget.

## Near-Term Build Order

1. Establish this design language and asset intake rules.
2. Swap the Evermarch theme tokens from mystical emerald to block-world material colors.
3. Use real voxel sprites in the active lane and inventory.
4. Add a blocky world/route visual layer without changing save schema.
5. Introduce sprite atlas loading once the sprite count grows.
6. Prototype a small active-action scene after the UI language is stable.
