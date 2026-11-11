# Roadmap — Telemetry Parser

Deferred features, in the order they are worth building. Nothing here is started.

## 1. Bundled example log

Ship a small, real `.csv` in `tools/` with a "Try an example" button. Lets anyone see
what the tool does without owning a radio, and gives us a fixed regression case.

## 2. Fullscreen map toggle

The map is the point of the tool and currently shares the page with the panels.
A single button that expands it to the viewport, Escape to leave.

## 3. Point inspection popup

Click a point on the track to see its time, altitude, speed, sats and link quality.
Needs the per-point data that is already attached to the Leaflet polyline.

## 4. Milestone markers

Markers for takeoff, landing, max altitude and max distance. Cheap to compute —
the stats panel already finds all four.

## 5. Playback / scrub

A timeline slider that moves a marker along the track, with the altitude and speed
charts following it. The biggest single win for reviewing a flight.

## 6. Track colour modes

Colour the polyline by speed, altitude or link quality instead of one flat colour.
Leaflet is already configured with `preferCanvas`, so no new dependency is needed.

## 7. Track smoothing (separate setting)

A genuine smoothing option: round off sharp corners and sensor jitter in the plotted
path. This is **not** what "Interpolate sparse GPS" does — that one only fills gaps
between real fixes with straight-line points and leaves corners untouched. The two
belong on separate toggles so it is clear which is being applied.

## 8. Vertical speed and 3D speed stats

Both existing speed stats are horizontal ground speed. Add:

- **Max climb / descent rate** (m/s) from the altitude series.
- **Max 3D speed**, combining horizontal and vertical components.

Keep them as their own tiles rather than folding altitude into the ground-speed
figures.

## 9. Show interpolated spans differently on the map

Interpolated points are already flagged (`point.interpolated`). Drawing those spans
dashed or dimmed would make it obvious at a glance which parts of the track are
reconstructed rather than measured, instead of a straight line that reads as a defect.

## 10. Ground shadow track in the KML export

An optional second copy of the path exported as a `clampToGround` line, drawn under
the 3D track. It stays readable from any camera angle and shows the route over the
terrain, which is useful on steep ground where the airborne line is hard to follow.

Nice to have, not a fix for anything: the track vanishing in Google Earth Web was
caused by zero-length segments, which the exporter now removes.

## 11. 3D globe view — deferred

A three.js globe was evaluated and set aside: roughly 370 KB of extra assets against
a 4.6 MB APK, for something Google Earth already does better from the exported KMZ.

---

## 12. Extend the test suite

`test/` now covers CSV parsing, the GPS filter, exports, map configuration and
the Android asset sync, and runs with `node --test test/*.test.js`. Gaps worth
closing as the parser changes:

- `isArmReset` and `detectFlights` segmentation, which is the subtlest logic in
  the file and full of tuned constants (50 m, 15 m, 3 rows, 2 m, 60 km/h).
- MSL offset detection against logs where it both does and does not fire.
- A large generated log through `updateStats`, guarding the stack overflow that
  `Math.max(...spread)` used to cause.
- Midnight rollover, and a log with no Date column.

Rendering stays out of scope: Leaflet and Chart.js are stubbed, so the suite
says nothing about how the map looks.

## 13. JSDoc coverage in the telemetry parser

Only 6 of 36 top-level functions in `tools/telemetry-parser.html` carry a `/** */`
block. The rest are explained with ordinary `//` comments, which read fine in place
but give editors and tooling nothing to work with, and no `@param` / `@returns`.

Raised by the CodeRabbit docstring-coverage check on PR #31 and deliberately left
out of that PR: documenting two dozen untouched functions inside a bug-fix diff
mixes in churn nobody reviews carefully. It is a pass of its own.

Start with the parsing and export path, where the argument types are least obvious:

- `parseCSV`, `splitCsvLine`, `findCol`, `parseTime`
- `implausibleStep`, `isArmReset`, `detectFlights`, `summarizeFlight`
- `interpolateGPSPoints`, `processFlightPoints`
- `dedupeCoords`, `generateKML`, `generateGPX`, `escXml`, `cdata`

The UI helpers (`renderFlightList`, `setTelemetryTab`, `updateChartsTheme` and the
rest) matter less and can follow. `js/map-config.js` is already fully documented and
is the style to copy.

---

## Known copy issues

- The sparse-GPS warning and the help section both attribute slow GPS updates to a
  low **ExpressLRS** telemetry ratio. Crossfire has no such setting, and a Crossfire
  log can show the same symptom from downlink loss alone. The wording should cover
  both links.
