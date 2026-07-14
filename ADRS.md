# Architecture Decision Records — mcp-search-local

## ADR-001: SearXNG as search backend

**Context:** We need a web search backend that runs 100% locally, with no API keys, no cost.

**Decision:** Use SearXNG in Docker as metasearch backend.

**Consequences:**
- ✅ Zero dependency on external APIs
- ✅ Aggregation of 150+ engines (Google, DuckDuckGo, Brave, Bing, Wikipedia, arXiv)
- ✅ Native REST JSON API
- ✅ Cache via Valkey (reduces latency)
- ❌ Dependency on Docker
- ❌ Higher latency than direct APIs (but acceptable with cache)
- ❌ Requires internet connection (internal engines query the web)

**Rejected alternatives:**
- DuckDuckGo scraping: fragile, frequent blocking
- Google scraping: violates TOS
- Paid APIs: contradicts the "100% local" requirement

## ADR-002: stdio as primary transport

**Context:** MCP supports stdio, Streamable HTTP, and WebSocket.

**Decision:** Use stdio as primary transport.

**Consequences:**
- ✅ Compatible with all MCP clients (Claude Code, Cursor, VS Code)
- ✅ Zero network setup
- ✅ More secure (no exposed port)
- ❌ Only works locally (which meets the requirement)

## ADR-003: SDK v1 (production) with eye on v2

**Context:** MCP SDK v2 is in beta, stable release in July/2026.

**Decision:** Use `@modelcontextprotocol/sdk` v1.x (stable) now. Prepare migration to `@modelcontextprotocol/server` v2 when stable.

**Consequences:**
- ✅ Stable API, no surprises
- ✅ Guaranteed compatibility with current clients
- ❌ Will need refactoring when v2 is stable

## ADR-004: Zod v3 for validation (following SDK v1)

**Context:** MCP SDK v1 uses Zod v3 internally.

**Decision:** Zod v3 for tool input schemas.

**Consequences:**
- ✅ Compatible with SDK v1
- ✅ Industry standard
- ❌ Migration to Zod v4 may be needed (SDK v2 already supports Standard Schema)

## ADR-005: `web_fetch` with plain cheerio (no Puppeteer)

**Context:** We need to extract content from URLs, but using Puppeteer/Playwright adds complexity and weight.

**Decision:** Use native `fetch` + `cheerio` to parse HTML.

**Consequences:**
- ✅ Lightweight, no heavy dependencies
- ✅ Sufficient for static pages
- ❌ Does not execute JavaScript (SPA pages may not render)
- Mitigation: for SPAs, we can add a "text-only" mode that returns raw HTML

## ADR-006: Two fallback engines for search

**Context:** SearXNG may have blocked or slow engines.

**Decision:** Configure SearXNG with multiple fallback engines. If all fail, the MCP tries `web_fetch` on the DuckDuckGo search URL as a last resort.

**Consequences:**
- ✅ Resilience against individual engine blocking
- ❌ Increases code complexity

## ADR-007: Tool naming in English

**Context:** The MCP standard is English. Claude Code and other clients expect English names.

**Decision:** `web_search` and `web_fetch` (English).

**Consequences:**
- ✅ Compatible with MCP standard
- ✅ Consistent with Exa, Brave, and other search MCPs
