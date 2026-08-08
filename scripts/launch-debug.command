#!/bin/zsh

set -euo pipefail

port="${CODEXION_CDP_PORT:-9341}"
app="/Applications/ChatGPT.app"

if [[ ! -d "$app" ]]; then
  echo "ChatGPT.app was not found at $app" >&2
  exit 1
fi

echo "Launching ChatGPT with Codexion CDP on 127.0.0.1:$port"
exec /usr/bin/open -na "$app" --args "--remote-debugging-port=$port"
