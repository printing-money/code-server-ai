# AI extension acceptance

The compatibility matrix intentionally separates installation from real agent
use. A release is not production-ready until the human checks below are
completed on the exact image and extension versions in the matrix.

## Preflight

Run this on the server after installing the pinned extensions:

```sh
./ci/ai-extensions/acceptance.sh preflight
```

The command must not report `FAIL`. `WARN` entries for pending authenticated
or stress stages are expected before the manual checks.

## Manual browser checks

Use HTTPS, open a trusted workspace, and sign in again if the credential file is
stale. Record the exact browser and commit used.

1. Open the Codex or Claude panel in one tab.
2. Send a prompt that reads a file, edits it, and runs a harmless terminal command.
3. Confirm the response completes and the tool approval path works.
4. Repeat after a page reload and after starting a second thread.
5. Keep two tabs active for 30 minutes, then repeat with six same-origin tabs.
6. Export browser console logs and run `./ci/ai-extensions/acceptance.sh browser-log --browser-log FILE`.

Acceptance fails on a renderer crash, a frozen workbench, an app-server IPC
error, an expired-token loop after re-login, or any known webview resource
failure signature. Do not patch an installed VSIX in place; preserve the exact
artifact and logs for the next compatibility decision.

## Current status

Codex activation has been verified on the previous Jack test instance. Its
authenticated request and single/multi-tab stability stages remain pending.
Claude Code is installation-verified only. Update
`compatibility/ai-extensions.json` only after repeating this checklist on the
new release.
