#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SCHEMA_URL =
  "https://raw.githubusercontent.com/mozilla/enterprise-firefox/enterprise-main/browser/components/enterprisepolicies/schemas/policies-schema.json";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = resolve(REPO_ROOT, "schema");
const SCHEMA_PATH = resolve(SCHEMA_DIR, "policies-schema.json");
const SOURCE_PATH = resolve(SCHEMA_DIR, ".source.json");

async function main() {
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
  }
  const raw = await res.text();
  const parsed = JSON.parse(raw);

  await mkdir(SCHEMA_DIR, { recursive: true });
  await writeFile(SCHEMA_PATH, raw);
  await writeFile(
    SOURCE_PATH,
    JSON.stringify(
      {
        url: SCHEMA_URL,
        fetchedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );

  const policyCount = Object.keys(parsed.properties ?? {}).length;
  console.log(`Schema synced: ${policyCount} top-level policies`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
