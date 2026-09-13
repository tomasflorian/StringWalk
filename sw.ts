#!/usr/bin/env node
// sw.ts — a shell for reading a pile.
//
//   npx tsx sw.ts                       start empty
//   npx tsx sw.ts scenarios/x.sw        start inside a saved reading
//   printf 'add hops ip\nadd next ip\ntable\n' | npx tsx sw.ts
//
// YOU TRAVERSE A TREE, AND FROM THE TREE YOU ADD WHAT YOU WANT. cd moves and
// add builds; nothing you have built goes away when you walk past it.
//
// Paths address positions in the tree. `/` is the pile, a segment is a step,
// `..` is the parent.
//
//   cd /Name/FirstName        move the cursor there
//   add Name                  add it at the cursor — and the cursor follows
//   add ../Age                add at the parent instead
//   add Name/First/Letter     a chain, creating as it goes
//
// A STEP IS A KIND, and the verb that reaches it is an optional qualifier:
//
//   host                 every way to a host from here
//   host resolves-to     only the one the dns export wrote
//   resolves-to host     the same, spelled the way a producer writes it
//
// One way in and it goes. More than one and it says what it would merge and
// waits, because taking all of them is a choice you should know you made.
//
// Nothing here only looks. A partial name adds nothing and lists what it
// matched, and at the root — the one place landing is destructive — naming
// asks twice before it replaces a reading.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { parse, build, readRelation, type Pile } from "./stringwalk.js";
import {
  begin, add as addStep, offers, rootOffers, routes, routeName,
  shape, shapeLines, relations, values,
  phrases, kindOf, kindValues, ANCHOR,
  type Table, type Column, type Step, type Offer,
} from "./table.js";
import { loadSchema, schemaNames, type Schema } from "./schema.js";
import { drawTable } from "./text.js";

const HERE = import.meta.dirname;
const PILES = join(HERE, "piles");
const SCHEMAS = join(HERE, "schemas");

const lines = readdirSync(PILES).filter(n => n.endsWith(".pile")).sort()
  .flatMap(n => parse(readFileSync(join(PILES, n), "utf8")));
const pile: Pile = build(lines);

// EVERY PHRASE IN THE PILE. `grows fruit` is how you ask for a backward step,
// and a phrase several relations answer to is one step, not a choice.
const said = new Set(phrases(pile));

// EVERY KIND ANYBODY NAMED — and so the names a drawer may not take.
const kindNames = new Set([...said].map(kindOf));

// A SCHEMA IS LOADED AFTER THE FACT AND CHANGES NOTHING IT IS LOADED OVER. It
// says which kinds are shown under one name, which changes what the menu offers
// and what a column you build from it is called. It never changes what a column
// contains, and a column already built keeps the name you typed for it.
let schema: Schema | null = null;
const label = (kind: string) => schema ? schema.label(kind) : kind;

// `null` focus is standing at the root, which is the pile: every value and
// every phrase, and naming one makes the first column.
let table: Table | null = null;
let focus: string | null = null;

// TWO THINGS ARE ASKED FOR TWICE. Naming a second thing at the root replaces
// the reading, and taking a kind that has more than one way in merges them. In
// both cases the first attempt says what would happen and does nothing; saying
// the same line again means it, and anything else cancels. Keyed by where and
// what, so a chain that trips twice makes progress on each repeat.
const confirmed = new Set<string>();
let lastLine = "";

// COLUMNS YOU STEP OVER RATHER THAN READ. Anchoring on one thing and walking out
// to another goes through columns that are a prerequisite rather than something
// you came for, and one of them can be a whole document. Held by column id, so
// it survives the tree growing around it and dies with the reading.
const short = new Set<string>();
const history: string[] = [];        // what you typed, so it can be kept

// --- steps ------------------------------------------------------------

// The token you would type to name the first column again — not its label,
// which says what the column holds rather than what was asked for.
const startedWith = (): string => table ? table.columns[0].step!.token : "";

const childrenOf = (t: Table, id: string): Column[] =>
  t.columns.filter(c => c.parent === id);

function pathOf(id: string | null): string {
  if (!table || id === null) return "/";
  const parts: string[] = [];
  let cur: string | null = id;
  while (cur && cur !== ANCHOR) {
    const col = table.columns.find(c => c.id === cur);
    if (!col?.step) break;
    parts.unshift(col.step.token);
    cur = col.parent;
  }
  return "/" + [startedWith(), ...parts].join("/");
}

// EVERYTHING ADDABLE SOMEWHERE. A kind is what you type; the ways in are only
// matchable, because listing them beside the kind is the noise this change
// exists to remove. `show` is that difference.
interface Opt {
  tok: string;        // what you type
  step: Step;         // the kind, and the phrases it turned out to name
  count: string;      // "13/29", or just a number at the root
  ways: number;       // how many phrases the token names
  members: string[];  // the kinds a drawer holds, empty when it is a kind
  made: boolean;      // a column that already exists
  header: string;     // what that existing column is called
  show: boolean;      // listed by `add`, or only reachable by typing it
}

// One offer becomes several ways to say the same thing: the kind alone, the
// kind narrowed by a verb, and the verb-first phrase, which is how a producer
// writes it and how every scenario saved before this typed it.
function optsOf(o: Offer, atRoot: boolean): Opt[] {
  // At the root there is nothing to be a fraction of yet — the count is how many
  // rows the first column would open with.
  const n = (have: number) => atRoot ? String(have) : `${have}/${o.of}`;
  const top: Opt = {
    tok: o.kind, step: { token: o.kind, phrases: o.ways.map(w => w.phrase) },
    count: n(o.have), ways: o.ways.length,
    members: o.drawer ? o.kinds.map(k => k.kind) : [],
    made: false, header: "", show: true,
  };
  const out: Opt[] = [top];
  for (const k of o.kinds) {
    // A KIND A DRAWER HOLDS IS STILL A NAME YOU CAN TYPE. It is only not listed
    // beside the drawer, exactly as a verb is not listed beside its kind.
    if (k.kind !== o.kind)
      out.push({ ...top, tok: k.kind, show: false, members: [],
        step: { token: k.kind, phrases: k.ways.map(w => w.phrase) },
        ways: k.ways.length, count: n(k.have) });
    for (const w of k.ways) {
      const one = { token: "", phrases: [w.phrase] };
      if (w.verb)
        out.push({ ...top, tok: `${k.kind} ${w.verb}`, show: false, members: [],
          step: { ...one, token: `${k.kind} ${w.verb}` }, ways: 1, count: n(w.have) });
      if (w.phrase !== k.kind)
        out.push({ ...top, tok: w.phrase, show: false, members: [],
          step: { ...one, token: w.phrase }, ways: 1, count: n(w.have) });
    }
  }
  return out;
}

// At the root the offers are over the whole pile, and a value is not among them:
// a reading begins with a relation or it does not begin.
function optionsAt(id: string | null): Opt[] {
  if (id === null)
    return rootOffers(pile, label).flatMap(o => optsOf(o, true))
      .map(o => ({ ...o, made: startedWith() === o.tok }));
  if (!table) return [];
  const made = new Map(childrenOf(table, id).map(c => [c.step!.token, c]));
  return [
    ...[...made].map(([tok, c]) => ({
      tok, step: c.step!, count: "", ways: c.step!.phrases.length, members: [],
      made: true, header: c.header, show: true,
    })),
    ...offers(pile, table, id, label)
      .flatMap(o => optsOf(o, false))
      .filter(o => !made.has(o.tok)),
  ];
}

// WHAT TAKING THIS WOULD MERGE. Printed when a kind has more than one way in,
// with the kind alone on top, because taking all of them is the default and the
// thing you say by repeating yourself.
function waysOf(opt: Opt, all: Opt[]): string[] {
  const kind = opt.step.token;
  // A DRAWER NARROWS TO THE KINDS IT HOLDS, a kind narrows to its verbs. One
  // level at a time either way: the ways into a drawer's members run to dozens
  // and listing them is the wall a schema exists to take down.
  const narrower = opt.members.length
    ? all.filter(o => opt.members.includes(o.tok))
    : all.filter(o => o.ways === 1 && o.tok.startsWith(kind + " "));
  const w = Math.max(kind.length, ...narrower.map(o => o.tok.length));
  return [
    `${kind} — ${opt.members.length ? many(opt.members.length, "kind")
                                    : many(opt.ways, "way")}`,
    `     ${kind.padEnd(w + 3)}${opt.count}   all of them`,
    ...narrower.map(o => `     ${o.tok.padEnd(w + 3)}${o.count}`),
  ];
}

// --- resolving a path -------------------------------------------------
//
// One walk, two modes. `cd` never creates: a path that is not there is a
// mistake, not an instruction. `add` creates every segment it needs, so a
// chain is one command and `../Age` is a sibling.

function resolve(path: string, create: boolean): { at: string | null } | { err: string } {
  let at: string | null = path.startsWith("/") ? null : focus;

  for (const seg of path.split("/").filter(p => p !== "" && p !== ".")) {
    if (seg === "..") {                 // the anchor's parent is the root
      at = at === null ? null : (table!.columns.find(c => c.id === at)?.parent ?? null);
      continue;
    }
    if (at === null) {                  // at the root a name is a kind
      if (table && startedWith() === seg) { at = ANCHOR; continue; }
      if (!create) return { err: `no such column: ${seg}` };
      const all = optionsAt(null);
      const pick = pickFrom(all, seg);
      if ("err" in pick) return pick;
      const opt = pick.opt;

      // Both warnings at once, because one repeat means both: what the merge
      // would take in, and what starting again would cost.
      const notes: string[] = [];
      if (opt.ways > 1) notes.push(...waysOf(opt, all));
      if (table) notes.push(
        `  ${oneLine(opt.tok)} at / would wipe the whole tree — ` +
        `${table.columns.length} column(s), ${shape(table)}`);
      if (notes.length && !confirmed.has("/" + opt.tok)) {
        confirmed.add("/" + opt.tok);
        return { err: notes.concat(
          "  say it again to mean it, anything else to cancel").join("\n") };
      }

      const losing = table ? table.columns.length : 0;
      short.clear();
      table = begin(pile, opt.step);
      if (losing) say(`  wiped ${losing} column(s)`);
      at = ANCHOR;
      continue;
    }
    const kids = childrenOf(table!, at);
    const kid = kids.find(c => c.step!.token === seg);
    if (kid) { at = kid.id; continue; }

    if (!create) {
      if (!kids.length) return { err: `nothing under here` };
      const pick = pickFrom(kids.map(c => ({
        tok: c.step!.token, step: c.step!, count: "", members: [],
        ways: c.step!.phrases.length, made: true, header: c.header, show: true,
      })), seg);
      if ("err" in pick) return pick;
      at = kids.find(c => c.step!.token === pick.opt.tok)!.id;
      continue;
    }

    const all = optionsAt(at);
    const pick = pickFrom(all, seg);
    if ("err" in pick) return pick;
    const opt = pick.opt;

    // ONE WAY IN AND IT JUST GOES. More than one and it says what it would
    // merge and waits, because that is the choice you did not know you made.
    const key = at + "/" + opt.tok;
    if (opt.ways > 1 && !opt.made && !confirmed.has(key)) {
      confirmed.add(key);
      return { err: waysOf(opt, all).concat(
        `  say it again for all of them, or narrow it`).join("\n") };
    }

    table = addStep(pile, table!, at, opt.step);
    at = table.columns.find(c => c.parent === at && c.step!.token === opt.tok)!.id;
  }
  return { at };
}

// Exact, then as a substring — so a miss becomes a filtered list rather than a
// refusal. An exact match never lists, so every string stays reachable however
// long the match list would be.
function pickFrom(opts: Opt[], seg: string):
  { opt: Opt } | { err: string } {
  const exact = opts.find(o => o.tok === seg || (o.made && o.header === seg));
  if (exact) return { opt: exact };

  const like = opts.filter(o => o.tok.toLowerCase().includes(seg.toLowerCase()));
  if (like.length === 1) return { opt: like[0] };
  if (like.length > 120)
    return { err: `${seg} matches ${like.length} strings · say more of it` };
  // A miss lists what it matched. Kinds first and the ways after, so a partial
  // name shows you the thing before the qualifiers on it.
  if (like.length) {
    const kinds = like.filter(o => o.show).map(o => o.tok);
    const ways = like.filter(o => !o.show).map(o => o.tok);
    return { err: `${seg} matches:\n` +
      [kinds.length ? menu(kinds) : "",
       ways.length ? menu(ways) : ""].filter(Boolean).join("\n") };
  }
  return { err: `nothing here matches ${seg}` };
}

// --- printing ---------------------------------------------------------

const say = (...l: string[]) => console.log(l.join("\n"));

const many = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

// Two different questions: whether to prompt is about the INPUT being a person,
// whether to colour is about the OUTPUT being a screen. A piped script watched
// on screen should still be lit; one redirected to a file must not be.
const tty = Boolean(process.stdin.isTTY);
const colour = Boolean(process.stdout.isTTY);
const ESC = String.fromCharCode(27);
const lit = (s: string) => colour ? `${ESC}[1;33m${s}${ESC}[0m` : s;

// The tree is the view; the table is asked for. A cell can be a whole document,
// so printing one after every step would bury everything else.
const shortCols = (): Set<number> => {
  const out = new Set<number>();
  table?.columns.forEach((c, i) => { if (short.has(c.id)) out.add(i); });
  return out;
};

function showTable(): void {
  if (!table) { say("  nothing named"); return; }
  say(drawTable(table, "  ", shortCols()).join("\n"), "");
}

function showTree(): void {
  if (!table) return;
  for (const l of shapeLines(table, focus)) {
    const text = l.text + (short.has(l.id) ? "   short" : "");
    say(l.focused ? lit(">" + text.slice(1)) : " " + text.slice(1));
  }
}

// EVERYTHING ADDABLE HERE — `add` on its own. Kinds, their counts, and the one
// thing worth saying about a kind you have not chosen yet: whether choosing it
// makes a choice. The ways themselves stay out of it until you ask.
// What is worth saying about a name you have not chosen yet: whether choosing
// it is a choice, and what it would merge if it is.
const markOf = (o: Opt): string =>
  o.made ? (o.header !== o.tok ? o.header : "")
  : o.members.length ? many(o.members.length, "kind")
  : o.ways > 1 ? `${o.ways} ways` : "";

// One row of the listing, drawn the way `schema` draws a drawer, so the add
// list and the tree it came from line up.
const rowOf = (o: Opt, w: number): string =>
  (`  ${(o.tok + (o.made ? "/" : "")).padEnd(w + 3)}` +
   `${o.count.padStart(4)}   ${markOf(o)}`).trimEnd();

function addable(): void {
  const opts = optionsAt(focus).filter(o => o.show);
  if (!opts.length) { say("  nothing can be added here."); return; }

  if (focus !== null || !schema) {
    if (focus === null)
      say(`  ${opts.length} kind(s) · naming one is the first column`);
    const w = Math.max(...opts.map(o => o.tok.length));
    for (const o of opts) say(rowOf(o, w));
    return;
  }

  // AT THE ROOT WITH A SCHEMA IN FORCE, THE LISTING IS THE SCHEMA'S OWN SHAPE:
  // its top level, in the order its author wrote it, so the thing you are
  // choosing from looks like the thing you loaded. Sorting by count instead
  // would scatter six drawers through thirty-three loose kinds, which is the
  // wall the schema was loaded to take down.
  say(`  ${opts.length} name(s) over ${kindNames.size} kind(s) · ${schema.name}` +
      ` · naming one is the first column`);

  const top = schema.children.get(schema.root) ?? [];
  const named = top.map(n => opts.find(o => o.tok === n))
    .filter((o): o is Opt => o !== undefined);
  const w = Math.max(...named.map(o => o.tok.length));
  for (const o of named) say(rowOf(o, w));

  // A NAME THE SCHEMA SAYS NOTHING ABOUT HAS NO PLACE IN IT, so it is not given
  // one. Counted, gridded, and still typed the same as any other name — the
  // schema narrows what is worth drawing as a shape, never what is reachable.
  const rest = opts.filter(o => !named.includes(o));
  if (!rest.length) return;
  say("", `  ${rest.length} outside ${schema.name}`);
  say(column(rest.map(o => o.tok + (o.made ? "/" : ` ${o.count}`) +
    (!o.made && o.ways > 1 ? `\u00b7${o.ways}` : ""))));
}

// THE STANDING VIEW, printed before every prompt rather than by whichever
// command changed something, so the tree is always there. A kind reachable more
// than one way carries how many, because that is the difference between a name
// and a choice, and it has to survive a pipe — the transcript has no colour.
function look(): void {
  showTree();
  if (table) say("");

  if (focus === null) {
    say(`  ${rootOffers(pile, label).length} ${schema ? "names · " + schema.name
                                                     : "kinds"} · type part of one` +
        (table ? " · naming one replaces this reading" : " to begin"));
    return;
  }
  const opts = optionsAt(focus).filter(o => o.show);
  say("  " + (opts.length
    ? opts.map(o => o.tok + (o.made ? "/" : ` ${o.count}`) +
        (o.made ? "" : o.members.length ? `\u00b7${o.members.length}`
                     : o.ways > 1 ? `\u00b7${o.ways}` : "")).join("   ")
    : "nothing can be added here."));
}

// A menu entry, not a value being shown, so cursor-moving characters are
// written the way the table writes them.
const oneLine = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n")
   .replace(/\r/g, "\\r").replace(/\t/g, "\\t");

// A GRID, SIZED PER COLUMN. One width for all of them lets a few long strings
// set the cell for every short one, turning 500 ten-character names into 500
// lines. The widest layout that still fits is the one used.
//
// SHARES is how wide a string can be and still share a line; past it a string
// gets a line of its own rather than widening a whole column.
const WIDE = 78;
const SHARES = 24;

function column(all: string[]): string {
  const grid = all.filter(s => s.length <= SHARES);
  const alone = all.filter(s => s.length > SHARES);

  // Column-major, so each column holds a run of the sorted list and reading
  // down a column is reading in order.
  const lay = (n: number): string[] | null => {
    const deep = Math.ceil(grid.length / n);
    const cols: string[][] = [];
    for (let i = 0; i < grid.length; i += deep) cols.push(grid.slice(i, i + deep));
    const w = cols.map(c => Math.max(...c.map(s => s.length)) + 2);
    if (w.reduce((a, b) => a + b, 0) > WIDE + 2) return null;
    return Array.from({ length: deep }, (_, r) =>
      ("  " + cols.map((c, i) => (c[r] ?? "").padEnd(w[i])).join("")).trimEnd());
  };

  let out: string[] = grid.map(s => "  " + s);
  for (let n = Math.min(grid.length, 10); n > 1; n--) {
    const got = lay(n);
    if (got) { out = got; break; }
  }
  return [...out, ...alone.map(s => "  " + s)].join("\n");
}

// A value can be a whole document, and a document in a menu is not a long line,
// it is the screen. Those are counted rather than printed — counted, not cut,
// because shortening a value is the one thing this tool must not do.
function menu(toks: string[]): string {
  const all = toks.map(oneLine);
  const shown = all.filter(t => t.length <= WIDE);
  const over = all.length - shown.length;
  return [
    shown.length ? column(shown) : "",
    over ? `  ${over} too wide to list · say part of one` : "",
  ].filter(Boolean).join("\n");
}

// THE SCHEMA AS A TREE. A drawer carries the count of values it reaches — the
// number a first column would open with — because that is the one thing about a
// drawer you cannot read off its name. A leaf carries its name and nothing
// else: its count is one `add` away, and fifteen leaves each on a line is a
// paragraph rather than a tree, so they flow.
function showSchema(s: Schema): void {
  const vals = kindValues(pile);
  const reach = (node: string): number => {
    const all = new Set<string>();
    for (const k of s.kindsOf.get(node) ?? [node])
      for (const v of vals.get(k) ?? []) all.add(v);
    return all.size;
  };

  const rows: { text: string; count: string; held: string }[] = [];
  const walk = (node: string, depth: number): void => {
    const pad = "  " + "   ".repeat(depth);
    const held = s.kindsOf.get(node) ?? [];
    rows.push({ text: pad + node, count: String(reach(node)),
                held: many(held.length, "kind") });

    const kids = s.children.get(node)!;
    for (const k of kids) if (s.children.has(k)) walk(k, depth + 1);

    // The leaves last, flowed to the width a menu uses, so a wide drawer reads
    // as one run of names instead of pushing its sibling drawers off the screen.
    const leaves = kids.filter(k => !s.children.has(k));
    let line = "";
    for (const leaf of leaves) {
      if (line && (line + "  " + leaf).length > WIDE) { rows.push({ text: line, count: "", held: "" }); line = ""; }
      line = line ? `${line}  ${leaf}` : pad + "   " + leaf;
    }
    if (line) rows.push({ text: line, count: "", held: "" });
  };
  walk(s.root, 0);

  const w = Math.max(...rows.filter(r => r.count).map(r => r.text.length));
  for (const r of rows)
    say(r.count
      ? `${r.text.padEnd(w + 3)}${r.count.padStart(4)}   ${r.held}`
      : r.text);
  if (s.unknown.length)
    say(`  ${s.unknown.length} member(s) this pile has no kind for: ` +
        s.unknown.join("  "));
}

const HELP = `
  You traverse a tree, and from the tree you add what you want. Moving never
  creates and never removes; only add changes anything.

  / is the pile.  it holds every KIND anybody named, and naming one is where a
  reading starts — the only thing here that is not a move.  the kind becomes
  the first column, with a row for every value it reaches.  naming another
  replaces the reading, so it asks twice.

  YOU TYPE THE KIND.  the verb is a qualifier and you only need it when you
  want one particular way in:

      host               every way to a host from here
      host resolves-to   only that one
      resolves-to host   the same, spelled the producer's way

  one way in and it goes.  more than one and it lists them and waits: say it
  again for all of them, or narrow it.  a column is called by the phrase when
  there is one way in, and by the kind when it merged several.

  every column after the first joins on the column to its left.

  add                on its own, everything you could add here
  add <path>         add it, and the focus follows.  at / it replaces the
                     whole reading, so it asks twice
                     add ../Age  a sibling      add a/b/c  a chain
                     a partial name adds nothing and lists what it matched,
                     which is how you look around
  cd <path>          move the cursor.  .. is the parent, / the pile
                     cd alone says where you are          (alias: focus)

  jump [kind] [n]    what is further out than one step.  on its own, every
                     kind within n steps (default 3); named, the routes that
                     reach it.  it only looks — what it prints is an add path,
                     so finding a route and taking it stay two acts
  schema <name>      load a taxonomy from schemas/<name>.sch.  drawers join
                     the add list beside the kinds they hold, and a drawer is
                     added, narrowed and typed exactly like a kind.  it merges
                     and never asserts: no line changes and no column already
                     built changes
                     schema       the tree in force, drawn
                     schema off   every kind under its own name again
  save <name>        keep this session as scenarios/<name>.sw
  shorten [path]     draw one column as a hash — for a column you step over
                     rather than read.  display only: it still joins, still
                     steps, still counts.  again puts it back
  table              the whole thing
  tree [flat]        the shape, one column per line

  help  quit
  a bare token is an add`;

function run(input: string): void {
  const line = input.trim().replace(/\s+/g, " ");

  // Off a terminal there is no echo, so say what is being run. That makes a
  // piped session a transcript, which is what the harness diffs.
  if (!tty && (line || input.trim().startsWith("#"))) say("$ " + input.trim());

  // A comment does nothing and is kept: it is the note on a scenario. Doing
  // nothing includes not cancelling — a saved reading explains itself between
  // the line that asks and the line that means it.
  if (line.startsWith("#")) { history.push(line); return; }

  if (line !== lastLine) confirmed.clear();  // anything else cancels a confirm
  lastLine = line;
  if (!line) return;
  if (!line.startsWith("save ")) history.push(line);
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ");

  const go = (path: string, create: boolean): void => {
    const r = resolve(path, create);
    if ("err" in r) { say("  " + r.err); return; }
    focus = r.at;
  };

  switch (cmd) {
    case "help": case "?": say(HELP); return;
    case "quit": case "exit": process.exit(0);

    case "add": if (!arg) { addable(); return; } go(arg, true); return;

    case "cd":
    case "focus":
      if (!arg) { say("  " + pathOf(focus)); return; }
      go(arg, false); return;

    case "table": case "cat": showTable(); return;

    // JUMP — what is further out than one step, asked the same way as one step:
    // by naming what you are after. Enumerating everything three steps from a
    // column runs to a couple of thousand routes here, and none of that fits a
    // terminal; naming the kind takes it to a handful.
    //
    // It only looks, which is the one thing nothing else here does — and it can,
    // because what it hands back is an `add` path. Finding a route and taking it
    // stay two acts, so `add` is still the only thing that changes anything.
    case "jump": {
      if (!table) { say("  nothing named"); return; }
      if (focus === null) { say("  jump reads from a column · cd into one"); return; }

      const parts = arg ? arg.split(" ") : [];
      const last = parts[parts.length - 1];
      const deep = last && /^[1-5]$/.test(last) ? Number(parts.pop()) : 3;
      const want = parts.join(" ");
      const far = deep === 1 ? "1 step" : `${deep} steps`;
      const here = table.columns.find(c => c.id === focus)!;
      const all = routes(pile, table, focus, deep, label);

      if (!want) {
        // Kinds, not routes — the same order of business as everywhere else.
        const byKind = new Map<string, { have: Set<string>; n: number; near: number }>();
        for (const r of all) {
          const k = r.kinds[r.kinds.length - 1];
          const got = byKind.get(k) ?? byKind.set(k, { have: new Set(), n: 0, near: 9 })
            .get(k)!;
          got.n++;
          got.near = Math.min(got.near, r.kinds.length);
          got.have.add(String(r.have));
        }
        const rows = [...byKind].map(([k, v]) => ({ k, n: v.n, near: v.near }))
          .sort((a, b) => a.near - b.near || b.n - a.n || a.k.localeCompare(b.k));
        say(`  from ${here.header} · ${rows.length} kind(s) within ${far}`);
        const w = Math.max(...rows.map(r => r.k.length));
        for (const r of rows)
          say(`  ${r.k.padEnd(w + 2)}` +
              `${(r.near + (r.near === 1 ? " step" : " steps")).padEnd(9)}` +
              `${r.n} route(s)`);
        say(`  say jump <kind> for the routes`);
        return;
      }

      const mine = all.filter(r => r.kinds[r.kinds.length - 1] === want);
      if (!mine.length) {
        const near = [...new Set(all.map(r => r.kinds[r.kinds.length - 1]))]
          .filter(k => k.toLowerCase().includes(want.toLowerCase()));
        say(near.length
          ? `  nothing reaches ${want} · did you mean ${near.join("  ")}`
          : `  nothing reaches ${want} within ${deep} steps`);
        return;
      }
      say(`  from ${here.header} · ${mine.length} route(s) reaching ${want} within ${far}`);
      const w = Math.max(...mine.map(r => routeName(r).length));
      for (const r of mine)
        say((`  ${routeName(r).padEnd(w + 2)}${`${r.have}/${r.of}`.padEnd(8)}` +
            (r.back ? "comes back" : "")).trimEnd());
      say(`  add one of them`);
      return;
    }

    // SHORTEN — a display choice on one column, and nothing else. The value
    // still joins, still steps, still counts; only what is painted changes, and
    // saying it again puts it back. Never automatic: a column cannot be known
    // to be a waypoint until you have seen what is in it.
    case "shorten": {
      if (!table) { say("  nothing named"); return; }
      let id = focus;
      if (arg) {
        const r = resolve(arg, false);
        if ("err" in r) { say("  " + r.err); return; }
        id = r.at;
      }
      if (id === null) {
        const on = table.columns.filter(c => short.has(c.id));
        say(on.length
          ? "  short: " + on.map(c => c.header).join(", ")
          : "  shorten <column> · nothing is short");
        return;
      }
      const col = table.columns.find(c => c.id === id)!;
      short.has(id) ? short.delete(id) : short.add(id);
      say(`  ${col.header} ${short.has(id) ? "shortened · say it again to read it whole"
                                           : "whole again"}`);
      return;
    }
    // A SCHEMA IS NAMED, NEVER THE SCHEMA. Loading one changes what the menu
    // offers and what a column built from a drawer is called. It changes no
    // line, no value and no column already built — so swapping mid-reading is
    // safe, and a column you made under another schema keeps the name you
    // typed for it even when that name is no longer one you could type.
    case "schema": {
      if (!arg || arg === "list") {
        const all = schemaNames(SCHEMAS);
        if (schema && arg !== "list") { showSchema(schema); say(""); }
        say(`  ${schema ? schema.name : "no schema"} · ` +
            (schema
              ? `${schema.drawers.length} drawer(s) over ` +
                `${schema.covered.length}/${kindNames.size} kind(s)` +
                (schema.unknown.length
                  ? ` · ${schema.unknown.length} member(s) this pile has no kind for`
                  : "")
              : `${kindNames.size} kind(s), each its own name`));
        if (all.length) say("  schemas: " + all.join("  "));
        return;
      }
      if (arg === "off" || arg === "none") {
        schema = null;
        say(`  no schema · ${kindNames.size} kind(s)`);
        return;
      }
      try {
        schema = loadSchema(SCHEMAS, arg, kindNames);
        say(`  ${schema.name} · ${schema.drawers.length} drawer(s) over ` +
            `${schema.covered.length}/${kindNames.size} kind(s)` +
            (schema.unknown.length
              ? ` · ${schema.unknown.length} member(s) this pile has no kind for: ` +
                schema.unknown.join(" ")
              : ""));
      } catch (e) {
        say("  " + (e as Error).message);
      }
      return;
    }

    // Multi-line by default; a deep tree stops fitting on one.
    case "tree":
      if (!table) { say("  nothing named"); return; }
      if (arg === "flat") say("  " + shape(table)); else showTree();
      return;

    // A SESSION IS A SCENARIO. What you typed is already the recipe, so
    // keeping it is writing it to a file the harness replays — which exercises
    // the shell as well as the table underneath.
    case "save": {
      if (!arg) { say("  save <name>"); return; }
      const name = arg.replace(/[^\w.-]+/g, "-");
      mkdirSync(join(HERE, "scenarios"), { recursive: true });
      writeFileSync(join(HERE, "scenarios", name + ".sw"), history.map(l => l + "\n").join(""));
      say(`  ${history.length} line(s) -> scenarios/${name}.sw`);
      return;
    }

    default: go(line, true);             // a bare token is an add
  }
}

// --- start ------------------------------------------------------------

// An argument is a script to run before handing over. Piped in, it runs and
// exits; on a terminal you carry on from wherever it left you. `--schema` puts
// a taxonomy in force before any of it runs, so a saved reading replays under
// the same vocabulary it was written in.
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] !== "--schema" && !argv[i].startsWith("--schema=")) continue;
  const [flag, tail] = argv[i].split("=");
  const name = tail ?? argv[i + 1];
  argv.splice(i, tail ? 1 : 2);
  i--;
  if (!name) { say("  --schema <name>"); process.exit(1); }
  try { schema = loadSchema(SCHEMAS, name, kindNames); }
  catch (e) { say("  " + (e as Error).message); process.exit(1); }
}
const script = argv[0];

if (tty)
  say(`${lines.length} lines · ${values(pile).length} values · ` +
      `${relations(pile).length} relations · ${said.size} phrases · ? for help\n` +
      (schema
        ? `${schema.name} · ${schema.drawers.length} drawer(s) over ` +
          `${schema.covered.length}/${kindNames.size} kind(s) · schema off for none\n`
        : `${schemaNames(SCHEMAS).length} schema(s): ` +
          `${schemaNames(SCHEMAS).join("  ")} · schema <name> to load one\n`) +
      `name one thing and it is your first column · type part of it to find it\n`);

const rl = createInterface({
  input: process.stdin, output: process.stdout, terminal: tty, prompt: "",
  completer: (line: string): [string[], string] => {
    const word = line.split(/\s+/).pop() ?? "";
    const pool = [
      ...optionsAt(focus).map(o => o.tok), "..", "/",
      "add", "cd", "focus",
      "table", "tree", "save", "shorten", "jump", "schema", "help", "quit",
      ...schemaNames(SCHEMAS), "off",
    ];
    const hits = pool.filter(c => c.startsWith(word));
    return [hits.length ? hits : pool, word];
  },
});

// What a column is and what it is called both count as the tree changing.
const signature = () =>
  table ? startedWith() + "|" + table.columns.map(c =>
    c.id + " " + c.header + (short.has(c.id) ? " short" : "")).join("|") : "";

const prompt = () => {
  look();
  if (!tty) return;
  rl.setPrompt("$ ");
  rl.prompt();
};

// The table comes back only when the tree actually changed. Moving the cursor
// is not news; building a column is. `table` still asks for it any time.
//
// The standing view is not redrawn after a comment or a blank line in a
// script — nothing happened, and a transcript should not repeat itself. On a
// terminal it always redraws, because pressing Enter is how you refresh.
function feed(l: string): void {
  const before = signature();
  run(l);
  if (table && signature() !== before) showTable();
  const bare = l.trim();
  if (tty || (bare && !bare.startsWith("#"))) prompt();
}

if (script) for (const l of readFileSync(script, "utf8").split("\n")) feed(l);
prompt();
rl.on("line", feed);
rl.on("close", () => { if (tty) say(""); });
