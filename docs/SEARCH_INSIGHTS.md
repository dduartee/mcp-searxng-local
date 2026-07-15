# Search Insights for AI Agents

Lessons learned building an MCP web search server and testing it with AI agents running real searches.

## What AI Agents Actually Need

### 1. Highlights, Not Full Pages

The most important insight: AI agents **don't want full pages**. They want the relevant excerpts.

We tested this with a subagent researching Linux distros for gaming. It made 15+ `web_fetch` calls. When `highlights` mode returned the full page (a bug we later fixed), the agent wasted tokens processing navigation, sidebars, and footers. After the fix — paragraphs extracted by keyword matching — the reduction was **98%** (341 characters out of 15,197).

| Mode | Typical Tokens | When to Use |
|------|---------------|-------------|
| `highlights` | ~300-800 chars | Factual search, multi-step agents, quick scanning |
| `text` | ~3000-5000 chars | Deep analysis, academic research, full context |

**Rule of thumb:** `mode=highlights` first, `mode=text` only when necessary.

### 2. Transparency About Failures

Agents need to know WHY something failed. Real example:

```
# Before (no diagnostics):
No results found.

# After (with diagnostics):
## Unresponsive Engines
- duckduckgo: Suspended: access denied
- brave: Suspended: too many requests
```

With diagnostics, the agent knows to try `engines=google` instead of `engines=duckduckgo`. Without diagnostics, it assumes there are no results and gives up.

### 3. Filters That Actually Work

We tested `startPublishedDate` with an agent searching for "iPXE secure boot". The date filter was client-side — results without dates slipped through. The agent received results from 2018 mixed with 2026. **Imprecise dates are worse than missing dates** — the agent trusts the filter and makes wrong decisions.

Fix: results without dates are excluded when a date filter is active.

### 4. Engine Discovery Is Essential

The agent tried `engines=wikipedia` and got 0 results. The engine exists in SearXNG but had no index for the query. The agent had no way to know if:
- The engine is configured but empty
- The engine is blocked/unavailable
- The engine name is wrong

**Partial solution:** we expose `unresponsive_engines` with the reason. But we still lack a way to list available engines.

### 5. Two Search Tools Confuse Agents

We had `web_search` and `web_search_advanced` with 80% parameter overlap. The agent didn't know which to use. We unified them — `web_search` now has all parameters, and `web_search_advanced` is an alias with the same handler.

### 6. Reduction Metrics Matter

When highlights extract excerpts, the agent needs to know **how much** was reduced. We added:

```
> Relevant excerpts (341 of 15197 characters, ~98% smaller).
```

This lets the agent decide if it needs `mode=text` for more context.

## What We Didn't Implement (and Why)

| Feature | Why Not |
|---------|---------|
| Structured output (`outputSchema`) | Requires external LLM — outside zero-API-key scope |
| Deep search / multi-step reasoning | Requires external LLM |
| Relevance scores per result | SearXNG doesn't provide native scores |
| Server-side date filtering | SearXNG doesn't support exact date filters |

## Observed Usage Patterns

Analyzing real subagents using the MCP:

1. **Agents search broadly first**, then refine with filters
2. **`web_fetch` is used on ~40% of search results** — the search snippet is usually enough
3. **Domain filtering is the most used filter** (exclude reddit/pinterest, include github/wikipedia)
4. **Agents rarely use `pageno` > 1** — they trust the first 5-10 results
5. **Queries tend to be long and natural language** — the agent writes as if talking to a human
