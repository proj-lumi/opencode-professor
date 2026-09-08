# Professor for OpenCode Desktop

A simple, selectable tutoring agent for OpenCode Desktop. It teaches one idea
at a time, defines jargon plainly, and checks understanding with application
questions.

## Install

Requirements: OpenCode Desktop and Node.js 22 or newer.

```bash
node scripts/install.mjs
```

Restart OpenCode Desktop, then choose **Professor** from the agent selector in
the message composer. You can also cycle primary agents with `Tab`.

The installer creates one symbolic link:

```text
~/.config/opencode/agents/professor.md
```

It does not install packages or change `opencode.json`.

To use another OpenCode config directory:

```bash
OPENCODE_CONFIG_DIR=/path/to/config node scripts/install.mjs
```

The installer refuses to overwrite an existing `professor.md` that it does not
own.

## Uninstall

```bash
node scripts/uninstall.mjs
```

The uninstaller only removes links created from this repository.

## Development

```bash
npm test
npm run check
```

The agent definition lives at [`.opencode/agents/professor.md`](.opencode/agents/professor.md).
