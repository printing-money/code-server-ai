# AI extension compatibility

## Runtime contract

Each server process assigns extensions a private 0700 temporary directory and
exports it as `TMPDIR`, `TMP`, and `TEMP`. This prevents Codex's app-server IPC
socket from colliding with a root-owned shared `/tmp` directory. Set
`JACK_CODE_SERVER_TMPDIR` to override it, or
`JACK_CODE_SERVER_DISABLE_RUNTIME_ISOLATION=1` only for compatibility tests.

Codex and Claude Code are installed from Open VSX using verified OpenAI and
Anthropic publisher artifacts. The tested versions, required host commands,
and credential locations live in `compatibility/ai-extensions.json`; no
modified extension bundle is included. code-server's own FAQ explains why its
default gallery is Open VSX rather than Microsoft's Marketplace.

## Install and verify

```sh
./ci/ai-extensions/install.sh versions
./ci/ai-extensions/install.sh all
./out/node/aiDoctor.js --extensions-dir ~/.local/share/code-server/extensions \
  --user-data-dir ~/.local/share/code-server --json
```

Open a trusted workspace before using extensions that execute tools. Sign in
to Codex or Claude Code in the extension UI; a stale local refresh token is a
warning, not a reason to bypass runtime isolation. The doctor reports an
app-server initialization line when the extension has started successfully.
Run [the acceptance checklist](ai-extension-acceptance.md) before calling the
release production-ready.

## Container

Run the published image with a persistent workspace and a writable home:

```sh
docker run --rm -p 8080:8080 -v "$PWD:/home/coder/project" \
  ghcr.io/printing-money/jack-code-server:4.129.0-jack.1
```

The container includes `git` and `bubblewrap`, but credentials should be
provided through the user home or an approved secret mount rather than baked
into an image. Keep outbound HTTPS available for Open VSX downloads and AI
API requests.
