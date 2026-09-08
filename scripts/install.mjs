#!/usr/bin/env node
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), ".config", "opencode")
const source = path.join(repo, ".opencode", "agents", "professor.md")
const destination = path.join(config, "agents", "professor.md")

if (!fs.existsSync(source)) {
  console.error(`Professor installation is incomplete; missing ${source}`)
  process.exit(1)
}

let existing
try {
  existing = fs.lstatSync(destination)
} catch {
  // The target does not exist yet.
}

if (existing) {
  try {
    if (existing.isSymbolicLink() && fs.realpathSync(destination) === fs.realpathSync(source)) {
      console.log(`already linked ${destination}`)
      console.log("Professor is installed. Restart OpenCode Desktop and select Professor.")
      process.exit(0)
    }
  } catch {
    // Broken links are conflicts too; do not remove user paths implicitly.
  }

  console.error(`Refusing to overwrite existing path: ${destination}`)
  console.error("Move it aside or remove it, then run the installer again.")
  process.exit(1)
}

fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.symlinkSync(source, destination, "file")
console.log(`linked ${destination}`)
console.log("Professor is installed. Restart OpenCode Desktop and select Professor.")
