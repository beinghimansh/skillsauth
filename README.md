<p align="center">
  <img src="https://skillsauth.com/icon.svg" alt="SkillsAuth" width="80" />
</p>

<h1 align="center">SkillsAuth</h1>

<p align="center">
  <strong>Install verified AI agent skills from the <a href="https://skillsauth.com">SkillsAuth</a> marketplace.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/skillsauth"><img src="https://img.shields.io/npm/v/skillsauth?color=0ea5e9&label=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/skillsauth"><img src="https://img.shields.io/npm/dm/skillsauth?color=6366f1" alt="downloads" /></a>
  <a href="https://github.com/beinghimansh/skillsauth/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="license" /></a>
  <a href="https://skillsauth.com"><img src="https://img.shields.io/badge/marketplace-skillsauth.com-f59e0b" alt="marketplace" /></a>
</p>

---

## Quick Start

```bash
npm install -g skillsauth
```

```bash
skillsauth search "react"                    # Search the marketplace
skillsauth list anthropics/skills            # List skills in a verified repo
skillsauth add anthropics/skills           # Install interactively
skillsauth add huggingface/skills -y -g    # Install all, globally, no prompts
skillsauth find                            # Interactive skill discovery
```

Examples below use **verified publishers** already on [SkillsAuth](https://skillsauth.com): [`anthropics/skills`](https://github.com/anthropics/skills), [`huggingface/skills`](https://github.com/huggingface/skills), and [`letta-ai/skills`](https://github.com/letta-ai/skills).

---

## Install a skill (`add` / `install` / `i`)

### Source formats

| Format | Example |
|--------|---------|
| GitHub shorthand | `skillsauth add anthropics/skills` |
| Local path (plugin or `skills/` tree) | `skillsauth add ./my-plugin` |

Remote installs use `owner/repo` only (no raw GitHub URL in the CLI today). Use **`list`** first to see exact skill names, then **`add owner/repo "Skill Name"`**.

### Options

| Option | Description |
|--------|-------------|
| `-g, --global` | Install under your home directory instead of the current project |
| `-y, --yes` | Skip confirmation prompts (CI / scripts) |
| `--agent <names...>` | Target specific agents (see [Supported agents](#supported-agents)) |
| `--all` | Install every skill from the repo without selecting |
| `--copy` | Copy files into each agent dir instead of symlinks |
| `--json` | Machine-readable JSON output |

### Examples (verified repos)

```bash
# List skills in a repo (no install)
skillsauth list huggingface/skills
skillsauth ls letta-ai/skills

# Interactive install — pick skills, scope, and agents
skillsauth add anthropics/skills

# Install one named skill (use the name shown by `list`)
skillsauth add anthropics/skills "skill-creator"

# Install all skills from a repo, project scope, no prompts
skillsauth add huggingface/skills --yes --all

# Global install, Cursor + Claude only
skillsauth add letta-ai/skills --global --yes --agent cursor claude-code

# CI: JSON output
skillsauth add huggingface/skills --json --yes --all

# Local plugin / folder with SKILL.md or plugin manifests
skillsauth add ./my-plugin --all --yes
```

### Installation scope

| Scope | Flag | Lockfile | Use case |
|-------|------|----------|----------|
| **Project** | _(default)_ | `.skillsauth-lock.json` | Per-repo, team-shared |
| **Global** | `-g` / `--global` | `~/.skillsauth/lock.json` | All projects on your machine |

### Installation methods

| Method | Description |
|--------|-------------|
| **Symlink** (default) | One canonical copy under `.agents/skills/<slug>/`, linked from each agent. Recommended. |
| **Copy** | `--copy` — full copies per agent when symlinks are not allowed. |

---

## Other commands

| Command | Alias | Description |
|---------|-------|-------------|
| `skillsauth list <repo>` | `ls` | List published skills in a GitHub repo on SkillsAuth |
| `skillsauth search <query>` | | Search the whole marketplace |
| `skillsauth find [query]` | | Interactive search + suggested `add` command |
| `skillsauth installed` | `status` | Show what is installed (local or global) |
| `skillsauth check` | | See if updates exist (does not install) |
| `skillsauth update` | `upgrade` | Pull latest versions for lockfile entries |
| `skillsauth remove <slug>` | `uninstall`, `rm` | Uninstall a skill by marketplace slug |
| `skillsauth init` | | Scaffold `SKILL.md` or `--plugin` bundle |
| `skillsauth agents` | | Print all supported agent IDs |

### `skillsauth list` / `ls`

Lists **verified, published** skills for an `owner/repo` that SkillsAuth has ingested.

```bash
skillsauth list anthropics/skills
skillsauth ls huggingface/skills
skillsauth ls letta-ai/skills
```

Use the **name** column with `skillsauth add owner/repo "Exact Name"`.

### `skillsauth search`

Keyword search across the marketplace (name, description, category, repo, trigger phrase).

```bash
skillsauth search "typescript"
skillsauth search "gradio" --limit 15
```

### `skillsauth find`

Interactive picker after search; prints a ready-to-run `npx skillsauth add ...` line.

```bash
skillsauth find
skillsauth find "docker"
skillsauth find --json
```

### `skillsauth installed` / `status`

Like `npm ls` for skills: slug, version, agents.

```bash
skillsauth installed
skillsauth installed --global
skillsauth installed --json
```

### `skillsauth check` / `skillsauth update`

```bash
# Read-only: outdated vs latest, quarantine warnings
skillsauth check
skillsauth check --global --json

# Apply updates from the marketplace
skillsauth update
skillsauth update --global
```

### `skillsauth remove` / `uninstall` / `rm`

Removes by **slug** from `installed` (e.g. `anthropics-skills-skills-skill-creator`), not by repo path.

```bash
skillsauth installed   # copy the slug column from output

skillsauth remove anthropics-skills-skills-skill-creator
skillsauth rm anthropics-skills-skills-skill-creator --yes
skillsauth remove your-skill-slug --global --yes
```

| Option | Description |
|--------|-------------|
| `-g, --global` | Use global lockfile / paths |
| `-y, --yes` | Skip confirm |

### `skillsauth init`

```bash
skillsauth init                 # ./<name>/SKILL.md with YAML frontmatter
skillsauth init --plugin        # Claude + Cursor plugin layout + skills/
```

### `skillsauth agents`

```bash
skillsauth agents
skillsauth agents --json
```

---

## Supported agents

Agent IDs and install paths match  (open agent skills ecosystem). skillsauth writes to the same project and global locations.

skillsauth keeps a **canonical** copy under `.agents/skills/<slug>/` (project) or `~/.agents/skills/<slug>/` (global) and symlinks into each tool’s directory when that path differs. Use `--copy` to duplicate files instead of symlinks.

| Agent | `--agent` | Project path | Global path |
|-------|-----------|----------------|-------------|
| Amp, Kimi Code CLI, Replit, Universal | `amp`, `kimi-cli`, `replit`, `universal` | `.agents/skills/` | `~/.config/agents/skills/` |
| Antigravity | `antigravity` | `.agents/skills/` | `~/.gemini/antigravity/skills/` |
| Augment | `augment` | `.augment/skills/` | `~/.augment/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| OpenClaw | `openclaw` | `skills/` | `~/.openclaw/skills/` |
| Cline, Warp | `cline`, `warp` | `.agents/skills/` | `~/.agents/skills/` |
| CodeBuddy | `codebuddy` | `.codebuddy/skills/` | `~/.codebuddy/skills/` |
| Codex | `codex` | `.agents/skills/` | `~/.codex/skills/` |
| Command Code | `command-code` | `.commandcode/skills/` | `~/.commandcode/skills/` |
| Continue | `continue` | `.continue/skills/` | `~/.continue/skills/` |
| Cortex Code | `cortex` | `.cortex/skills/` | `~/.snowflake/cortex/skills/` |
| Crush | `crush` | `.crush/skills/` | `~/.config/crush/skills/` |
| Cursor | `cursor` | `.agents/skills/` | `~/.cursor/skills/` |
| Deep Agents | `deepagents` | `.agents/skills/` | `~/.deepagents/agent/skills/` |
| Droid | `droid` | `.factory/skills/` | `~/.factory/skills/` |
| Firebender | `firebender` | `.agents/skills/` | `~/.firebender/skills/` |
| Gemini CLI | `gemini-cli` | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `~/.copilot/skills/` |
| Goose | `goose` | `.goose/skills/` | `~/.config/goose/skills/` |
| Junie | `junie` | `.junie/skills/` | `~/.junie/skills/` |
| iFlow CLI | `iflow-cli` | `.iflow/skills/` | `~/.iflow/skills/` |
| Kilo Code | `kilo` | `.kilocode/skills/` | `~/.kilocode/skills/` |
| Kiro CLI | `kiro-cli` | `.kiro/skills/` | `~/.kiro/skills/` |
| Kode | `kode` | `.kode/skills/` | `~/.kode/skills/` |
| MCPJam | `mcpjam` | `.mcpjam/skills/` | `~/.mcpjam/skills/` |
| Mistral Vibe | `mistral-vibe` | `.vibe/skills/` | `~/.vibe/skills/` |
| Mux | `mux` | `.mux/skills/` | `~/.mux/skills/` |
| OpenCode | `opencode` | `.agents/skills/` | `~/.config/opencode/skills/` |
| OpenHands | `openhands` | `.openhands/skills/` | `~/.openhands/skills/` |
| Pi | `pi` | `.pi/skills/` | `~/.pi/agent/skills/` |
| Qoder | `qoder` | `.qoder/skills/` | `~/.qoder/skills/` |
| Qwen Code | `qwen-code` | `.qwen/skills/` | `~/.qwen/skills/` |
| Roo Code | `roo` | `.roo/skills/` | `~/.roo/skills/` |
| Trae | `trae` | `.trae/skills/` | `~/.trae/skills/` |
| Trae CN | `trae-cn` | `.trae/skills/` | `~/.trae-cn/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Zencoder | `zencoder` | `.zencoder/skills/` | `~/.zencoder/skills/` |
| Neovate | `neovate` | `.neovate/skills/` | `~/.neovate/skills/` |
| Pochi | `pochi` | `.pochi/skills/` | `~/.pochi/skills/` |
| AdaL | `adal` | `.adal/skills/` | `~/.adal/skills/` |

**Kiro CLI:** After installing skills, add them to your custom agent’s `resources` in `.kiro/agents/<agent>.json`:

```json
{
  "resources": ["skill://.kiro/skills/**/SKILL.md"]
}
```

Run `skillsauth agents` or `skillsauth agents --json` for the full ID list.

---

## Plugin authoring

Create plugins that work across Claude Code, Cursor, and the same agent paths as above:

```bash
skillsauth init --plugin
```

```
my-plugin/
├── .claude-plugin/plugin.json   # Claude Code manifest
├── .cursor-plugin/plugin.json   # Cursor manifest
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── README.md
```

---

## Security

All skills on SkillsAuth are verified before installation:

- **mcp-scan** — prompt injection and tool poisoning checks
- **Semgrep** — static analysis
- **VirusTotal** — malware scanning
- **More scanners** — integrated over time

Skills that fail any scan are **quarantined** and cannot be installed. The CLI warns you if an installed skill becomes quarantined during `update` or `check`.

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SKILLSAUTH_API_URL` | API base URL | `https://skillsauth.com/api/cli` |
| `SKILLSAUTH_YES` | Skip all prompts | `false` |
| `SKILLSAUTH_NO_ANALYTICS` | Disable download tracking | `false` |
| `SKILLSAUTH_DEBUG` | Verbose HTTP logging | `false` |

---

## Lockfile

| Scope | Path |
|-------|------|
| Local | `.skillsauth-lock.json` |
| Global | `~/.skillsauth/lock.json` |

---

## License

MIT
