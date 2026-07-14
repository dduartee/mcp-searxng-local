# Comparativo: mcp-searxng-local vs Alternativas

## vs Exa MCP (referência de mercado)

| Dimensão | Exa MCP | mcp-searxng-local |
|----------|---------|-----------------|
| **Custo** | Pago (tier grátis limitado) | Zero |
| **API key** | Obrigatória | Nenhuma |
| **Privacidade** | Nuvem Exa (EUA) | 100% local (Docker) |
| **Engines** | Index próprio proprietário | 150+ via SearXNG (Google, DDG, Brave, Wikipedia, arXiv, Bing...) |
| **Rate limits** | Sim (tier-dependente) | Não (SearXNG é local) |
| **Cache** | Server-side apenas | LRU local (100 entradas, 5min TTL) |
| **Retry** | Não documentado | Exponential backoff + jitter |
| **Tools** | `web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`, Agent | `web_search`, `web_search_advanced`, `web_fetch` |
| **Highlights** | IA proprietária (embeddings) | Keyword matching (client-side) |
| **Structured output** | `outputSchema` com LLM | Não disponível |
| **Deep search** | Agent multi-step (até 40s) | Não disponível |
| **Filtro de domínio** | `includeDomains` / `excludeDomains` | `includeDomains` / `excludeDomains` |
| **Filtro de data** | `startPublishedDate` / `endPublishedDate` (server-side) | `startPublishedDate` / `endPublishedDate` (client-side) |
| **Safe search** | `moderation: true` | `safesearch: 0/1/2` |
| **Engine selection** | Não (usa index próprio) | `engines` (google, wikipedia, arxiv, etc.) |
| **Diagnóstico de engines** | Não aplicável | `unresponsive_engines` com motivo |
| **Streamable HTTP** | Nativo (produção) | Suportado (`src/http.ts`) |
| **Open source** | Sim (GitHub) | Sim |

### Quando usar cada um

**Use Exa MCP se:**
- Precisa de structured output (`outputSchema`)
- Precisa de deep search multi-step (Agent)
- Precisa de highlights com IA (não keyword matching)
- Aceita custo e dependência de API externa

**Use mcp-searxng-local se:**
- Quer zero custo e zero API keys
- Precisa de privacidade total (dados não saem da máquina)
- Quer controle sobre engines de busca
- Não depende de features que exigem LLM (structured output, deep reasoning)

## vs Brave Search MCP

| Dimensão | Brave MCP | mcp-searxng-local |
|----------|-----------|-----------------|
| Custo | Grátis 2k queries/mês | Ilimitado |
| API key | Obrigatória | Nenhuma |
| Engines | Brave Search apenas | Google + DDG + Brave + Wikipedia + arXiv + Bing |

## vs SearXNG direto (sem MCP server)

SearXNG expõe API REST em `localhost:4000/search?format=json`. O mcp-searxng-local adiciona:

- **Protocolo MCP** (tools/list, tools/call) que o LLM entende nativamente
- **Validação Zod** dos parâmetros com descrições para o LLM
- **Formatação markdown** dos resultados (SearXNG retorna JSON bruto)
- **Filtros client-side** (domínios, datas exatas)
- **Highlights** (extração de trechos relevantes)
- **Cache + retry**
- **Diagnóstico de engines**

## vs Web Search via navegador (Chrome DevTools MCP)

Alguns clientes MCP fazem busca web abrindo um navegador e usando Google diretamente. Comparação:

| Dimensão | Chrome DevTools MCP | mcp-searxng-local |
|----------|-------------------|-----------------|
| Latência | ~3-5s (renderiza página) | ~1-3s (API JSON) |
| Formato | HTML bruto | Markdown limpo |
| Recursos | Browser completo (RAM pesada) | Apenas Node.js + Docker |
| Escala | 1 busca por vez | Multi-thread (axios) |
| Parsing | Precisa extrair texto do DOM | JSON estruturado |
| Bloqueio | Google pode bloquear | SearXNG usa múltiplos engines |
