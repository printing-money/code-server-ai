ARG BASE_IMAGE=codercom/code-server:4.129.0
FROM ${BASE_IMAGE}

USER root
COPY out/node /usr/lib/code-server/out/node
COPY compatibility /usr/lib/code-server/compatibility
COPY ci/ai-extensions /usr/lib/code-server/ci/ai-extensions
COPY deploy/docker/canary/entrypoint.sh /usr/local/bin/jack-code-server-entrypoint
COPY deploy/docker/canary/settings.json /usr/local/share/jack-code-server/settings.json

RUN chmod 755 \
  /usr/local/bin/jack-code-server-entrypoint \
  /usr/lib/code-server/out/node/entry.js \
  /usr/lib/code-server/out/node/aiDoctor.js \
  /usr/lib/code-server/ci/ai-extensions/install.sh \
  /usr/lib/code-server/ci/ai-extensions/acceptance.sh \
  && /usr/lib/code-server/lib/node -e 'const fs=require("fs");const file="/usr/lib/code-server/lib/vscode/product.json";const product=JSON.parse(fs.readFileSync(file,"utf8"));product.nameShort="Jack Code Server";product.nameLong="Jack Code Server";product.codeServerVersion="4.129.0-jack.1-canary";product.trustedExtensionAuthAccess=[...new Set([...(product.trustedExtensionAuthAccess||[]),"openai.chatgpt","anthropic.claude-code"])];fs.writeFileSync(file,JSON.stringify(product,null,2)+"\n")'

USER 1000
ENTRYPOINT ["/usr/local/bin/jack-code-server-entrypoint"]
