#!/usr/bin/env node
import { logger } from "@coder/logger"
import { spawnSync } from "child_process"
import { promises as fs } from "fs"
import * as net from "net"
import * as os from "os"
import * as path from "path"
import { rootPath } from "./constants"
import { prepareExtensionRuntime } from "./extensionRuntime"
import { paths } from "./util"

type ExtensionSpec = {
  id: string
  displayName: string
  testedVersion: string
  gallery?: string
  publisherVerified?: boolean
  verification?: Record<string, string>
  commands?: string[]
  credentialFiles?: string[]
}

type Matrix = {
  release: string
  vscode: string
  extensions: ExtensionSpec[]
}

export type DoctorCheck = {
  name: string
  status: "PASS" | "WARN" | "FAIL"
  message: string
}

export type DoctorReport = {
  release: string
  checks: DoctorCheck[]
  ok: boolean
}

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const readJson = async <T>(filePath: string): Promise<T | undefined> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T
  } catch {
    return undefined
  }
}

const commandExists = (command: string): boolean => {
  const result = spawnSync("sh", ["-c", `command -v ${JSON.stringify(command)}`], { stdio: "ignore" })
  return result.status === 0
}

const walk = async (directory: string): Promise<string[]> => {
  if (!(await exists(directory))) return []
  const result: string[] = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await walk(entryPath)))
    else result.push(entryPath)
  }
  return result
}

const latestCodexLog = async (userDataDir: string): Promise<string | undefined> => {
  const files = (await walk(path.join(userDataDir, "logs"))).filter((filePath) => /codex\.log$/i.test(filePath))
  let latest: { filePath: string; mtime: number } | undefined
  for (const filePath of files) {
    const stat = await fs.stat(filePath)
    if (!latest || stat.mtimeMs > latest.mtime) latest = { filePath, mtime: stat.mtimeMs }
  }
  return latest?.filePath
}

const checkSocket = async (directory: string): Promise<boolean> => {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 })
  const socketPath = path.join(directory, `doctor-${process.pid}.sock`)
  const server = net.createServer()
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(socketPath, resolve)
    })
    return true
  } catch {
    return false
  } finally {
    server.close()
    await fs.rm(socketPath, { force: true }).catch(() => undefined)
  }
}

const parseArgs = (argv: string[]) => {
  let extensionsDir = path.join(paths.data, "extensions")
  let userDataDir = paths.data
  let json = false
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--json") json = true
    else if (argument === "--extensions-dir") extensionsDir = argv[++index] || extensionsDir
    else if (argument.startsWith("--extensions-dir=")) extensionsDir = argument.slice("--extensions-dir=".length)
    else if (argument === "--user-data-dir") userDataDir = argv[++index] || userDataDir
    else if (argument.startsWith("--user-data-dir=")) userDataDir = argument.slice("--user-data-dir=".length)
  }
  return { extensionsDir: path.resolve(extensionsDir), userDataDir: path.resolve(userDataDir), json }
}

export async function runAiDoctor(argv = process.argv.slice(2)): Promise<DoctorReport> {
  const { extensionsDir, userDataDir, json } = parseArgs(argv)
  const matrix = await readJson<Matrix>(path.join(rootPath, "compatibility", "ai-extensions.json"))
  const checks: DoctorCheck[] = []
  if (!matrix) {
    checks.push({
      name: "compatibility matrix",
      status: "FAIL",
      message: "compatibility/ai-extensions.json is missing or invalid",
    })
    return { release: "unknown", checks, ok: false }
  }

  const runtime = (await prepareExtensionRuntime()) || process.env.TMPDIR || os.tmpdir()
  checks.push({
    name: "private extension runtime",
    status: (await checkSocket(runtime)) ? "PASS" : "FAIL",
    message: `${runtime} is available for extension IPC`,
  })

  for (const extension of matrix.extensions) {
    const extensionRoot = path.join(extensionsDir, extension.id)
    const packageFiles = (await walk(extensionsDir)).filter((filePath) =>
      filePath.endsWith(`${extension.id}/package.json`),
    )
    const manifestPath = (await exists(path.join(extensionRoot, "package.json")))
      ? path.join(extensionRoot, "package.json")
      : packageFiles[0]
    const manifest = manifestPath ? await readJson<{ version?: string }>(manifestPath) : undefined
    if (!manifest) {
      checks.push({ name: extension.displayName, status: "WARN", message: `${extension.id} is not installed` })
      continue
    }
    checks.push({
      name: extension.displayName,
      status: manifest.version === extension.testedVersion ? "PASS" : "WARN",
      message: `${extension.id}@${manifest.version || "unknown"} (tested ${extension.testedVersion})`,
    })
    for (const [stage, status] of Object.entries(extension.verification || {})) {
      if (status !== "verified") {
        checks.push({
          name: `${extension.displayName} ${stage}`,
          status: "WARN",
          message: `acceptance status is ${status}`,
        })
      }
    }
    for (const command of extension.commands || []) {
      checks.push({
        name: `${extension.displayName} prerequisite ${command}`,
        status: commandExists(command) ? "PASS" : "WARN",
        message: commandExists(command) ? `${command} is available` : `${command} is not installed`,
      })
    }
    for (const credential of extension.credentialFiles || []) {
      const credentialPath = credential.replace(/^~/, os.homedir())
      checks.push({
        name: `${extension.displayName} credentials`,
        status: (await exists(credentialPath)) ? "PASS" : "WARN",
        message: (await exists(credentialPath)) ? `${credentialPath} exists` : `${credentialPath} is missing`,
      })
    }
  }

  const codexLog = await latestCodexLog(userDataDir)
  if (codexLog) {
    const content = await fs.readFile(codexLog, "utf8")
    if (/app-server.*initialize|initialize received/i.test(content)) {
      checks.push({ name: "Codex app-server", status: "PASS", message: "Codex app-server initialized" })
    }
    if (/EACCES.*codex-ipc|PendingMigrationError/i.test(content)) {
      checks.push({ name: "Codex runtime errors", status: "FAIL", message: "Codex IPC or navigator migration failed" })
    }
    if (/401|expired|invalid.*refresh.*token/i.test(content)) {
      checks.push({
        name: "Codex authentication",
        status: "WARN",
        message: "Codex log contains an expired or invalid token",
      })
    }
  }

  const report: DoctorReport = {
    release: matrix.release,
    checks,
    ok: checks.every((check) => check.status !== "FAIL"),
  }
  if (json) process.stdout.write(`${JSON.stringify(report)}\n`)
  else checks.forEach((check) => process.stdout.write(`[${check.status}] ${check.name}: ${check.message}\n`))
  return report
}

if (require.main === module) {
  runAiDoctor().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
