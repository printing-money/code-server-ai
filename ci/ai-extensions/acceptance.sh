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
doctor_output="$(mktemp)"
trap 'rm -f "$doctor_output"' EXIT
node "$doctor" --extensions-dir "$extensions_dir" --user-data-dir "$user_data_dir" --json >"$doctor_output"
jq -e '[.checks[] | select(.status == "FAIL")] | length == 0' "$doctor_output" >/dev/null

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
