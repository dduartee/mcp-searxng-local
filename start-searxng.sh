#!/data/data/com.termux/files/usr/bin/bash
# Start SearXNG on Termux (local, no Docker)
# NOTE: This script uses a Termux-specific shebang. It will not work on standard Linux.

SEARXNG_PORT=${SEARXNG_PORT:-4000}
LOGFILE=~/searxng.log
PIDFILE=~/.searxng.pid

# Kill existing if running
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "SearXNG already running (PID $OLD_PID). Stopping..."
    kill "$OLD_PID" 2>/dev/null
    sleep 2
  fi
  rm -f "$PIDFILE"
fi

# Start in background with setsid to survive shell exit
setsid bash -c "
  source ~/searxng-pyenv/bin/activate
  export SEARXNG_SETTINGS_PATH=~/.config/searxng/settings.yml
  exec python -m searx.webapp
" >"$LOGFILE" 2>&1 &

echo $! > "$PIDFILE"
echo "SearXNG starting (PID $(cat $PIDFILE)). Waiting up to 30s..."

# Wait for server to be ready
for i in $(seq 1 30); do
  sleep 1
  if curl -s -o /dev/null "http://127.0.0.1:${SEARXNG_PORT}/" 2>/dev/null; then
    echo "SearXNG ready on http://127.0.0.1:${SEARXNG_PORT}"
    exit 0
  fi
done

echo "SearXNG may still be starting. Check: curl http://127.0.0.1:${SEARXNG_PORT}/"
echo "Logs: tail -f $LOGFILE"
exit 1
