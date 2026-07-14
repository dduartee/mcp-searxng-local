# Referências e Pesquisas — mcp-search-local

## MCP SDK (Model Context Protocol)

### Documentação Oficial
- **Spec:** https://modelcontextprotocol.io/specification/latest
- **SDK Typescript (v1):** https://ts.sdk.modelcontextprotocol.io/
- **SDK Typescript (v2 beta):** https://ts.sdk.modelcontextprotocol.io/v2/
- **Repositório SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **MCP Blog (v2 RC):** https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/

### Exemplos
- **Weather server (tutorial):** https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md
- **Exemplos end-to-end:** https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples

### Pacotes npm (v2 beta)
- `@modelcontextprotocol/server` — https://www.npmjs.com/package/@modelcontextprotocol/server
- `@modelcontextprotocol/client` — https://www.npmjs.com/package/@modelcontextprotocol/client

## Insipiração: Exa MCP Server

- **Repo:** https://github.com/exa-labs/exa-mcp-server
- **Package npm:** https://www.npmjs.com/package/exa-mcp-server
- **Documentação API:** https://docs.exa.ai/reference/exa-mcp
- **Arquitetura analisada:**
  - `src/stdio.ts` — entry point com `McpServer` + `StdioServerTransport`
  - `src/mcp-handler.ts` — `initializeMcpServer()` registra tools, prompts, resources
  - `src/toolRegistry.ts` — `TOOL_REGISTRY` com metadata de cada tool (enabled, group, description)
  - `src/tools/webSearch.ts` — `registerWebSearchTool()` com zod schema + handler
  - `src/tools/webFetch.ts` — `registerWebFetchTool()` com zod schema + handler
  - `src/types.ts` — interfaces ExaSearchRequest, ExaSearchResponse, etc.
  - Uso de `readOnlyHint`, `destructiveHint`, `openWorldHint`, `idempotentHint`
  - Rate limiting via Upstash Redis (não usaremos)

## SearXNG

### Documentação
- **Docker Install:** https://docs.searxng.org/admin/installation-docker.html
- **Search API:** https://docs.searxng.org/dev/search_api.html
- **Settings YAML:** https://docs.searxng.org/admin/settings/settings.html
- **Search Settings:** https://docs.searxng.org/admin/settings/settings_search.html
- **Engines config:** https://docs.searxng.org/admin/settings/settings_engines.html
- **Architecture:** https://docs.searxng.org/admin/architecture.html
- **Lista de engines:** https://docs.searxng.org/dev/engines/engine_overview.html

### Docker
- **Docker Hub:** https://hub.docker.com/r/searxng/searxng
- **GHCR:** https://ghcr.io/searxng/searxng
- **Compose template oficial:** https://github.com/searxng/searxng/blob/master/container/docker-compose.yml
- **DotEnv exemplo:** https://github.com/searxng/searxng/blob/master/container/.env.example

### API Parameters
```
GET /search?q=<query>&format=json&categories=<cat>&language=<lang>&pageno=<n>&time_range=<day|month|year>&safesearch=<0|1|2>
```

Retorno JSON:
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

## Outras Alternativas Pesquisadas

### YaCy (P2P Search)
- **Repo:** https://github.com/yacy/yacy_search_server
- **Prós:** 100% descentralizado, sem internet necessária se já tiver index local
- **Contras:** Precisa de seed para começar, index próprio limitado
- **Status:** Descartado como primário, possível fallback futuro

### Brave Search API
- **Preço:** Grátis 2.000 queries/mês
- **API Key:** Sim (mas tem tier grátis)
- **Status:** Backup caso SearXNG não funcione

### DuckDuckGo (scrape direto)
- **URL:** `https://html.duckduckgo.com/html/?q=<query>`
- **Parse:** cheerio no HTML
- **Status:** Fallback de emergência (frágil, pode quebrar)
- **Pacote npm:** `@ddug-ddgo/ddgo` (não testado)

## Ferramentas Auxiliares

### MCP Inspector (testes)
- `npx @modelcontextprotocol/inspector <comando>`
- Usado para testar tools sem precisar do Claude

### Zod (validação)
- `zod` v3.x (compatível SDK v1)
- `zod/v4` (para SDK v2)
- https://zod.dev/

### Cheerio (HTML parsing)
- `cheerio` — jQuery-like para Node.js
- https://cheerio.js.org/

## Notas de Pesquisa

### Latência SearXNG
- Primeira consulta: ~2-5s (consulta N engines)
- Consultas cacheadas (Valkey): ~50-200ms
- Mitigação: limitar engines ativos no settings.yml

### Formato JSON
- `format=json` precisa estar na lista `search.formats` em `settings.yml`
- Padrão SearXNG: `["html"]` apenas. Adicionar `json`.

### Portas
- SearXNG padrão: `8080` (interna) mapeada para `4000` (host)
- Valkey: `6379` (interna, sem expor para host)
