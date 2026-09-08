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

for (const [sourceName, destinationName] of resources) {
  const source = path.join(repo, sourceName)
  const destination = path.join(config, destinationName)
  try {
    if (!fs.lstatSync(destination).isSymbolicLink() || fs.realpathSync(destination) !== fs.realpathSync(source)) {
      console.log(`kept ${destination} (not this repository's link)`)
      continue
    }
    fs.unlinkSync(destination)
    console.log(`removed ${destination}`)
  } catch {
    // Missing paths need no action.
  }
}

console.log("Professor links removed. Lessons and OpenCode dependencies were left untouched.")
