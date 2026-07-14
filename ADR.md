# Architecture Decision Records — mcp-search-local

## ADR-001: SearXNG como backend de busca

**Contexto:** Precisamos de um backend de busca web que rode 100% local, sem API keys, sem custo.

**Decisão:** Usar SearXNG em Docker como metasearch backend.

**Consequências:**
- ✅ Zero dependência de APIs externas
- ✅ Agregação de 150+ engines (Google, DuckDuckGo, Brave, Bing, Wikipedia, arXiv)
- ✅ API REST JSON nativa
- ✅ Cache via Valkey (reduz latência)
- ❌ Dependência de Docker
- ❌ Latência maior que APIs diretas (mas aceitável com cache)
- ❌ Requer conexão com internet (os engines internos consultam a web)

**Alternativas rejeitadas:**
- DuckDuckGo scrape: frágil, bloqueio frequente
- Google scraping: viola TOS
- APIs pagas: contradiz requisito "100% local"

## ADR-002: Transporte stdio como primário

**Contexto:** MCP suporta stdio, Streamable HTTP, e WebSocket.

**Decisão:** Usar stdio como transporte primário.

**Consequências:**
- ✅ Compatível com todos os clientes MCP (Claude Code, Cursor, VS Code)
- ✅ Setup zero de rede
- ✅ Mais seguro (sem expor porta)
- ❌ Só funciona localmente (o que atende ao requisito)

## ADR-003: SDK v1 (produção) com olho no v2

**Contexto:** MCP SDK v2 está em beta, lançamento estável em julho/2026.

**Decisão:** Usar `@modelcontextprotocol/sdk` v1.x (estável) agora. Preparar migração para `@modelcontextprotocol/server` v2 quando estável.

**Consequências:**
- ✅ API estável, sem surpresas
- ✅ Compatibilidade garantida com clientes atuais
- ❌ Precisará de refactor quando v2 for estável

## ADR-004: Zod v3 para validação (seguindo SDK v1)

**Contexto:** MCP SDK v1 usa Zod v3 internamente.

**Decisão:** Zod v3 para schemas de input das tools.

**Consequências:**
- ✅ Compatível com SDK v1
- ✅ Padrão da indústria
- ❌ Migração para Zod v4 pode ser necessária (SDK v2 já suporta Standard Schema)

## ADR-005: `web_fetch` com cheerio puro (sem Puppeteer)

**Contexto:** Precisamos extrair conteúdo de URLs, mas usar Puppeteer/Playwright adiciona complexidade e peso.

**Decisão:** Usar `fetch` nativo + `cheerio` para parsear HTML.

**Consequências:**
- ✅ Leve, sem dependências pesadas
- ✅ Suficiente para páginas estáticas
- ❌ Não executa JavaScript (páginas SPA podem não renderizar)
- Mitigação: para SPAs, podemos adicionar modo "text-only" que retorna o HTML raw

## ADR-006: Dois motores de fallback para busca

**Contexto:** SearXNG pode ter engines bloqueados ou lentos.

**Decisão:** Configurar SearXNG com múltiplos engines como fallback. Se falhar, o MCP tenta `web_fetch` na URL de busca do DuckDuckGo como último recurso.

**Consequências:**
- ✅ Resiliência contra bloqueio de engines individuais
- ❌ Aumenta complexidade do código

## ADR-007: Nomenclatura das tools em inglês

**Contexto:** O padrão MCP é inglês. Claude Code e outros clientes esperam nomes em inglês.

**Decisão:** `web_search` e `web_fetch` (inglês).

**Consequências:**
- ✅ Compatível com padrão MCP
- ✅ Consistente com Exa, Brave e outros MCPs de busca
