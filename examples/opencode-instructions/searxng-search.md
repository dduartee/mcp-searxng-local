# SearXNG Search Protocol

Use these tools for any web search:

## web_search — general search
Use for factual queries, news, documentation.
- Prefer `engines=google` for general results
- Use `includeDomains=["wikipedia.org"]` for encyclopedic sources
- Use `categories=news` for recent news

## web_fetch — extract content
Use AFTER web_search to read full pages.
- Prefer `mode=highlights` with the same search query (~98% fewer tokens)
- Use `mode=text` only when you need the full content

## web_search_advanced — precise filters
Use when you need date range, domain filtering, or combined filters.
