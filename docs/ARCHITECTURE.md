# Arquitetura Interna

## Fluxo de uma requisição

```
Cliente MCP (OpenCode / Claude Code)
  │ JSON-RPC via stdio
  ▼
src/index.ts ───────────────────────── entry point
  │ StdioServerTransport
  ▼
src/server.ts ───────────────────────── factory + register tools
  │ McpServer.tool("web_search", ...)
  ▼
src/tools/webSearch.ts ──────────────── valida params (Zod), chama SearXNG
  │ createSearxngClient(config)
  ▼
src/engines/searxng.ts ──────────────── HTTP → SearXNG API
  │ cache (5min TTL) + retry (3x, exp backoff)
  ▼
SearXNG (Docker, porta 4000) ────────── metasearch: Google, DDG, Brave...
  │ JSON response { results, answers, infoboxes, suggestions }
  ▼
src/utils/formatter.ts ──────────────── markdown formatado para o LLM
  │ formatFullSearchResponse()
  ▼
Resposta MCP ────────────────────────── { content: [{ type: "text", text: "..." }] }
```

## Estrutura de diretórios

```
src/
├── index.ts                # Entry point (stdio)
├── http.ts                 # Entry point alternativo (Streamable HTTP)
├── server.ts               # Factory McpServer + registro de tools
├── toolRegistry.ts         # Metadados das ferramentas
├── types.ts                # Interfaces compartilhadas
├── tools/
│   ├── webSearch.ts        # web_search + web_search_advanced (handler unificado)
│   └── webFetch.ts         # web_fetch (text + highlights)
├── engines/
│   ├── searxng.ts          # Cliente HTTP SearXNG (cache + retry)
│   └── fetchHtml.ts        # Fetch + cheerio (HTML → texto limpo)
└── utils/
    ├── formatter.ts        # Formatação markdown + extractHighlights
    ├── errors.ts           # Classes de erro + formatador MCP
    ├── logger.ts           # Logging condicional (debug on/off)
    ├── retry.ts            # Retry com exponential backoff + jitter
    └── cache.ts            # Cache LRU em memória com TTL
```

## Decisões de design

### Transporte: stdio como primário

stdio é o transporte mais compatível com clientes MCP. Não expõe porta, não requer configuração de rede, e funciona com qualquer cliente (OpenCode, Claude Code, Cursor, VS Code).

`src/http.ts` existe como alternativa para acesso remoto, usando `StreamableHTTPServerTransport`.

### Cache em duas camadas

1. **SearXNG (Valkey):** cache server-side para consultas repetidas (~50ms vs 2-5s)
2. **Memória (LRU + TTL):** cache client-side no MCP server, 100 entradas, 5 min TTL

Isso evita chamadas redundantes quando o agente refaz a mesma query.

### Retry com exponential backoff

Conexões ao SearXNG e fetch de páginas usam `withRetry()` com:
- 3 tentativas (SearXNG), 2 tentativas (web_fetch)
- Delay: 500ms → 1s → 2s (SearXNG), 1s → 2s (web_fetch)
- Jitter aleatório (±200ms) para evitar thundering herd

### Zod para validação

Usamos Zod v3 (compatível com MCP SDK v1). Os schemas são descritos com `.describe()` — o LLM lê essas descrições para entender quando e como usar cada parâmetro.

### Formatação markdown

Toda resposta é formatada como markdown. O LLM consome markdown nativamente e extrai informações estruturadas (URLs, títulos, snippets) sem precisar de parsing JSON.

## Testes

56 testes unitários com vitest cobrindo:
- `formatter.test.ts` — highlights, full response, domain filtering
- `errors.test.ts` — classes de erro, formatador MCP
- `retry.test.ts` — comportamento de retry e fallback
- `logger.test.ts` — debug on/off
- `cache.test.ts` — LRU eviction, TTL expiry
