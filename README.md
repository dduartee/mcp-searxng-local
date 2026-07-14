# mcp-searxng-local

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-28%20passed-brightgreen)]()

MCP server for web search via [SearXNG](https://docs.searxng.org/) — **zero API keys, zero cost, 100% local**.

> Why not Exa? Costs money. Why not Brave? Requires API key. This: self-hosted, unlimited queries, your data never leaves your machine.

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

## Quick Start

```bash
git clone https://github.com/dduartee/mcp-searxng-local
cd mcp-searxng-local
npm install && npm run build
docker compose up -d

# Verify SearXNG is responding
curl -s "http://localhost:4000/search?q=test&format=json" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('results',[])), 'results')"

# Verify MCP server works
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
# Expected: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

Then add to your MCP client config below. **Restart your client** for the tools to appear.

> Path note: replace `/home/user/mcp-searxng-local` in examples below with your actual clone path.

## Why mcp-searxng-local?

| | Exa MCP | Brave MCP | **mcp-searxng-local** |
|---|---------|-----------|----------------------|
| API key | Required | Required | **None** |
| Cost | Paid (limited free) | 2k/mo free | **Unlimited** |
| Privacy | Cloud (USA) | Cloud | **100% local** |
| Engines | Proprietary index | Brave only | **Google, DDG, Brave, Wikipedia, arXiv** |
| Highlights | AI (paid) | No | **Keyword matching (free)** |
| Cache | Server-side | No | **LRU local (5min TTL)** |

## Tools

### `web_search` / `web_search_advanced`

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
| `engines` | string | — | `google,duckduckgo,brave,wikipedia,arxiv,bing` |
| `safesearch` | number | — | `0`=off, `1`=moderate, `2`=strict |
| `startPublishedDate` | string | — | ISO date: `"2025-01-01"` (client-side filter) |
| `endPublishedDate` | string | — | ISO date: `"2025-12-31"` (client-side filter) |

Response includes: results + **direct answers**, **infoboxes**, **spelling suggestions**, **search suggestions**, and **unresponsive engine diagnostics**.

### `web_fetch`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | *(required)* | Full URL |
| `maxChars` | number | `5000` | Character limit (100-50000) |
| `mode` | enum | `text` | `text` (full page) or `highlights` (relevant excerpts) |
| `query` | string | — | Required for `highlights` mode |

**Highlights tip:** Results are typically ~98% smaller than full page text. Use `mode=highlights` with the same query that led you to the URL.

## Setup

After adding the config, **restart your MCP client** for the tools to appear.

### OpenCode

```bash
# CLI (adds to global config)
opencode mcp add mcp-searxng-local -- node /home/user/mcp-searxng-local/dist/index.js
```

```jsonc
// Project config: ./opencode.json (relative path)
{ "mcp": { "mcp-searxng-local": { "type": "local", "command": ["node", "dist/index.js"] } } }

// Global config: ~/.config/opencode/opencode.json (absolute path)
{ "mcp": { "mcp-searxng-local": { "type": "local", "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"] } } }
```

### Claude Code

```json
{
  "mcpServers": {
    "mcp-searxng-local": {
      "command": "node",
      "args": ["/home/user/mcp-searxng-local/dist/index.js"],
      "env": { "SEARXNG_HOST": "localhost", "SEARXNG_PORT": "4000" }
    }
  }
}
```

### Cursor

```json
// .cursor/mcp.json
{ "mcpServers": { "mcp-searxng-local": { "command": "node", "args": ["/home/user/mcp-searxng-local/dist/index.js"] } } }
```

### VS Code · Windsurf · Zed · Codex · Antigravity

See [Install Guide](docs/INSTALL.md) for all client configs.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `SEARXNG_HOST` | `localhost` | SearXNG host |
| `SEARXNG_PORT` | `4000` | SearXNG port |
| `SEARXNG_TIMEOUT` | `10000` | HTTP timeout (ms) |
| `SEARXNG_FALLBACK_URLS` | — | Comma-separated public SearXNG URLs (auto-fallback when local engines fail) |
| `DEBUG` | `false` | Enable verbose logging |

Also accepts `MCP_SEARCH_LOCAL_` prefix: `MCP_SEARCH_LOCAL_SEARXNG_HOST`, `MCP_SEARCH_LOCAL_SEARXNG_PORT`, `MCP_SEARCH_LOCAL_TIMEOUT`, `MCP_SEARCH_LOCAL_DEBUG`.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tools don't appear | Path wrong or build missing | Run `npm run build`, verify `dist/index.js` exists |
| `web_search` connection error | SearXNG not running | `docker compose up -d` |
| `"Nenhum resultado encontrado"` with `engines=X` | Engine blocked/suspended | Check `## Engines indisponíveis` section in response; retry with different engine |
| All engines return 0 results | Server IP blocked by search providers | Set `SEARXNG_FALLBACK_URLS` to public instances (e.g. `https://search.rhscz.eu,https://searx.tiekoetter.com`) — auto-fallback kicks in |
| Highlights returns full page | Page has no paragraph breaks or all text matches query | Use `mode=text` with smaller `maxChars` |
| `web_fetch` timeout (15s) | Page is slow or .js-heavy SPA | Reduce `maxChars`, try a different URL |

## Testing

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_search","arguments":{"query":"test"}}}' | node dist/index.js

npm test             # 28 unit tests
npm run inspector    # MCP Inspector UI
```

## Architecture

```
MCP Client (OpenCode, Claude Code, Cursor...)
  │ stdio or Streamable HTTP
  ▼
mcp-searxng-local (Node.js + TypeScript)
  │ HTTP + LRU cache + exponential backoff retry
  ▼
SearXNG (Docker) ← Google, DuckDuckGo, Brave, Wikipedia, arXiv, Bing
```

## Documentation

| Doc | Description |
|-----|-------------|
| [Install Guide](docs/INSTALL.md) | Project, global, and plugin-based setup |
| [Examples](docs/EXAMPLES.md) | Real agent workflows and CLI usage |
| [Architecture](docs/ARCHITECTURE.md) | Internal design, data flow, decisions |
| [Search Insights](docs/SEARCH_INSIGHTS.md) | What AI agents actually need from search |
| [Comparison](docs/COMPARISON.md) | vs Exa, Brave, SearXNG raw, Chrome DevTools |

## License

MIT
