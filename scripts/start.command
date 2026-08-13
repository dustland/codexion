#!/bin/zsh

set -euo pipefail

root="${0:A:h:h}"
port="${CODEXION_CDP_PORT:-9341}"
data_dir="$HOME/Library/Application Support/Codexion"
pid_file="$data_dir/codexion.pid"
log_file="$data_dir/codexion.log"

mkdir -p "$data_dir"

if [[ ! -f "$root/dist/index.js" ]]; then
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "Codexion needs pnpm to build from source." >&2
    exit 1
  fi
  pnpm --dir "$root" build
fi

if [[ -f "$pid_file" ]]; then
  existing_pid="$(<"$pid_file")"
  if [[ "$existing_pid" == <-> ]] && kill -0 "$existing_pid" 2>/dev/null; then
    echo "Codexion is already running (PID $existing_pid)."
    exit 0
  fi
  rm -f "$pid_file"
fi

nohup node "$root/dist/index.js" start --port "$port" >"$log_file" 2>&1 < /dev/null &
codexion_pid="$!"
echo "$codexion_pid" > "$pid_file"

echo "Codexion is preparing Codex Desktop…"
for _ in {1..140}; do
  if /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$port/json/version" >/dev/null 2>&1; then
    echo "Codexion is ready. Sanity Meter will appear in Codex Desktop."
    exit 0
  fi
  if ! kill -0 "$codexion_pid" 2>/dev/null; then
    echo "Codexion could not start:" >&2
    tail -n 20 "$log_file" >&2
    exit 1
  fi
  sleep 0.25
done

echo "Codexion timed out. See $log_file" >&2
exit 1
