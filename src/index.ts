#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { attachToCodex } from "./attach.js";
import { diagnoseCodex, startCodexWithCdp } from "./lifecycle/codex-app.js";

export { fetchTargets, isMainRendererTarget, waitForMainRenderer } from "./cdp/discovery.js";
export { CdpSession } from "./cdp/session.js";
export { diagnoseCodex, startCodexWithCdp } from "./lifecycle/codex-app.js";
export { formatWeeklyMeter } from "./ui/title-meter.js";
export { createAppServerUsageProvider } from "./usage/app-server-provider.js";
export { parseWeeklyUsage } from "./usage/parse.js";
export type { UsageProvider, UsageSnapshot } from "./usage/types.js";
export { attachToCodex };

export const codexion = {
  name: "Codexion",
  version: "0.1.0",
  firstFeature: "Sanity Meter",
} as const;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Codexion] ${message}`);
    process.exitCode = 1;
  });
}

async function runCli(args: string[]): Promise<void> {
  const command = args[0] ?? "info";
  if (command === "info" || command === "--help" || command === "-h") {
    console.log(`${codexion.name} ${codexion.version} — ${codexion.firstFeature}`);
    console.log(
      "Usage: codexion <start|attach|doctor> [--port 9341] [--app /Applications/ChatGPT.app]",
    );
    return;
  }

  if (!new Set(["start", "attach", "doctor"]).has(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  const port = readPort(args.slice(1));
  const appPath = readOption(args.slice(1), "--app");
  const lifecycleOptions = appPath === undefined ? { port } : { appPath, port };
  if (command === "doctor") {
    console.log(JSON.stringify(await diagnoseCodex(lifecycleOptions), null, 2));
    return;
  }

  if (command === "start") {
    console.log("[Codexion] preparing Codex Desktop with local CDP...");
    const result = await startCodexWithCdp(lifecycleOptions);
    console.log(
      `[Codexion] Codex Desktop ${result.restarted ? "restarted" : "already ready"} on CDP port ${port}`,
    );
  }

  const attached = await attachToCodex(port, {
    ...(appPath === undefined ? {} : { appPath }),
    log: (message) => console.log(`[Codexion] ${message}`),
  });
  console.log(`[Codexion] watching weekly usage on CDP port ${port}`);

  const shutdown = () => {
    attached.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  await new Promise<void>(() => undefined);
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function readPort(args: string[]): number {
  const portIndex = args.indexOf("--port");
  const value = portIndex === -1 ? (process.env.CODEXION_CDP_PORT ?? "9341") : args[portIndex + 1];
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid CDP port: ${value}`);
  }
  return port;
}
