#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
mode="preflight"
extensions_dir="${XDG_DATA_HOME:-$HOME/.local/share}/code-server/extensions"
user_data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/code-server"
browser_log=""

if [[ ${1-} == preflight || ${1-} == browser-log ]]; then
  mode="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extensions-dir) extensions_dir="$2"; shift 2 ;;
    --user-data-dir) user_data_dir="$2"; shift 2 ;;
    --browser-log) browser_log="$2"; shift 2 ;;
    *) echo "Usage: $0 [preflight|browser-log] [--extensions-dir DIR] [--user-data-dir DIR] [--browser-log FILE]" >&2; exit 2 ;;
  esac
done

doctor="${JACK_CODE_SERVER_DOCTOR:-$root_dir/out/node/aiDoctor.js}"
if [[ -n ${JACK_CODE_SERVER_NODE:-} ]]; then
  node_bin="$JACK_CODE_SERVER_NODE"
elif command -v node >/dev/null 2>&1; then
  node_bin="$(command -v node)"
elif [[ -x /usr/lib/code-server/lib/node ]]; then
  node_bin="/usr/lib/code-server/lib/node"
elif [[ -x /usr/local/lib/code-server/lib/node ]]; then
  node_bin="/usr/local/lib/code-server/lib/node"
else
  echo "Unable to find a Node.js runtime" >&2
  exit 1
fi
doctor_output="$(mktemp)"
trap 'rm -f "$doctor_output"' EXIT
"$node_bin" "$doctor" --extensions-dir "$extensions_dir" --user-data-dir "$user_data_dir" --json >"$doctor_output"
"$node_bin" -e 'const report=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(report.checks.some((check)=>check.status==="FAIL"))process.exit(1)' "$doctor_output"

if [[ "$mode" == preflight ]]; then
  echo "AI extension preflight passed; authenticated and browser stress checks remain pending."
  cat "$doctor_output"
  exit 0
fi

if [[ -z "$browser_log" || ! -f "$browser_log" ]]; then
  echo "browser-log mode requires --browser-log FILE" >&2
  exit 2
fi

if grep -Ein 'Render process gone|potential listener LEAK|RequestStore#acceptReply|ERR_NAME_NOT_RESOLVED.*vscode-cdn|insufficient resources|PendingMigrationError|EACCES.*codex-ipc' "$browser_log"; then
  echo "AI extension browser/runtime failure signature found" >&2
  exit 1
fi

echo "AI extension browser log contains no known failure signatures."
