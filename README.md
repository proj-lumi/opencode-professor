# Professor for OpenCode Desktop

The full adaptive Professor workflow for OpenCode Desktop, with a selectable
**Professor** primary agent and `/teach`, `/resume`, `/lessons`, `/gap`, and
`/log` commands.

Professor probes the learner's current understanding, commits a dependency
plan, teaches one reasoning step at a time, and verifies each step before
advancing. Lesson state, quiz attempts, a Mermaid progress dashboard, and the
session transcript are saved in the project being taught.

## Included

| Piece | OpenCode implementation |
| --- | --- |
| Selectable tutor | Primary agent at `.opencode/agents/professor.md` |
| Teaching protocol | Skill at `.opencode/skills/teach/SKILL.md` |
| Graded quizzes | Native Desktop questions graded by the Professor plugin |
| Durable progress | `lesson_state` writes `lessons/<topic>/state.json` and `learning-plan.md` |
| Lesson transcript | `lesson_log` mirrors the session to `lesson.md` |
| Lesson glossary | Each lesson keeps jargon in `lessons/<topic>/Glossary.md` |
| Fact checking | `professor-researcher` subagent |
| Diagrams | `professor-svg-artist` with render-and-inspect SVG tools |
| Slash commands | `/teach`, `/resume`, `/lessons`, `/gap`, and `/log` |

## Install

No package manager or separate Node.js installation is required. OpenCode
provides the plugin runtime and prepares its matching plugin SDK at startup.

| Platform | Command |
| --- | --- |
| Linux or macOS | `sh scripts/install.sh` |
| Windows PowerShell | `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1` |

Restart OpenCode Desktop afterward. Select **Professor** in the message
composer, cycle to it with `Tab`, or run `/teach <topic>` directly.

The scripts copy the workflow into `~/.config/opencode/`. Set
`OPENCODE_CONFIG_DIR` to use another config directory. Re-running an installer
updates managed files, but it refuses to overwrite files it does not manage.

## Use

```text
/teach HTTP and JSON fundamentals
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
├── learning-plan.md
├── Glossary.md
└── assets/
```

## Uninstall

| Platform | Command |
| --- | --- |
| Linux or macOS | `sh scripts/uninstall.sh` |
| Windows PowerShell | `powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1` |

Only files containing this repository's management marker are removed. Lesson
files remain untouched.

## Development

The shell installer tests need only a POSIX shell. Core JavaScript tests require
Node.js 22 for contributors; end users do not need it.

```bash
sh tests/install.sh
node --test tests/core.test.js
```
