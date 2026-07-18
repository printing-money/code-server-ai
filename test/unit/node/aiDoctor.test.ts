import { promises as fs } from "fs"
import * as os from "os"
import * as path from "path"

describe("runAiDoctor", () => {
  it("checks the installed Codex extension and app-server log", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jack-doctor-"))
    const extensions = path.join(root, "extensions", "openai.chatgpt")
    const userData = path.join(root, "user-data", "logs", "session")
    await fs.mkdir(extensions, { recursive: true })
    await fs.mkdir(userData, { recursive: true })
    await fs.writeFile(path.join(extensions, "package.json"), JSON.stringify({ version: "26.623.141536" }))
    await fs.writeFile(path.join(userData, "Codex.log"), "Activating\napp-server Initialize received id=1\n")

    const { runAiDoctor } = await import("../../../src/node/aiDoctor")
    const report = await runAiDoctor([
      "--extensions-dir",
      path.join(root, "extensions"),
      "--user-data-dir",
      path.join(root, "user-data"),
      "--json",
    ])
    expect(report.release).toMatch(/jack/)
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "OpenAI Codex", status: "PASS" }),
        expect.objectContaining({ name: "Codex app-server", status: "PASS" }),
      ]),
    )
  })
})
