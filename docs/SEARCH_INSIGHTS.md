# Search Insights for AI Agents

Lições aprendidas ao construir um MCP server de busca web e ao testá-lo com agentes de IA executando pesquisas reais.

## O que agentes de IA realmente precisam

### 1. Highlights, não páginas inteiras

O insight mais importante: agentes de IA **não querem páginas completas**. Querem os trechos relevantes.

Testamos isso com um subagente pesquisando distros Linux para gaming. Ele fez 15+ chamadas de `web_fetch`. Quando o modo `highlights` retornava a página inteira (bug que depois corrigimos), o agente desperdiçava tokens processando navegação, sidebars e rodapés. Após a correção — parágrafos extraídos por keyword matching — a redução foi de **98%** (341 caracteres de 15.197).

| Modo | Tokens típicos | Quando usar |
|------|---------------|-------------|
| `highlights` | ~300-800 chars | Busca factual, multi-step agents, scanning rápido |
| `text` | ~3000-5000 chars | Análise profunda, pesquisa acadêmica, contexto completo |

**Regra prática:** `mode=highlights` primeiro, `mode=text` só se necessário.

### 2. Transparência sobre falhas

Agentes precisam saber POR QUE algo falhou. Exemplo real:

```
# Antes (sem diagnóstico):
Nenhum resultado encontrado.

# Depois (com diagnóstico):
## Engines indisponíveis
- duckduckgo: Suspended: access denied
- brave: Suspended: too many requests
```

Com o diagnóstico, o agente sabe que deve tentar `engines=google` em vez de `engines=duckduckgo`. Sem diagnóstico, ele assume que não há resultados e desiste.

### 3. Filtros que funcionam de verdade

Testamos `startPublishedDate` com um agente pesquisando "iPXE secure boot". O filtro de data era client-side — resultados sem data passavam. O agente recebeu resultados de 2018 misturados com 2026. **Datas imprecisas são piores que datas ausentes** — o agente confia no filtro e toma decisões erradas.

Corrigimos: resultados sem data são excluídos quando o filtro está ativo.

### 4. Engine discovery é essencial

O agente testou `engines=wikipedia` e recebeu 0 resultados. O motor existe no SearXNG mas não tinha índice para a query. O agente não tinha como saber se:
- O engine está configurado mas vazio
- O engine está bloqueado/indisponível
- O nome do engine está errado

**Solução parcial:** expomos `unresponsive_engines` com o motivo. Mas ainda falta uma forma de listar engines disponíveis.

### 5. Duas tools de search confundem

Tínhamos `web_search` e `web_search_advanced` com 80% de overlap de parâmetros. O agente não sabia qual usar. Unificamos — `web_search` agora tem todos os parâmetros, e `web_search_advanced` é um alias com o mesmo handler.

### 6. Métricas de redução importam

Quando o highlights extrai trechos, o agente precisa saber **o quanto** foi reduzido. Adicionamos:

```
> Trechos relevantes (341 de 15197 caracteres, ~98% menor).
```

Isso permite ao agente decidir se precisa de `mode=text` para mais contexto.

## O que NÃO implementamos (e por quê)

| Feature | Por que não |
|---------|------------|
| Structured output (`outputSchema`) | Requer LLM externo — fora do escopo zero-API-key |
| Deep search / multi-step reasoning | Requer LLM externo |
| Relevance scores por resultado | SearXNG não fornece scores nativos |
| Server-side date filtering | SearXNG não suporta filtro de data exato |

## Padrões de uso observados

Analisando subagentes reais usando o MCP:

1. **Agentes fazem busca ampla primeiro**, depois refinam com filtros
2. **Web_fetch é usado em ~40% dos resultados de busca** — o snippet do search geralmente basta
3. **Domain filtering é o filtro mais usado** (excluir reddit/pinterest, incluir github/wikipedia)
4. **Agentes raramente usam `pageno` > 1** — confiam nos primeiros 5-10 resultados
5. **Queries tendem a ser longas e em linguagem natural** — o agente escreve como falaria com um humano
