/**
 * index.ts
 * Entry point do servidor MCP.
 *
 * Este arquivo:
 * 1. Lê configuração de variáveis de ambiente
 * 2. Cria o servidor MCP via createServer()
 * 3. Conecta ao transporte stdio (padrão MCP)
 *
 * Transporte stdio:
 *   O servidor lê JSON do stdin e escreve JSON no stdout.
 *   O Claude Code (ou qualquer cliente MCP) gerencia o processo
 *   e se comunica via pipe.
 *
 * Para rodar:
 *   npm run dev    (desenvolvimento com hot reload)
 *   npm start      (produção)
 *
 * Para testar com MCP Inspector:
 *   npm run inspector
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer, checkSearxngHealth } from './server.js'
import type { ServerConfig } from './types.js'
import { warn } from './utils/logger.js'

/**
 * Lê configuração das variáveis de ambiente.
 * Suporta os prefixos SEARXNG_ e MCP_SEARCH_LOCAL_ para flexibilidade.
 */
function loadConfigFromEnv(): ServerConfig {
  return {
    searxngHost: process.env.SEARXNG_HOST
      || process.env.MCP_SEARCH_LOCAL_SEARXNG_HOST
      || 'localhost',
    searxngPort: parseInt(
      process.env.SEARXNG_PORT
        || process.env.MCP_SEARCH_LOCAL_SEARXNG_PORT
        || '4000',
      10
    ),
    searxngTimeout: parseInt(
      process.env.SEARXNG_TIMEOUT
        || process.env.MCP_SEARCH_LOCAL_TIMEOUT
        || '10000',
      10
    ),
    debug: process.env.DEBUG === 'true'
      || process.env.MCP_SEARCH_LOCAL_DEBUG === 'true',
  }
}

/**
 * Função principal.
 * Inicializa tudo e conecta ao transporte.
 */
async function main(): Promise<void> {
  const config = loadConfigFromEnv()

  // Verifica se o SearXNG está rodando (não crítico — só avisa)
  const healthy = await checkSearxngHealth(config)
  if (!healthy) {
    warn('⚠️  SearXNG não está respondendo em '
      + `http://${config.searxngHost}:${config.searxngPort}. `
      + 'Execute "docker compose up -d" para iniciar.')
    warn('O servidor MCP vai iniciar, mas web_search pode falhar até o SearXNG estar online.')
  }

  // Cria e configura o servidor
  const server = createServer(config)

  // Conecta ao transporte stdio
  // O StdioServerTransport lê do stdin e escreve no stdout
  // Segue o protocolo JSON-RPC do MCP
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Inicia o servidor
// Captura erros não tratados para dar mensagem amigável
main().catch((err) => {
  console.error('[mcp-searxng-local] Fatal:', err)
  process.exit(1)
})
