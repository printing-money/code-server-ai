#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
matrix="$root_dir/compatibility/ai-extensions.json"
command_name="${CODE_SERVER_BIN:-code-server}"
selection="${1:-all}"

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

if [[ ! -f "$matrix" ]]; then
  echo "Compatibility matrix is missing: $matrix" >&2
  exit 1
fi

if [[ "$selection" == versions ]]; then
  MATRIX_PATH="$matrix" "$node_bin" -e 'const matrix = JSON.parse(require("fs").readFileSync(process.env.MATRIX_PATH, "utf8")); for (const extension of matrix.extensions) console.log(`${extension.id} ${extension.testedVersion}`)'
  exit 0
fi

case "$selection" in
  codex) ids=(openai.chatgpt) ;;
  claude) ids=(anthropic.claude-code) ;;
  all) ids=(openai.chatgpt anthropic.claude-code) ;;
  *)
    echo "Usage: $0 [codex|claude|all|versions]" >&2
    exit 2
    ;;
esac

for extension_id in "${ids[@]}"; do
  version="$(MATRIX_PATH="$matrix" EXTENSION_ID="$extension_id" "$node_bin" -e 'const matrix = JSON.parse(require("fs").readFileSync(process.env.MATRIX_PATH, "utf8")); const extension = matrix.extensions.find((item) => item.id === process.env.EXTENSION_ID); if (extension) console.log(extension.testedVersion)')"
  if [[ -z "$version" || "$version" == null ]]; then
    echo "No tested version for $extension_id" >&2
    exit 1
  fi
  echo "Installing $extension_id@$version from Open VSX (verified publisher artifact)"
  "$command_name" --install-extension "$extension_id@$version"
done
