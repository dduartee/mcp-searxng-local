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
