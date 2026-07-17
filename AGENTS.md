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
- **Tests:** vitest (48 tests)
- **Backend:** SearXNG (Docker) + Valkey (cache)
- **Env loading:** dotenv (`.env` files auto-loaded in entry points)

## Build & Test

```bash
npm run build        # tsc → dist/
npm run typecheck    # tsc --noEmit
npx vitest run       # 48 tests
npm run dev          # tsx watch (development)
npm start            # node dist/index.js (production)
```

**Always run `npm run build && npx vitest run` before committing.**

## Project Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full directory tree with descriptions.

```
src/
├── index.ts              # Entry point (stdio)
├── http.ts               # Entry point (Streamable HTTP)
├── server.ts             # McpServer factory + tool registration
├── types.ts              # Shared interfaces
├── tools/                # webSearch.ts, webFetch.ts
├── engines/              # searxng.ts, fetchHtml.ts, github.ts
├── utils/                # formatter.ts, errors.ts, retry.ts, cache.ts, logger.ts
└── __tests__/            # vitest (48 tests)
```

## Key Architecture Decisions

- **stdio** is primary transport (compatible with all MCP clients). HTTP via `src/http.ts` for remote access.
- **Unified handler:** `web_search` and `web_search_advanced` share the same `registerSearchTool()` function in `webSearch.ts`. `_advanced` is a hint to the LLM to use filters more carefully.
- **All user-facing strings in English.** Tool descriptions, error messages, Zod `.describe()`, log messages — everything the user/LLM sees is EN.
- **Identifiers in English.** Function names, variable names, types, interfaces.
- **Cache:** LRU in-memory (100 entries, 5min TTL). SearXNG also caches via Valkey.
- **Retry:** `withRetry()` with exponential backoff + jitter. 3 retries for SearXNG, 2 for web_fetch.
- **Rate limit handling:** Auto-fallback to public SearXNG instances when all local engines are unresponsive. Configured via `SEARXNG_FALLBACK_URLS` env var.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design decisions.

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
- **GitHub optimization:** `web_fetch` detects GitHub URLs and routes to optimized endpoints. See [docs/GITHUB_FETCH.md](docs/GITHUB_FETCH.md).
- **GITHUB_TOKEN:** Optional. When set, GitHub API requests are authenticated (5000 req/h vs 60 unauthenticated). Falls back to generic HTML on 403.

## Files That Changed Recently

See git log for context. Key files:
- `src/tools/webSearch.ts` — unified handler for both search tools
- `src/utils/formatter.ts` — all output formatting lives here
- `src/utils/errors.ts` — centralized error handling
- `searxng/settings.yml` — SearXNG configuration (recently fixed `privacy:` key)
- `src/engines/github.ts` — GitHub URL optimization (raw content + API metadata)
- `src/engines/fetchHtml.ts` — GitHub pre-check in `extractFromUrl`
