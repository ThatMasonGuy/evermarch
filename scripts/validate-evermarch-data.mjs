import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmpDir = resolve(repoRoot, 'node_modules', '.tmp')
const bundlePath = resolve(tmpDir, 'evermarch-data-validation-bundle.mjs')

const result = await build({
  stdin: {
    contents: `
      export * as skills from './src/games/evermarch/data/skills.ts'
      export * as tasks from './src/games/evermarch/data/tasks.ts'
      export * as resources from './src/games/evermarch/data/resources.ts'
      export * as xp from './src/games/evermarch/data/xp.ts'
    `,
    loader: 'ts',
    resolveDir: repoRoot,
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  write: false,
  logLevel: 'silent',
})

await mkdir(tmpDir, { recursive: true })
await writeFile(bundlePath, result.outputFiles[0].text)

const data = await import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`)
const { skills, tasks, resources, xp } = data

const expectedSkillIds = [
  'woodcutting',
  'fishing',
  'firemaking',
  'cooking',
  'mining',
  'smithing',
  'farming',
  'fletching',
  'crafting',
  'runecrafting',
]

const errors = []

function check(condition, message) {
  if (!condition) errors.push(message)
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && expected.every((value) => actual.includes(value))
}

function taskOutputValue(task) {
  return task.drops.reduce(
    (sum, drop) => sum + resources.getResourceDefinition(drop.resourceId).sellValue * drop.amount,
    0,
  )
}

function taskInputValue(task) {
  return (task.costs ?? []).reduce(
    (sum, cost) => sum + resources.getResourceDefinition(cost.resourceId).sellValue * cost.amount,
    0,
  )
}

function taskLabel(task) {
  return `${task.id} (${task.name})`
}

const skillIds = skills.SKILL_LIST.map((skill) => skill.id)
check(sameMembers(skillIds, expectedSkillIds), `Expected exactly these skills: ${expectedSkillIds.join(', ')}`)
check(new Set(skillIds).size === skillIds.length, 'Skill ids must be unique')
check(Object.keys(skills.SKILLS).length === expectedSkillIds.length, 'SKILLS registry must contain exactly 10 skills')

for (let level = 2; level <= xp.MAX_LEVEL; level++) {
  const previousLevelXp = xp.xpForLevel(level - 1)
  const currentLevelXp = xp.xpForLevel(level)
  const nextLevelXp = level < xp.MAX_LEVEL ? xp.xpForLevel(level + 1) : currentLevelXp

  check(currentLevelXp > previousLevelXp, `XP for level ${level} must be greater than level ${level - 1}`)
  if (level < xp.MAX_LEVEL) {
    check(
      nextLevelXp - currentLevelXp >= currentLevelXp - previousLevelXp,
      `XP curve must not get cheaper after level ${level}`,
    )
  }
  check(xp.levelForXp(currentLevelXp) === level, `Level lookup must return ${level} at its threshold`)
}
check(xp.MAX_LEVEL === 99, 'MAX_LEVEL must be 99')

const taskIds = tasks.ALL_TASKS.map((task) => task.id)
check(new Set(taskIds).size === taskIds.length, 'Task ids must be unique')

for (const task of tasks.ALL_TASKS) {
  check(expectedSkillIds.includes(task.skillId), `${taskLabel(task)} has an unknown skill id`)
  check(Number.isInteger(task.levelRequired) && task.levelRequired >= 1 && task.levelRequired <= 99, `${taskLabel(task)} has an invalid level`)
  check(task.baseInterval > 0, `${taskLabel(task)} must have a positive interval`)
  check(task.xpPerAction > 0, `${taskLabel(task)} must grant XP`)
  check(task.drops.length > 0, `${taskLabel(task)} must produce at least one resource`)
  check(task.allowedLanes.length > 0, `${taskLabel(task)} must be available in at least one lane`)

  for (const drop of task.drops) {
    const definition = resources.getResourceDefinition(drop.resourceId)
    check(drop.amount > 0, `${taskLabel(task)} has a non-positive drop amount for ${drop.resourceId}`)
    check(definition.name.length > 0, `${taskLabel(task)} drop ${drop.resourceId} must resolve to a name`)
    check(definition.category.length > 0, `${taskLabel(task)} drop ${drop.resourceId} must resolve to a category`)
    check(definition.sellValue > 0, `${taskLabel(task)} drop ${drop.resourceId} must have sell value`)
  }

  for (const cost of task.costs ?? []) {
    const definition = resources.getResourceDefinition(cost.resourceId)
    check(cost.amount > 0, `${taskLabel(task)} has a non-positive cost amount for ${cost.resourceId}`)
    check(definition.name.length > 0, `${taskLabel(task)} cost ${cost.resourceId} must resolve to a name`)
    check(definition.sellValue > 0, `${taskLabel(task)} cost ${cost.resourceId} must have sell value`)
  }

  const outputValue = taskOutputValue(task)
  const inputValue = taskInputValue(task)
  check(outputValue > inputValue, `${taskLabel(task)} should be worth more than its inputs`)
}

const farmingResourceIds = new Set(tasks.FARMING_TASKS.flatMap((task) => task.drops.map((drop) => drop.resourceId)))
for (const [index, task] of [...tasks.COOKING_TASKS].sort((a, b) => a.levelRequired - b.levelRequired).entries()) {
  const costIds = (task.costs ?? []).map((cost) => cost.resourceId)
  check(costIds.some((resourceId) => resourceId.startsWith('raw_')), `${taskLabel(task)} must use raw fish`)

  if (index > 0) {
    const cropCost = (task.costs ?? []).find((cost) => farmingResourceIds.has(cost.resourceId))
    const cropTask = cropCost
      ? tasks.FARMING_TASKS.find((candidate) => candidate.drops.some((drop) => drop.resourceId === cropCost.resourceId))
      : null

    check(cropCost, `${taskLabel(task)} must use a Farming ingredient`)
    check(
      !cropTask || cropTask.levelRequired <= task.levelRequired,
      `${taskLabel(task)} uses ${cropCost?.resourceId}, which unlocks after the recipe`,
    )
  }
}

for (const skillId of expectedSkillIds) {
  const skill = skills.SKILLS[skillId]
  const skillTasks = tasks.getTasksForSkill(skillId)
  const sortedTasks = [...skillTasks].sort((a, b) => a.levelRequired - b.levelRequired || a.id.localeCompare(b.id))

  check(skill, `${skillId} must exist in SKILLS`)
  check(skillTasks.length >= 11, `${skillId} needs at least 11 unique tasks`)
  check(new Set(skillTasks.map((task) => task.name)).size === skillTasks.length, `${skillId} task names must be unique`)
  check(skillTasks.some((task) => task.levelRequired === 1), `${skillId} must have a level 1 task`)
  check(skillTasks.some((task) => task.levelRequired === 99), `${skillId} must have a level 99 task`)

  if (skillId === 'farming') {
    check(sameMembers(skill.allowedLanes, ['background']), 'Farming must be background-only')
    check(skillTasks.every((task) => sameMembers(task.allowedLanes, ['background'])), 'Farming tasks must be background-only')
  } else {
    check(sameMembers(skill.allowedLanes, ['active', 'idle']), `${skillId} must support active and routine lanes`)
    check(
      skillTasks.every((task) => sameMembers(task.allowedLanes, ['active', 'idle'])),
      `${skillId} tasks must support active and routine lanes only`,
    )
  }

  let previousLevel = 0
  let previousValue = 0
  for (const task of sortedTasks) {
    const value = taskOutputValue(task)
    if (task.levelRequired > previousLevel) {
      check(value >= previousValue, `${skillId} value regressed at ${taskLabel(task)}`)
      previousLevel = task.levelRequired
      previousValue = value
    }
  }

  const firstTaskValue = taskOutputValue(sortedTasks[0])
  const finalTaskValue = taskOutputValue(sortedTasks[sortedTasks.length - 1])
  check(finalTaskValue > firstTaskValue, `${skillId} level 99 task should be worth more than its starter task`)
}

for (const lane of ['active', 'idle', 'background']) {
  const taskId = tasks.getDefaultTaskIdForLane(lane)
  const task = tasks.getTaskById(taskId)
  check(task, `Default ${lane} task must exist`)
  check(task?.allowedLanes.includes(lane), `Default ${lane} task must be allowed in that lane`)
  check(tasks.normalizeTaskId(null, lane) === taskId, `Null ${lane} task should normalize to its default`)
}

check(tasks.normalizeTaskId('fish_shrimp', 'idle') === 'fish_shallow_coast', 'Legacy shrimp fishing task should migrate')
check(tasks.normalizeTaskId('grow_potato', 'active') === tasks.getDefaultTaskIdForLane('active'), 'Invalid active farming task should normalize away')

if (errors.length > 0) {
  console.error(`Evermarch data validation failed with ${errors.length} issue(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`Evermarch data validation passed: ${expectedSkillIds.length} skills, ${tasks.ALL_TASKS.length} tasks.`)
