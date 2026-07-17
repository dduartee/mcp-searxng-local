# Install Guide

| Mode | Effort | Best for |
|------|--------|----------|
| [Local project](#1-local-project) | Low | Contributors working on the repo itself |
| [Clone + absolute path](#2-clone--absolute-path) | Medium | Using in any project |
| [Global with plugin](#3-global-with-plugin) | High | Full experience, always available |
| [Termux (Android)](#4-termux-android) | Medium | Running SearXNG natively without Docker |

---

## 1. Local Project

Minimal setup. Follow the [Quick Start](../README.md#quick-start) in the README, then the MCP config is already included in the repo's `opencode.json`.

**Pros:** Zero configuration, relative path works.

**Cons:** Only works inside the project directory.

---

## 2. Clone + Absolute Path

Clone the repo to a fixed location and point to the absolute path. Works in any project.

```bash
git clone https://github.com/dduartee/mcp-searxng-local ~/mcp-searxng-local
cd ~/mcp-searxng-local
npm install && npm run build
docker compose up -d
```

```jsonc
// ~/.config/opencode/opencode.json (global)
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website",
        "GITHUB_TOKEN": ""
      }
    }
  }
}
```

Or via CLI:

```bash
opencode mcp add mcp-searxng-local -- node /home/user/mcp-searxng-local/dist/index.js
```

**Pros:** Available in any project. One clone, use everywhere.

**Cons:** Requires manual updates (`git pull && npm run build`). Absolute path required.

### `.env` file

Instead of passing env vars through MCP config, create a `.env` file in the project root. Loaded automatically via `dotenv`:

```bash
SEARXNG_HOST=localhost
SEARXNG_PORT=4000
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

---

## 3. Global with Plugin

Three layers working together:

```
~/.config/opencode/
├── opencode.json           ← MCP server config
├── plugins/
│   └── searxng-startup.js  ← Plugin: starts SearXNG on boot
└── instructions/
    └── searxng-search.md   ← Rules: when to use each tool
```

### 3.1 MCP Config (`opencode.json`)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website",
        "GITHUB_TOKEN": ""
      }
    }
  }
}
```

### 3.2 Startup Plugin (`~/.config/opencode/plugins/searxng-startup.js`)

Copy from [examples/opencode-plugin/searxng-startup.js](../examples/opencode-plugin/searxng-startup.js) to ensure SearXNG is running before the MCP server starts:

```js
import { execSync } from 'node:child_process'

export default async () => {
  const searxngDir = '/home/user/mcp-searxng-local'

  try {
    execSync('curl -sf http://localhost:4000/search?q=health&format=json', {
      stdio: 'ignore',
      timeout: 3000,
    })
  } catch {
    console.error('[searxng-startup] SearXNG not running, starting...')
    execSync('docker compose up -d', { cwd: searxngDir, stdio: 'inherit' })
  }
}
```

### 3.3 Usage Instructions (`~/.config/opencode/instructions/searxng-search.md`)

Copy from [examples/opencode-instructions/searxng-search.md](../examples/opencode-instructions/searxng-search.md) to define when to use each tool.

Register the instructions in `opencode.json`:

```json
{
  "instructions": [
    "/home/user/.config/opencode/instructions/searxng-search.md"
  ]
}
```

**Pros:** Full experience. SearXNG starts automatically. Agent knows when to use each tool.

**Cons:** More files to maintain. Plugin requires Node.js.

---

## 4. Termux (Android)

SearXNG runs natively on Termux without Docker. See the [Termux Install Guide](install-searxng-termux.md) for the full walkthrough: dependencies, SearXNG install, configuration, start/stop scripts, MCP config, and troubleshooting.

**Pros:** No Docker. Runs on any Android with Termux. Same port (4000) as Docker.

**Cons:** SearXNG must be started manually (or via script). Some engines (brave/startpage) may be blocked on mobile IPs.

## Updating

### Docker

```bash
cd ~/mcp-searxng-local
git pull
npm install && npm run build
docker compose pull   # updates SearXNG + Valkey images
docker compose up -d  # restarts with new images
```

### Termux

See the [Termux Install Guide — Updating](install-searxng-termux.md#updating).

After updating, restart OpenCode.

## Troubleshooting

See [Troubleshooting](../README.md#troubleshooting) in the README.

## Future: npm Publication

When published, setup will be reduced to:

```json
{
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["npx", "-y", "mcp-searxng-local"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website",
        "GITHUB_TOKEN": ""
      }
    }
  }
}
```

`npx -y` downloads and runs automatically. No clone, no manual build.
