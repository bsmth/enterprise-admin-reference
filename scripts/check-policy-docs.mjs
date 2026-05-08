#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SCHEMA_URL =
  "https://raw.githubusercontent.com/mozilla/enterprise-firefox/enterprise-main/browser/components/enterprisepolicies/schemas/policies-schema.json";

const POLICIES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/content/docs/reference/policies",
);

async function fetchSchema() {
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function listDocStems() {
  const entries = await readdir(POLICIES_DIR);
  return entries
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.slice(0, -".mdx".length));
}

function formatList(items) {
  return items
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((item) => ` - ${item}`)
    .join("\n");
}

async function main() {
  const schema = await fetchSchema();
  const policies = Object.keys(schema.properties ?? {});
  const policySet = new Set(policies);

  const docStems = await listDocStems();
  const docSet = new Set(docStems);

  const missing = policies.filter((name) => !docSet.has(name));
  const orphans = docStems.filter((stem) => !policySet.has(stem));
  const matchedCount = policies.length - missing.length;

  console.log(`Schema: ${policies.length} top-level policies`);
  console.log(`Docs: ${docStems.length} .mdx files\n`);
  console.log(`✅ ${matchedCount} top-level policies have matching docs\n`);

  if (missing.length === 0) {
    console.log("❌ Missing docs (0): none\n");
  } else {
    console.log(`❌ Missing docs (${missing.length}):`);
    console.log(formatList(missing) + "\n");
  }

  if (orphans.length === 0) {
    console.log("⚠️  Orphan .mdx files (0): none");
  } else {
    console.log(`⚠️  Orphan .mdx files — not top-level schema policies (${orphans.length}):`);
    console.log(formatList(orphans.map((stem) => `${stem}.mdx`)));
  }

  process.exit(missing.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(2);
});
