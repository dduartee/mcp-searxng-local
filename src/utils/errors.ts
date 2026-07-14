/**
 * errors.ts
 * Tratamento centralizado de erros para o MCP server.
 * Formata erros no formato esperado pelo MCP: { content, isError: true }.
 */

import { error as logError } from './logger.js'

/**
 * Erro customizado para falhas de conexão com o SearXNG.
 */
export class SearxngConnectionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'SearxngConnectionError'
  }
}

/**
 * Erro customizado para respostas inesperadas do SearXNG.
 */
export class SearxngResponseError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'SearxngResponseError'
  }
}

/**
 * Erro customizado para falhas no fetch de páginas web.
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * Converte qualquer erro em uma resposta MCP formatada corretamente.
 * O Claude interpreta isError=true como falha na execução da tool.
 */
export function formatErrorResponse(error: unknown): {
  content: Array<{ type: 'text'; text: string }>
  isError: true
} {
  if (error instanceof SearxngConnectionError) {
    logError(`SearXNG connection failed: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: '❌ Erro de conexão com o SearXNG. Verifique se o Docker está rodando:\n'
          + '  docker compose up -d\n\n'
          + `Detalhes: ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof SearxngResponseError) {
    logError(`SearXNG response error (${error.statusCode}): ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ Erro do SearXNG (HTTP ${error.statusCode ?? '?'}): ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof FetchError) {
    logError(`Fetch failed for ${error.url}: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ Erro ao acessar a URL${error.url ? ` (${error.url})` : ''}: ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof Error) {
    logError(`Unexpected error: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ Erro inesperado: ${error.message}`
      }],
      isError: true,
    }
  }

  return {
    content: [{
      type: 'text',
      text: '❌ Erro desconhecido'
    }],
    isError: true,
  }
}
