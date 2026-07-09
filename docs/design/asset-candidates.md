# Voxel Asset Candidates

This file tracks real asset sources that fit Evermarch's block-adjacent direction. Re-check source pages before importing anything new.

## Imported Now

| Source | License | Best use | Repo status |
| --- | --- | --- | --- |
| [Kenney Voxel Pack](https://opengameart.org/content/voxel-pack) | CC0, license included in pack | Item/tool sprites, material tiles, future spritesheets | Curated subset imported to `src/games/evermarch/assets/vendor/kenney-voxel/` |

## Strong Candidates

| Source | License signal | Best use | Notes |
| --- | --- | --- | --- |
| [Kenney Block Pack](https://kenney.nl/assets/block-pack) | CC0 on asset page | Isometric terrain/building blocks, town/world UI motifs | Downloaded to `.tmp/assets` for inspection only. Good for future world map panels. |
| [Kenney Isometric Blocks](https://kenney-assets.itch.io/isometric-blocks) | CC0 on itch page | Isometric tilesheets and separate sprites | Useful if the world view becomes a tile-board. Name-your-own-price download. |
| [Square Block Textures](https://opengameart.org/content/square-block-textures) | OpenGameArt asset page; verify exact license before import | Small block texture sheets | More pixel-adjacent than ideal, but useful for prototypes or CSS texture studies. |
| [itch.io CC0 Voxel assets](https://itch.io/game-assets/assets-cc0/tag-voxel) | Filtered to Creative Commons Zero v1.0 Universal | Larger future pool for models, props, and voxel sets | Treat each asset page as a separate license check before importing. |

## Intake Checklist

- Do not import assets that recreate Minecraft textures or identifiable Minecraft UI/items.
- Prefer CC0 assets for prototype and production use.
- If an asset requires attribution, record the exact attribution text before import.
- Keep source URLs and license files next to vendored assets.
- Prefer curated subsets over committing whole archives.
- Optimize or atlas sprites before adding broad runtime usage.
- Keep raw downloads in `.tmp/assets` only; do not commit raw zips unless there is a clear archival reason.

## Format Guidance

- Individual transparent PNGs are best for early Vue component integration.
- PNG spritesheets plus XML/JSON metadata are better once many icons render in the same view.
- WebP can reduce runtime size after the art direction stabilizes.
- Avoid remote asset URLs in runtime code; local bundled assets keep web, mobile, and Steam builds portable.
