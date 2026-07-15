# SearXNG on Termux (No Docker)

Run SearXNG natively on Android via [Termux](https://termux.dev) — no Docker required. Same port (4000) and JSON API as the Docker setup, so the MCP server works identically.

Tested on Samsung SM-S911B (aarch64, Android 16, Termux 0.118.3).

## Prerequisites

- [Termux](https://f-droid.org/en/packages/com.termux/) (F-Droid recommended)
- Node.js >= 20 (`pkg install nodejs`)
- Python 3.10+ (`pkg install python`)

## 0. Clone MCP Server

```bash
git clone https://github.com/dduartee/mcp-searxng-local ~/mcp-searxng-local
cd ~/mcp-searxng-local
npm install && npm run build
```

This gives you the MCP server binary and the start/stop scripts used in later steps.

## 1. System Dependencies

```bash
pkg update -y && pkg upgrade -y
pkg install -y libxslt binutils
```

`libxml2`, `libffi`, and `openssl` are typically pre-installed on Termux.

## 2. Clone SearXNG

```bash
git clone https://github.com/searxng/searxng ~/searxng-src
```

## 3. Virtual Environment & Python Dependencies

```bash
python -m venv ~/searxng-pyenv
source ~/searxng-pyenv/bin/activate

pip install -U pip setuptools wheel
pip install -U pyyaml msgspec typing-extensions pybind11 tzdata

cd ~/searxng-src
pip install --use-pep517 --no-build-isolation -e .
```

> `lxml` compiles from source on ARM64 (~2 min). `tzdata` is needed for engines like `bilibili`.

## 4. Configure SearXNG

```bash
mkdir -p ~/.config/searxng
SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

cat > ~/.config/searxng/settings.yml << SETTINGS
use_default_settings: true

general:
  debug: false
  instance_name: "SearXNG Termux"

search:
  safe_search: 0
  autocomplete: ""
  formats:
    - html
    - json

server:
  port: 4000
  bind_address: "127.0.0.1"
  secret_key: "${SECRET}"
  limiter: false
  image_proxy: false
  method: "GET"

valkey:
  url: false

ui:
  default_theme: simple

outgoing:
  request_timeout: 5.0
  enable_http2: true
SETTINGS
```

Key settings:
- **Port 4000** — matches MCP server default
- **formats: json** — required for MCP
- **limiter: false** — no Valkey/Redis on Termux
- **method: GET** — more compatible than POST

## 5. Start / Stop

The scripts `start-searxng.sh` and `stop-searxng.sh` are included in the MCP server repo (cloned in step 0).

```bash
cd ~/mcp-searxng-local

# Start (waits up to 30s for server readiness)
./start-searxng.sh

# Stop
./stop-searxng.sh
```

The start script uses `setsid` to survive shell exit.

### Manual start (without scripts)

```bash
source ~/searxng-pyenv/bin/activate
export SEARXNG_SETTINGS_PATH=~/.config/searxng/settings.yml
setsid python -m searx.webapp > ~/searxng.log 2>&1 &
sleep 30
curl -s "http://127.0.0.1:4000/"
```

## 6. Verify

```bash
# SearXNG directly
curl -s "http://127.0.0.1:4000/search?q=test&format=json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])), 'results')"

# Via MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_search","arguments":{"query":"test"}}}' \
  | node ~/mcp-searxng-local/dist/index.js
```

## 7. Configure MCP Client

Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mcp-searxng-local": {
      "type": "local",
      "command": ["node", "/data/data/com.termux/files/home/mcp-searxng-local/dist/index.js"],
      "enabled": true,
      "env": {
        "SEARXNG_HOST": "localhost",
        "SEARXNG_PORT": "4000"
      }
    }
  }
}
```

Restart your MCP client after editing.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on port 4000 | SearXNG not running | `./start-searxng.sh` |
| 0 results, all engines unresponsive | IP blocked by search providers | Normal on mobile IPs. MCP auto-falls back to public instances |
| `bilibili: can't register engine` | Missing timezone data | `pip install tzdata` in the SearXNG venv |
| `ahmia/torch: can't register engine` | Tor-only engines; expected | Safe to ignore — does not affect search |
| Server dies a few seconds after start | Process not detached from shell | Use `setsid` (handled by `start-searxng.sh`) |
| `X-Forwarded-For not set` warning | Bot detection expects proxy | Safe to ignore for local usage |

## Updating

```bash
# Update MCP server
cd ~/mcp-searxng-local && git pull && npm run build

# Update SearXNG
cd ~/searxng-src && git pull
source ~/searxng-pyenv/bin/activate
pip install --use-pep517 --no-build-isolation -e .

# Restart
~/mcp-searxng-local/stop-searxng.sh
~/mcp-searxng-local/start-searxng.sh
```
