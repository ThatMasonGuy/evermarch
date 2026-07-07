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
- Preserve user work already in the tree.
- Do not credit external code-generation tools in commits, docs, comments, or generated project content.
