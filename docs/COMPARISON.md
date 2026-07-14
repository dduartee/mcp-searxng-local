# Comparison: mcp-searxng-local vs Alternatives

## vs Exa MCP (market reference)

| Dimension | Exa MCP | mcp-searxng-local |
|----------|---------|-----------------|
| **Cost** | Paid (limited free tier) | Zero |
| **API key** | Required | None |
| **Privacy** | Exa Cloud (US) | 100% local (Docker) |
| **Engines** | Proprietary own index | 150+ via SearXNG (Google, DDG, Brave, Wikipedia, arXiv, Bing...) |
| **Rate limits** | Yes (tier-dependent) | No (SearXNG is local) |
| **Cache** | Server-side only | Local LRU (100 entries, 5min TTL) |
| **Retry** | Not documented | Exponential backoff + jitter |
| **Tools** | `web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`, Agent | `web_search`, `web_search_advanced`, `web_fetch` |
| **Highlights** | Proprietary AI (embeddings) | Keyword matching (client-side) |
| **Structured output** | `outputSchema` with LLM | Not available |
| **Deep search** | Multi-step Agent (up to 40s) | Not available |
| **Domain filter** | `includeDomains` / `excludeDomains` | `includeDomains` / `excludeDomains` |
| **Date filter** | `startPublishedDate` / `endPublishedDate` (server-side) | `startPublishedDate` / `endPublishedDate` (client-side) |
| **Safe search** | `moderation: true` | `safesearch: 0/1/2` |
| **Engine selection** | No (uses own index) | `engines` (google, wikipedia, arxiv, etc.) |
| **Engine diagnostics** | N/A | `unresponsive_engines` with reason |
| **Streamable HTTP** | Native (production) | Supported (`src/http.ts`) |
| **Open source** | Yes (GitHub) | Yes |

### When to use each

**Use Exa MCP if:**
- You need structured output (`outputSchema`)
- You need multi-step deep search (Agent)
- You need AI-powered highlights (not keyword matching)
- You accept the cost and external API dependency

**Use mcp-searxng-local if:**
- You want zero cost and zero API keys
- You need complete privacy (data never leaves your machine)
- You want control over search engines
- You don't depend on features that require LLM (structured output, deep reasoning)

## vs Brave Search MCP

| Dimension | Brave MCP | mcp-searxng-local |
|----------|-----------|-----------------|
| Cost | Free 2k queries/month | Unlimited |
| API key | Required | None |
| Engines | Brave Search only | Google + DDG + Brave + Wikipedia + arXiv + Bing |

## vs Raw SearXNG (without MCP server)

SearXNG exposes a REST API at `localhost:4000/search?format=json`. mcp-searxng-local adds:

- **MCP protocol** (tools/list, tools/call) that the LLM understands natively
- **Zod validation** of parameters with descriptions for the LLM
- **Markdown formatting** of results (SearXNG returns raw JSON)
- **Client-side filters** (domains, exact dates)
- **Highlights** (extraction of relevant excerpts)
- **Cache + retry**
- **Engine diagnostics**

## vs Web Search via browser (Chrome DevTools MCP)

Some MCP clients perform web search by opening a browser and using Google directly. Comparison:

| Dimension | Chrome DevTools MCP | mcp-searxng-local |
|----------|-------------------|-----------------|
| Latency | ~3-5s (renders page) | ~1-3s (JSON API) |
| Format | Raw HTML | Clean markdown |
| Resources | Full browser (heavy RAM) | Only Node.js + Docker |
| Scale | 1 search at a time | Multi-threaded (axios) |
| Parsing | Needs to extract text from DOM | Structured JSON |
| Blocking | Google may block | SearXNG uses multiple engines |
