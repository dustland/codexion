#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/extract-release-notes.mjs <version>");
  process.exit(1);
}

const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const lines = changelog.split(/\r?\n/);
const heading = new RegExp(`^## ${escapeRegExp(version)}(?:\\s+-\\s+.+)?$`);
const start = lines.findIndex((line) => heading.test(line));
if (start === -1) {
  console.error(`CHANGELOG.md has no release section for ${version}`);
  process.exit(1);
}

const endOffset = lines.slice(start + 1).findIndex((line) => /^##\s+/.test(line));
const end = endOffset === -1 ? lines.length : start + 1 + endOffset;
const body = lines.slice(start + 1, end).join("\n").trim();
if (!body) {
  console.error(`CHANGELOG.md release section for ${version} is empty`);
  process.exit(1);
}

process.stdout.write(`## What's changed\n\n${body}\n`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
