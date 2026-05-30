#!/usr/bin/env node
// build-examples.mjs — Build canonical example event stream by computing
// hash chain over input "shape" records that omit prev_hash + hash.
//
// Reads examples/<name>/source.json (array of event drafts), writes
// examples/<name>-stream.ndjson with proper prev_hash + hash fields.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ZERO_HASH = "0".repeat(64);

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

function sha256Hex(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

const examplesDir = new URL("../examples/", import.meta.url);
const entries = readdirSync(examplesDir);

for (const name of entries) {
  const dir = new URL(`./${name}/`, examplesDir);
  let s;
  try { s = statSync(dir); } catch { continue; }
  if (!s.isDirectory()) continue;
  const sourcePath = new URL("./source.json", dir);
  let drafts;
  try { drafts = JSON.parse(readFileSync(sourcePath, "utf8")); }
  catch { continue; }

  let prev = ZERO_HASH;
  const out = [];
  for (const draft of drafts) {
    const ev = { ...draft, prev_hash: prev };
    const hash = sha256Hex(canonicalize(ev));
    const sealed = { ...ev, hash };
    out.push(sealed);
    prev = hash;
  }
  const outPath = new URL(`../examples/${name}-stream.ndjson`, import.meta.url);
  writeFileSync(outPath, out.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
  console.log(`built ${name} (${out.length} events) → ${outPath.pathname}`);
}
