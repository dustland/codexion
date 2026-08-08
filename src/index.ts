#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { attachToCodex } from "./attach.js";

export { fetchTargets, isMainRendererTarget, waitForMainRenderer } from "./cdp/discovery.js";
export { CdpSession } from "./cdp/session.js";
export { formatWeeklyMeter } from "./ui/title-meter.js";
export { parseWeeklyUsage } from "./usage/parse.js";
export type { UsageProvider, UsageSnapshot } from "./usage/types.js";
export { attachToCodex };

export const codexion = {
  name: "Codexion",
  version: "0.1.0",
  firstFeature: "Sanity Meter",
} as const;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCli(process.argv.slice(2));
}

async function runCli(args: string[]): Promise<void> {
  const command = args[0] ?? "info";
  if (command === "info" || command === "--help" || command === "-h") {
    console.log(`${codexion.name} ${codexion.version} — ${codexion.firstFeature}`);
    console.log("Usage: codexion attach [--port 9341]");
    return;
  }

  if (command !== "attach") {
    throw new Error(`Unknown command: ${command}`);
  }

  const port = readPort(args.slice(1));
  const attached = await attachToCodex(port, {
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

function readPort(args: string[]): number {
  const portIndex = args.indexOf("--port");
  const value = portIndex === -1 ? (process.env.CODEXION_CDP_PORT ?? "9341") : args[portIndex + 1];
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid CDP port: ${value}`);
  }
  return port;
}
