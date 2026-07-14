import type { ToolMetadata } from './types.js'

export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  web_search: {
    id: 'web_search',
    name: 'Web Search',
    description: 'Web search via SearXNG with category, time, domain, engine, and safe search filters. Includes direct answers and infoboxes.',
    enabled: true,
  },
  web_search_advanced: {
    id: 'web_search_advanced',
    name: 'Web Search Advanced',
    description: 'Advanced search with ISO date range, domain filtering, engine selection, safe search. For queries requiring precise filtering.',
    enabled: true,
  },
  web_fetch: {
    id: 'web_fetch',
    name: 'Web Fetch',
    description: 'Extract URL content. "text" mode (full page) or "highlights" mode (relevant excerpts, ~10x fewer tokens).',
    enabled: true,
  },
}

export type ToolId = keyof typeof TOOL_REGISTRY

export const AVAILABLE_TOOL_IDS = Object.keys(TOOL_REGISTRY) as ToolId[]

export function listToolMetadata(): ToolMetadata[] {
  return AVAILABLE_TOOL_IDS.map((id) => ({
    ...TOOL_REGISTRY[id],
    id,
  }))
}
