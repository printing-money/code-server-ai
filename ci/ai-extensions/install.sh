#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
matrix="$root_dir/compatibility/ai-extensions.json"
command_name="${CODE_SERVER_BIN:-code-server}"
selection="${1:-all}"

if [[ ! -f "$matrix" ]]; then
  echo "Compatibility matrix is missing: $matrix" >&2
  exit 1
fi

if [[ "$selection" == versions ]]; then
  jq -r '.extensions[] | "\(.id) \(.testedVersion)"' "$matrix"
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
  version="$(jq -r --arg id "$extension_id" '.extensions[] | select(.id == $id) | .testedVersion' "$matrix")"
  if [[ -z "$version" || "$version" == null ]]; then
    echo "No tested version for $extension_id" >&2
    exit 1
  fi
  echo "Installing $extension_id@$version from Open VSX (verified publisher artifact)"
  "$command_name" --install-extension "$extension_id@$version"
done
