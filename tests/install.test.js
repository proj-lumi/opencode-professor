import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "..")
const install = path.join(root, "scripts", "install.mjs")
const uninstall = path.join(root, "scripts", "uninstall.mjs")

test("agent is a selectable primary agent", () => {
  const agent = fs.readFileSync(path.join(root, ".opencode", "agents", "professor.md"), "utf8")
  assert.match(agent, /^---\ndescription: .+\nmode: primary\n---/)
})

test("installer and uninstaller manage only the Professor agent link", () => {
  const config = fs.mkdtempSync(path.join(os.tmpdir(), "professor-config-test-"))

  try {
    const env = { ...process.env, OPENCODE_CONFIG_DIR: config }
    const installed = spawnSync(process.execPath, [install], { cwd: root, env, encoding: "utf8" })
    assert.equal(installed.status, 0, installed.stderr)

    const agent = path.join(config, "agents", "professor.md")
    assert.equal(fs.lstatSync(agent).isSymbolicLink(), true)
    assert.equal(fs.realpathSync(agent), path.join(root, ".opencode", "agents", "professor.md"))
    assert.equal(fs.existsSync(path.join(config, "package.json")), false)

    const installedAgain = spawnSync(process.execPath, [install], { cwd: root, env, encoding: "utf8" })
    assert.equal(installedAgain.status, 0, installedAgain.stderr)

    const removed = spawnSync(process.execPath, [uninstall], { cwd: root, env, encoding: "utf8" })
    assert.equal(removed.status, 0, removed.stderr)
    assert.equal(fs.existsSync(agent), false)
  } finally {
    fs.rmSync(config, { recursive: true, force: true })
  }
})

test("installer refuses to overwrite an existing agent", () => {
  const config = fs.mkdtempSync(path.join(os.tmpdir(), "professor-conflict-test-"))

  try {
    const agents = path.join(config, "agents")
    fs.mkdirSync(agents, { recursive: true })
    fs.writeFileSync(path.join(agents, "professor.md"), "user-owned\n")

    const result = spawnSync(process.execPath, [install], {
      cwd: root,
      env: { ...process.env, OPENCODE_CONFIG_DIR: config },
      encoding: "utf8",
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /Refusing to overwrite/)
    assert.equal(fs.readFileSync(path.join(agents, "professor.md"), "utf8"), "user-owned\n")
  } finally {
    fs.rmSync(config, { recursive: true, force: true })
  }
})
