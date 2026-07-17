# mcp-searxng-local

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-48%20passed-brightgreen)](https://github.com/dduartee/mcp-searxng-local/actions)

MCP server for web search via [SearXNG](https://docs.searxng.org/) — **zero API keys, zero cost, 100% local**.

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2 (recommended), **or** Python 3.10+ on [Termux](https://termux.dev) (Android)

## Quick Start

```bash
git clone https://github.com/dduartee/mcp-searxng-local
cd mcp-searxng-local
npm install && npm run build
docker compose up -d

# Verify
curl -s "http://localhost:4000/search?q=test&format=json" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('results',[])), 'results')"
```

For Termux (no Docker), see the [Termux Install Guide](docs/install-searxng-termux.md).

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search via Google, DuckDuckGo, Brave, Wikipedia, arXiv. Supports domain/date filters, engine selection. |
| `web_search_advanced` | Same as `web_search` — unified handler. Hint for the LLM to use filters more carefully. |
| `web_fetch` | Extract page content. `mode=highlights` returns relevant excerpts (~98% smaller). Optimized for GitHub URLs. |

### `web_search` / `web_search_advanced` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *(required)* | Search query |
| `count` | number | `10` | Results (1-50) |
| `pageno` | number | `1` | Page number |
| `categories` | enum | — | `general`, `news`, `images`, `files`, `video`, `music` |
| `time_range` | enum | — | `day`, `month`, `year` |
| `language` | string | — | `pt-BR`, `en-US`, etc. |
| `includeDomains` | string[] | — | Only results from these domains |
| `excludeDomains` | string[] | — | Exclude these domains |
| `engines` | string | — | `google,duckduckgo,brave,wikipedia,arxiv` |
| `safesearch` | number | — | `0`=off, `1`=moderate, `2`=strict |
| `startPublishedDate` | string | — | ISO date (client-side filter) |
| `endPublishedDate` | string | — | ISO date (client-side filter) |

### `web_fetch` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *(required)* | Full URL |
| `maxChars` | number | `5000` | Character limit (100-50000) |
| `mode` | enum | `text` | `text` (full page) or `highlights` (relevant excerpts) |
| `query` | string | — | Required for `highlights` mode |

## Setup

After adding the config, **restart your MCP client** for the tools to appear.

Replace `/home/user/mcp-searxng-local` with your actual clone path.

### OpenCode

```bash
opencode mcp add mcp-searxng-local -- node /home/user/mcp-searxng-local/dist/index.js
```

```jsonc
// ./opencode.json (project) or ~/.config/opencode/opencode.json (global)
{ "mcp": { "mcp-searxng-local": { "type": "local", "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"] } } }
```

### Claude Code / Cursor / VS Code / Windsurf

```json
{
  "mcpServers": {
    "mcp-searxng-local": {
      "command": "node",
      "args": ["/home/user/mcp-searxng-local/dist/index.js"]
    }
  }
}
```

For VS Code use `"servers"` instead of `"mcpServers"`. For Windsurf, config goes in `~/.windsurf/mcp.json`. See the [Install Guide](docs/INSTALL.md) for all client configs.

## Configuration

All env vars are optional — defaults work for local SearXNG on port 4000.

| Env var | Default | Description |
|---------|---------|-------------|
| `SEARXNG_HOST` | `localhost` | SearXNG host |
| `SEARXNG_PORT` | `4000` | SearXNG port |
| `SEARXNG_TIMEOUT` | `10000` | HTTP timeout (ms) |
| `SEARXNG_FALLBACK_URLS` | — | Comma-separated public SearXNG URLs (auto-retry when local engines are blocked) |
| `GITHUB_TOKEN` | — | GitHub PAT — raises API rate limit from 60 to 5000 req/h |
| `DEBUG` | `false` | Enable verbose logging |

Also accepts `MCP_SEARCH_LOCAL_` prefix (e.g. `MCP_SEARCH_LOCAL_SEARXNG_HOST`).

The server loads `.env` files automatically via `dotenv`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Tools don't appear | Run `npm run build`, verify `dist/index.js` exists |
| `web_search` connection error | SearXNG not running: `docker compose up -d` |
| `## Unresponsive Engines` | Auto-fallback handles this. Add `SEARXNG_FALLBACK_URLS` for more options |
| Highlights returns full page | Use `mode=text` with smaller `maxChars` |

See [Install Guide](docs/INSTALL.md) for full troubleshooting.

## Documentation

| Doc | Description |
|-----|-------------|
| [Install Guide](docs/INSTALL.md) | Local, clone, global+plugin, and all MCP client configs |
| [Termux Install](docs/install-searxng-termux.md) | SearXNG native install on Android — no Docker |
| [Architecture](docs/ARCHITECTURE.md) | Request flow, design decisions, directory structure |
| [Examples](docs/EXAMPLES.md) | JSON-RPC payloads, agent workflows, CLI testing |
| [Comparison](docs/COMPARISON.md) | vs Exa, Brave, SearXNG raw, Chrome DevTools |
| [GitHub Fetch](docs/GITHUB_FETCH.md) | Optimized GitHub URL handling in `web_fetch` |
| [Search Insights](docs/SEARCH_INSIGHTS.md) | What AI agents actually need from search |

## License

MIT
