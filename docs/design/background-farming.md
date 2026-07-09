# Background Farming

## Goal

Farming should feel like an active task that waits in the background between short player decisions. It is not a passive tick lane that quietly spits out one crop every few seconds.

The loop is:

1. Choose an open field.
2. Plant one unlocked crop.
3. Wait 6-12 hours, depending on the crop tier.
4. Get a ready notification.
5. Return to the app, collect a meaningful harvest, then plant again or replant.

## Player Feel

- Planting is a small intentional action.
- Waiting is background time, not invisible spam.
- Harvesting should feel chunky: one field produces a batch sized to its crop and growth time.
- Replanting should be one click after harvest for players who want a low-friction repeat loop.
- Farming level should visibly expand capacity by unlocking more fields.

## Field Unlocks

Initial field unlock curve:

- Field 1: Farming Lv.1
- Field 2: Farming Lv.10
- Field 3: Farming Lv.25
- Field 4: Farming Lv.45
- Field 5: Farming Lv.70
- Field 6: Farming Lv.90

This gives early confirmation that Farming is expanding while leaving high-level capacity as a long-term reward.

## Crop Timing

Crop growth should scale from 6 hours to 12 hours across the Farming task ladder.

- Low-tier crops: about 6 hours.
- Mid-tier crops: about 8-10 hours.
- High-tier crops: about 11-12 hours.

Growth should be stored with timestamps:

- `plantedAt`
- `readyAt`
- `notifiedAt`
- `lastCollectedAt`

The app should not simulate thousands of background crop actions while closed. On load, it only needs to determine which fields are ready.

## Yield And XP

Harvest yield should be a batch, not a single unit. The current first-pass rule scales yield by crop tier and growth time.

XP and task mastery should be awarded at harvest time. The account stat formerly used for background work can represent Farming growth time credited when the field is collected.

## Navigation

The main play surfaces should be split:

- Active: click/tap-driven active play such as the mining block-face minigame.
- Routine: the automated idle lane.
- Farming: timestamp-based crop fields.
- Quests: player direction across skill goals.

Farming should live in its own sidebar item below Routine, not inside the main active lane view.

## Notifications

Current implementation can use in-app log and toast-style readiness feedback. Later versions can add browser/mobile push notifications after product and platform requirements are clearer.

## Future Hooks

- Seeds, compost, sprinklers, scarecrows, and soil tiers.
- Quest stages for planting specific crops, harvesting batches, and sustaining multiple fields.
- Rare crop mutations or special harvest rolls.
- Crop contracts that turn a long wait into a targeted goal.
- Visual field states: empty soil, planted, growing, ready, harvested.
