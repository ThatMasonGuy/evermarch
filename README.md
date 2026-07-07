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

Firebase config is provided through `VITE_FIREBASE_*` environment variables. Local values can live in `.env`; production values are generated in the play-site deployment workflow and passed into this app build.

## Build

```bash
npm run build
```

The play-site pipeline builds Evermarch with:

```bash
npm run build -- --base=/evermarch/app/
```

## Live Update Pipeline

1. Work in this repo.
2. Run `npm run build`.
3. Commit and push `main`.
4. Run the **Deploy Evermarch to Play Site** workflow in this repo's GitHub Actions tab.

That workflow validates this exact commit, then dispatches `ThatMasonGuy/play-tempest-studios`. The play site updates only Evermarch's locked commit before rebuilding and deploying Firebase Hosting. Other external games stay pinned to their previously deployed commits.
