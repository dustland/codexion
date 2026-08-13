#!/bin/zsh

set -euo pipefail

root="${0:A:h:h}"
port="${CODEXION_CDP_PORT:-9341}"

if [[ ! -f "$root/dist/index.js" ]]; then
  pnpm --dir "$root" build
fi

exec node "$root/dist/index.js" doctor --port "$port"
