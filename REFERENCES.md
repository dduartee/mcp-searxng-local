# References and Research — mcp-search-local

## MCP SDK (Model Context Protocol)

### Official Documentation
- **Spec:** https://modelcontextprotocol.io/specification/latest
- **TypeScript SDK (v1):** https://ts.sdk.modelcontextprotocol.io/
- **TypeScript SDK (v2 beta):** https://ts.sdk.modelcontextprotocol.io/v2/
- **SDK Repository:** https://github.com/modelcontextprotocol/typescript-sdk
- **MCP Blog (v2 RC):** https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/

### Examples
- **Weather server (tutorial):** https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md
- **End-to-end examples:** https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples

### npm Packages (v2 beta)
- `@modelcontextprotocol/server` — https://www.npmjs.com/package/@modelcontextprotocol/server
- `@modelcontextprotocol/client` — https://www.npmjs.com/package/@modelcontextprotocol/client

## Inspiration: Exa MCP Server

- **Repo:** https://github.com/exa-labs/exa-mcp-server
- **npm Package:** https://www.npmjs.com/package/exa-mcp-server
- **API Documentation:** https://docs.exa.ai/reference/exa-mcp
- **Architecture analyzed:**
  - `src/stdio.ts` — entry point with `McpServer` + `StdioServerTransport`
  - `src/mcp-handler.ts` — `initializeMcpServer()` registers tools, prompts, resources
  - `src/toolRegistry.ts` — `TOOL_REGISTRY` with metadata for each tool (enabled, group, description)
  - `src/tools/webSearch.ts` — `registerWebSearchTool()` with zod schema + handler
  - `src/tools/webFetch.ts` — `registerWebFetchTool()` with zod schema + handler
  - `src/types.ts` — interfaces ExaSearchRequest, ExaSearchResponse, etc.
  - Usage of `readOnlyHint`, `destructiveHint`, `openWorldHint`, `idempotentHint`
  - Rate limiting via Upstash Redis (we won't use this)

## SearXNG

### Documentation
- **Docker Install:** https://docs.searxng.org/admin/installation-docker.html
- **Search API:** https://docs.searxng.org/dev/search_api.html
- **Settings YAML:** https://docs.searxng.org/admin/settings/settings.html
- **Search Settings:** https://docs.searxng.org/admin/settings/settings_search.html
- **Engines config:** https://docs.searxng.org/admin/settings/settings_engines.html
- **Architecture:** https://docs.searxng.org/admin/architecture.html
- **Engine list:** https://docs.searxng.org/dev/engines/engine_overview.html

### Docker
- **Docker Hub:** https://hub.docker.com/r/searxng/searxng
- **GHCR:** https://ghcr.io/searxng/searxng
- **Official Compose template:** https://github.com/searxng/searxng/blob/master/container/docker-compose.yml
- **DotEnv example:** https://github.com/searxng/searxng/blob/master/container/.env.example

### API Parameters
```
GET /search?q=<query>&format=json&categories=<cat>&language=<lang>&pageno=<n>&time_range=<day|month|year>&safesearch=<0|1|2>
```

JSON response:
```json
{
  "query": "...",
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "...",
      "author": "...",
      "publishedDate": "...",
      "engine": "google",
      "category": "general"
    }
  ],
  "answers": [],
  "infoboxes": [],
  "suggestions": [],
  "unresponsive_engines": []
}
```

## Other Alternatives Evaluated

### YaCy (P2P Search)
- **Repo:** https://github.com/yacy/yacy_search_server
- **Pros:** 100% decentralized, no internet needed if local index exists
- **Cons:** Needs seed to start, own index is limited
- **Status:** Discarded as primary, possible future fallback

### Brave Search API
- **Price:** Free 2,000 queries/month
- **API Key:** Yes (but has free tier)
- **Status:** Backup in case SearXNG doesn't work

### DuckDuckGo (direct scraping)
- **URL:** `https://html.duckduckgo.com/html/?q=<query>`
- **Parse:** cheerio on HTML
- **Status:** Emergency fallback (fragile, may break)
- **npm Package:** `@ddug-ddgo/ddgo` (untested)

## Auxiliary Tools

### MCP Inspector (testing)
- `npx @modelcontextprotocol/inspector <command>`
- Used to test tools without needing Claude

### Zod (validation)
- `zod` v3.x (compatible with SDK v1)
- `zod/v4` (for SDK v2)
- https://zod.dev/

### Cheerio (HTML parsing)
- `cheerio` — jQuery-like for Node.js
- https://cheerio.js.org/

## Research Notes

### SearXNG Latency
- First query: ~2-5s (queries N engines)
- Cached queries (Valkey): ~50-200ms
- Mitigation: limit active engines in settings.yml

### JSON Format
- `format=json` must be in the `search.formats` list in `settings.yml`
- SearXNG default: `["html"]` only. Add `json`.

### Ports
- SearXNG default: `8080` (internal) mapped to `4000` (host)
- Valkey: `6379` (internal, not exposed to host)
