#!/bin/zsh

set -u

root="${PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
port="${CODEXION_CDP_PORT:-9341}"

for _ in {1..60}; do
  if /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$port/json/list" >/dev/null 2>&1; then
    break
  fi
  /bin/sleep 0.5
done

if ! /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$port/json/list" >/dev/null 2>&1; then
  echo "Codexion helper could not find CDP on 127.0.0.1:$port" >&2
  exit 1
fi

if [[ ! -f "$root/dist/index.js" ]]; then
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "Codexion helper needs pnpm to build $root" >&2
    exit 1
  fi
  pnpm --dir "$root" build
fi

exec node "$root/dist/index.js" attach --port "$port"
