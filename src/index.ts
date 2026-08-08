#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export { formatWeeklyMeter } from "./ui/title-meter.js";
export type { UsageProvider, UsageSnapshot } from "./usage/types.js";

export const codexion = {
  name: "Codexion",
  version: "0.1.0",
  firstFeature: "Sanity Meter",
} as const;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`${codexion.name} ${codexion.version} — ${codexion.firstFeature}`);
}
