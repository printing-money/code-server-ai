import { logger } from "@coder/logger"
import { promises as fs } from "fs"
import * as os from "os"
import * as path from "path"

const isTruthy = (value: string | undefined): boolean => value === "1" || value === "true"

const userId = (): string => {
  return typeof process.getuid === "function" ? String(process.getuid()) : "user"
}

const candidates = (): string[] => {
  const explicit = process.env.JACK_CODE_SERVER_TMPDIR
  if (explicit) {
    return [path.resolve(explicit)]
  }

  if (process.platform === "win32") {
    return [path.join(os.tmpdir(), "jack-code-server", userId(), "tmp")]
  }

  const runtimeRoot = process.env.XDG_RUNTIME_DIR
  const fallbackRoot = "/tmp"
  const roots = runtimeRoot ? [runtimeRoot, fallbackRoot] : [fallbackRoot]
  return roots.map((root) => path.join(root, `jack-code-server-${userId()}`, "tmp"))
}

export async function prepareExtensionRuntime(): Promise<string | undefined> {
  if (isTruthy(process.env.JACK_CODE_SERVER_DISABLE_RUNTIME_ISOLATION)) {
    process.env.JACK_CODE_SERVER_ALLOW_GLOBAL_NAVIGATOR = "1"
    return undefined
  }

  const explicit = Boolean(process.env.JACK_CODE_SERVER_TMPDIR)
  let lastError: unknown
  for (const candidate of candidates()) {
    try {
      await fs.mkdir(candidate, { recursive: true, mode: 0o700 })
      await fs.chmod(candidate, 0o700)
      await fs.access(candidate)
      process.env.TMPDIR = candidate
      process.env.TMP = candidate
      process.env.TEMP = candidate
      process.env.JACK_CODE_SERVER_ALLOW_GLOBAL_NAVIGATOR = "1"
      return candidate
    } catch (error) {
      lastError = error
      if (explicit) {
        throw new Error(`Unable to use JACK_CODE_SERVER_TMPDIR=${candidate}: ${String(error)}`)
      }
      logger.warn(`Unable to use extension runtime directory ${candidate}; trying a fallback`)
    }
  }

  throw new Error(`Unable to create a private extension runtime directory: ${String(lastError)}`)
}
