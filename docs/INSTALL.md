# Guia de Instalação

Este guia cobre todos os modos de instalação do `mcp-searxng-local`, desde o setup local de desenvolvimento até a configuração global com automação.

## Modos de instalação

| Modo | Esforço | Ideal para |
|------|---------|------------|
| [Projeto local](#1-projeto-local) | Baixo | Desenvolvedores do próprio repo |
| [Clone + path absoluto](#2-clone--path-absoluto) | Médio | Usar em qualquer projeto |
| [Global com plugin](#3-global-com-plugin) | Alto | Experiência completa, sempre disponível |

---

## 1. Projeto local

Setup mínimo. O `opencode.json` do projeto carrega o MCP automaticamente.

```bash
git clone https://github.com/dduartee/mcp-searxng-local
cd mcp-searxng-local
npm install
npm run build
docker compose up -d
```

```json
// opencode.json (já incluso no repo)
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website"
      }
    }
  }
}
```

**Prós:** Zero configuração, caminho relativo funciona.

**Contras:** Só funciona dentro do diretório do projeto.

---

## 2. Clone + path absoluto

Clone o repo em um local fixo e aponte o caminho absoluto. Funciona em qualquer projeto.

```bash
git clone https://github.com/dduartee/mcp-searxng-local ~/mcp-searxng-local
cd ~/mcp-searxng-local
npm install && npm run build
docker compose up -d
```

```json
// ~/.config/opencode/opencode.json (global)
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website"
      }
    }
  }
}
```

Ou via CLI:

```bash
opencode mcp add mcp-searxng-local -- node /home/user/mcp-searxng-local/dist/index.js
```

**Prós:** Disponível em qualquer projeto. Um clone, usa sempre.

**Contras:** Precisa atualizar manualmente (`git pull && npm run build`). Path absoluto obrigatório.

---

## 3. Global com plugin

Inspirado no [mind MCP](https://github.com/anomalyco/mind). Três camadas que trabalham juntas:

```
~/.config/opencode/
├── opencode.json           ← MCP server config
├── plugins/
│   └── searxng-startup.js  ← Plugin: inicia SearXNG no boot
└── instructions/
    └── searxng-search.md   ← Regras: quando usar cada tool
```

### 3.1 Config do MCP (`opencode.json`)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "/home/user/mcp-searxng-local/dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website"
      }
    }
  }
}
```

### 3.2 Plugin de startup (`~/.config/opencode/plugins/searxng-startup.js`)

Garante que o SearXNG está rodando antes do MCP server iniciar:

```js
import { execSync } from 'node:child_process'

export default async () => {
  const searxngDir = '/home/user/mcp-searxng-local'

  try {
    execSync('curl -sf http://localhost:4000/search?q=health&format=json', {
      stdio: 'ignore',
      timeout: 3000,
    })
  } catch {
    console.error('[searxng-startup] SearXNG not running, starting...')
    execSync('docker compose up -d', { cwd: searxngDir, stdio: 'inherit' })
  }
}
```

### 3.3 Instruções de uso (`~/.config/opencode/instructions/searxng-search.md`)

```markdown
# SearXNG Search Protocol

Use estas ferramentas para qualquer pesquisa na web:

## web_search — busca geral
Use para pesquisas factuais, notícias, documentação.
- Prefira `engines=google` para resultados gerais
- Use `includeDomains=["wikipedia.org"]` para fontes enciclopédicas
- Use `categories=news` para notícias recentes

## web_fetch — extrair conteúdo
Use APÓS o web_search para ler páginas completas.
- Prefira `mode=highlights` com a mesma query da busca (~98% tokens menores)
- Use `mode=text` apenas quando precisar do conteúdo completo

## web_search_advanced — filtros precisos
Use quando precisar de date range, filtro de domínio, ou combinação de filtros.
```

Registre as instruções no `opencode.json`:

```json
{
  "instructions": [
    "/home/user/.config/opencode/instructions/searxng-search.md"
  ]
}
```

**Prós:** Experiência completa. SearXNG inicia sozinho. Agente sabe quando usar cada tool.

**Contras:** Mais arquivos para manter. Plugin requer Node.js.

---

## Atualização

```bash
cd ~/mcp-searxng-local
git pull
npm install && npm run build
docker compose pull   # atualiza imagens SearXNG + Valkey
docker compose up -d  # reinicia com novas imagens
```

Após atualizar, reinicie o OpenCode.

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Tools não aparecem | Caminho errado no config | Verifique se `dist/index.js` existe no path absoluto |
| `web_search` retorna erro de conexão | SearXNG não está rodando | `docker compose up -d` no diretório do projeto |
| `## Engines indisponíveis` com `brave: too many requests` | Engine bloqueado/rate-limited | **Fallback automático cuida disso** — nenhuma ação necessária |
| Todos os engines retornam 0 resultados + todos indisponíveis | IP do servidor bloqueado | Defina `SEARXNG_FALLBACK_URLS` com instâncias públicas — fallback retry automático |
| Highlights retorna página inteira | Página tem parágrafos curtos ou única seção | Use `mode=text` com `maxChars` menor |
| Timeout no web_fetch | Página lenta ou bloqueando bots | Aumente o `SEARXNG_TIMEOUT` via env var |

## Publicação futura no npm

Quando publicado, o setup será reduzido a:

```json
{
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["npx", "-y", "mcp-searxng-local"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000",
        "SEARXNG_FALLBACK_URLS": "https://search.rhscz.eu,https://searx.tiekoetter.com,https://searxng.website"
      }
    }
  }
}
```

O `npx -y` baixa e executa automaticamente. Sem clone, sem build manual.
