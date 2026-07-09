# AGENTS.md

## Project

Evermarch is the authenticated idle RPG app mounted at `/evermarch/app/` on `play.tempeststudios.com.au`.

## Runtime

- Use Node.js 24.x and npm 11.x.
- `.node-version` and `.nvmrc` are the source of truth for local and GitHub Actions Node selection.
- Do not introduce a different Node major in workflows, docs, package metadata, or ad-hoc commands.

## Repository Boundary

- This repo owns the playable Evermarch app, engine, local/cloud save code, and the release trigger.
- `ThatMasonGuy/play-tempest-studios` owns the public landing page, SEO metadata, sitemap, robots.txt, Firebase Hosting deploy, and mounted `/evermarch/app/` build output.
- Do not vendor play-site build output into this repo.
- Do not edit the play-site landing page from this repo.

## Live Update Pipeline

- To update the live game, finish the Evermarch work, run `npm run build`, commit, push `main`, then run the **Deploy Evermarch to Play Site** workflow in this repo's GitHub Actions tab.
- The workflow file is `.github/workflows/deploy-evermarch-to-play-site.yml`.
- The workflow uses Node.js 24, runs `npm ci`, runs `npm run build -- --base=/evermarch/app/`, then sends a `repository_dispatch` event to `ThatMasonGuy/play-tempest-studios`.
- The dispatch payload includes the exact Evermarch commit SHA. The play-site repo must build that exact commit, not just whatever `main` points at later.
- The play-site repo pins every external game in `external-games.lock.json`. An Evermarch dispatch updates only Evermarch's lock entry; Cluckback and future games must remain pinned to their existing deployed commits.
- This repo requires the `PLAY_SITE_DISPATCH_TOKEN` Actions secret. Do not print, commit, or move that token into source files.

## Development Workflow

- Keep game logic scoped under `src/games/evermarch`.
- Keep shared auth/Firebase integration under `src/platform`.
- Validate meaningful changes with `npm run build`.
- If dependencies change, run `npm install` and keep `package-lock.json` in sync.
- After any major change or new feature, commit a verified checkpoint promptly. Multiple commits during one working turn are acceptable when they create useful rollback points.
- Preserve user work already in the tree.
- Do not credit external code-generation tools in commits, docs, comments, or generated project content.

## Design Direction

- For visual, UX, gameplay-feel, or asset work, read `docs/design/evermarch-voxel-direction.md` and `docs/design/asset-candidates.md` before editing.
- For active-lane mining work, also read `docs/design/active-mining-minigame.md`; it is the canonical design for the mining block-face/depth loop.
- For skill quest, objective, achievement-like progression, or reward-chain work, read `docs/design/skill-questlines.md` before editing.
- Evermarch's target direction is Minecraft-adjacent block/voxel materiality crossed with Melvor Idle-style dense progression UI and active Minecraft-like gathering/crafting actions.
- Do not copy Minecraft textures, sprites, UI, sounds, mobs, item silhouettes, names, or trade dress. Use the inspiration for material feel and verbs, not source assets.
- Prefer CC0, owned, or commissioned assets. Keep source URLs, license files, and intake notes next to any vendored asset folder.
- Keep runtime assets lightweight and portable for web first, with future mobile and Steam builds in mind. Prefer curated PNG/WebP sprites and spritesheets over large raw archives.

## Platform Posture

- Firebase/Firestore is acceptable while it stays free and fits the app. Do not migrate persistence or hosting by default.
- Preserve migration optionality by keeping save serialization, engine logic, and platform services separated.
- Revisit hosting or database choices only when the user explicitly asks or revenue/live-ops needs justify the cost and complexity.
