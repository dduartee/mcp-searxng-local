# AGENTS.md

## Project Overview

MCP server for local web search via SearXNG — zero API keys, zero cost, 100% local. Exposes 3 tools: `web_search`, `web_search_advanced`, `web_fetch`.

## Tech Stack

- **Runtime:** Node.js >= 20
- **Language:** TypeScript (strict, ESM)
- **MCP SDK:** `@modelcontextprotocol/sdk` v1
- **Validation:** Zod v3
- **HTTP:** axios (SearXNG API), native fetch (web_fetch)
- **HTML parsing:** cheerio
- **Tests:** vitest (28 tests)
- **Backend:** SearXNG (Docker) + Valkey (cache)

## Build & Test

```bash
npm run build        # tsc → dist/
npm run typecheck    # tsc --noEmit
npx vitest run       # 28 tests
npm run dev          # tsx watch (development)
npm start            # node dist/index.js (production)
```

**Always run `npm run build && npx vitest run` before committing.**

## Project Structure

```
src/
├── index.ts              # Entry point (stdio transport)
├── http.ts               # Entry point (Streamable HTTP transport)
├── server.ts             # McpServer factory + tool registration
├── toolRegistry.ts       # Tool metadata (id, name, description)
├── types.ts              # Shared interfaces (SearxngResponse, WebSearchParams, etc.)
├── tools/
│   ├── webSearch.ts      # web_search + web_search_advanced (unified handler)
│   └── webFetch.ts       # web_fetch (text + highlights modes)
├── engines/
│   ├── searxng.ts        # SearXNG HTTP client (cache + retry)
│   └── fetchHtml.ts      # HTML fetch + cheerio extraction
├── utils/
│   ├── formatter.ts      # Markdown formatting + highlight extraction
│   ├── errors.ts         # Error classes + MCP error response formatter
│   ├── logger.ts         # Conditional logging (debug on/off)
│   ├── retry.ts          # Exponential backoff + jitter
│   └── cache.ts          # In-memory LRU cache with TTL
└── __tests__/            # vitest unit tests (4 files, 28 tests)
```

## Key Architecture Decisions

- **stdio** is primary transport (compatible with all MCP clients). HTTP via `src/http.ts` for remote access.
- **Unified handler:** `web_search` and `web_search_advanced` share the same `registerSearchTool()` function in `webSearch.ts`. `_advanced` is a hint to the LLM to use filters more carefully.
- **All user-facing strings in English.** Tool descriptions, error messages, Zod `.describe()`, log messages — everything the user/LLM sees is EN.
- **Identifiers in English.** Function names, variable names, types, interfaces.
- **Cache:** LRU in-memory (100 entries, 5min TTL). SearXNG also caches via Valkey.
- **Retry:** `withRetry()` with exponential backoff + jitter. 3 retries for SearXNG, 2 for web_fetch.
- **Rate limit handling:** Auto-fallback to public SearXNG instances when all local engines are unresponsive. Configured via `SEARXNG_FALLBACK_URLS` env var.

## Conventions

- **Error handling:** All errors go through `formatErrorResponse()` in `utils/errors.ts` which returns MCP-expected `{ content, isError: true }`.
- **Tool registration:** Each tool uses `server.tool(name, description, schema, hints, handler)` pattern.
- **Zod schemas:** All tool parameters use Zod with `.describe()` for LLM-readable descriptions.
- **Tests:** One test file per utility/tool module. Test descriptions in English.
- **Config:** `opencode.json` at project root (relative path), `~/.config/opencode/opencode.json` (absolute path).
- **Docker:** `docker-compose.yml` at root, SearXNG config in `searxng/settings.yml`.

## Important Notes

- `dist/` is gitignored — must run `npm run build` before using.
- SearXNG must be running (`docker compose up -d`) for tools to work. Health check: `curl -s "http://localhost:4000/search?q=test&format=json"`.
- The `settings.yml` uses `use_default_settings: true` — only overridden settings need to be specified.
- Engines may be blocked/suspended depending on server IP (especially DuckDuckGo, Brave). Response includes `unresponsive_engines` with reasons.
- **Auto-fallback:** When all engines are unresponsive, the server automatically retries against public SearXNG instances (`SEARXNG_FALLBACK_URLS`). No manual intervention needed.
- Highlights mode (`web_fetch`) uses keyword matching — ~98% token reduction vs full page.
- Date filtering (`startPublishedDate`/`endPublishedDate`) is client-side. Undated results are excluded when date filter is active.

## Files That Changed Recently

See git log for context. Key files:
- `src/tools/webSearch.ts` — unified handler for both search tools
- `src/utils/formatter.ts` — all output formatting lives here
- `src/utils/errors.ts` — centralized error handling
- `searxng/settings.yml` — SearXNG configuration (recently fixed `privacy:` key)
