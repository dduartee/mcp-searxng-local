import type { ToolMetadata } from './types.js'

export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  web_search: {
    id: 'web_search',
    name: 'Web Search',
    description: 'Busca na web via SearXNG com filtros de categoria, período, domínios, engines e safe search. Inclui respostas diretas e infoboxes.',
    enabled: true,
  },
  web_search_advanced: {
    id: 'web_search_advanced',
    name: 'Web Search Advanced',
    description: 'Busca avançada com date range ISO, filtro de domínios, seleção de engines, safe search. Para queries que exigem filtragem precisa.',
    enabled: true,
  },
  web_fetch: {
    id: 'web_fetch',
    name: 'Web Fetch',
    description: 'Extrai conteúdo de URL. Modo "text" (página completa) ou "highlights" (trechos relevantes, ~10x menos tokens).',
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
