#!/usr/bin/env node
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), ".config", "opencode")
const resources = [
  [".opencode/plugins/professor.js", "plugins/professor.js"],
  [".opencode/lib/professor-core.js", "lib/professor-core.js"],
  [".opencode/skills/teach", "skills/teach"],
  [".opencode/commands/teach.md", "commands/teach.md"],
  [".opencode/commands/resume.md", "commands/resume.md"],
  [".opencode/commands/lessons.md", "commands/lessons.md"],
  [".opencode/commands/gap.md", "commands/gap.md"],
  [".opencode/commands/log.md", "commands/log.md"],
  [".opencode/agents/professor-researcher.md", "agents/professor-researcher.md"],
  [".opencode/agents/professor-svg-artist.md", "agents/professor-svg-artist.md"],
]
const targets = resources.map(([source, destination]) => ({
  source: path.join(repo, source),
  destination: path.join(config, destination),
}))

for (const { source } of targets) {
  if (!fs.existsSync(source)) {
    console.error(`Professor installation is incomplete; missing ${source}`)
    process.exit(1)
  }
}

const packageFile = path.join(config, "package.json")
let manifest = {}
if (fs.existsSync(packageFile)) {
  try {
    manifest = JSON.parse(fs.readFileSync(packageFile, "utf8"))
  } catch (error) {
    console.error(`Could not parse ${packageFile}: ${error}`)
    process.exit(1)
  }
}

for (const { source, destination } of targets) {
  let existing
  try {
    existing = fs.lstatSync(destination)
  } catch {
    continue
  }
  try {
    if (existing.isSymbolicLink() && fs.realpathSync(destination) === fs.realpathSync(source)) continue
  } catch {
    // Broken links are conflicts too; do not remove user paths implicitly.
  }
  console.error(`Refusing to overwrite existing path: ${destination}`)
  console.error("Move it aside or remove it, then run the installer again.")
  process.exit(1)
}

for (const { source, destination } of targets) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  try {
    if (fs.realpathSync(destination) === fs.realpathSync(source)) continue
  } catch {
    // The target does not exist yet.
  }
  fs.symlinkSync(source, destination, fs.statSync(source).isDirectory() ? "dir" : "file")
  console.log(`linked ${destination}`)
}

manifest.dependencies ??= {}
manifest.dependencies["@opencode-ai/plugin"] ??= "^1.18.16"
fs.mkdirSync(config, { recursive: true })
fs.writeFileSync(packageFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
console.log(`updated ${packageFile}`)
console.log("Professor installed. Restart OpenCode Desktop, then run /teach <topic>.")
