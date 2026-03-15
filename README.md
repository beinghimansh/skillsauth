# skillsauth

Install verified AI agent skills from the [SkillsAuth](https://skillsauth.com) marketplace.

## Installation

```bash
npm install -g skillsauth
# or
npx skillsauth <command>
```

## Quick Start

```bash
# Search for skills
skillsauth search "react"

# List skills in a repository
skillsauth list facebook/react

# Install all skills from a repo
skillsauth add facebook/react

# Install with auto-confirm
skillsauth add facebook/react --yes

# Install globally (all projects)
skillsauth add facebook/react --global
```

## Commands

### `add <repo> [skill]`
Install skills from a repository.

```bash
skillsauth add owner/repo              # Interactive install
skillsauth add owner/repo --yes        # Auto-confirm
skillsauth add owner/repo --global     # Install globally
skillsauth add owner/repo skill-name   # Install specific skill
```

Options:
- `-g, --global` — Install to global directory (~/.claude/skills/)
- `-y, --yes` — Skip all prompts

### `list <repo>`
List all verified skills in a repository.

```bash
skillsauth list facebook/react
```

### `search <query>`
Search the SkillsAI marketplace.

```bash
skillsauth search "typescript"
skillsauth search "api" --limit 20
```

Options:
- `-l, --limit <n>` — Max results (default: 10)

### `installed`
Show installed skills.

```bash
skillsauth installed            # Local installs
skillsauth installed --global   # Global installs
```

Options:
- `-g, --global` — Show global installs

### `update`
Update all installed skills to latest versions.

```bash
skillsauth update            # Update local
skillsauth update --global   # Update global
```

Options:
- `-g, --global` — Update global installs

### `remove <slug>`
Remove an installed skill.

```bash
skillsauth remove facebook-react-flow
skillsauth remove facebook-react-flow --yes
skillsauth remove facebook-react-flow --global
```

Options:
- `-g, --global` — Remove from global install
- `-y, --yes` — Skip confirmation

## Supported AI Agents

skillsauth automatically detects and installs to:

| Agent | Local Path | Global Path |
|-------|------------|-------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Windsurf | `.windsurf/memories/` | `~/.windsurf/memories/` |

## Security

All skills on SkillsAI are:
- ✓ Scanned with mcp-scan
- ✓ Analyzed with Semgrep
- ✓ Verified by VirusTotal

Skills that fail security scans are quarantined and cannot be installed.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SKILLSAI_API_URL` | API base URL (default: https://skillsauth.com/api/cli) |
| `SKILLSAI_YES` | Set to `true` to skip all prompts |
| `SKILLSAI_NO_ANALYTICS` | Set to `true` to disable download tracking |
| `SKILLSAI_DEBUG` | Set to `true` for verbose output |

## Lockfile

skillsauth maintains a lockfile to track installed skills:
- Local: `.skillsai-lock.json` (in project root)
- Global: `~/.skillsai/lock.json`

## License

MIT
