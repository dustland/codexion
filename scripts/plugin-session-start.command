#!/bin/zsh

set -u

root="${PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
port="${CODEXION_CDP_PORT:-9341}"
app="${CODEXION_APP_PATH:-/Applications/ChatGPT.app}"
data_dir="${PLUGIN_DATA:-${TMPDIR:-/tmp}/codexion}"
pid_file="$data_dir/codexion-helper.pid"
log_file="$data_dir/codexion-helper.log"

mkdir -p "$data_dir" 2>/dev/null || true

if [[ -f "$pid_file" ]]; then
  helper_pid="$(<"$pid_file")"
  if [[ "$helper_pid" == <-> ]] && kill -0 "$helper_pid" 2>/dev/null; then
    exit 0
  fi
  rm -f "$pid_file"
fi

if /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$port/json/version" >/dev/null 2>&1; then
  :
elif [[ ! -d "$app" ]]; then
  echo "Codexion could not find the desktop app at $app" >&2
  exit 0
else
  echo "Codexion is launching a CDP-enabled desktop instance on 127.0.0.1:$port"
  /usr/bin/open -na "$app" --args "--remote-debugging-port=$port" >/dev/null 2>&1 &
fi

echo "Codexion is starting the standalone helper; log: $log_file"
nohup /bin/zsh "$root/scripts/start-codexion-helper.command" >"$log_file" 2>&1 < /dev/null &
echo "$!" > "$pid_file"
