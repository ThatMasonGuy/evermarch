# Evermarch updates

This directory is the source of truth for the public Evermarch update archive on `https://play.tempeststudios.com.au/evermarch/updates`.

Each update is a JSON document in `posts/`. The play site copies this directory from the exact Evermarch commit supplied by the **Publish Evermarch Updates to Play Site** workflow. The post data and any screenshots are deployed with the portal; they are not copied into or maintained by hand in the play-site repo.

## Writing an update

1. Add one `posts/<slug>.json` file. Use a stable, lowercase, hyphenated slug.
2. Keep the player-facing summary in `excerpt` and put the complete post in `body` blocks.
3. Add screenshots under `images/<slug>/` and reference them with a path relative to `content/updates/`. Every screenshot needs useful alt text and a concise caption.
4. Run `npm run validate:updates`.
5. Commit the post with the work it describes. After it is on `main`, run **Publish Evermarch Updates to Play Site** from GitHub Actions.

The public post URL is `https://play.tempeststudios.com.au/evermarch/updates/<slug>`.

## Post format

```json
{
  "slug": "this-week-in-evermarch-example",
  "title": "This Week in Evermarch: A Clear Player-Facing Headline",
  "excerpt": "A one- or two-sentence summary for the updates index and search results.",
  "publishedAt": "2026-07-12",
  "category": "Weekly update",
  "keywords": ["Evermarch", "idle RPG development", "browser RPG"],
  "body": [
    { "type": "paragraph", "text": "Open with the player-visible outcome." },
    { "type": "heading", "text": "What changed" },
    { "type": "list", "items": ["One concrete change.", "Another concrete change."] }
  ],
  "screenshots": [
    {
      "src": "images/this-week-in-evermarch-example/mining-panel.webp",
      "alt": "The Evermarch mining panel showing a newly added progress state.",
      "caption": "Mining panel during this update."
    }
  ]
}
```

Supported body block types are `paragraph`, `heading`, and `list`. Keep each post factual, player-focused, and specific about the work completed. Use descriptive titles, excerpts, and keywords so the updates are useful in search results as well as to returning players.
