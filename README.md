# Professor for OpenCode Desktop

A simple, selectable tutoring agent for OpenCode Desktop. It teaches one idea
at a time, defines jargon plainly, and checks understanding with application
questions.

## Install

No package manager or Node.js installation is required.

| Platform | Command |
|---|---|
| Linux or macOS | `sh scripts/install.sh` |
| Windows PowerShell | `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1` |

Restart OpenCode Desktop, then choose **Professor** from the agent selector in
the message composer. You can also cycle primary agents with `Tab`.

The installer copies the agent to:

```text
~/.config/opencode/agents/professor.md
```

Set `OPENCODE_CONFIG_DIR` to use another OpenCode config directory. Re-running
the installer updates its managed copy, but it refuses to overwrite an existing
Professor agent that it does not manage.

## Uninstall

| Platform | Command |
|---|---|
| Linux or macOS | `sh scripts/uninstall.sh` |
| Windows PowerShell | `powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1` |

The uninstaller only removes the agent file when it contains this repository's
management marker.

The agent definition lives at [`.opencode/agents/professor.md`](.opencode/agents/professor.md).
