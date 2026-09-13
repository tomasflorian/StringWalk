// schema.ts — a taxonomy, loaded after the fact.
//
// A SCHEMA IS LINES. A `.sch` file is a pile file: three strings, same parser,
// same merge. Every line is one edge of the tree, child on the left and parent
// on the right, written with the one relation this file reads as vertical:
//
//   ["ip", "kind, is-a, example, kind", "address"]
//
// It lives outside piles/ because anything in piles/ is loaded always, and a
// schema nobody named should not be putting `network` and `noise` in the root
// listing. Naming one is a separate act from having the lines.
//
// A SCHEMA MAY ONLY MERGE. IT MAY NEVER ASSERT. Every column a drawer builds
// could have been built by hand, by naming its members one at a time. It adds
// no lines, changes no value, and dropping it leaves every record identical —
// which is what makes it safe to load after the data, and safe to be wrong
// about. What it changes is which readings are one word away.
//
// A DRAWER NAME MAY NOT BE A KIND NAME. `ip` cannot be a drawer holding `ip`,
// because then typing `ip` would have two meanings and the bare kind would
// have no name left. Refused at load, not resolved by a rule.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse, readRelation } from "./stringwalk.js";

export interface Schema {
  name: string;
  root: string;
  children: Map<string, string[]>;     // a drawer -> what hangs off it
  kindsOf: Map<string, string[]>;      // a drawer -> every live kind under it
  drawers: string[];
  covered: string[];                   // every live kind the schema reaches
  unknown: string[];                   // members the pile has no kind for
  label: (kind: string) => string;     // a kind -> the drawer shown for it
}

export const schemaNames = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter(n => n.endsWith(".sch"))
    .map(n => n.replace(/\.sch$/, "")).sort() : [];

// The one relation read as vertical. Anything else in a .sch file is a line
// that belongs in a pile, not in a schema.
const VERTICAL = "is-a";

export function loadSchema(dir: string, name: string, kinds: Set<string>): Schema {
  const file = join(dir, name + ".sch");
  if (!existsSync(file)) throw new Error(`no schema named ${name}`);

  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();

  for (const line of parse(readFileSync(file, "utf8"))) {
    const rel = readRelation(line[1])!;
    if (rel.fwd.verb !== VERTICAL)
      throw new Error(`${name}: a schema line reads ${JSON.stringify(rel.fwd.verb)}` +
        `\n  every line is one edge: ["child", "kind, is-a, example, kind", "parent"]`);
    const [child, , up] = line;
    if (parent.has(child) && parent.get(child) !== up)
      throw new Error(`${name}: ${child} hangs off both ${parent.get(child)} and ${up}`);
    parent.set(child, up);
    const kids = children.get(up) ?? children.set(up, []).get(up)!;
    if (!kids.includes(child)) kids.push(child);
  }

  const roots = [...children.keys()].filter(d => !parent.has(d));
  if (!roots.length)
    throw new Error(`${name}: every drawer hangs off another one, so there is no top` +
      `\n  something in here is under itself`);
  if (roots.length > 1)
    throw new Error(`${name}: a schema has one top, this has ` +
      `${roots.length} — ${roots.join(", ")}`);
  const root = roots[0];

  // A DRAWER NAME IS NOT A KIND NAME.
  const clash = [...children.keys()].filter(d => kinds.has(d));
  if (clash.length)
    throw new Error(`${name}: ${clash.join(", ")} ` +
      `${clash.length === 1 ? "is" : "are"} both a drawer and a kind in the pile` +
      `\n  a drawer needs a name of its own, or typing it would mean two things`);

  // Every live kind under a drawer, at any depth. A member the pile has no kind
  // for is not an error — a schema is written for a reader, not for one pile —
  // it just reads zero, and `schema` says how many.
  const unknown: string[] = [];
  const kindsOf = new Map<string, string[]>();
  const under = (node: string, seen: Set<string>): string[] => {
    if (seen.has(node)) throw new Error(`${name}: ${node} is under itself`);
    const kids = children.get(node);
    if (!kids) {
      if (kinds.has(node)) return [node];
      if (!unknown.includes(node)) unknown.push(node);
      return [];
    }
    const got = kids.flatMap(k => under(k, new Set(seen).add(node)));
    kindsOf.set(node, [...new Set(got)]);
    return got;
  };
  under(root, new Set());

  // WHAT A KIND IS SHOWN AS is the top-level drawer covering it — the root's
  // own children. Deeper drawers stay typeable; they just are not the grain the
  // menu is drawn at, the same way a verb is typeable and not listed.
  const top = new Map<string, string>();
  for (const d of children.get(root) ?? [])
    for (const k of kindsOf.get(d) ?? (kinds.has(d) ? [d] : [])) if (!top.has(k)) top.set(k, d);

  return {
    name, root, children, kindsOf,
    drawers: [...children.keys()].sort(),
    covered: kindsOf.get(root) ?? [],
    unknown,
    label: (kind: string) => top.get(kind) ?? kind,
  };
}
