#!/usr/bin/env sh
set -eu

runtime_dir="${JACK_CODE_SERVER_TMPDIR:-/tmp/jack-code-server-$(id -u)/tmp}"
mkdir -p "$runtime_dir"
chmod 700 "$runtime_dir"
export TMPDIR="$runtime_dir"
export TMP="$runtime_dir"
export TEMP="$runtime_dir"
export JACK_CODE_SERVER_ALLOW_GLOBAL_NAVIGATOR=1

settings_source=/usr/local/share/jack-code-server/settings.json
settings_target="${XDG_DATA_HOME:-$HOME/.local/share}/code-server/User/settings.json"
if [ -f "$settings_source" ] && [ ! -f "$settings_target" ]; then
  mkdir -p "$(dirname "$settings_target")"
  cp "$settings_source" "$settings_target"
fi

exec /usr/bin/entrypoint.sh "$@"
