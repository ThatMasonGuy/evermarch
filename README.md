# Evermarch

Evermarch is the authenticated browser game app mounted at `/evermarch/app/` on [play.tempeststudios.com.au](https://play.tempeststudios.com.au).

The public landing page, SEO metadata, sitemap, and Firebase Hosting deploy are owned by `ThatMasonGuy/play-tempest-studios`. This repo owns the actual playable Evermarch app, its game engine, save UI, and release trigger.

## Runtime

Use Node.js 24.x with npm 11.x. `.node-version` and `.nvmrc` are the local and GitHub Actions source of truth.

## Local Development

```bash
npm install
npm run dev
```

By default, `npm run dev` can run without Firebase values. When required `VITE_FIREBASE_*` variables are blank, Evermarch uses a local platform shim with an approved developer user, localStorage saves, and cloud backup disabled. This keeps the game playable while the public portal, auth UI, and hosted Firebase config remain owned by `ThatMasonGuy/play-tempest-studios`.

Firebase config is provided through `VITE_FIREBASE_*` environment variables. Local values can live in `.env`; production values are generated in the play-site deployment workflow and passed into this app build. If you have Firebase values filled but still want the local shim, set:

```bash
VITE_EVERMARCH_FORCE_LOCAL_PLATFORM=true
```

## Build

```bash
npm run build
```

The build runs `npm run validate:data` first. That gate checks the Evermarch skill/task data, lane rules, XP curve, resource costs, and progression economy before TypeScript and Vite run.

The play-site pipeline builds Evermarch with:

```bash
npm run build -- --base=/evermarch/app/
```

## Design Direction

Evermarch is moving toward a Minecraft-adjacent voxel/block visual language with Melvor Idle-style progression density and active gathering/crafting actions. Start with:

- `docs/design/evermarch-voxel-direction.md`
- `docs/design/asset-candidates.md`

Current seed art lives under `src/games/evermarch/assets/vendor/kenney-voxel/` and uses the included CC0 license.

## Live Update Pipeline

1. Work in this repo.
2. Run `npm run build`.
3. Commit and push `main`.
4. Run the **Deploy Evermarch to Play Site** workflow in this repo's GitHub Actions tab.

That workflow validates this exact commit, then dispatches `ThatMasonGuy/play-tempest-studios`. The play site updates only Evermarch's locked commit before rebuilding and deploying Firebase Hosting. Other external games stay pinned to their previously deployed commits.
