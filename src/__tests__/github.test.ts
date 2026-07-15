import { describe, it, expect } from 'vitest'
import { parseGithubUrl, fetchGithubUrl } from '../engines/github.js'

describe('parseGithubUrl', () => {
  it('returns null for non-GitHub URLs', () => {
    expect(parseGithubUrl('https://example.com')).toBeNull()
    expect(parseGithubUrl('https://gitlab.com/user/repo')).toBeNull()
    expect(parseGithubUrl('https://github.com')).toBeNull()
  })

  it('parses repo root URL', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'repo',
    })
  })

  it('parses repo root with trailing slash', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'repo',
    })
  })

  it('parses blob URL with file path', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/blob/master/Readme.md')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'blob',
      filePath: 'master/Readme.md',
    })
  })

  it('parses blob URL with nested path', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/blob/master/lib/express.js')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'blob',
      filePath: 'master/lib/express.js',
    })
  })

  it('parses raw URL with file path', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/raw/master/package.json')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'raw',
      filePath: 'master/package.json',
    })
  })

  it('returns type=other for unsupported paths like /issues', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/issues')
    expect(info).toEqual({
      owner: 'expressjs',
      repo: 'express',
      type: 'other',
    })
  })

  it('returns type=other for /pulls path', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/pulls')
    expect(info?.type).toBe('other')
  })

  it('returns type=other for /tree/ path', () => {
    const info = parseGithubUrl('https://github.com/expressjs/express/tree/master/lib')
    expect(info?.type).toBe('other')
  })

  it('handles HTTP URLs', () => {
    const info = parseGithubUrl('http://github.com/user/repo')
    expect(info).not.toBeNull()
    expect(info?.type).toBe('repo')
  })

  it('handles URLs with .git suffix as valid repo', () => {
    const info = parseGithubUrl('https://github.com/user/repo.git')
    expect(info).toEqual({
      owner: 'user',
      repo: 'repo.git',
      type: 'repo',
    })
  })
})

describe('fetchGithubUrl', () => {
  it('returns null for non-GitHub URLs', async () => {
    const result = await fetchGithubUrl('https://example.com')
    expect(result).toBeNull()
  })

  it('returns null for unsupported GitHub paths', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express/issues'
    )
    expect(result).toBeNull()
  })

  it('fetches Readme.md via blob URL (raw content)', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express/blob/master/Readme.md'
    )
    expect(result).not.toBeNull()
    expect(result!.title).toBe('expressjs/express — Readme.md')
    expect(result!.description).toContain('Raw file from GitHub')
    expect(result!.text).toContain('Express')
    expect(result!.text).toContain('npm')
    expect(result!.text.length).toBeGreaterThan(200)
  }, 15000)

  it('fetches package.json via blob URL', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express/blob/master/package.json'
    )
    expect(result).not.toBeNull()
    expect(result!.title).toContain('package.json')
    expect(result!.text).toContain('"name"')
    expect(result!.text).toContain('"express"')
    expect(result!.text).toContain('"version"')
  }, 15000)

  it('fetches source file lib/express.js', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express/blob/master/lib/express.js'
    )
    expect(result).not.toBeNull()
    expect(result!.title).toContain('express.js')
    expect(result!.text).toContain('require')
    expect(result!.text.length).toBeGreaterThan(100)
  }, 15000)

  it('fetches repo metadata for root URL', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express'
    )
    if (!result) return // Rate limited — fallback is MCP-only behavior
    expect(result.title).toBe('expressjs/express')
    expect(result.text).toContain('**Stars:**')
    expect(result.text).toContain('**Forks:**')
    expect(result.text).toContain('**Language:** JavaScript')
    expect(result.text).toContain('**License:** MIT')
    expect(result.text).toContain('**Default Branch:** master')
    expect(result.text).toContain('Fast, unopinionated')
  }, 15000)

  it('includes file tree in repo root response', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express'
    )
    if (!result) return // Rate limited
    expect(result.text).toContain('**Files:**')
    expect(result.text).toContain('package.json')
    expect(result.text).toContain('Readme.md')
    expect(result.text).toContain('📁 lib')
  }, 15000)

  it('includes README in repo root response', async () => {
    const result = await fetchGithubUrl(
      'https://github.com/expressjs/express'
    )
    if (!result) return // Rate limited
    expect(result.text).toContain('## README')
    expect(result.text).toContain('Express')
    expect(result.text.length).toBeGreaterThan(2000)
  }, 15000)

  it('returns cached result on second call', async () => {
    const url = 'https://github.com/expressjs/express/blob/master/Readme.md'
    const first = await fetchGithubUrl(url)
    const second = await fetchGithubUrl(url)
    expect(first).toEqual(second)
  }, 15000)
})
