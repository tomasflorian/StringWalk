// text.ts — a table as text. Shared by the shell and the replayer so the two
// cannot drift, since one of them writes the file a diff reads.

import type { Row, Table } from "./table.js";

// A ROW IS A LINE, so a value holding a newline would not make the table wide,
// it would break every column after it. Cursor-moving characters are written
// the way source writes them — an encoding, not a shortening; it reads back.
const oneLine = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n")
   .replace(/\r/g, "\\r").replace(/\t/g, "\\t");

// SHORTENING — THE TABLE ONLY, and only where you asked for it.
//
// Anchoring on one thing and walking out to another goes through columns that
// are a prerequisite rather than something you came to read, and one of them
// can be a document. `shorten` replaces that column's cells with a hash.
//
// A plain ellipsis would be worse than the long value: two documents sharing an
// opening would draw the same, and the table would be asserting a collision
// that is not there. A hash of the whole value cannot do that.
//
// NOTHING IS ASSERTED AND NOTHING IS LOST. The value is untouched everywhere it
// means anything — it is still what the column joins on, still what the next
// step walks from, still what a menu counts. This is a way of SEEING that two
// cells differ, not a name for either of them, and `shorten` again puts it back.
//
// FNV-1a, 32 bit. Non-cryptographic on purpose: all it has to do is differ.
const fnv1a = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

// The shortest stub that still tells this column's values apart. A stub that
// collided would be claiming two different strings are one, which is the one
// thing shortening must not start doing.
function stubber(values: string[]): (v: string) => string {
  const distinct = [...new Set(values)];
  for (let n = 3; n < 8; n++) {
    const seen = new Set(distinct.map(v => fnv1a(v).slice(-n)));
    if (seen.size === distinct.length) return v => fnv1a(v).slice(-n);
  }
  return v => fnv1a(v);
}

// `?` is a hole — the step found nothing from this row — not an empty value.
export function drawTable(t: Table, indent = "  ", short: ReadonlySet<number> = new Set()):
  string[] {
  const stub = new Map<number, (v: string) => string>();
  for (const i of short)
    stub.set(i, stubber(t.rows.map(r => r.cells[i]).filter((v): v is string => v !== null)));

  const head = t.columns.map((c, i) =>
    oneLine(c.header) + (stub.has(i) ? " (short)" : ""));
  const cell = (r: Row, i: number) => {
    const c = r.cells[i];
    if (c === null || c === undefined) return "?";
    return stub.has(i) ? stub.get(i)!(c) : oneLine(c);
  };
  const wide = head.map((h, i) =>
    Math.max(h.length, ...t.rows.map(r => cell(r, i).length)));
  return [
    head.map((h, i) => h.padEnd(wide[i])).join(" | "),
    wide.map(n => "-".repeat(n)).join("-+-"),
    ...t.rows.map(r => r.cells.map((_, i) => cell(r, i).padEnd(wide[i])).join(" | ")),
  ].map(l => indent + l.trimEnd());
}
