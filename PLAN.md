# Plan: Local Web Search MCP — `mcp-search-local`

## 1. Objective

Create an MCP (Model Context Protocol) server that allows Claude Code (or any MCP client) to perform **web searches** and **extract content from URLs**, running **100% locally** with no paid external API dependencies.

## 2. Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                   MCP Client                        │
│              (Claude Code, Cursor, etc.)              │
└─────────────────┬───────────────────────────────────┘
                  │ stdio or Streamable HTTP
┌─────────────────▼───────────────────────────────────┐
│               mcp-search-local (TS/Node)             │
│   ┌──────────────────────────────────────────────┐   │
│   │  @modelcontextprotocol/server (MCP SDK)      │   │
│   │  Zod v4 (input validation)                   │   │
│   │  Axios (HTTP requests)                       │   │
│   │  cheerio (HTML parsing for web_fetch)        │   │
│   └────────────┬─────────────────────────────┬───┘   │
│                │                             │         │
│         HTTP JSON API                  HTTP fetch      │
└─────────────────┬───────────────────────────────────┘
                  │ http://localhost:4000
┌─────────────────▼───────────────────────────────────┐
│              SearXNG (Docker)                        │
│   Metasearch engine: Google, Bing, DuckDuckGo,      │
│   Brave, Wikipedia, arXiv, GitHub, etc.              │
└─────────────────────────────────────────────────────┘
```

### 2.1 Components

| Component | Function | Tech |
|---|---|---|
| **MCP Server** | Expose `web_search` + `web_fetch` tools | TypeScript, `@modelcontextprotocol/server` |
| **Search** | Metasearch aggregating multiple engines | **SearXNG** (`searxng/searxng:latest`) in Docker |
| **Fetch** | Extract HTML from URLs and convert to markdown | `fetch` + `cheerio` (Node.js) |
| **Transport** | Communication with MCP client | **stdio** (primary) + **Streamable HTTP** (optional) |

### 2.2 Why SearXNG?

| Alternative | API Key? | Local? | Quality | Maintenance |
|---|---|---|---|---|
| **SearXNG** (chosen) | ❌ | ✅ Docker | Good (aggregates 10+ engines) | Active, OSS |
| DuckDuckGo scraping | ❌ | ✅ (pure JS) | Low (fragile, blocking) | Fragile |
| Google scraping | ❌ | ✅ (pure JS) | Excellent (illegal TOS) | Illegal |
| SerpAPI | ✅ free 100/month | ❌ | Good | External API |
| Exa | ✅ paid | ❌ | Excellent | External API |
| Bing API | ✅ free 1k/month | ❌ | Good | External API |
| Brave Search | ✅ free 2k/month | ❌ | Good | External API |

**SearXNG wins because:**
- Zero API keys
- Zero operational cost
- Aggregates Google + DuckDuckGo + Brave + Bing + Wikipedia + arXiv + GitHub + 150+ engines
- Docker compose ready (`searxng/searxng`)
- Native JSON API at `localhost:4000/search?format=json`
- Active community, stable upstream
- Internal cache (Valkey/Redis) reduces latency

## 3. MCP Server Architecture

### 3.1 Directory structure

```
mcp-search-local/
├── src/
│   ├── index.ts              # Entry point (stdio or HTTP)
│   ├── server.ts             # McpServer configuration + tool registration
│   ├── toolRegistry.ts       # Tool metadata
│   ├── tools/
│   │   ├── webSearch.ts      # web_search tool
│   │   └── webFetch.ts       # web_fetch tool
│   ├── engines/
│   │   ├── searxng.ts        # SearXNG API client
│   │   └── fetchHtml.ts      # Fetch + parse HTML to markdown
│   ├── types.ts              # Shared types
│   └── utils/
│       ├── logger.ts         # Logging
│       ├── formatter.ts      # Result formatting
│       └── errors.ts         # Error handling
├── docker-compose.yml        # SearXNG + Valkey
├── searxng/
│   └── settings.yml          # SearXNG config (format=json enabled)
├── package.json
├── tsconfig.json
├── opencode.json             # Config for OpenCode
└── README.md
```

### 3.2 Request flow

```
MCP Client
  │
  │  tools/call "web_search" { query: "AI news", count: 5 }
  ▼
src/tools/webSearch.ts
  │
  │  GET http://localhost:4000/search?q=AI+news&format=json&pageno=1
  ▼
SearXNG API (Docker on port 4000)
  │
  │  Aggregates results from Google, DuckDuckGo, Brave, etc.
  ▼
JSON Response { results: [...], answers: [...], infoboxes: [...] }
  │
  │  Filter, sort, format
  ▼
MCP Response { content: [{ type: "text", text: "..." }] }
```

### 3.3 Exposed tools

| Tool | Description | Input Schema |
|---|---|---|
| `web_search` | Web search via SearXNG | `{ query: string, count?: number (1-50), pageno?: number, categories?: string[], time_range?: "day"\|"month"\|"year", language?: string }` |
| `web_fetch` | Extract content from a URL | `{ url: string, maxChars?: number }` |

## 4. Implementation Decisions

### 4.1 Transport: stdio vs HTTP

| Transport | Advantages | Disadvantages |
|---|---|---|
| **stdio** (chosen) | Simple, supported by all MCP clients | No remote access |
| Streamable HTTP | Remote access, web integration | More complex, less client support |

**Decision:** stdio as primary (maximum compatibility). Prepare code to support HTTP v2 in the future.

### 4.2 MCP SDK: v1 vs v2

The Exa MCP uses `@modelcontextprotocol/sdk` v1.x (stable). The SDK v2 is in beta with `@modelcontextprotocol/server`.

**Decision:** Use **SDK v1** (`@modelcontextprotocol/sdk`) for production. But prepare migration to v2 (which will be released in July/2026).

### 4.3 HTML Parsing in Web Fetch

For `web_fetch`, we use Node's native `fetch` + `cheerio` to:
- Extract `<title>`, `<meta description>`
- Remove script/style/nav/footer tags
- Convert HTML to clean text
- Limit by `maxChars`

### 4.4 Rate Limiting and Cache

SearXNG already implements:
- Rate limiting via Valkey/Redis (optional)
- Result caching (avoids re-fetching the same term)
- Bot filtering

## 5. References

### 5.1 MCP SDK

- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **v1 Documentation:** https://ts.sdk.modelcontextprotocol.io/
- **v2 Documentation:** https://ts.sdk.modelcontextprotocol.io/v2/
- **MCP Spec:** https://modelcontextprotocol.io/specification/latest
- **Base example:** https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples

### 5.2 Exa MCP (inspiration)

- **Repository:** https://github.com/exa-labs/exa-mcp-server
- **Architecture:** `src/mcp-handler.ts` → tool registration → `src/tools/webSearch.ts` → exa-js SDK
- **Package:** `@modelcontextprotocol/sdk` v1.12.1 + `zod` + `exa-js`

### 5.3 SearXNG

- **Docker:** https://docs.searxng.org/admin/installation-docker.html
- **Search API:** https://docs.searxng.org/dev/search_api.html
- **Config:** format=json must be enabled in `search.formats` in settings.yml
- **Parameters:** `q`, `categories`, `language`, `pageno`, `time_range`, `format=json`, `safesearch`
- **Docker image:** `searxng/searxng:latest`
- **Official Docker Compose:** https://github.com/searxng/searxng/blob/master/container/docker-compose.yml

## 6. Roadmap

### Phase 1 — MVP (days 1-2)
- [x] Feasibility research
- [x] Architecture definition
- [ ] SearXNG setup via Docker Compose
- [ ] MCP server with `web_search` tool (stdio)
- [ ] Test with Claude Code / MCP Inspector

### Phase 2 — Web Fetch (days 3-4)
- [ ] Implement `web_fetch` tool
- [ ] Error handling and retry
- [ ] Logging and debug

### Phase 3 — Robustness (days 5-7)
- [ ] OpenCode configuration (`opencode.json`)
- [ ] Documentation
- [ ] Testing with multiple engines (via SearXNG)
- [ ] Category support (news, files, images, etc.)

### Phase 4 — Advanced (post-MVP)
- [ ] HTTP mode (Streamable HTTP) for remote access
- [ ] Smart caching (avoid re-fetching)
- [ ] `web_search_advanced` with advanced filters support
- [ ] Migration to MCP SDK v2

## 7. Risks and Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| SearXNG being blocked by some engines | Medium | Fallback to Yacy engine (P2P) or multiple engines |
| High latency (SearXNG queries N engines) | Medium | Valkey cache, limit active engines, use `search-type` mode |
| MCP SDK v1 being deprecated | High (Jul/2026) | Prepare abstraction to swap SDK without changing tools |
| Docker not available in environment | Low | Fallback: pure JS DuckDuckGo scraping |

## 8. Key Commands

```bash
# Start SearXNG
docker compose up -d

# Check if SearXNG is running
curl http://localhost:4000/search?q=test&format=json

# Start MCP server (development)
npm run dev

# Start MCP server (production)
npm start

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```
