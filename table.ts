// table.ts — building a table by walking outward.
//
// COLUMNS ARE A TREE. A step hangs off a column you choose, so two steps can
// hang off the same one and sit side by side: from a host you want who ran on
// it AND which address resolves to it, and neither is a step from the other.
// The tree lives here, never in the pile.
//
// A ROW IS A PATH through that tree, and each cell holds a value.
//
// EVERY STEP IS A JOIN. A fact is three strings, so one line is one hop and no
// line holds a route. A column of more than two therefore reads across lines,
// joining on the string in the cell to its left — which is why the pivot never
// has to be reported: it is always the column to the left.

import { readRelation, type Dir, type Pile, type Spot } from "./stringwalk.js";

export type { Dir };

// THE KIND COMES FIRST. What a reader is after is a thing — an ip, a ticket, an
// account — and which verb reached it is a qualifier they may not need. So a
// STEP is a token you typed and the phrases it turned out to name:
//
//   "ip"                every way to an ip from here, merged
//   "ip resolves-to"    only that one
//
// The kind leads and the verb trails, which is the opposite of a phrase. That
// costs nothing: a phrase is assembled by the reader too — `readRelation` builds
// it out of two fields and the line never stores it — so this is the same two
// fields in the other order.
export interface Step { token: string; phrases: string[] }

// A PHRASE is verb-then-kind, so its kind is the last word. `related`, the one
// phrase with no kind at all, is its own.
export const kindOf = (phrase: string): string => {
  const i = phrase.lastIndexOf(" ");
  return i < 0 ? phrase : phrase.slice(i + 1);
};

export const verbOf = (phrase: string): string => {
  const i = phrase.lastIndexOf(" ");
  return i < 0 ? "" : phrase.slice(0, i);
};

// WHAT A COLUMN IS CALLED IS WHAT IT HOLDS. One phrase and the column says that
// phrase, because being specific is free when it is the only choice. Several
// and it says the kind, because that is the honest name for the merge.
export const nameOf = (s: Step): string =>
  s.phrases.length === 1 ? s.phrases[0] : s.token;

export interface Column {
  id: string;                 // structural: parent plus step. never shown.
  header: string;             // the whole route, for a person to read
  step: Step | null;          // null for the anchor
  parent: string | null;      // the id this hangs off
}

export type Cell = string | null;                 // null is a hole

export interface Row { cells: Cell[] }            // parallel to columns

// A READING STARTS BY NAMING ONE THING, AND THAT THING IS THE FIRST COLUMN. A
// phrase gives it a row per value that phrase landed on; a value gives it one
// row. That is the whole difference.
export interface Table { columns: Column[]; rows: Row[] }

// --- one hop ----------------------------------------------------------
//
// A value sits at one end of a line, and that end says which way it can be
// walked: from the left you go forwards, from the right you go backwards.
// Either way there is exactly one relation to check and one value to land on.

function hop(pile: Pile, s: Spot, relation: string, dir: Dir): string | null {
  const line = pile.lines[s.line];
  if (line[1] !== relation) return null;
  if (dir === "fwd") return s.pos === 0 ? line[2] : null;
  return s.pos === 2 ? line[0] : null;
}

// EVERY WAY THE PHRASE CAN BE WALKED, from every line that mentions the value,
// all at once. `add` groups the landings afterwards, so two relations that agree
// collapse into one cell and two that disagree split the row.
function move(pile: Pile, value: string, step: Step): string[] {
  const out: string[] = [];
  for (const phrase of step.phrases)
    for (const w of pile.ways.get(phrase) ?? [])
      for (const s of pile.at.get(value) ?? []) {
        const landed = hop(pile, s, w.relation, w.dir);
        if (landed !== null && !out.includes(landed)) out.push(landed);
      }
  return out;
}

// --- the tree ---------------------------------------------------------
//
// A column is found by ID, never by header: the id is structural — where it
// hangs and what step it is — and the header is display.

const at = (t: Table, id: string): number => t.columns.findIndex(c => c.id === id);

const idFor = (parent: string, s: Step): string => `${parent}/${s.token}`;

function descends(t: Table, id: string, from: string): boolean {
  let cur = t.columns[at(t, id)]?.parent ?? null;
  while (cur !== null) {
    if (cur === from) return true;
    cur = t.columns[at(t, cur)]?.parent ?? null;
  }
  return false;
}

// A child goes directly after its parent's existing subtree, so siblings end
// up next to each other and a branch reads left to right.
function insertionPoint(t: Table, parent: string): number {
  let j = at(t, parent) + 1;
  while (j < t.columns.length && descends(t, t.columns[j].id, parent)) j++;
  return j;
}

// A header is a whole route, not a step — `next ip` and `next ip via hops ip`
// are different columns and the header is the only place that can say so. It is
// recursive because a parent header is itself a route.
//
// The anchor is the one column nothing says `via`: it is where you began, so
// naming it would add a word to every header and tell nobody anything.
function headerFor(t: Table, parent: string, step: Step): string {
  const p = at(t, parent);
  const base = parent === ANCHOR
    ? nameOf(step) : `${nameOf(step)} via ${t.columns[p].header}`;
  let header = base;
  for (let n = 2; t.columns.some(c => c.header === header); n++) header = `${base} ${n}`;
  return header;
}

// --- the menu ---------------------------------------------------------
//
// OFFERS ARE KINDS, not phrases. What a reader wants is a thing; the verb that
// reaches it is a qualifier. So each offer is one kind, the count of this
// column's values that can reach it at all, and the ways in — which only matter
// when there is more than one.

export interface Way2 { verb: string; phrase: string; have: number }
export interface KindWays { kind: string; have: number; ways: Way2[] }
export interface Offer {
  kind: string;            // the kind, or the drawer a schema shows it under
  have: number; of: number;
  drawer: boolean;         // did a schema merge several kinds into this
  kinds: KindWays[];       // what it merged, each still typeable
  ways: Way2[];            // every phrase under it, likewise
}

// A KIND -> WHAT IT IS SHOWN AS. Without a schema a kind is shown as itself, so
// every count below is the same count it always was. With one, several kinds
// land in one bucket and the bucket is a drawer. That is the only difference,
// and it is one function.
export type Label = (kind: string) => string;
const asItself: Label = k => k;

// Every phrase a value can walk from where it stands.
function phrasesFrom(pile: Pile, value: string): Set<string> {
  const out = new Set<string>();
  for (const s of pile.at.get(value) ?? []) {
    if (s.pos === 1) continue;                // standing on a relation string
    const rel = readRelation(pile.lines[s.line][1]);
    if (!rel) continue;
    // Which end you sit at is which way you can go.
    out.add((s.pos === 0 ? rel.fwd : rel.back).text);
  }
  return out;
}

function group(reach: Map<string, Set<string>>, of: number, label: Label): Offer[] {
  // name -> kind -> phrase -> the values that can walk it. Three levels because
  // a reader narrows through all three: the drawer, the kind in it, the phrase.
  const byName = new Map<string, Map<string, Map<string, Set<string>>>>();
  for (const [phrase, who] of reach) {
    const k = kindOf(phrase);
    const n = label(k);
    const m = byName.get(n) ?? byName.set(n, new Map()).get(n)!;
    const km = m.get(k) ?? m.set(k, new Map()).get(k)!;
    km.set(phrase, who);
  }

  // COUNTED AS A UNION AT EVERY LEVEL, never summed. Two kinds a drawer holds
  // can be reachable from the same value, so adding their counts would report
  // more values than the column has.
  const union = (sets: Iterable<Set<string>>): number => {
    const all = new Set<string>();
    for (const who of sets) for (const v of who) all.add(v);
    return all.size;
  };
  const waysIn = (m: Map<string, Set<string>>): Way2[] =>
    [...m].map(([phrase, who]) => ({ verb: verbOf(phrase), phrase, have: who.size }))
      .sort((a, b) => b.have - a.have || a.phrase.localeCompare(b.phrase));

  const out: Offer[] = [];
  for (const [name, m] of byName) {
    const kinds: KindWays[] = [...m].map(([kind, km]) =>
      ({ kind, have: union(km.values()), ways: waysIn(km) }))
      .sort((a, b) => b.have - a.have || a.kind.localeCompare(b.kind));
    out.push({
      kind: name,
      have: union([...m.values()].flatMap(km => [...km.values()])),
      of,
      drawer: kinds.length > 1 || kinds[0].kind !== name,
      kinds,
      ways: kinds.flatMap(k => k.ways),
    });
  }
  return out.sort((a, b) => b.have - a.have || a.kind.localeCompare(b.kind));
}

export function offers(pile: Pile, table: Table, from: string,
  label: Label = asItself): Offer[] {
  const col = at(table, from);
  if (col < 0) return [];

  // COUNTED OVER DISTINCT VALUES, not over rows: a row splitting in some other
  // branch must not change what this column can do.
  const seen = new Set<string>();
  for (const row of table.rows) {
    const cell = row.cells[col];
    if (cell !== null && cell !== undefined) seen.add(cell);
  }

  const reach = new Map<string, Set<string>>();
  for (const value of seen)
    for (const phrase of phrasesFrom(pile, value))
      (reach.get(phrase) ?? reach.set(phrase, new Set()).get(phrase)!).add(value);

  return group(reach, seen.size, label);
}

// AT THE ROOT the same list, over the whole pile: every kind anybody named, and
// how many values would be in the first column. `of` is that same number, since
// nothing narrows it yet.
export function rootOffers(pile: Pile, label: Label = asItself): Offer[] {
  const reach = new Map<string, Set<string>>();
  for (const phrase of pile.ways.keys())
    reach.set(phrase, landings(pile, phrase));
  let all = 0;
  const seen = new Set<string>();
  for (const who of reach.values()) for (const v of who) seen.add(v);
  all = seen.size;
  return group(reach, all, label);
}

// --- what is further out ----------------------------------------------
//
// A JUMP IS A QUESTION WITH A DISTANCE ON IT. Enumerating everything two and
// three steps from a column runs to hundreds of routes and thousands, which is
// a scrollable pane in a browser and nothing at all in a terminal. So you say
// what you are after, the same way you say it one step at a time, and the
// answer is the routes that reach it.
//
// A route is kinds, merged at every step, which is why it can be handed
// straight back as an `add` path.

export interface Route { kinds: string[]; have: number; of: number; back: boolean }

export const routeName = (r: Route): string => r.kinds.join("/");

export function routes(pile: Pile, table: Table, from: string, depth = 3,
  label: Label = asItself): Route[] {
  const col = at(table, from);
  if (col < 0) return [];

  const seen = new Set<string>();
  for (const row of table.rows) {
    const cell = row.cells[col];
    if (cell !== null && cell !== undefined) seen.add(cell);
  }

  const hit = new Map<string, { kinds: string[]; who: Set<string>; back: boolean }>();

  // Once per starting value, because `have` is how many of this column's values
  // can walk the whole route — the same count a one-step offer carries.
  for (const start of seen) {
    let layer: { kinds: string[]; at: Set<string> }[] = [{ kinds: [], at: new Set([start]) }];
    for (let d = 0; d < depth && layer.length; d++) {
      const next: { kinds: string[]; at: Set<string> }[] = [];
      for (const { kinds, at: here } of layer) {
        // A step takes every phrase of its kind at once, exactly as `add` does,
        // so a route's count is the count you get when you walk it.
        // A step takes every phrase shown under one name — which is the kind,
        // or the drawer a schema shows the kind under. So a jumped route is
        // spelled in whatever vocabulary the reader is using.
        const byKind = new Map<string, Set<string>>();
        for (const v of here)
          for (const phrase of phrasesFrom(pile, v)) {
            const n = label(kindOf(phrase));
            (byKind.get(n) ?? byKind.set(n, new Set()).get(n)!).add(phrase);
          }

        for (const [kind, phrases] of byKind) {
          const step: Step = { token: kind, phrases: [...phrases] };
          const to = new Set<string>();
          for (const v of here) for (const landed of move(pile, v, step)) to.add(landed);
          if (!to.size) continue;

          const route = [...kinds, kind];
          next.push({ kinds: route, at: to });

          const key = route.join("/");
          const got = hit.get(key)
            ?? hit.set(key, { kinds: route, who: new Set(), back: false }).get(key)!;
          got.who.add(start);
          if (to.has(start)) got.back = true;
        }
      }
      layer = next;
    }
  }

  return [...hit.values()]
    .map(h => ({ kinds: h.kinds, have: h.who.size, of: seen.size, back: h.back }))
    .sort((a, b) =>
      a.kinds.length - b.kinds.length ||
      b.have - a.have ||
      a.kinds.join("/").localeCompare(b.kinds.join("/")));
}

// --- building ---------------------------------------------------------
//
// Naming is the one thing a reading cannot walk to. Everything after is a move.

export const ANCHOR = "#";

// Every value a phrase lands on, anywhere in the pile. A relation whose two
// phrases read the same — `related`, which is what `""` reads as in both
// directions — lands on both of its ends.
function landings(pile: Pile, phrase: string): Set<string> {
  const dirs = new Map<string, Dir[]>();
  for (const w of pile.ways.get(phrase) ?? [])
    (dirs.get(w.relation) ?? dirs.set(w.relation, []).get(w.relation)!).push(w.dir);

  const found = new Set<string>();
  for (const line of pile.lines)
    for (const dir of dirs.get(line[1]) ?? [])
      found.add(dir === "fwd" ? line[2] : line[0]);
  return found;
}

// EVERY KIND -> EVERY VALUE IT LANDS ON, over the whole pile. The same number a
// first column would open with, which is what a drawer holding several kinds
// has to union rather than add.
export function kindValues(pile: Pile): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const phrase of pile.ways.keys()) {
    const k = kindOf(phrase);
    const set = out.get(k) ?? out.set(k, new Set()).get(k)!;
    for (const v of landings(pile, phrase)) set.add(v);
  }
  return out;
}

// A READING STARTS BY NAMING A KIND, and that kind is the first column: a row
// for every value any of its phrases landed on. There is no starting from a
// string — a reading begins with a relation or it does not begin.
export function anchor(pile: Pile, step: Step): Table {
  const found = new Set<string>();
  for (const phrase of step.phrases)
    for (const v of landings(pile, phrase)) found.add(v);

  return {
    columns: [{ id: ANCHOR, header: nameOf(step), step, parent: null }],
    rows: [...found].sort((a, b) => a.localeCompare(b)).map(value => ({ cells: [value] })),
  };
}

export const begin = anchor;

// Every row tries the step from the PARENT column's cell. Two answers split the
// row — the other cells come along, because a row is one path through the tree.
// No answer leaves a hole, and that branch stops there.
export function add(pile: Pile, table: Table, parent: string, step: Step): Table {
  const p = at(table, parent);
  if (p < 0) return table;

  const id = idFor(parent, step);
  if (at(table, id) >= 0) return table;        // already ticked, off this column

  const where = insertionPoint(table, parent);

  const rows: Row[] = [];
  for (const row of table.rows) {
    const from = row.cells[p];
    const landed = from === null || from === undefined ? [] : move(pile, from, step);

    const put = (cell: Cell): Row => {
      const cells = [...row.cells];
      cells.splice(where, 0, cell);
      return { cells };
    };

    if (!landed.length) { rows.push(put(null)); continue; }
    for (const value of [...landed].sort((a, b) => a.localeCompare(b))) rows.push(put(value));
  }

  const columns = [...table.columns];
  columns.splice(where, 0, {
    id, header: headerFor(table, parent, step), step, parent,
  });

  return { ...table, columns, rows };
}

// --- what a column is worth saying ------------------------------------

// The column's own name, without the `via` chain the header carries.
export const labelOf = (c: Column): string => c.step ? nameOf(c.step) : c.header;

export function shape(table: Table): string {
  const under = (id: string): string => {
    const kids = table.columns.filter(k => k.parent === id);
    if (!kids.length) return "";
    if (kids.length === 1) return " " + draw(kids[0]);
    return ` (${kids.map(draw).join(", ")})`;
  };
  const draw = (c: Column): string => labelOf(c) + under(c.id);
  return draw(table.columns[0]);
}

// The same tree, one column per line, for when the brackets stop helping. Each
// line shows the phrase, which is also what you would type.
export interface TreeLine { id: string; text: string; focused: boolean }

export function shapeLines(table: Table, focus?: string | null): TreeLine[] {
  const rows: { id: string; depth: number }[] = [];
  const walk = (c: Column, depth: number): void => {
    rows.push({ id: c.id, depth });
    for (const kid of table.columns.filter(k => k.parent === c.id)) walk(kid, depth + 1);
  };
  walk(table.columns[0], 0);

  return rows.map(r => ({
    id: r.id,
    focused: r.id === focus,
    text: "   ".repeat(r.depth + 1) + labelOf(table.columns[at(table, r.id)]),
  }));
}

// --- what is in the pile ----------------------------------------------

// EVERY PHRASE ANYBODY WROTE — the whole addressing scheme. You type what the
// column is called and the pile knows which relations answer to it.
export const phrases = (pile: Pile): string[] => [...pile.ways.keys()].sort();

export const relations = (pile: Pile): string[] =>
  [...new Set(pile.lines.map(l => l[1]))].sort();

export const values = (pile: Pile): string[] =>
  [...new Set(pile.lines.flatMap(l => [l[0], l[2]]))].sort();
