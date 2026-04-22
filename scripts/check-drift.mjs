#!/usr/bin/env node
import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const POLICIES_DIR = join(__dirname, "../src/content/docs/reference/policies");

const RAW_UPSTREAM =
  "https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/components/enterprisepolicies/schemas/policies-schema.json";
const GH_UPSTREAM =
  "https://github.com/mozilla-firefox/firefox/blob/main/browser/components/enterprisepolicies/schemas/policies-schema.json";

const res = await fetch(RAW_UPSTREAM);
if (!res.ok) throw new Error(`Failed to fetch upstream: ${res.status}`);
const rawText = await res.text();
const upstream = new Set(Object.keys(JSON.parse(rawText).properties));

const lines = rawText.split("\n");
const lineNumbers = {};
for (const [i, line] of lines.entries()) {
  const match = line.match(/^\s+"(\w+)":/);
  if (match) lineNumbers[match[1]] ??= i + 1;
}

const files = await readdir(POLICIES_DIR);
const localBases = new Set(
  files
    .filter((f) => f.endsWith(".mdx"))
    .map(
      (f) =>
        f
          .replace(/\.mdx$/, "")
          .replace(/_Deprecated_?$/i, "")
          .split("_")[0],
    ),
);

const missing = [...upstream].filter((p) => !localBases.has(p)).sort();
const extra = [...localBases].filter((p) => !upstream.has(p)).sort();

console.log(`Upstream: ${upstream.size} policies  |  Local: ${localBases.size} policies\n`);

if (extra.length) {
  console.log(`Local policies not upstream (${extra.length}):`);
  extra.forEach((p) => console.log(`  - ${p}`));
} else {
  console.log("No local policies missing from upstream.");
}

console.log();

if (missing.length) {
  console.log(`Undocumented upstream policies (${missing.length}):`);
  missing.forEach((p) => {
    const line = lineNumbers[p];
    const url = line ? `${GH_UPSTREAM}#L${line}` : GH_UPSTREAM;
    console.log(`  + ${p} ${url}`);
  });
  console.log();
  process.exit(1);
} else {
  console.log("All upstream policies are covered locally.");
}
