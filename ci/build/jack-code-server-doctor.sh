#!/usr/bin/env sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
if [ ! -f "$root_dir/out/node/aiDoctor.js" ]; then
  root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
fi
exec node "$root_dir/out/node/aiDoctor.js" "$@"
