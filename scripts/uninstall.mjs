#!/usr/bin/env node
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), ".config", "opencode")
const source = path.join(repo, ".opencode", "agents", "professor.md")
const destination = path.join(config, "agents", "professor.md")

try {
  if (!fs.lstatSync(destination).isSymbolicLink() || fs.realpathSync(destination) !== fs.realpathSync(source)) {
    console.log(`kept ${destination} (not this repository's link)`)
    process.exit(0)
  }

  fs.unlinkSync(destination)
  console.log(`removed ${destination}`)
} catch {
  // Missing paths need no action.
}

console.log("Professor removed.")
