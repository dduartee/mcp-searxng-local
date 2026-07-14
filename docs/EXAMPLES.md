# Usage Examples

## Basic: simple search

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

Returns results from Google, DuckDuckGo, Brave, Wikipedia with formatted snippets.

## With engine filter

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

Uses only Wikipedia and arXiv. If any engine is unavailable, the response includes:

```
## Unavailable engines
- brave: Suspended: too many requests
```

## With domain filter

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

Restricts to official domains, excludes social media.

## With date filter

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

Only results with publication date from 2026 onward. Results without a date are excluded.

## Web Fetch: full text mode

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

Returns the full page as clean markdown (no scripts, nav, footer).

## Web Fetch: highlights mode

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

Extracts only relevant paragraphs. Typical response:

```markdown
# Preboot Execution Environment - ArchWiki
Source: https://wiki.archlinux.org/title/Preboot_Execution_Environment

dhcp-boot=/boot/syslinux/lpxelinux.0

pxe-service=X86-64_EFI, "Boot from network X86-64 EFI", ipxe.efi

archiso_nfs_srv=${pxeserver}:/mnt/archiso

> Relevant excerpts (341 of 15197 characters, ~98% smaller).
```

## Advanced search with all filters

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

## Real agent workflow

Example of how an AI agent uses the tools in sequence:

```
1. web_search("best Linux distro for gaming NVIDIA 2026", count=10)
   → 10 snippets of candidate distros

2. web_fetch(url="https://bazzite.gg", mode="highlights", query="NVIDIA driver support GTX 1060")
   → confirms driver 580 available on Bazzite

3. web_search("Nobara NVIDIA Pascal GTX 1060", engines="google", includeDomains=["reddit.com"])
   → discovers Nobara dropped Pascal support

4. web_search_advanced("ProtonDB Linux distro NVIDIA", startPublishedDate="2026-01-01")
   → recent compatibility data

5. web_fetch(url="https://archlinux.org/download/", mode="text", maxChars=2000)
   → confirms ISO size (1.5 GB)
```

## Testing via CLI (without MCP client)

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

# Perform a search
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_search","arguments":{"query":"Python asyncio tutorial","count":3}}}' | node dist/index.js

# Perform web_fetch with highlights
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_fetch","arguments":{"url":"https://example.com","mode":"highlights","query":"example query"}}}' | node dist/index.js
```

## Streamable HTTP (alternative to stdio)

```bash
# Start HTTP server
MCP_PORT=3000 node dist/http.js

# Health check
curl http://localhost:3000/health

# Use via remote MCP client
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
