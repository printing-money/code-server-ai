# Jack Code Server Canary

This deployment overlays the Jack compatibility runtime and acceptance tools on the official `codercom/code-server:4.129.0` image. It is a test artifact, not a replacement for the published release image.

From the repository root, create `deploy/docker/canary/.env` with a `JACK_CODE_SERVER_PASSWORD` value, then run:

```sh
docker compose --env-file deploy/docker/canary/.env -f deploy/docker/canary/compose.yaml up -d --build
```

The included Caddy configuration uses an internal CA for testing at `jack-vscode.81-70-32-51.sslip.io`. When the host firewall is not open, use an SSH tunnel:

```sh
ssh -N -L 9443:127.0.0.1:443 root@81.70.32.51
```

Open `https://jack-vscode.81-70-32-51.sslip.io:9443` and accept or trust Caddy's local CA. For a public deployment, replace `tls internal` with a certificate trusted by clients and open TCP 80/443 in the cloud firewall.

Run the in-container checks after startup:

```sh
docker exec -u coder jack-code-server-canary /usr/lib/code-server/ci/ai-extensions/acceptance.sh preflight
docker exec -u coder jack-code-server-canary /usr/bin/code-server --list-extensions --show-versions
```
