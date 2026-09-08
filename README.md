# Professor for OpenCode Desktop

An adaptive private-teacher workflow for OpenCode Desktop using a
**probe → plan → teach** loop.

Professor finds the edge of one learner's understanding, commits a dependency
plan, teaches one reasoning step at a time, and verifies each step before
advancing. Lesson state, quiz attempts, a Mermaid progress dashboard, and the
session transcript are saved under the project being taught.

## What is included

| Piece | OpenCode implementation |
|---|---|
| Teaching protocol | Native agent skill at `.opencode/skills/teach/SKILL.md` |
| Graded quizzes | `professor_quiz` stages a native Desktop `question`; a plugin hook grades it mechanically |
| Durable progress | `lesson_state` tool writes `lessons/<topic>/state.json` |
| Lesson transcript | `lesson_log` mirrors the OpenCode session to `lesson.md` |
| Progress dashboard | Managed Mermaid block in a separate learning-plan note |
| Fact checking | `professor-researcher` OpenCode subagent |
| Diagrams | `professor-svg-artist` plus render-and-inspect SVG tools |
| Entry points | `/teach`, `/resume`, `/lessons`, `/gap`, and `/log` |

## Requirements

- OpenCode Desktop 1.18 or newer
- Node.js 22 or newer, only for the installer and tests
- One configured OpenCode model
- Optional: `rsvg-convert` or ImageMagick for verified SVG diagrams

The core lesson and quiz workflow has no paid service of its own. Model calls,
including researcher and diagram subagents, use the provider configured in
OpenCode and may incur that provider's normal cost.

## Install from a clone

Clone the repository anywhere, enter it, then run:

```bash
node scripts/install.mjs
```

The installer creates symbolic links in `~/.config/opencode/` and adds the
OpenCode plugin SDK to that config's `package.json` when missing. It does not
run a package installer. Restart OpenCode Desktop after it finishes.

Set `OPENCODE_CONFIG_DIR` to install into a different config directory:

```bash
OPENCODE_CONFIG_DIR=/path/to/config node scripts/install.mjs
```

The installer refuses to overwrite existing commands, agents, skills, or
plugins. This keeps a global OpenCode setup safe, but names such as `teach.md`
may need to be moved manually if they already exist.

## Use

Open a project in OpenCode Desktop and run:

```text
/teach HTTP and JSON fundamentals
```

Other commands:

```text
/resume HTTP and JSON fundamentals
/lessons
/gap I do not understand request headers
/log lessons/http-and-json/lesson.md
```

Lesson artifacts are created in the open project:

```text
lessons/<topic>/
├── state.json
├── lesson.md
└── assets/
```

The human-facing Mermaid plan is kept separately at the path selected when the
lesson starts. `state.json` is always the source of truth.

## How quiz grading works

OpenCode custom tools cannot directly own a Desktop modal. Professor therefore
uses a deliberate two-stage bridge:

1. The agent calls `professor_quiz`, which validates and shuffles the quiz and
   privately stores the answer key.
2. The agent immediately calls OpenCode's native `question` tool with the exact
   returned payload.
3. After the learner answers in the Desktop UI, the plugin compares selected
   labels with the stored key, adds authoritative grading to the tool result,
   and updates matching lesson nodes.

The teaching skill tells the model never to grade its own questions.

## Uninstall

From the same clone, run:

```bash
node scripts/uninstall.mjs
```

Only symbolic links pointing to this clone are removed. Lesson files and the
shared OpenCode SDK dependency are left untouched.

## Development

```bash
npm test
npm run check
```

The test suite uses Node's built-in runner and does not need installed package
dependencies. Testing the complete question modal requires launching OpenCode
Desktop because the modal belongs to OpenCode itself.

## Current compatibility boundary

This port targets the installed OpenCode 1.18 plugin API. Pi-specific TUI
widgets and child-process delegation were intentionally replaced with native
OpenCode questions and subagents. Transcript syncing happens when a session
becomes idle, so the file can lag behind while a model response is still
streaming.

## Provenance and licensing

See [`NOTICE.md`](NOTICE.md) before publishing this repository publicly.
