import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CODEXION_VERSION } from "../src/version.js";

describe("Codexion version", () => {
  it("matches package.json", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      version?: unknown;
    };

    expect(CODEXION_VERSION).toBe(packageJson.version);
  });
});
