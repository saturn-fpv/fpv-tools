# Tests

```bash
node --test test/*.test.js
```

No dependencies, no `package.json`, no install. Node ships `--test`, which
suits a project that deliberately has no build step.

## How it works

The tools are plain HTML pages with no module system, so there is nothing to
`require`. `harness.js` evaluates the page's inline `<script>` against stubbed
browser globals and hands back the functions by name. Earlier attempts picked
functions out of the file by brace-matching; that breaks on regex literals and
quoted strings. Evaluating the whole script means that if the page parses in a
browser, it parses here.

## Files

| File | Covers |
|---|---|
| `harness.js` | loads the parser and `js/map-config.js` under stubs |
| `fixtures.js` | synthetic EdgeTX logs, built in code |
| `parser.test.js` | CSV splitting, header matching, units, satellites, unusable logs |
| `filter.test.js` | GPS jump filter, stale first fix, interpolation, de-duplication |
| `export.test.js` | KML and GPX well-formedness, escaping, round-trip |
| `mapconfig.test.js` | tile providers, attribution, protocol fallback |
| `sync.test.js` | the Android assets still match the root folders |
| `reallogs.test.js` | real radio logs, when any are present |

## Fixtures

Synthetic logs are **built in code** rather than recorded. They carry no flight
data, they run anywhere, and each isolates one quirk. The header spellings are
deliberate: EdgeTX truncates sensor unit suffixes, so real files contain
`Alt(s k)` and `GSpd(cm/)`, and the parser has to cope.

Real logs stay in `temp/`, which is **gitignored** — they hold the coordinates
of actual flying sites and have no business in a public repository.
`reallogs.test.js` picks up any `.csv` it finds there and skips cleanly when
there are none, which is what happens on a fresh clone and in CI. Point it
elsewhere with `FPV_TEST_LOGS=/some/path`.

So the suite runs everywhere, and runs *richer* on a machine that has logs.

## Writing a test

A test that cannot fail is worse than no test, because it buys false
confidence. The `collapses repeated coordinates` case in `export.test.js`
originally passed even with de-duplication removed, because the fixture had no
repeated positions to collapse — it asserts the fixture contains repeats before
asserting anything about the output.

Worth checking a new test by breaking the code on purpose and confirming it
goes red. The bugs these guard against were all real, and several were
introduced *while fixing other bugs*.

## What is not covered

Rendering. Leaflet layers, Chart.js output and DOM wiring are stubbed, so the
suite says nothing about whether the map looks right — only about the data fed
to it. Tile URLs and layer configuration are checked in `mapconfig.test.js`;
anything visual still needs a browser.
