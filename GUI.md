# GUI

A design for a browser front end over `table.ts`. Not built.

The shell does almost everything a GUI would, and does it scriptable. This
records the parts that are genuinely different, so a rebuild starts from them
rather than from a port of the terminal.

## Shape

Two panes. Left is the pile: every kind, its ways in, every string, with a
filter.
Right is the reading: the tree, the table, and what can be added.

The engine is `table.ts`, unchanged. Anchoring, stepping, the column tree,
`offers`, `shape` — all of it is shared, and a GUI adds no concepts. A reading
starts by naming a kind and that kind is the first column, so there is one
start to build a control for.

A kind reached more than one way is where a GUI has the most to add: the
terminal prints the ways and waits for you to say it again, where a page can
show the merge and the ways in beside each other and let you tick.

## What only a GUI can do

**Show a value whole.** A cell holding a password-record document is merely
tall in a browser — `white-space: pre-wrap`, scroll past it. A terminal cannot
do this at any price: a newline in a cell breaks the row apart, so the shell
escapes them to `\n` and a long value makes a column nobody can read. This is
the one place the GUI is not a convenience but a capability, and it is the
reason to build one.

**Several things at once.** The relation list, the string list, the tree, the
table and the menu are all in peripheral vision. A terminal shows one at a
time and you hold the rest in your head.

**Click a thing instead of naming it.** Selecting a column is clicking its
header; in the shell it is `cd` and a path. This matters when a phrase is long
or awkward — `parses subnet from ip with subnet` is fine to look at and
tiresome to type.

**Browse the pile.** List every string in it, filter it, click one. A value can
be a whole password-record document, and shortening one is the thing this tool
must not do, so the terminal counts those instead of printing them — you can
only find a string you can already half-name. A browser lists them as
scrollable boxes and the problem is gone.

**Colour as a free dimension.** A hole, a hub, a kind, a value that repeats
down a column — all of them can differ by colour rather than by spending width
on a word. A terminal has one highlight and a few symbols, and it pays for
every mark in every row.

**Hover for the second answer.** A column headed `previous ip` can reveal the
other phrasing its producer wrote — `next ip` — on hover. The shell prints both
columns or neither.

**Add lines in the session.** A paste box that merges typed lines into the
pile as a union, reporting added, already-there and ignored. New lines are
appended so existing occurrences keep their positions and a table already on
screen stays valid and gains whatever the new lines make possible.

## What a rebuild should take from the shell

**The tree with a focus marker.** The page never had one; it turned out to be
the best view in the tool. One column per line, indented by depth, the phrase
you would type, the focused row marked. Nothing else on it: a step is a phrase,
and the column is where a phrase gets named.

**Saving to files, not to the browser.** `save <name>` writes a session to
`scenarios/<name>.sw` — readable, diffable, committable, and replayed by the
harness. Per-browser storage cannot be shared or tested.

**One way to write a reading down.** A session script. A separate JSON recipe
format existed only because the browser needed something to put in local
storage.

## Practical notes

A browser will not ES-import a module from `file://`, so a GUI needs either a
static server or everything inlined in one HTML file. A server is the smaller
cost: `serve.ts` was 45 lines, static files plus one endpoint listing the pile
files.

It also needs a build, because the browser runs JavaScript and the engine is
TypeScript. That is the only thing in this project that needs one.

**Do not re-implement rendering.** A second rendering path — HTML tables and
menus beside the terminal's — is two implementations of the same display with
nothing keeping them in step. Either share the structure and let CSS do the
rest, or accept the split and test both.
