#!/bin/zsh

set -u

port="${CODEXION_CDP_PORT:-9341}"
app="${CODEXION_APP_PATH:-/Applications/ChatGPT.app}"

if /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$port/json/version" >/dev/null 2>&1; then
  exit 0
fi

if [[ ! -d "$app" ]]; then
  echo "Codexion could not find the desktop app at $app" >&2
  exit 0
fi

echo "Codexion is launching a CDP-enabled desktop instance on 127.0.0.1:$port"
/usr/bin/open -na "$app" --args "--remote-debugging-port=$port" >/dev/null 2>&1 &
