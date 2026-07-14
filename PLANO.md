# Plano: MCP de Busca Web Local — `mcp-search-local`

## 1. Objetivo

Criar um servidor MCP (Model Context Protocol) que permita ao Claude Code (ou qualquer cliente MCP) realizar **buscas na web** e **extrair conteúdo de URLs**, rodando **100% local** sem dependência de APIs externas pagas.

## 2. Stack Tecnológica

```
┌─────────────────────────────────────────────────────┐
│                   Cliente MCP                        │
│              (Claude Code, Cursor, etc.)              │
└─────────────────┬───────────────────────────────────┘
                  │ stdio ou Streamable HTTP
┌─────────────────▼───────────────────────────────────┐
│               mcp-search-local (TS/Node)             │
│   ┌──────────────────────────────────────────────┐   │
│   │  @modelcontextprotocol/server (MCP SDK)      │   │
│   │  Zod v4 (validação de input)                 │   │
│   │  Axios (HTTP requests)                       │   │
│   │  cheerio (HTML parsing para web_fetch)       │   │
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

### 2.1 Componentes

| Componente | Função | Tech |
|---|---|---|
| **MCP Server** | Expor ferramentas `web_search` + `web_fetch` | TypeScript, `@modelcontextprotocol/server` |
| **Busca** | Metasearch agregando múltiplos motores | **SearXNG** (`searxng/searxng:latest`) em Docker |
| **Fetch** | Extrair HTML de URLs e converter para markdown | `fetch` + `cheerio` (Node.js) |
| **Transporte** | Comunicação com o cliente MCP | **stdio** (primário) + **Streamable HTTP** (opcional) |

### 2.2 Por que SearXNG?

| Alternativa | API Key? | Local? | Qualidade | Manutenção |
|---|---|---|---|---|
| **SearXNG** (escolhido) | ❌ | ✅ Docker | Boa (agrega 10+ motores) | Ativo, OSS |
| DuckDuckGo scrape | ❌ | ✅ (puro JS) | Baixa (fragil, bloqueio) | Frágil |
| Google scraping | ❌ | ✅ (puro JS) | Excelente (ilegal TOS) | Ilegal |
| SerpAPI | ✅ grátis 100/mês | ❌ | Boa | API externa |
| Exa | ✅ paga | ❌ | Excelente | API externa |
| Bing API | ✅ grátis 1k/mês | ❌ | Boa | API externa |
| Brave Search | ✅ grátis 2k/mês | ❌ | Boa | API externa |

**SearXNG ganha porque:**
- Zero API keys
- Zero custo operacional
- Agrega Google + DuckDuckGo + Brave + Bing + Wikipedia + arXiv + GitHub + 150+ engines
- Docker compose pronto (`searxng/searxng`)
- API JSON nativa em `localhost:4000/search?format=json`
- Community ativa, upstream estável
- Cache interno (Valkey/Redis) reduz latência

## 3. Arquitetura do MCP Server

### 3.1 Estrutura de diretórios

```
mcp-search-local/
├── src/
│   ├── index.ts              # Entry point (stdio ou HTTP)
│   ├── server.ts             # Configuração McpServer + registro de tools
│   ├── toolRegistry.ts       # Metadados das ferramentas
│   ├── tools/
│   │   ├── webSearch.ts      # web_search tool
│   │   └── webFetch.ts       # web_fetch tool
│   ├── engines/
│   │   ├── searxng.ts        # Cliente SearXNG API
│   │   └── fetchHtml.ts      # Fetch + parse HTML to markdown
│   ├── types.ts              # Tipos compartilhados
│   └── utils/
│       ├── logger.ts         # Logging
│       ├── formatter.ts      # Formatação de resultados
│       └── errors.ts         # Error handling
├── docker-compose.yml        # SearXNG + Valkey
├── searxng/
│   └── settings.yml          # Config do SearXNG (format=json habilitado)
├── package.json
├── tsconfig.json
├── opencode.json             # Config para OpenCode
└── README.md
```

### 3.2 Fluxo de requisição

```
Cliente MCP
  │
  │  tools/call "web_search" { query: "noticias IA", count: 5 }
  ▼
src/tools/webSearch.ts
  │
  │  GET http://localhost:4000/search?q=noticias+IA&format=json&pageno=1
  ▼
SearXNG API (Docker na porta 4000)
  │
  │  Agrega resultados de Google, DuckDuckGo, Brave, etc.
  ▼
Resposta JSON { results: [...], answers: [...], infoboxes: [...] }
  │
  │  Filtra, ordena, formata
  ▼
Resposta MCP { content: [{ type: "text", text: "..." }] }
```

### 3.3 Ferramentas expostas

| Tool | Descrição | Input Schema |
|---|---|---|
| `web_search` | Busca na web via SearXNG | `{ query: string, count?: number (1-50), pageno?: number, categories?: string[], time_range?: "day"\|"month"\|"year", language?: string }` |
| `web_fetch` | Extrai conteúdo de uma URL | `{ url: string, maxChars?: number }` |

## 4. Decisões de Implementação

### 4.1 Transporte: stdio vs HTTP

| Transporte | Vantagens | Desvantagens |
|---|---|---|
| **stdio** (escolhido) | Simples, suportado por todos clientes MCP | Sem remote access |
| Streamable HTTP | Acesso remoto, integração web | Mais complexo, menos suporte em clientes |

**Decisão:** stdio como primário (compatibilidade máxima). Preparar código para suportar HTTP v2 futuramente.

### 4.2 MCP SDK: v1 vs v2

O Exa MCP usa `@modelcontextprotocol/sdk` v1.x (estável). O SDK v2 está em beta com `@modelcontextprotocol/server`.

**Decisão:** Usar **SDK v1** (`@modelcontextprotocol/sdk`) para produção. Mas preparar migração para v2 (que será lançado em julho/2026).

### 4.3 Parsing de HTML no Web Fetch

Para `web_fetch`, usaremos `fetch` nativo do Node + `cheerio` para:
- Extrair `<title>`, `<meta description>`
- Remover tags de script/style/nav/footer
- Converter HTML para texto limpo
- Limitar por `maxChars`

### 4.4 Rate Limiting e Cache

SearXNG já implementa:
- Rate limiting via Valkey/Redis (opcional)
- Cache de resultados (evita re-buscar mesmo termo)
- Filtro de bots

## 5. Referências

### 5.1 MCP SDK

- **SDK Typescript:** https://github.com/modelcontextprotocol/typescript-sdk
- **Documentação v1:** https://ts.sdk.modelcontextprotocol.io/
- **Documentação v2:** https://ts.sdk.modelcontextprotocol.io/v2/
- **Spec MCP:** https://modelcontextprotocol.io/specification/latest
- **Exemplo base:** https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples

### 5.2 Exa MCP (inspiração)

- **Repositório:** https://github.com/exa-labs/exa-mcp-server
- **Arquitetura:** `src/mcp-handler.ts` → registro de tools → `src/tools/webSearch.ts` → exa-js SDK
- **Package:** `@modelcontextprotocol/sdk` v1.12.1 + `zod` + `exa-js`

### 5.3 SearXNG

- **Docker:** https://docs.searxng.org/admin/installation-docker.html
- **Search API:** https://docs.searxng.org/dev/search_api.html
- **Config:** format=json precisa estar ativado em `search.formats` no settings.yml
- **Parâmetros:** `q`, `categories`, `language`, `pageno`, `time_range`, `format=json`, `safesearch`
- **Imagem Docker:** `searxng/searxng:latest`
- **Docker Compose oficial:** https://github.com/searxng/searxng/blob/master/container/docker-compose.yml

## 6. Roadmap

### Fase 1 — MVP (dias 1-2)
- [x] Pesquisa de viabilidade
- [x] Definição de arquitetura
- [ ] Setup SearXNG via Docker Compose
- [ ] MCP server com `web_search` tool (stdio)
- [ ] Testar com Claude Code / MCP Inspector

### Fase 2 — Web Fetch (dias 3-4)
- [ ] Implementar `web_fetch` tool
- [ ] Tratamento de erros e retry
- [ ] Logging e debug

### Fase 3 — Robustez (dias 5-7)
- [ ] Configuração OpenCode (`opencode.json`)
- [ ] Documentação
- [ ] Testes com múltiplos motores (via SearXNG)
- [ ] Suporte a categorias (news, files, images, etc.)

### Fase 4 — Avançado (pós-MVP)
- [ ] Modo HTTP (Streamable HTTP) para acesso remoto
- [ ] Cache inteligente (evitar re-buscar)
- [ ] Suporte a `web_search_advanced` com filtros avançados
- [ ] Migração para MCP SDK v2

## 7. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| SearXNG ser bloqueado por alguns motores | Média | Fallback para engine Yacy (P2P) ou múltiplos motores |
| Latência alta (SearXNG consulta N motores) | Média | Cache Valkey, limitar engines ativos, usar modo `search-type` |
| MCP SDK v1 ser deprecated | Alta (jul/2026) | Preparar abstração para trocar de SDK sem mudar tools |
| Docker não disponível no ambiente | Baixa | Fallback: scraping DuckDuckGo puro JS |

## 8. Comandos Principais

```bash
# Iniciar SearXNG
docker compose up -d

# Verificar se SearXNG está rodando
curl http://localhost:4000/search?q=test&format=json

# Iniciar MCP server (desenvolvimento)
npm run dev

# Iniciar MCP server (produção)
npm start

# Testar com MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```
