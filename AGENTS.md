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

- To update the live game, complete the issue verification and release-preparation workflow, ensure the intended release commit is on `main`, run `npm run build`, push `main`, then run the **Deploy Evermarch to Play Site** workflow in this repo's GitHub Actions tab. After a successful deployment, tag the exact deployed commit and publish the corresponding GitHub Release.
- The workflow file is `.github/workflows/deploy-evermarch-to-play-site.yml`.
- The workflow uses Node.js 24, runs `npm ci`, runs `npm run build -- --base=/evermarch/app/`, then sends a `repository_dispatch` event to `ThatMasonGuy/play-tempest-studios`.
- The dispatch payload includes the exact Evermarch commit SHA. The play-site repo must build that exact commit, not just whatever `main` points at later.
- The play-site repo pins every external game in `external-games.lock.json`. An Evermarch dispatch updates only Evermarch's lock entry; Cluckback and future games must remain pinned to their existing deployed commits.
- This repo requires the `PLAY_SITE_DISPATCH_TOKEN` Actions secret. Do not print, commit, or move that token into source files.

## Non-Negotiable Release Completion Gate

- A successful Play Site deployment is not the release. Every live deployment must also have a version bump, a dated `CHANGELOG.md` entry, player-facing patch notes, an annotated Git tag, and a GitHub Release on the exact commit that the deployment built.
- For a Ready-bucket pass, update `CHANGELOG.md` and `docs/patch-notes/UNRELEASED.md` while implementing the issues. Do not defer the issue record until after deployment, and do not leave a completed issue absent from the release notes.
- Before reporting the work complete, run this sequence: choose the next semantic version; update `package.json` and `package-lock.json`; move Unreleased changelog and patch notes into the versioned release files; create fresh Unreleased sections; build; commit; push `main`; run **Deploy Evermarch to Play Site**; verify the Evermarch dispatch SHA and play-site lock; create and push an annotated `vMAJOR.MINOR.PATCH` tag on that exact deployed commit; create the GitHub Release from the versioned patch notes; then verify the release, tag target, and live URL.
- Never tag the pre-release feature commit by mistake, reuse or move an existing tag, or call a deployment complete while the deployed commit is still untagged and unreleased. If a deployment occurred before release preparation, deploy the final release commit again before tagging and creating the GitHub Release.

## Development Workflow

- Keep game logic scoped under `src/games/evermarch`.
- Keep shared auth/Firebase integration under `src/platform`.
- Validate meaningful changes with `npm run build`.
- If dependencies change, run `npm install` and keep `package-lock.json` in sync.
- For tracked issue work, keep one final issue-scoped commit on `main`. Direct-to-main work should be committed once after validation. Pull-request branches may contain useful checkpoint commits, but must be squash-merged so `main` receives one focused commit for the issue.
- Preserve user work already in the tree.
- Do not credit external code-generation tools in commits, docs, comments, or generated project content.

## Issue, Project, and Release Workflow

### Issue and Project Tracking

- GitHub Issues are the source of truth for bugs, additions, and tracked development work.
- The GitHub Project named `Evermarch` is the workflow and longitudinal project view.
- Required Project statuses are:
  - `Ready`
  - `In progress`
  - `Needs verification`
  - `Done`
- Use GitHub CLI or the GitHub API to read issues, comments, labels, milestones, pull requests, and Project status.
- If GitHub authentication or Project permissions are unavailable, do not silently skip bookkeeping. Report the missing operation clearly.

When working from the issue queue:

1. Select one open issue from the `Ready` status.
2. Read the entire issue and all existing comments before editing.
3. Confirm the issue contains enough information to implement and validate.
4. Move the issue to `In progress` before changing code.
5. Keep the implementation scoped to that issue unless closely related work is explicitly required.
6. Do not combine unrelated issues into one commit or pull request.

### Direct Commits and Pull Requests

- Small-to-medium, isolated, backward-compatible fixes and additions should be committed directly to `main`.
- Major, breaking, risky, or cross-cutting changes must use a dedicated branch and pull request.
- Changes requiring a pull request include:
  - save-format or migration changes
  - authentication, Firebase, or cloud-save architecture changes
  - deployment pipeline changes
  - major dependency or framework upgrades
  - broad engine or platform refactors
  - changes spanning several systems
  - changes that could break existing saves or live behaviour
- Pull requests created by an agent must not be merged without explicit human approval.
- Checkpoint commits are acceptable on a pull-request branch, but the pull request should be squash-merged so `main` receives one focused commit for the issue.
- Direct-to-main issue work should produce one focused commit after validation.
- Reference the issue in the commit subject using `(#<issue-number>)`.
- Do not use automatic closing keywords such as `Fixes`, `Closes`, or `Resolves`.
- Do not close issues automatically.

Example commit:

```text
fix(inventory): prevent filtered values appearing in All (#1)
```

### Changelog and Patch Notes

- `CHANGELOG.md` is the technical and project-facing record of changes.
- Every completed issue must add an entry under `## Unreleased`.
- Categorise changelog entries under the appropriate heading:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
  - `Security`
- Every changelog entry must reference its issue number.
- `docs/patch-notes/UNRELEASED.md` is the ongoing player-facing patch-notes document.
- Create these files if they do not exist.
- Add an entry to the player-facing patch notes only when the change affects players.
- Patch notes should describe observable behaviour and avoid implementation details, internal refactors, or developer-only maintenance.
- Changelog and patch-note changes must be included in the same commit or pull request as the issue implementation.

### Agent Completion and Human Verification

Before presenting an issue as completed:

1. Run the relevant validation, including `npm run build` for meaningful changes.
2. Confirm the issue requirements have been addressed.
3. Update `CHANGELOG.md`.
4. Update `docs/patch-notes/UNRELEASED.md` when the change is player-visible.
5. Commit the direct-to-main change, or push and open the required pull request.
6. Add a comment to the issue containing:
   - the root cause or explanation of what was wrong
   - what changed
   - validation or tests performed
   - the commit SHA for direct commits
   - the pull request link and head commit SHA for pull-request work
7. Move the issue to `Needs verification`.

The agent must not:

- close the issue
- move the issue to `Done`
- claim human verification has occurred
- merge its own pull request without explicit approval

### Ready-Queue Execution Evidence (Mandatory)

For every issue taken from the `Ready` Project status, follow this exact sequence. A previous failed attempt, an older issue comment, or code already present in the working tree is not completion evidence.

1. Read the complete issue body and every existing comment before changing code.
2. If the issue contains an image or screenshot, retrieve and visually inspect every supplied image before deciding on the implementation. Address the visible problem, not only the written summary.
3. Move that issue to `In progress` before editing. Work one Ready issue at a time unless the user explicitly asks for a combined change.
4. Implement only that issue's scope, update `CHANGELOG.md` and player-facing `docs/patch-notes/UNRELEASED.md` when applicable, and run the relevant validation (including `npm run build` for meaningful app changes).
5. Commit the validated direct-to-main change with the issue number in the subject, push it, then add an issue comment that explicitly includes: root cause or explanation, what changed, validation performed, and the pushed commit SHA.
6. Only after the commit and complete issue comment exist, move the item to `Needs verification`. Never move it directly from `Ready` to `Needs verification`, and never mark it `Done` or close it.

Before reporting a Ready-queue pass, re-read the Project board and confirm that every processed issue is in `Needs verification`, each issue comment contains its commit SHA, and no Ready item was silently skipped or combined with an unrelated issue.

A human reviews work in `Needs verification`. Once accepted, the human closes the issue. The Project may then automatically move the closed issue to `Done`.

If validation fails or the issue is blocked:

- leave the issue open
- do not move it to `Needs verification`
- comment with the failure or blocker
- do not present the work as complete

### Release Milestones

- Use GitHub milestones to associate issues and pull requests with their intended release.
- Assign an issue to its target release milestone when that release is known.
- Only human-verified, closed issues in the `Done` Project status may be included in a live release, except for the live-verification exception below.
- Close the release milestone after the corresponding GitHub Release has been published.

### Live-Verification Release Exception

- An open issue in `Needs verification` may be included in a release only when its latest issue comment explicitly says that testing is blocked until the change is live (for example, it requires a real cloud account, a physical device, or the production deployment).
- The agent must read and verify that latest comment immediately before release preparation; an assumption that a feature is hard to test locally is not enough.
- Keep such issues open and in `Needs verification`; the agent must not close them, move them to `Done`, or claim that they have been verified.
- In the versioned `CHANGELOG.md` entry, list every exception under an `Unconfirmed / untested pending live verification` heading with its issue number and the specific live test still required. Do not present those changes as confirmed in player-facing copy.
- After deployment, tag, and GitHub Release publication, leave a comment on each exception issue with the deployed version, commit SHA, and live URL so the human verifier can test it in production.

### Versioning

- Every successful deployment to the live Evermarch app is a versioned GitHub Release.
- Use version tags in the form `vMAJOR.MINOR.PATCH`.
- Increment:
  - `PATCH` for compatible bug fixes and polish-only releases
  - `MINOR` for backward-compatible features or substantial additions
  - `MAJOR` for incompatible production changes
- While the project remains below `v1.0.0`, breaking pre-release changes may increment the minor version instead of the major version.
- Every live deployment must receive a unique version.
- Never move or reuse an existing release tag.

### Release Preparation

Before deploying a release:

1. Confirm every included issue has been human-verified, closed, and moved to `Done`, unless it qualifies for the documented Live-Verification Release Exception above.
2. Select the next version.
3. Change the `CHANGELOG.md` `Unreleased` section into:

   ```md
   ## [vX.Y.Z] - YYYY-MM-DD
   ```

4. Add a new empty `## Unreleased` section above the released version.
5. Rename:

   ```text
   docs/patch-notes/UNRELEASED.md
   ```

   to:

   ```text
   docs/patch-notes/vX.Y.Z.md
   ```

6. Create a fresh `docs/patch-notes/UNRELEASED.md` for the next release.
7. Commit the release preparation to `main`.
8. Run `npm run build`.
9. Push the release commit to `main`.
10. Run the **Deploy Evermarch to Play Site** workflow.
11. Record the exact Evermarch commit SHA sent in the repository dispatch.

### Publishing the Release

- Do not publish a GitHub Release until the deployment has succeeded.
- Confirm the deployed Evermarch SHA matches:
  - the dispatch payload
  - the intended release commit
  - the Evermarch entry in the play-site `external-games.lock.json`
- Create an annotated Git tag pointing to that exact deployed commit.
- Push the tag without moving or recreating it.
- Create the GitHub Release from that existing tag.
- Use `docs/patch-notes/vX.Y.Z.md` as the GitHub Release body.
- Use the release title `Evermarch vX.Y.Z`.
- If deployment fails, do not create the tag or publish the GitHub Release.

Example release commands:

```bash
git tag -a "vX.Y.Z" "<deployed-commit-sha>" -m "Evermarch vX.Y.Z"
git push origin "vX.Y.Z"

gh release create "vX.Y.Z" \
  --verify-tag \
  --title "Evermarch vX.Y.Z" \
  --notes-file "docs/patch-notes/vX.Y.Z.md"
```

## Design Direction

- For visual, UX, gameplay-feel, or asset work, read `docs/design/evermarch-voxel-direction.md` and `docs/design/asset-candidates.md` before editing.
- For active-lane mining work, also read `docs/design/active-mining-minigame.md`; it is the canonical design for the mining block-face/depth loop.
- For Farming or background progression work, also read `docs/design/background-farming.md`; Farming is field-based timestamp growth, not a passive tick lane.
- For skill quest, objective, achievement-like progression, or reward-chain work, read `docs/design/skill-questlines.md` before editing.
- Evermarch's target direction is Minecraft-adjacent block/voxel materiality crossed with Melvor Idle-style dense progression UI and active Minecraft-like gathering/crafting actions.
- Do not copy Minecraft textures, sprites, UI, sounds, mobs, item silhouettes, names, or trade dress. Use the inspiration for material feel and verbs, not source assets.
- Prefer CC0, owned, or commissioned assets. Keep source URLs, license files, and intake notes next to any vendored asset folder.
- Keep runtime assets lightweight and portable for web first, with future mobile and Steam builds in mind. Prefer curated PNG/WebP sprites and spritesheets over large raw archives.

## Platform Posture

- Firebase/Firestore is acceptable while it stays free and fits the app. Do not migrate persistence or hosting by default.
- Preserve migration optionality by keeping save serialization, engine logic, and platform services separated.
- Revisit hosting or database choices only when the user explicitly asks or revenue/live-ops needs justify the cost and complexity.
