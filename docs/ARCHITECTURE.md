# Internal Architecture

## Request flow

### web_search / web_search_advanced

```
MCP Client (OpenCode / Claude Code)
  │ JSON-RPC via stdio
  ▼
src/index.ts ───────────────────────── entry point
  │ StdioServerTransport
  ▼
src/server.ts ───────────────────────── factory + register tools
  │ McpServer.tool("web_search", ...)
  ▼
src/tools/webSearch.ts ──────────────── validates params (Zod), calls SearXNG
  │ createSearxngClient(config)
  ▼
src/engines/searxng.ts ──────────────── HTTP → SearXNG API
  │ cache (5min TTL) + retry (3x, exp backoff)
  │ if all engines unresponsive → fallback to public instances
  ▼
SearXNG (Docker, port 4000) ────────── metasearch: Google, DDG, Brave...
  │ or → Public SearXNG instances (rate limit fallback)
  │ JSON response { results, answers, infoboxes, suggestions }
  ▼
src/utils/formatter.ts ──────────────── formatted markdown for the LLM
  │ formatFullSearchResponse()
  ▼
MCP Response ────────────────────────── { content: [{ type: "text", text: "..." }] }
```

### web_fetch

```
MCP Client
  │
  ▼
src/tools/webFetch.ts ──────────────── validates params, calls fetch
  │ extractFromUrl(url, signal)
  ▼
src/engines/fetchHtml.ts ───────────── GitHub detection
  │
  ├─ GitHub URL? ─→ src/engines/github.ts
  │                  ├─ /blob, /raw → raw.githubusercontent.com
  │                  └─ repo root   → api.github.com (30min cache)
  │
  └─ Otherwise ──→ Generic fetch + cheerio (HTML → clean text)
                    │ withRetry(2x), 15s timeout
                    ▼
                  ExtractedContent { title, description, text }
```

## Directory structure

```
src/
├── index.ts                # Entry point (stdio)
├── http.ts                 # Alternative entry point (Streamable HTTP)
├── server.ts               # McpServer factory + tool registration
├── toolRegistry.ts         # Tool metadata
├── types.ts                # Shared interfaces
├── tools/
│   ├── webSearch.ts        # web_search + web_search_advanced (unified handler)
│   └── webFetch.ts         # web_fetch (text + highlights)
├── engines/
│   ├── searxng.ts          # SearXNG HTTP client (cache + retry + auto-fallback)
│   ├── fetchHtml.ts        # Fetch + cheerio (HTML → clean text)
│   └── github.ts           # Optimized GitHub fetch (raw content, API metadata)
└── utils/
    ├── formatter.ts        # Markdown formatting + extractHighlights
    ├── errors.ts           # Error classes + MCP formatter
    ├── logger.ts           # Conditional logging (debug on/off)
    ├── retry.ts            # Retry with exponential backoff + jitter
    └── cache.ts            # In-memory LRU cache with TTL
```

## Design decisions

### Transport: stdio as primary

stdio is the most compatible transport with MCP clients. It exposes no port, requires no network configuration, and works with any client (OpenCode, Claude Code, Cursor, VS Code).

`src/http.ts` exists as an alternative for remote access, using `StreamableHTTPServerTransport`.

### Cache

The MCP server maintains an in-memory LRU cache (100 entries, 5 min TTL) to avoid redundant calls to SearXNG when the agent repeats the same query. SearXNG also uses Valkey internally for engine caching.

### Retry with exponential backoff

Connections to SearXNG and page fetches use `withRetry()` with:
- 3 attempts (SearXNG), 2 attempts (web_fetch)
- Delay: 500ms → 1s → 2s (SearXNG), 1s → 2s (web_fetch)
- Random jitter (±200ms) to avoid thundering herd

### Zod for validation

We use Zod v3 (compatible with MCP SDK v1). Schemas are described with `.describe()` — the LLM reads these descriptions to understand when and how to use each parameter.

### GitHub URL optimization

`web_fetch` has a special path for GitHub URLs in `src/engines/github.ts`. Before attempting a generic HTML fetch, `extractFromUrl` checks whether the URL is a GitHub URL and routes it to an optimized handler:

- **Blob/raw URLs** (`/blob/...`, `/raw/...`) → `raw.githubusercontent.com` — returns clean file content directly, bypassing cheerio HTML parsing entirely. This is much faster and produces ~99% less noise than scraping the rendered GitHub page.
- **Repo root URLs** (`github.com/user/repo`) → GitHub REST API (`api.github.com/repos/:owner/:repo`) — returns enriched response: structured metadata (stars, forks, language, license, topics, open issues, default branch) + file tree + README, fetched via 3 parallel API calls.
- **Other GitHub paths** (`/issues`, `/pulls`, etc.) → falls back to generic HTML fetch (no degradation in behavior).

Caching uses a separate `MemoryCache` instance with 30-minute TTL, distinct from the 5-minute SearXNG cache, because GitHub metadata (stars, forks) changes less frequently than search results.

This optimization is transparent to the caller — `web_fetch` handles GitHub URLs the same way as any other URL, just with better results and lower latency.

### Rate limit handling & auto-fallback

Search engines frequently block server IPs with CAPTCHAs or rate limits. The server handles this transparently:

1. Queries local SearXNG with configured engines (google, duckduckgo, brave, wikipedia, arxiv)
2. If **all engines return 0 results** and are marked `unresponsive`, triggers fallback
3. Iterates through `SEARXNG_FALLBACK_URLS` (public SearXNG instances) in order
4. Returns first successful response (with results > 0)
5. Always includes `## Unresponsive Engines` section in response for transparency

This means:
- **No manual intervention** — searches keep working even when engines are blocked
- **Zero config** — pre-configured fallback instances in `opencode.json`
- **Transparent** — response always shows what failed and why
- **Graceful degradation** — if all fallbacks fail, returns empty results with diagnostics

### Markdown formatting

All responses are formatted as markdown. The LLM consumes markdown natively and extracts structured information (URLs, titles, snippets) without needing JSON parsing.

## Tests

48 unit tests with vitest covering:
- `formatter.test.ts` — highlights, full response, domain filtering (12 tests)
- `errors.test.ts` — error classes, MCP formatter (8 tests)
- `retry.test.ts` — retry behavior and fallback (4 tests)
- `logger.test.ts` — debug on/off (4 tests)
- `github.test.ts` — URL parsing, raw content fetch, repo metadata fetch, fallback logic (20 tests)
