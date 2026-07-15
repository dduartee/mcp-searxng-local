#!/data/data/com.termux/files/usr/bin/bash
# Stop SearXNG on Termux
# NOTE: This script uses a Termux-specific shebang. It will not work on standard Linux.

PIDFILE=~/.searxng.pid

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    sleep 1
    echo "SearXNG stopped (PID $PID)."
  else
    echo "SearXNG not running (stale PID file)."
  fi
  rm -f "$PIDFILE"
else
  # Fallback: kill by process name
  PIDS=$(pgrep -f "python -m searx.webapp" 2>/dev/null)
  if [ -n "$PIDS" ]; then
    kill $PIDS
    sleep 1
    echo "SearXNG killed."
  else
    echo "SearXNG not running."
  fi
fi
