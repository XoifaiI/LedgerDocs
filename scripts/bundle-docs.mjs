// Concatenates every .mdx under content/docs into one plain text file.
// Sidebar order is taken from each meta.json, so the output reads top to bottom
// the way the site does. No dependencies.
//
//   node scripts/bundle-docs.mjs [outfile]

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "content/docs";
const OUT = process.argv[2] ?? "ledger-docs.txt";
const RULE = "=".repeat(78);

async function ordering(dir) {
  try {
    const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8"));
    return Array.isArray(meta.pages) ? meta.pages : null;
  } catch {
    return null;
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  const named = new Map();
  for (const entry of entries) {
    if (entry.name === "meta.json") continue;
    if (entry.isDirectory() || entry.name.endsWith(".mdx")) {
      named.set(entry.name.replace(/\.mdx$/, ""), entry);
    }
  }

  // meta.json decides the order; "---Label---" entries are separators, not pages
  const listed = (await ordering(dir)) ?? [];
  const order = listed.filter((name) => named.has(name));
  for (const name of [...named.keys()].sort()) {
    if (!order.includes(name)) order.push(name);
  }

  const files = [];
  for (const name of order) {
    const entry = named.get(name);
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function split(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { body: text.trim() };

  const front = match[1];
  return {
    title: front.match(/^title:\s*(.+)$/m)?.[1]?.trim(),
    description: front.match(/^description:\s*(.+)$/m)?.[1]?.trim(),
    body: text.slice(match[0].length).trim(),
  };
}

const files = await walk(ROOT);
const parts = [];

for (const path of files) {
  const { title, description, body } = split(await readFile(path, "utf8"));
  const head = [RULE, title ?? path];
  if (description) head.push(description);
  head.push(path.replace(/\\/g, "/"), RULE);
  parts.push(`${head.join("\n")}\n\n${body}`);
}

const text = parts.join("\n\n\n");
await writeFile(OUT, text, "utf8");

console.log(`${files.length} pages -> ${OUT} (${text.length} chars)`);
