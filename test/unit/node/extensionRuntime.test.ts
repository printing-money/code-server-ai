import { promises as fs } from "fs"
import * as os from "os"
import * as path from "path"

describe("prepareExtensionRuntime", () => {
  const originalEnvironment = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnvironment }
    jest.resetModules()
  })

  it("creates a private runtime directory from XDG_RUNTIME_DIR", async () => {
    const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jack-runtime-"))
    process.env.XDG_RUNTIME_DIR = runtimeRoot
    delete process.env.JACK_CODE_SERVER_TMPDIR
    delete process.env.JACK_CODE_SERVER_DISABLE_RUNTIME_ISOLATION

    const { prepareExtensionRuntime } = await import("../../../src/node/extensionRuntime")
    const runtime = await prepareExtensionRuntime()
    expect(runtime).toContain(runtimeRoot)
    expect(process.env.TMPDIR).toBe(runtime)
    expect((await fs.stat(runtime!)).mode & 0o777).toBe(0o700)
  })

  it("honors an explicit runtime directory", async () => {
    const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "jack-runtime-"))
    process.env.JACK_CODE_SERVER_TMPDIR = path.join(runtime, "explicit")
    const { prepareExtensionRuntime } = await import("../../../src/node/extensionRuntime")
    await expect(prepareExtensionRuntime()).resolves.toBe(process.env.JACK_CODE_SERVER_TMPDIR)
  })

  it("falls back when XDG_RUNTIME_DIR is not writable", async () => {
    process.env.XDG_RUNTIME_DIR = "/sys/jack-code-server-runtime"
    delete process.env.JACK_CODE_SERVER_TMPDIR
    const { prepareExtensionRuntime } = await import("../../../src/node/extensionRuntime")
    const runtime = await prepareExtensionRuntime()
    expect(runtime).toContain("/tmp/jack-code-server-")
  })

  it("can be disabled for compatibility", async () => {
    process.env.JACK_CODE_SERVER_DISABLE_RUNTIME_ISOLATION = "1"
    const { prepareExtensionRuntime } = await import("../../../src/node/extensionRuntime")
    await expect(prepareExtensionRuntime()).resolves.toBeUndefined()
  })
})
