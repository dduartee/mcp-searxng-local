# GitHub Fetch Optimization

`web_fetch` has a special optimization for GitHub URLs. When it detects a URL pointing to `github.com`, it routes the request to an efficient endpoint instead of parsing the HTML page with cheerio.

## URL Routing

| URL pattern | Example | Route | Response |
|---|---|---|---|
| Repo root | `github.com/user/repo` | GitHub REST API | Enriched: metadata + file tree + README |
| File (blob) | `github.com/user/repo/blob/main/src/index.ts` | `raw.githubusercontent.com` | Raw file content |
| File (raw) | `github.com/user/repo/raw/main/src/index.ts` | `raw.githubusercontent.com` | Raw file content |
| Other | `github.com/user/repo/issues/42` | Generic HTML fetch | Fallback to normal web_fetch |

## Repo root (`/user/repo`)

Fetches three resources in parallel via the GitHub REST API:

1. **Repo metadata** — `api.github.com/repos/:owner/:repo` (stars, forks, language, license, topics, etc.)
2. **File tree** — `api.github.com/repos/:owner/:repo/contents/` (directory listing at root)
3. **README** — `api.github.com/repos/:owner/:repo/readme` (decoded from base64, truncated at 4000 chars)

Example output:

```
## octocat/Hello-World

My first repository on GitHub!

**Stars:** 2,345
**Forks:** 678
**Language:** JavaScript
**License:** MIT
**Open Issues:** 12
**Default Branch:** master
**Topics:** demo, tutorial

**Files:**
- .gitignore
- README.md (1.2 KB)
- 📁 src/
- 📁 docs/

---

## README

# Hello-World
...
```

If `GITHUB_TOKEN` is set, requests are authenticated (5000 req/h vs 60 unauthenticated). On 403, falls back to generic HTML fetch.

## Blob/raw files (`/blob/...`, `/raw/...`)

Routes to `raw.githubusercontent.com` — fetches the file directly without any HTML processing. The response contains only the raw file content with a descriptive title.

This is the most impactful optimization: GitHub renders blob pages with navigation, sidebars, footers, and syntax-highlighted HTML that is extremely noisy for LLM consumption. Going directly to the raw endpoint eliminates all of that.

## Fallback behavior

Paths like `/issues`, `/pulls`, `/actions`, `/releases`, `/wiki`, and any other non-matching path fall back to the generic HTML fetch. This means:

- Behavior is never worse than without the optimization
- Unsupported paths work exactly as before
- No silent failures or gaps in functionality

## Implementation

The optimization lives in `src/engines/github.ts` and consists of:

1. **`parseGithubUrl(url)`** — Regex-based URL parser that extracts owner, repo, and path info. Returns `null` for non-GitHub URLs.
2. **`fetchRawFile(url, info, signal)`** — Fetches `/blob` or `/raw` URLs from `raw.githubusercontent.com` with retry (2 attempts, 1s base delay).
3. **`fetchRepoInfo(url, info, signal)`** — Fetches repo root URLs via 3 parallel API calls (metadata + file tree + README) from `api.github.com/v3` and formats the JSON response as structured markdown. Uses `GITHUB_TOKEN` for authentication when available.
4. **`fetchGithubUrl(url, signal)`** — Orchestrator: parses the URL, checks the cache, dispatches to the right handler, caches the result.

The integration point is in `src/engines/fetchHtml.ts:45-47` — a pre-check in `extractFromUrl` that delegates to `fetchGithubUrl` before the generic HTML pipeline.

## Caching

GitHub responses use a separate `MemoryCache` instance with a 30-minute TTL (vs. 5 minutes for SearXNG searches). This longer TTL is appropriate because:

- Repo metadata (stars, forks, license) changes infrequently
- Raw file content only changes when committed
- Reduces redundant API calls to GitHub

Cache capacity is 50 entries, keyed by the full URL with a `gh:` prefix.

## Testing

20 tests in `src/__tests__/github.test.ts` covering:

- URL parsing: non-GitHub URLs, repo root, blob URLs, raw URLs, trailing slashes, HTTP protocol
- Raw content fetching: blob URLs return clean file content
- Repo metadata: root URLs return structured data with stars, forks, etc.
- Fallback: unsupported paths and non-GitHub URLs return `null`
