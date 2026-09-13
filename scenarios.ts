#!/usr/bin/env node
// scenarios.ts — replay saved sessions and print them as text you can diff.
//
//   npx tsx scenarios.ts > check/scenarios.txt
//   git diff check/scenarios.txt          did anything move?
//
// A scenario is a SESSION — the commands you typed, kept by `save <name>`. So
// this drives the real shell through its own front door and covers path
// resolution, matching, the tree, the menus and the table, not just the engine.
//
// It runs against whatever is in piles/, deliberately: add a line and the diff
// shows which readings it changed, which is worth as much as the regression.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const HERE = import.meta.dirname;
const DIR = join(HERE, "scenarios");
const files = existsSync(DIR) ? readdirSync(DIR).filter(n => n.endsWith(".sw")).sort() : [];

if (!files.length) {
  console.log("no scenarios yet — play in `npx tsx sw.ts`, then `save <name>`.");
  process.exit(0);
}

for (const file of files) {
  // On stdin, exactly as piping commands by hand does — nothing the shell
  // knows is a test.
  const out = execFileSync("npx", ["tsx", join(HERE, "sw.ts")], {
    input: readFileSync(join(DIR, file), "utf8"),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  console.log(`=== ${file.replace(/\.sw$/, "")} ===\n`);
  console.log(out.replace(/\n+$/, "") + "\n");
}
