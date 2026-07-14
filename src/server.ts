/**
 * server.ts
 * Configuração central do servidor MCP.
 *
 * Responsabilidades:
 * 1. Criar a instância do McpServer (nome, versão, metadados)
 * 2. Registrar todas as tools (web_search, web_fetch)
 * 3. Expor resources (lista de tools, health check)
 * 4. Fornecer factory function para criar o servidor configurado
 *
 * Inspirado no Exa MCP (src/mcp-handler.ts):
 *   initializeMcpServer(server, config) -> registra tools baseado na config
 *
 * A diferença é que este servidor é mais simples (2 tools vs 14 do Exa),
 * então não precisamos de toolRegistry com enabled/disabled dinâmico.
 * Mas mantivemos o toolRegistry para consistência e extensibilidade.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ServerConfig } from './types.js'
import { registerWebSearchTool, registerWebSearchAdvancedTool } from './tools/webSearch.js'
import { registerWebFetchTool } from './tools/webFetch.js'
import { listToolMetadata } from './toolRegistry.js'
import { setDebug, log } from './utils/logger.js'
import { createSearxngClient } from './engines/searxng.js'

/**
 * Factory: cria e configura um servidor MCP completo.
 *
 * @param config  - Configuração (porta SearXNG, debug, etc.)
 * @returns       - Instância do McpServer pronta para conectar
 */
export function createServer(config: ServerConfig = {}): McpServer {
  // Ativa logs detalhados se debug=true
  if (config.debug) {
    setDebug(true)
  }

  log('Criando servidor MCP...')
  log(`Config: ${JSON.stringify(config)}`)

  // Cria a instância do McpServer
  // O name é usado pelo cliente MCP para identificar o servidor
  const server = new McpServer({
    name: 'mcp-searxng-local',
    version: '0.1.0',
  })

  // Registra as ferramentas
  // Cada tool vira um "tool" no protocolo MCP, listável e chamável
  log('Registrando ferramentas...')
  registerWebSearchTool(server, config)
  registerWebSearchAdvancedTool(server, config)
  registerWebFetchTool(server, config)
  log('Ferramentas registradas com sucesso')

  // Registra um resource estático com a lista de tools
  // Resources são dados que o servidor expõe para o cliente ler
  server.resource(
    'tools',
    'mcp-searxng-local://tools',
    {
      description: 'Lista de ferramentas disponíveis no servidor',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [{
        uri: 'mcp-searxng-local://tools',
        text: JSON.stringify(listToolMetadata(), null, 2),
        mimeType: 'application/json',
      }],
    })
  )

  return server
}

/**
 * Verifica se o SearXNG está acessível.
 * Chamado durante o startup para dar feedback ao usuário.
 */
export async function checkSearxngHealth(config: ServerConfig): Promise<boolean> {
  const client = createSearxngClient(config)
  const healthy = await client.healthCheck()
  return healthy
}
