# StringWalk

```sh
npx tsx sw.ts                      # a shell over the pile
npx tsx sw.ts --schema netops      # with a taxonomy in force
npx tsx scenarios.ts               # replay saved readings as text
```

No build step. `GUI.md` is a design for a browser front end, unbuilt.

`piles/` holds eight files written by people and programs that never
coordinated: a DNS export, an auth log, a ticket export, two traceroutes, a
scraper that found pairs it could not name, a taxonomy of kinds, a nursery
receipt, and 930 lines of real data whose producer said as little as it is
possible to say.

## The line

```
[ value, relation, value ]
```

Exactly three strings. **A value is any string** — a document with newlines in
it, an address, a blob of whitespace. A line is one fact somebody wrote down:

```
["10.2.14.7", "ip, resolves-to, has-address, host", "backup-03.corp"]
["mike", "", "summer2006"]
```

Merging is `cat piles/*.pile | sort -u`.

## Three, and nothing longer

A line used to be allowed to run on — value, relation, value, relation, value —
so a traceroute could be written as one long line and a route would be a thing
you could read straight through.

That is a list of steps flattened into a tuple, and the flattening is not free.
It puts a route's identity in the **structure** of the line, and structure is
not a string, so nothing can stand on it, name it, or join on it. Everything
that followed came from that: you had to be *inside* a route to read it, which
meant a reader had to track a line and a position rather than a value, which
meant two kinds of move — one that stayed on the line and one that left it —
which meant a sigil, a mode on every step, a menu that offered every phrase
twice, and rows that were half quotation and half inference.

One removal took all of it out. A route worth recording is a **value**: its own
exact text, which you can stand on, name, and join on like any other string.
Facts about it are more lines.

```
["trace","trace, produced, produced-by, route","10.2.14.7,10.2.0.1,192.0.2.9"]
["10.2.14.7,10.2.0.1,192.0.2.9","route, hops, hop-of, ip","10.2.0.1"]
["10.2.14.7","ip, next, previous, ip","10.2.0.1"]
```

This is the pattern `rfg.pile` already used for all 930 of its lines: a whole
document sits in the pile as one value, and what was found inside it is written
as separate facts about it.

The admission that comes with it: a fact does not need a name, but **a path
does**. The old format was a way of avoiding that, and the price of avoiding it
was a second way of reading.

## Left and right are transcription. The middle is interpretation.

This is the most important sentence here.

A value arrives from the world. It can only be wrong by being copied wrong.
Nobody decided it, nobody is responsible for it, and no later knowledge makes
it a different string.

A relation is somebody making sense of what they saw. It can be wrong, and
over a long enough pile it will be. Two producers can read the same bytes and
write different relations, both in good faith.

So the two halves of a line are not the same kind of claim, and the format
should not pretend they are. Everything below follows from that.

## A relation has a shape

```
"ip, resolves-to, has-address, host"

forwards    10.2.14.7       resolves-to host   backup-03.corp
backwards   backup-03.corp  has-address ip     10.2.14.7
```

**The kinds sit at the ends and the verbs sit between them.** A relation always
joins two kinds — the thing at the start is something, the thing at the end is
something — and which one you land on is only a question of which way you
walked. So kinds come as a pair or not at all. One kind would be a relation
that knew what it points at and not what it points from, which is not a thing a
relation can be.

Verbs come in pairs, because every verb has a reverse phrasing — naming one and
not the other is not a state of knowledge, it is half a job. Kinds come in pairs
for the reason above. So three field counts, and nothing in between:

```
""                                 0   related, nobody has said how
"grows-on, grows"                  2   both verbs, kinds unsaid
"fruit, grows-on, grows, plant"    4   everything
```

There is no compatibility layer. An unnamed relation is a relation with the
optional fields left blank, and `rfg.pile`'s 930 lines walk without a special
case anywhere.

**The empty relation is the one that matters.** A parser that found `mike` next
to `summer2006` can be certain they belong together and have no idea what to
call it. Made to guess, it puts a lie in the pile. Made to drop the pair, it
throws away something it genuinely saw. `""` records exactly what it knew.

```
["mike","","summer2006"]
```

The reader calls it `related`, and marks it as the reader's word rather than a
producer's, so anybody — including the same parser later, knowing more — can
name it without that line changing.

## You type the kind. The verb is a qualifier.

What a reader is after is a thing — an ip, a ticket, an account. Which verb
reached it is a detail they may not need, so the kind leads and the verb
trails:

```
host                every way to a host from here
host resolves-to    only the one the dns export wrote
resolves-to host    the same, spelled the way a producer writes it
```

That costs nothing in fidelity. A phrase is assembled by the reader anyway —
`readRelation` builds it out of two fields and the line never stores it — so
kind-first is the same two fields in the other order.

**One way in and it goes.** More than one and it says what it would merge and
waits:

```
$ add kind
  kind — 2 ways
     kind           8   all of them
     kind example   5
     kind is-a      3
  say it again to mean it, anything else to cancel
```

Saying it again takes all of them. `is-a kind` and `example kind` are the two
ends of one relation, so that column holds what each kind is an example of and
what is an example of it, together. Nothing sorts that out for you.

**A column is called by what it holds.** One way in and the column says the
phrase, because being specific is free when it is the only choice. Several and
it says the kind, because that is the honest name for a merge.

```
   resolves-to host        one way to a host from the dns export
      ran-as account       one way to an account from a host
>        raised ticket
```

Backwards needs no `rev`, no sigil, no setting: the producer wrote both verbs
into the one relation, so `ip has-address` is a name they chose. A relation
whose producer said nothing at all is `related` in both directions, and the
reader marks that word as its own.

**There are no sigils.**

## Every column after the first is a join

A line is one hop, so a column of more than two columns is reading across
lines, and what it joins on is the string in the cell to its left. That is the
only thing a step does, so nothing has to mark it.

**Merging adds no lines and creates knowledge.** No single pile gets from
`10.2.14.7` to `dana`. Merged, the route exists, and it is in none of the
lines.

```
  resolves-to host | ran-as account | raised ticket via ran-as account
  -----------------+----------------+---------------------------------
  backup-03.corp   | svc-deploy     | OPS-4412
  mail-01.corp     | ?              | ?
  web-01.corp      | www-data       | ?
```

`?` is a hole: mail-01 ran nothing, and the row says so rather than disappearing.

The one worth staring at is the nursery. `garden.pile` is a receipt — who
ordered, what they ordered, where it ships. It shares exactly one string with
the auth log, `web-01.corp`, because the order happened to be placed from a
machine somebody else was logging. Neither producer knew the other existed:

```
  flower            | listed-on receipt (short) | submitted-from host via listed-on receipt | ran-as account via submitted-from host via listed-on receipt
  ------------------+---------------------------+-------------------------------------------+-------------------------------------------------------------
  Barbara Karst     | cde                       | web-01.corp                               | www-data
  Casa Blanca       | cde                       | web-01.corp                               | www-data
  Mme Isaac Pereire | cde                       | web-01.corp                               | www-data
```

It overlaps twice more, and the second one goes the other way. The rose was
bred in `paris`, and `rfg.pile` has `paris` in a csv row, a key-value block and
a json object whose `geo` is a town — so a flower reaches a json blob through a
city name, with nothing in between but the string. And `10.0.0.5` is an `addr`
somebody parsed out of that object and an `ip` the nursery's greenhouse
controller answers to, which is a join the tool will happily make and cannot
vouch for. That is the point of `?` and the point of reading the pivot.

**A join is not a verdict.** It says two lines share a string; it says nothing
about whether joining on it was sound, and the tool cannot say, because a pile
holds no identity. Five lines sharing `alice|2026-08-25|projX|5|2` are five
fields of one timesheet row and joining them invents nothing. Two hops sharing
a router are two different routes passing through one machine, and reading
across them makes a path nobody walked.

What lets you tell them apart is already in the table: **a join pivots on the
value you were standing on, so the pivot is the cell immediately to the left.**
Read left and you are looking at the string the join was made on — and if a
route is one of your columns, you are looking at the whole route, which either
contains what the row claims or does not.

```
  produced route                | hops ip   | next host via hops ip
  ------------------------------+-----------+----------------------
  10.2.14.7,10.2.0.1,192.0.2.9  | 10.2.0.1  | 203.0.113.5
  10.9.0.4,10.2.0.1,203.0.113.5 | 10.2.0.1  | 203.0.113.5
```

Both rows pass through `10.2.0.1`, and one of them is claiming a hop that is not
in its own route's text. The evidence is in the row. It used to be a decision
you made before you could see anything.

## The shell

You traverse a tree, and from the tree you add what you want. Moving never
creates and never removes; only `add` changes anything.

```
   resolves-to host
      ran-as account
>        raised ticket

  assigned-to person 1/1   raised-by account 1/1
```

That whole block is the prompt — printed before every input, so the tree is
always there. The focused line is marked and, on a screen, coloured. Under it,
what can be added here, with how many of this column's values can do it. The
table comes back when the tree changed, and only then; `table` asks for it any
time.

**`/` is the pile, and it holds every kind anybody named.** Naming one is
where a reading starts and the only thing in the tool that is not a move.

**A reading starts by naming a kind, and that kind is the first column** — a
row for every value it reaches. `host` is the hosts, `ip` is the addresses, and
neither direction is the awkward one.

There is no starting from a string. A reading begins with a relation or it does
not begin. That is a simplification and it may be relaxed later; today it means
`/` lists 78 kinds instead of 78 kinds and 385 strings jumbled together.

A reading has one starting point, because a table has one set of rows, so
naming a second thing replaces the reading. It asks twice.

```
add [path]    cd [path]      table          jump [kind] [n]
tree [flat]   shorten [path] save <name>    schema [name]   help   quit
```

`add` on its own lists everything you could add here — the offers with their
counts, and at `/` every kind in the pile. `add ../x` is a sibling, `add a/b/c`
is a chain creating as it goes, and a partial name adds nothing and lists what it
matched. Between them there is nothing left for a command that only looks.

At `/` that listing is the kinds, with how many rows each would open with and
whether choosing it is a choice:

```
  78 kind(s) · naming one is the first column
  string           251     14 ways
  short-string     158
  word             152     2 ways
  text             42      8 ways
  host             15      6 ways
```

The ways themselves stay out of it until you ask, which is what `add host` does.
The always-on line under the tree is the same list with the count of ways
appended — `record 16/16·3` — because that mark has to survive a pipe: the
transcript the harness diffs has no colour in it.

A value can be a whole document, and a document in a menu is not a long line, it
is the screen. So a listing counts the ones too long to be a line rather than
printing them — counted, not cut, and a fragment still reaches every one.

## When you do not know the way

One step at a time is fine until you do not know which steps. Enumerating
everything two and three steps out is the obvious answer and it does not fit:
from the `string` column that is 271 routes and then 1950. So `jump` asks the
same question one step asks — **name the kind you are after** — with a distance
on it.

```
$ jump ip
  from username-of record · 3 route(s) reaching ip within 3 steps
  notes/ip                  3/10
  password-record/notes/ip  3/10
  string/notes/ip           3/10
  add one of them
```

Three instead of 475. Every step of a route is a kind, merged the same way a
single step is, so the count is the count you get when you walk it — and the
route is an `add` path, verbatim:

```
$ add notes/ip
```

`jump` on its own is the same list one level up: every kind within reach, how
far the nearest route is, and how many routes there are.

**It is the one thing here that only looks**, and it can be, because what it
hands back is something you then type. Finding a route and taking it stay two
acts, so `add` is still the only thing that changes anything.

A route that returns to the row it started from is marked `comes back` rather
than hidden. It is a real route and whether it is worth walking is not something
the tool can know.

## Columns you step over rather than read

Walking from a record out to an ip goes through the record's notes, and one of
those notes is 700 characters of a BitLocker recovery key. The column is a
prerequisite, not something you came to read, and it makes the table unreadable
before you have read anything.

`shorten` draws that column as a hash:

```
  username-of record | has notes (short) | contains ip via has notes
  -------------------+-------------------+--------------------------
  PasswordRecord:77  | 7e8               | 10.20.30.1
  PasswordRecord:80  | 3b4               | 203.0.113.42
  PasswordRecord:82  | 1ef               | ?
```

The third column proves the point: `contains ip` walked out of the whole notes
text, not out of the stub. **Nothing is asserted and nothing is lost.** The value
is untouched everywhere it means anything — it is still what the column joins
on, still what the next step walks from, still what a menu counts. `shorten`
again puts it back.

A hash rather than an ellipsis, because two documents that share an opening
would ellipse to the same thing and the table would be claiming a collision that
is not there. The stub is the shortest length that still tells that column's
values apart, so it can never claim two different strings are one.

This is the one place the tool draws something other than the value, and it is
never automatic: a column cannot be known to be a waypoint until you have seen
what is in it. Taking a jumped route is the closest thing to an exception —
you asked for the far end, so the middles are waypoints by construction — but
`account` and `ticket` are middles too, and hashing a nine-character account
name loses more than it saves. So the chain arrives whole and you say
`shorten ..`.

`sw.ts <file>` runs a script and hands you the shell wherever it left off.

## Kinds come out of the relations for free

The kind is the last word of every phrase you type, so it is already on the
column, in the tree, and in the menu:

```
  previous ip   next ip   has-address ip   hops ip
```

Nobody added a line for that. It was inside the relations, and the reader can
read it now that the shape says where to look.

There is no command for this. A report regrouping what is already on screen is
not worth a verb; the shell holds moves and views of the reading, not reports
about the pile.

The part worth staring at: `ip` appears inside four relations **and** as a value
in `kinds.pile`, where somebody wrote
`["ip","kind, is-a, example, kind","address"]`. So `ip` is a string you can
name, and naming it gives a first column headed `ip` like naming any other
string. The vocabulary inside a relation and a taxonomy somebody exported meet
as the same string, with no mechanism at all.

## A value and a kind are the same slot

```
["ip", "kind, is-a, example, kind", "address"]
["10.2.14.7", "ip, resolves-to, has-address, host", "backup-03.corp"]
```

The same shape of line. One is about a kind and one is about an address, and
nothing in the format says which is which.

That is not an oversight waiting to be tidied up. Write the chain out and it
does not stop at either end:

```
itstuff
   endpoint
      address
         ip
            192.168.1.1
               192.168.1.1 used as default on Linksys routers
                  192.168.1.1 used as default on my Linksys router
```

**So the line between a type and a value is where somebody stopped walking, not
a fact about the world.** A typed system treats it as ontology: there are
categories, there are instances, and they are different sorts of thing. Here
they are strings, `is-a` is one more fact rather than a structural privilege,
and how far along the chain you went is a choice nothing records.

Nothing *could* record it, which is the honest half. No line says how specific
`192.168.1.1` is, because you can always write another one below it. What you
can ask is *what is this an example of* and *what is an example of this*, and
both are ordinary walks in the two directions of one relation.

It is also why a chain is lines rather than a longer line. Five levels is four
facts. Putting them in one line would put the chain in the line's structure,
and structure is not a string — which is where this whole format started.

## A schema is loaded after the fact

Seventy-eight kinds is a screen of names. A schema says which of them are shown
under one, and naming a drawer is naming a thing:

```
$ schema triage
  triage · 11 drawer(s) over 70/78 kind(s)
$ add
  14 name(s) over 78 kind(s) · triage · naming one is the first column
  network        45   17 kinds
  identity       60   11 kinds
  text-shape    301   15 kinds
  tabular        60   13 kinds
  time           15   6 kinds
  geography       8   8 kinds

  8 outside triage
  kind 8·2  related 4  flag 2  proj 2  number 1  ticket 1·2  type 1·2  value 1·2
```

**The listing is the schema's own shape**, top level in the order its author
wrote it, because the thing you are choosing from should look like the thing you
loaded. Sorting by count instead scatters six drawers through thirty-three loose
kinds, which is the wall the schema was loaded to take down. A name the schema
says nothing about has no place in its shape, so it is not given one: counted,
gridded, and typed exactly like any other name. The schema narrows what is worth
drawing as a shape, never what is reachable.

On its own, `schema` draws what is in force:

```
  triage           373   70 kinds
     network        45   17 kinds
        address     23   5 kinds
           ip  internal-ip  valid-ip  addr  host
        locator      8   2 kinds
           url  email
        subnets      5   6 kinds
           subnet  cidr  mask  octet4  last-octet  octet-sum
        path         3   2 kinds
           route  trace
        port  endpoint
     identity       60   11 kinds
        person  name  first-name  last-name  username  account  emp  company
        password  password-record  notes
     text-shape    301   15 kinds
        string  short-string  word  char  text  sentence  paragraph  blob
        line  length  entropy  vowels  first-letter  last-letter  format
```

A drawer carries the count of values it reaches, because that is the one thing
about it you cannot read off its name. A leaf carries its name and nothing else:
its count is one `add` away, and fifteen leaves on fifteen lines is a paragraph
rather than a tree.

**A schema may only merge. It may never assert.** Every column a drawer builds
could have been built by hand, by naming its members one at a time. It adds no
line, changes no value, hides no kind, and dropping it leaves every record
identical. That is what makes it safe to load over data already written, and
safe to be wrong about: being wrong costs you one reading. What it changes is
which readings are one word away, which is what people actually do.

A drawer and a kind carry the same grammar — `geography` reads `8 kinds` and
`kind` reads `2 ways`, both a count of what the name merges — so a drawer is
never a different sort of thing, only a name with more under it. And the schema's
coverage is on the screen rather than in a report: eight names here are outside
`triage`, and under `gardener` seventy-five are.

**The counts are unions at every level, never sums.** `text-shape` reads 301
where its fifteen kinds add up to about 670. The gap is the strings that are a
`word` and a `string` and a `short-string` at once, and it is visible because a
drawer is counted the way the column is built.

**A drawer is added, narrowed and typed exactly like a kind**, and the kinds it
holds stay typeable underneath it — `network`, then `ip`, then `ip resolves-to`.
One addressing scheme with three depths instead of two. `jump` reports routes in
the same vocabulary, so `identity/network` is a route you can hand to `add`.

**A drawer name may not be a kind name.** A drawer called `ip` holding the kind
`ip` would make `ip` mean two things and leave the bare kind with no name at
all, so it is refused at load rather than resolved by a rule.

**Never THE taxonomy.** Schemas swap inside a session, and the same column reads
differently under each:

```
  network 43/45·15   text-shape 19/45·3   tabular 3/45·3   identity 2/45·1

  addresses 21/45·3   noise 20/45·6   host 17/45·5   paths 8/45·2
  services 8/45·2   locators 7/45·1   subnets 4/45·6   account 2/45
```

Same rows, same steps, same 45 strings. `triage` says *you are inside the
network world and 43 of 45 stay in it*; `netops` says *here is where inside*,
and calls the text machinery `noise`, which is the honest name for it to that
reader. A column already built keeps the name you typed for it, because a schema
never revises a reading already made.

**A schema is a hypothesis, not a law.** The counts check it as they go.
`addresses` reads 21, exactly what `ip` reads alone, so every value that can
reach an `internal-ip` can reach an `ip` — the pile agreeing with what the
schema claimed was narrower. It could have disagreed. A member that pushed its
parent's count up would mean the schema has it backwards, said as a number in a
menu, with nothing stopping you proceeding anyway.

An enforced schema cannot be tested, because whatever would have contradicted it
was refused at the door. This one is falsifiable and not binding, which is what
you want from a conjecture and the wrong thing to want from a constraint.

**A schema is lines.** `schemas/<name>.sch` is a pile file — three strings, same
parser, same merge — where every line is one edge of the tree:

```
["ip", "kind, is-a, example, kind", "address"]
```

So a schema edits like data, merges like data, and can be `cat` into `piles/`
later if you want to walk it. It lives outside `piles/` because everything in
`piles/` is loaded always, and a schema nobody asked for should not be putting
`network` and `noise` in the root listing. Having the lines and naming them are
two acts.

A schema does not have to fit the pile. `schemas/gardener.sch` names `byte`,
`computername` and `cpu`, which nobody here wrote; they read zero and `schema`
says which. That is what lets a schema be shared while a pile stays private.

## Keeping a reading

A scenario is a session. Play, then keep what you typed:

```
$ # every host, its account, and what they raised
$ add host resolves-to
$ add account/ticket
$ save hosts-and-accounts
  3 line(s) -> scenarios/hosts-and-accounts.sw
```

```sh
npx tsx scenarios.ts > check/scenarios.txt
git diff check/scenarios.txt        # did any saved reading move?
```

The harness drives the real shell with the script on stdin, so it covers path
resolution, matching, the tree, the menus and the table. Piped in, the shell
echoes each command, so the output is a transcript and a diff points at the
command whose result changed.

It runs against whatever is in `piles/`. Add a line and the diff tells you
which readings it altered. Nothing is asserted and nothing screams: a renamed
relation leaves a table with no rows, a vanished column leaves a step
unapplied, a step that finds nothing leaves holes. Each is a change you read in
the diff.

## The concepts, all of them

- **A line is one fact, exactly three strings.** Values are transcription;
  relations are interpretation.
- **A pile is a set of lines.** Merging is a union.
- **A relation is kinds at the ends and verbs between them**, and a producer
  fills in as much as they know — down to nothing.
- **A step is a kind**, with the verb as an optional qualifier. No direction,
  because a phrase already is one, and no mode, because a one-hop fact leaves
  nothing to stay inside.
- **A kind with several ways in merges them**, and says so before it does.
- **A column is called by what it holds** — the phrase when there is one way
  in, the kind when it merged several.
- **Every column after the first joins on the column to its left**, so the
  pivot is always there to read and never has to be reported.
- **A reading starts by naming a kind, and that kind is the first column.**
- **A value and a kind are the same slot.** Where the chain from `itstuff` down
  to one address stops is where a reader stopped, and no line records it.
- **A path is a value.** If order matters, the ordered thing is a string you
  can stand on, and the facts about it are more lines.
- **A schema is a lens, not a law.** It may merge and never assert, several can
  be in force over the same lines, and being wrong about one costs a reading.

## What it refuses

Three strings with a relation in the middle is what RDF is. The ways this is not
that are the load-bearing part.

**No minted identity.** RDF joins on URIs, so a merge depends on producers
having coordinated, or on `sameAs` lines that are themselves claims somebody has
to stand behind. Here the join is on the literal bytes. `paris` in a nursery
receipt and `paris` in a json blob are one node because they are one string, and
nobody arranged it. That is why `cat piles/*.pile | sort -u` is the whole merge
— and it is the same reason nothing can tell a sound join from an unsound one.
What would let it is what it declined to record.

**No inference.** A class in RDFS or OWL entails triples a reasoner then adds. A
drawer derives nothing. It groups names in a menu, and unloading it leaves the
pile exactly as it was.

**No shared vocabulary.** The relation carries its own — kinds at the ends,
verbs between — so every line says what it means in both directions and there is
no ontology to fetch, agree on, or version.

What the three buy is that a merge needs no algorithm. Counts would have to sum,
order would conflict, timestamps would need reconciling clocks; none of it
exists, so a union is the entire operation and eight uncoordinated producers are
safe to `cat` together. **The commitment that usually happens at write time
happens at read time here, and read time is revisable.** Being wrong about a
schema costs one reading. Being wrong in a system that enforced one costs the
data, and you find out years later when somebody asks a question nobody
anticipated.

The price is that the tool will not be an oracle. It puts the evidence beside
the claim — the pivot in the column to the left, the whole route sitting in the
row — and stops. That works for a reader who can judge thirty rows. It does not
become *the system tells you the answer*, and it never will, because what would
make it authoritative is the identity it gave up.

## Deliberately not here

No picture. No grouping of relations that mean the same thing — a schema groups
kinds, and the same move over verbs is not built. No way to remove
a column short of starting the reading over. Nothing caps how wide a column
gets, so one value from `rfg.pile` runs to thousands of characters across.

There is no way for a third party to name a relation its producer left empty.
`""` is an invitation to say it later and nothing accepts the invitation. That
is a gap, not a decision.

**Nothing tells a sound join from an unsound one**, and nothing can from the
lines alone — that needs identity, which a pile refuses to record on purpose.
The reader does it by looking at the pivot.

**You cannot walk inside a route.** `10.2.14.7,10.2.0.1,192.0.2.9` is one
string, and the tool never looks inside a string, so *what came after
`10.2.0.1` in this route* is a question for a person reading the value. What the
pile answers is *which routes contain `10.2.0.1`*. If walking a route turns out
to be worth having, the way in is more lines — the route travelled so far as
the thing you are standing on, with one relation stepping from each prefix to
the next — and it can be added without touching a line already written.

## The open question

If left and right are transcription and the middle is interpretation, then the
two halves of a line may not deserve the same permissions. A value should never
be revised; revising it is falsifying a record. A relation is somebody's
reading of what they saw, and a better reading should be allowed to replace it.

Nothing in the tool does this today — a pile is append-only and merging is a
union, which is what makes seven uncoordinated producers safe to `cat`
together. But the empty relation is already an invitation: it is a line saying
*something goes here and I do not know what yet*, and the obvious next thing
anyone will want is to say it later.
