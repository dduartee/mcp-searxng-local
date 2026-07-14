# mcp-searxng-local

MCP server for local web search via [SearXNG](https://docs.searxng.org/) — zero API keys, zero cost, 100% local.

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | Web search via SearXNG metasearch with domain/engine/date filters, safe search, answers + infoboxes |
| `web_search_advanced` | Advanced search with all filters — domains, ISO date ranges, engine selection |
| `web_fetch` | Extract page content: `mode=text` (full page) or `mode=highlights` (relevant excerpts, ~98% smaller) |

## Quick Start

```bash
# 1. Start SearXNG
docker compose up -d

# 2. Verify SearXNG is responding
curl "http://localhost:4000/search?q=test&format=json"

# 3. Build and start the MCP server
npm run build
npm start
```

## Setup with OpenCode

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000"
      }
    }
  }
}
```

Then restart OpenCode.

## Setup with other MCP clients

```json
// Claude Code
{
  "mcpServers": {
    "mcp-searxng-local": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}

// Cursor (.cursor/mcp.json)
{
  "mcpServers": {
    "mcp-searxng-local": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `SEARXNG_HOST` | `localhost` | SearXNG host |
| `SEARXNG_PORT` | `4000` | SearXNG port |
| `SEARXNG_TIMEOUT` | `10000` | Request timeout (ms) |
| `DEBUG` | `false` | Enable debug logging |

Prefix `MCP_SEARCH_LOCAL_` variants also supported.

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Internal design, data flow, design decisions |
| [Search Insights](docs/SEARCH_INSIGHTS.md) | What we learned about AI agent search patterns |
| [Comparison](docs/COMPARISON.md) | vs Exa MCP, Brave MCP, SearXNG raw, Chrome DevTools |
| [Examples](docs/EXAMPLES.md) | Real usage examples and agent workflows |

## Testing

```bash
# CLI test (JSON-RPC via stdio)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_search","arguments":{"query":"test"}}}' | node dist/index.js

# Run unit tests (vitest, 56 tests)
npm test

# MCP Inspector
npm run inspector
```

## Development

```bash
npm run dev        # tsx watch
npm run build      # tsc
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run inspector  # MCP Inspector
```

## Streamable HTTP (alternative transport)

```bash
# Start HTTP server instead of stdio
MCP_PORT=3000 node dist/http.js
```

Then configure your client to use `http://localhost:3000/mcp`.

## Architecture

```
Cliente MCP (OpenCode, Claude Code, etc.)
  │ stdio or Streamable HTTP
  ▼
mcp-searxng-local (Node.js / TypeScript)
  │ HTTP + cache + retry
  ▼
SearXNG (Docker) ← Google, DuckDuckGo, Brave, Wikipedia, arXiv, Bing
```

## SearXNG Engines

Enabled by default: Google, DuckDuckGo, Brave, Wikipedia, arXiv.

Add or remove engines in `searxng/settings.yml` and restart: `docker compose restart searxng`.

## License

MIT
