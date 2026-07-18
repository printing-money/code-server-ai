# Jack Code Server

Jack Code Server is a thin, reproducible code-server distribution that keeps
the upstream VS Code web runtime and adds the small compatibility layer needed
by official AI extensions such as OpenAI Codex and Claude Code.

The current release line is `4.129.0-jack.1`. Install verified publisher
artifacts from the Open VSX gallery at their tested versions with:

```sh
./ci/ai-extensions/install.sh all
./out/node/aiDoctor.js --json
```

The Docker image is published as
`ghcr.io/printing-money/jack-code-server:4.129.0-jack.1` after the release
workflow is run. See [docs/ai-extensions.md](docs/ai-extensions.md) for
runtime requirements, trust/authentication steps, and verification commands.

Jack keeps the VS Code application/data folder names compatible with existing
code-server installations. It does not redistribute modified VSIX files; the
installer downloads the verified Open VSX artifacts at the pinned versions in
`compatibility/ai-extensions.json`.
