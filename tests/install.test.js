import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")

test("installer and uninstaller operate in an isolated config directory", () => {
  const config = fs.mkdtempSync(path.join(os.tmpdir(), "professor-config-test-"))
  try {
    const env = { ...process.env, OPENCODE_CONFIG_DIR: config }
    const installed = spawnSync(process.execPath, [path.join(root, "scripts", "install.mjs")], {
      cwd: root,
      env,
      encoding: "utf8",
    })
    assert.equal(installed.status, 0, installed.stderr)
    assert.equal(fs.lstatSync(path.join(config, "plugins", "professor.js")).isSymbolicLink(), true)
    assert.equal(fs.lstatSync(path.join(config, "skills", "teach")).isSymbolicLink(), true)
    const pkg = JSON.parse(fs.readFileSync(path.join(config, "package.json"), "utf8"))
    assert.equal(pkg.dependencies["@opencode-ai/plugin"], "^1.18.16")

    const removed = spawnSync(process.execPath, [path.join(root, "scripts", "uninstall.mjs")], {
      cwd: root,
      env,
      encoding: "utf8",
    })
    assert.equal(removed.status, 0, removed.stderr)
    assert.equal(fs.existsSync(path.join(config, "plugins", "professor.js")), false)
    assert.equal(fs.existsSync(path.join(config, "package.json")), true)
  } finally {
    fs.rmSync(config, { recursive: true, force: true })
  }
})
