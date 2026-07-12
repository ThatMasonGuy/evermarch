import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const updatesDir = path.join(rootDir, 'content', 'updates')
const postsDir = path.join(updatesDir, 'posts')
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const validBlockTypes = new Set(['paragraph', 'heading', 'list'])

function fail(message) {
  throw new Error(message)
}

function requireString(value, field, fileName) {
  if (typeof value !== 'string' || !value.trim()) fail(`${fileName}: ${field} must be a non-empty string.`)
}

function validatePost(post, fileName) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) fail(`${fileName}: the post must be a JSON object.`)
  for (const field of ['slug', 'title', 'excerpt', 'publishedAt', 'category']) requireString(post[field], field, fileName)
  if (!slugPattern.test(post.slug)) fail(`${fileName}: slug must use lowercase letters, numbers, and single hyphens.`)
  if (!datePattern.test(post.publishedAt) || Number.isNaN(Date.parse(`${post.publishedAt}T00:00:00Z`))) fail(`${fileName}: publishedAt must be an ISO date (YYYY-MM-DD).`)
  if (!Array.isArray(post.keywords) || post.keywords.length === 0 || !post.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim())) fail(`${fileName}: keywords must be a non-empty array of strings.`)
  if (!Array.isArray(post.body) || post.body.length === 0) fail(`${fileName}: body must contain at least one block.`)

  for (const [index, block] of post.body.entries()) {
    if (!block || typeof block !== 'object' || !validBlockTypes.has(block.type)) fail(`${fileName}: body block ${index + 1} has an unsupported type.`)
    if (block.type === 'list') {
      if (!Array.isArray(block.items) || block.items.length === 0 || !block.items.every((item) => typeof item === 'string' && item.trim())) fail(`${fileName}: list block ${index + 1} needs one or more text items.`)
    } else {
      requireString(block.text, `body block ${index + 1} text`, fileName)
    }
  }

  if (!Array.isArray(post.screenshots)) fail(`${fileName}: screenshots must be an array.`)
  for (const [index, screenshot] of post.screenshots.entries()) {
    if (!screenshot || typeof screenshot !== 'object') fail(`${fileName}: screenshot ${index + 1} must be an object.`)
    for (const field of ['src', 'alt', 'caption']) requireString(screenshot[field], `screenshot ${index + 1} ${field}`, fileName)
    const sourcePath = path.resolve(updatesDir, screenshot.src)
    const relative = path.relative(updatesDir, sourcePath)
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(sourcePath)) fail(`${fileName}: screenshot ${index + 1} src must reference an existing file inside content/updates.`)
  }
}

const fileNames = fs.readdirSync(postsDir).filter((fileName) => fileName.endsWith('.json')).sort()
if (fileNames.length === 0) fail('content/updates/posts must contain at least one JSON post.')

const slugs = new Set()
for (const fileName of fileNames) {
  let post
  try {
    post = JSON.parse(fs.readFileSync(path.join(postsDir, fileName), 'utf8'))
  } catch (error) {
    fail(`${fileName}: invalid JSON (${error.message}).`)
  }
  validatePost(post, fileName)
  if (slugs.has(post.slug)) fail(`${fileName}: duplicate slug ${post.slug}.`)
  if (path.basename(fileName, '.json') !== post.slug) fail(`${fileName}: filename must match the post slug.`)
  slugs.add(post.slug)
}

console.log(`EVERMARCH_UPDATE_POSTS_VALID: ${fileNames.length} post(s)`)
