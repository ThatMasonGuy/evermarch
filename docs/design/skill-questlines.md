# Skill Questlines

## Core Idea

Every Evermarch skill should have its own questline: a staged chain of practical goals that teaches, directs, and rewards progress through that skill.

These are not story-heavy RPG quests at first. They are structured skill tasks such as:

- Mine this many blocks.
- Gather this many Copper Ore.
- Reach Mining Lv.5.
- Clear a mining layer at least `10m` deep.
- Cook this many Trout.
- Grow this many Potatoes.
- Master this early task to a given level.

Questlines should give the player a reason to keep rotating through skills without turning the game into a checklist-only experience.

## Design Goals

1. **Give each skill a spine**
   - Each skill should feel like it has a journey, not just a task list.
   - Early stages teach the core loop.
   - Later stages introduce deeper systems like mastery, material chains, active minigames, and world unlocks.

2. **Reward useful progression**
   - Rewards should make the next stretch a little easier or more interesting.
   - Avoid huge permanent multipliers that trivialize the economy.
   - Prefer small, flavorful unlocks and targeted conveniences.

3. **Bridge idle and active play**
   - Some stages can be completed through idle/routine lanes.
   - Some stages should specifically celebrate active play, especially mining depth and active-only finds.
   - Questlines should make active play feel special without making idle players feel blocked from the whole game.

4. **Stay readable**
   - Quest objectives must be concrete and countable.
   - The player should always know what the next step is and why it matters.

## Questline Shape

Each skill has one main questline made of ordered stages.

Example mining questline:

```text
Mining I: First Chips
- Mine 25 blocks.
- Collect 10 Copper Ore.
- Reward: +1% mining speed and 1 TNT charge.

Mining II: Coal Dust
- Reach Mining Lv.5.
- Collect 25 Coal.
- Dig to 10m active depth.
- Reward: unlock Coal Seam chance and +2% coal yield.

Mining III: Iron Nerve
- Break 100 stone blocks.
- Collect 50 Iron Ore.
- Clear a 3x3 active mining layer.
- Reward: reinforced pick head recipe or active hardness reduction.
```

Questline stage count can vary by skill, but each skill should eventually cover:

- Onboarding stage.
- Early progression stage.
- First material-chain stage.
- Mastery/depth/quality stage.
- Late-game identity stage.

## Objective Types

Use objective types that can be tracked by the existing game systems or by planned active minigame summaries.

Core objective types:

- `collect_resource`: gain or hold a resource amount.
- `perform_task`: complete a task/action a number of times.
- `reach_skill_level`: reach a skill level.
- `reach_task_mastery`: reach mastery for a specific task.
- `assign_lane`: use a skill in active, routine, or background lane.
- `sell_resource`: sell a resource amount.
- `craft_resource`: produce an artisan output.

Active-mining objective types:

- `break_blocks`: break active mining blocks.
- `reach_active_depth`: reach a depth threshold.
- `clear_layers`: clear active mining layers.
- `find_vein`: discover or clear a vein.
- `use_tnt`: use TNT charges.
- `find_active_item`: collect active-only finds.

## Reward Types

Rewards should be designed as small nudges, not economy-breaking jumps.

Good reward patterns:

- Small speed bonus for a skill or task family.
- Small yield bonus for a specific resource category.
- One-time resource bundles.
- Active-only charges such as TNT.
- Unlock a new active event type, vein type, or convenience.
- Reduce hardness for specific low-tier blocks.
- Increase offline cap for a specific passive lane by a small amount.
- Cosmetic frame/badge/title for the skill.
- Unlock a new world route or quest branch.

Avoid:

- Large global multipliers.
- Mandatory quest rewards that make uncompleted skills feel unusable.
- Rewards that require paid/live-service logic.
- Quest rewards that depend directly on Firebase/Firestore shapes.

## Data Model Guidance

Questline definitions should live in static bundled game data near other Evermarch data.

Likely definition shape:

```ts
interface SkillQuestlineDefinition {
  skillId: SkillId
  stages: SkillQuestStageDefinition[]
}

interface SkillQuestStageDefinition {
  id: string
  title: string
  description: string
  objectives: SkillQuestObjectiveDefinition[]
  rewards: SkillQuestRewardDefinition[]
}
```

Save data should track progress and claims separately:

```ts
interface SkillQuestlineState {
  skillId: SkillId
  activeStageId: string
  completedStageIds: string[]
  claimedRewardStageIds: string[]
  objectiveProgress: Record<string, number>
}
```

Definitions should be versionable. If questline requirements change later, save migration should preserve completed/claimed stages wherever possible.

## UI Placement

Questlines need two surfaces:

1. **Skill detail quest panel**
   - Shows the current stage for the selected skill.
   - Shows objective progress bars and reward preview.
   - Lets the player claim completed rewards.

2. **Quest overview**
   - Shows every skill's current quest stage.
   - Highlights claimable rewards.
   - Helps players choose what to work on next.

The active lane can also show a small "quest progress" chip when the current task contributes to the active skill's quest.

## Skill Themes

Each skill questline should emphasize what makes that skill distinct.

- Mining: depth, blocks broken, veins, ores, TNT, active finds.
- Woodcutting: logs gathered, tree tiers, fletching/firemaking supply chains.
- Fishing: fishing spots, raw fish collection, cooking chains.
- Firemaking: logs consumed, ember production, beacon/kiln milestones.
- Cooking: recipes completed, food tiers, ingredient chains.
- Smithing: ore-to-metalwork conversion and fittings/frames.
- Farming: background growth, crop variety, long-tail harvests.
- Fletching: logs into arrows/bows, output batches.
- Crafting: ores/gems into trinkets and trade goods.
- Runecrafting: rune essence conversion and rune batches.

## MVP Slice

First buildable slice:

1. Add static questline definitions for Mining and Woodcutting only.
2. Track objective progress for collect, perform task, and reach level.
3. Add a compact current quest panel to the Skills view.
4. Add reward claiming for simple resource bundles and small skill/task modifiers.
5. Persist quest state in saves.

Second slice:

1. Add all remaining skill questlines.
2. Add quest overview.
3. Add active mining objectives after the mining minigame exists.
4. Add claimable reward badges and notifications.

Third slice:

1. Add late-game quest branches.
2. Add cosmetic badges/titles.
3. Add special active-event unlocks such as vein/TNT modifiers.
4. Add migration tooling for questline definition changes.

## Open Questions

- Should every skill have one linear questline, or should later stages branch?
- Should rewards be auto-claimed or manually claimed?
- Should quest stages require holding resources or lifetime collected resources?
- Should some active-mining quest rewards be active-lane-only?
- How much quest progress should offline/passive play grant compared with active play?
- Should questlines be visible from the start or unlock after the first few tutorial stages?

## Design Commitment

Skill questlines should become Evermarch's directed progression layer. They are how the game tells players what to try next, rewards them for learning each skill, and gives each skill a sense of identity beyond raw XP.
