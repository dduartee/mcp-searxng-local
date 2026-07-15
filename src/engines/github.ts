/**
 * github.ts
 * Optimized fetching for GitHub URLs.
 *
 * Routes:
 * - /blob/...  → raw.githubusercontent.com (raw file content)
 * - /raw/...   → raw.githubusercontent.com (already raw)
 * - /          → GitHub API (repo metadata)
 * - Everything else → falls back to generic HTML fetch (null)
 */

import { FetchError } from '../utils/errors.js'
import { withRetry } from '../utils/retry.js'
import { MemoryCache } from '../utils/cache.js'
import type { ExtractedContent } from './fetchHtml.js'

const GITHUB_RAW_TTL = 30 * 60 * 1000 // 30 minutes
const githubCache = new MemoryCache<ExtractedContent>(50)

export interface GithubUrlInfo {
  owner: string
  repo: string
  type: 'blob' | 'raw' | 'repo' | 'other'
  filePath?: string
}

/**
 * Parses a GitHub URL into structured info.
 * Returns null if not a GitHub URL.
 */
export function parseGithubUrl(url: string): GithubUrlInfo | null {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/.*)?$/)
  if (!match) return null

  const [, owner, repo, rest] = match
  const path = rest || ''

  const blobMatch = path.match(/^\/blob\/(.+?)\/(.+)$/)
  if (blobMatch) {
    return { owner, repo, type: 'blob', filePath: `${blobMatch[1]}/${blobMatch[2]}` }
  }

  const rawMatch = path.match(/^\/raw\/(.+?)\/(.+)$/)
  if (rawMatch) {
    return { owner, repo, type: 'raw', filePath: `${rawMatch[1]}/${rawMatch[2]}` }
  }

  if (path === '' || path === '/') {
    return { owner, repo, type: 'repo' }
  }

  return { owner, repo, type: 'other' }
}

function toRawUrl(info: GithubUrlInfo): string {
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.filePath}`
}

async function fetchRawFile(
  url: string,
  info: GithubUrlInfo,
  signal?: AbortSignal
): Promise<ExtractedContent> {
  const rawUrl = toRawUrl(info)

  const response = await withRetry(
    () => fetch(rawUrl, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MCP-Search-Local/0.1)',
        'Accept': 'text/plain',
      },
    }),
    { maxRetries: 2, baseDelayMs: 1000 }
  )

  if (!response.ok) {
    throw new FetchError(
      `GitHub raw fetch failed (HTTP ${response.status})`,
      url,
      response.status
    )
  }

  const text = await response.text()
  const fileName = info.filePath?.split('/').pop() || 'file'

  return {
    title: `${info.owner}/${info.repo} — ${fileName}`,
    description: `Raw file from GitHub: ${info.filePath}`,
    text,
  }
}

function getGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; MCP-Search-Local/0.1)',
    'Accept': 'application/vnd.github.v3+json',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `token ${token}`
  }
  return headers
}

interface GithubRepoData {
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  topics?: string[]
  html_url: string
  license?: { spdx_id: string } | null
  open_issues_count: number
  default_branch: string
}

interface GithubContentsEntry {
  name: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  size: number
}

async function fetchRepoInfo(
  url: string,
  info: GithubUrlInfo,
  signal?: AbortSignal
): Promise<ExtractedContent> {
  const base = `https://api.github.com/repos/${info.owner}/${info.repo}`

  const fetchJson = async <T>(endpoint: string): Promise<T> => {
    const response = await withRetry(
      () => fetch(`${base}${endpoint}`, {
        signal,
        headers: getGithubHeaders(),
      }),
      { maxRetries: 2, baseDelayMs: 1000 }
    )
    if (!response.ok) {
      throw new FetchError(
        `GitHub API error (HTTP ${response.status})`,
        `${base}${endpoint}`,
        response.status
      )
    }
    return response.json() as Promise<T>
  }

  const [repoData, readmeData, contentsData] = await Promise.all([
    fetchJson<GithubRepoData>(''),
    fetchJson<{ content: string; encoding: string }>('/readme').catch(() => null),
    fetchJson<GithubContentsEntry[]>('/contents/').catch(() => null),
  ])

  const lines = [
    `## ${repoData.full_name}`,
    '',
    repoData.description || '(no description)',
    '',
    `**Stars:** ${repoData.stargazers_count.toLocaleString()}`,
    `**Forks:** ${repoData.forks_count.toLocaleString()}`,
    `**Language:** ${repoData.language || 'N/A'}`,
    `**License:** ${repoData.license?.spdx_id || 'N/A'}`,
    `**Open Issues:** ${repoData.open_issues_count}`,
    `**Default Branch:** ${repoData.default_branch}`,
  ]

  if (repoData.topics && repoData.topics.length > 0) {
    lines.push(`**Topics:** ${repoData.topics.join(', ')}`)
  }

  if (contentsData && contentsData.length > 0) {
    lines.push('', '**Files:**')
    for (const entry of contentsData) {
      const prefix = entry.type === 'dir' ? '📁 ' : ''
      const size = entry.type === 'file' ? ` (${formatBytes(entry.size)})` : ''
      lines.push(`- ${prefix}${entry.name}${size}`)
    }
  }

  if (readmeData?.content) {
    const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8')
    const trimmed = decoded.length > 4000 ? decoded.slice(0, 4000) + '\n\n[README truncated...]' : decoded
    lines.push('', '---', '', '## README', '', trimmed)
  }

  lines.push('', `URL: ${repoData.html_url}`)

  return {
    title: repoData.full_name,
    description: repoData.description,
    text: lines.join('\n'),
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/**
 * Attempts to handle a GitHub URL with optimized fetching.
 * Returns ExtractedContent if handled, null if should fall back to generic fetch.
 */
export async function fetchGithubUrl(
  url: string,
  signal?: AbortSignal
): Promise<ExtractedContent | null> {
  const info = parseGithubUrl(url)
  if (!info) return null

  const cacheKey = `gh:${url}`
  const cached = githubCache.get(cacheKey)
  if (cached) return cached

  let result: ExtractedContent

  try {
    switch (info.type) {
      case 'blob':
      case 'raw':
        result = await fetchRawFile(url, info, signal)
        break
      case 'repo':
        result = await fetchRepoInfo(url, info, signal)
        break
      default:
        return null
    }
  } catch (err) {
    if (err instanceof FetchError && err.statusCode === 403) {
      return null
    }
    throw err
  }

  githubCache.set(cacheKey, result, GITHUB_RAW_TTL)
  return result
}
