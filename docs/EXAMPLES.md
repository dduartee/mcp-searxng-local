# Exemplos de Uso

## Básico: busca simples

```json
{
  "method": "tools/call",
  "params": {
    "name": "web_search",
    "arguments": {
      "query": "TypeScript 5.7 new features"
    }
  }
}
```

Retorna resultados do Google, DuckDuckGo, Brave, Wikipedia com snippets formatados.

## Com filtro de engine

```json
{
  "name": "web_search",
  "arguments": {
    "query": "Rust memory safety model",
    "engines": "wikipedia,arxiv",
    "count": 5
  }
}
```

Usa apenas Wikipedia e arXiv. Se algum engine estiver indisponível, a resposta inclui:

```
## Engines indisponíveis
- brave: Suspended: too many requests
```

## Com filtro de domínio

```json
{
  "name": "web_search",
  "arguments": {
    "query": "PXE boot configuration",
    "includeDomains": ["wiki.archlinux.org", "ipxe.org"],
    "excludeDomains": ["reddit.com", "pinterest.com"]
  }
}
```

Restringe a domínios oficiais, exclui redes sociais.

## Com filtro de data

```json
{
  "name": "web_search",
  "arguments": {
    "query": "Linux kernel release",
    "startPublishedDate": "2026-01-01",
    "count": 5
  }
}
```

Apenas resultados com data de publicação a partir de 2026. Resultados sem data são excluídos.

## Web Fetch: modo texto completo

```json
{
  "name": "web_fetch",
  "arguments": {
    "url": "https://wiki.archlinux.org/title/Dnsmasq",
    "mode": "text",
    "maxChars": 5000
  }
}
```

Retorna a página completa como markdown limpo (sem scripts, nav, footer).

## Web Fetch: modo highlights

```json
{
  "name": "web_fetch",
  "arguments": {
    "url": "https://wiki.archlinux.org/title/Preboot_Execution_Environment",
    "mode": "highlights",
    "query": "PXE network boot UEFI",
    "maxChars": 500
  }
}
```

Extrai apenas parágrafos relevantes. Resposta típica:

```markdown
# Preboot Execution Environment - ArchWiki
Fonte: https://wiki.archlinux.org/title/Preboot_Execution_Environment

dhcp-boot=/boot/syslinux/lpxelinux.0

pxe-service=X86-64_EFI, "Boot from network X86-64 EFI", ipxe.efi

archiso_nfs_srv=${pxeserver}:/mnt/archiso

> Trechos relevantes (341 de 15197 caracteres, ~98% menor).
```

## Busca avançada com todos os filtros

```json
{
  "name": "web_search_advanced",
  "arguments": {
    "query": "secure boot shim signed efi",
    "includeDomains": ["github.com"],
    "startPublishedDate": "2025-01-01",
    "engines": "google",
    "count": 3
  }
}
```

## Fluxo real de um agente

Exemplo de como um agente de IA usa as tools em sequência:

```
1. web_search("best Linux distro for gaming NVIDIA 2026", count=10)
   → 10 snippets de distros candidatas

2. web_fetch(url="https://bazzite.gg", mode="highlights", query="NVIDIA driver support GTX 1060")
   → confirma driver 580 disponível no Bazzite

3. web_search("Nobara NVIDIA Pascal GTX 1060", engines="google", includeDomains=["reddit.com"])
   → descobre que Nobara dropou suporte Pascal

4. web_search_advanced("ProtonDB Linux distro NVIDIA", startPublishedDate="2026-01-01")
   → dados recentes de compatibilidade

5. web_fetch(url="https://archlinux.org/download/", mode="text", maxChars=2000)
   → confirma tamanho da ISO (1.5 GB)
```

## Testando via CLI (sem cliente MCP)

```bash
# Listar tools disponíveis
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

# Fazer uma busca
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_search","arguments":{"query":"Python asyncio tutorial","count":3}}}' | node dist/index.js

# Fazer web_fetch com highlights
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_fetch","arguments":{"url":"https://example.com","mode":"highlights","query":"example query"}}}' | node dist/index.js
```

## Streamable HTTP (alternativa ao stdio)

```bash
# Iniciar servidor HTTP
MCP_PORT=3000 node dist/http.js

# Health check
curl http://localhost:3000/health

# Usar via cliente MCP remoto
# opencode.json:
{
  "mcp": {
    "mcp-searxng-local": {
      "type": "remote",
      "url": "http://localhost:3000/mcp",
      "enabled": true
    }
  }
}
```
