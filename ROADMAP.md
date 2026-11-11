# Roadmap

Planned work across the whole app: the tools, the Android wrapper and the
tooling around them. Nothing here is started.

Items are grouped by area rather than numbered, so entries can be added or
reordered without renumbering everything; refer to them by heading. Within a
group they are roughly in the order they are worth doing.

---

# Tools

## Telemetry parser

### Bundled example log

Ship a small, real `.csv` in `tools/` with a "Try an example" button. Lets anyone
see what the tool does without owning a radio, and gives us a fixed regression
case.

### Fullscreen map toggle

The map is the point of the tool and currently shares the page with the panels.
A single button that expands it to the viewport, Escape to leave.

### Point inspection popup

Click a point on the track to see its time, altitude, speed, sats and link
quality. Needs the per-point data that is already attached to the Leaflet
polyline.

### Milestone markers

Markers for takeoff, landing, max altitude and max distance. Cheap to compute —
the stats panel already finds all four.

### Playback / scrub

A timeline slider that moves a marker along the track, with the altitude and
speed charts following it. The biggest single win for reviewing a flight.

### Track colour modes

Colour the polyline by speed, altitude or link quality instead of one flat
colour. Leaflet is already configured with `preferCanvas`, so no new dependency
is needed.

### Track smoothing (separate setting)

A genuine smoothing option: round off sharp corners and sensor jitter in the
plotted path. This is **not** what "Interpolate sparse GPS" does — that one only
fills gaps between real fixes with straight-line points and leaves corners
untouched. The two belong on separate toggles so it is clear which is being
applied.

### Vertical speed and 3D speed stats

Both existing speed stats are horizontal ground speed. Add:

- **Max climb / descent rate** (m/s) from the altitude series.
- **Max 3D speed**, combining horizontal and vertical components.

Keep them as their own tiles rather than folding altitude into the ground-speed
figures.

### Show interpolated spans differently on the map

Interpolated points are already flagged (`point.interpolated`). Drawing those
spans dashed or dimmed would make it obvious at a glance which parts of the
track are reconstructed rather than measured, instead of a straight line that
reads as a defect.

### Ground shadow track in the KML export

An optional second copy of the path exported as a `clampToGround` line, drawn
under the 3D track. It stays readable from any camera angle and shows the route
over the terrain, which is useful on steep ground where the airborne line is
hard to follow.

Nice to have, not a fix for anything: the track vanishing in Google Earth Web
was caused by zero-length segments, which the exporter now removes.

### 3D globe view — deferred

A three.js globe was evaluated and set aside: roughly 370 KB of extra assets
against a 4.6 MB APK, for something Google Earth already does better from the
exported KMZ.

---

## New tools

Proposed, not yet specified. Each needs its scope pinned down before it is worth
starting.

### Superview tool

Apply or reverse GoPro's Superview mapping — the non-linear horizontal stretch
that fits 4:3 sensor output into a 16:9 frame while keeping the centre close to
rectilinear. Useful both for stretching 4:3 footage to fill a widescreen frame
and for undoing it when a shot needs straight geometry.

There is already a `feature/wide-stretch-tool` branch holding a scaffold commit
for this. Decide whether to build on it or start fresh before doing anything
else here.

### Flight time / distance calculator

Estimate endurance and range from pack capacity, cell count, all-up weight and
current draw. Scope to settle first: whether it works from a hover current the
user supplies, from a logged flight, or from a model of the airframe.

### Panini projection tool

Re-project wide-angle FPV footage with a Panini projection, which keeps vertical
lines straight while retaining more of the field of view than a rectilinear
de-warp. Related to the Superview tool and probably shares its image pipeline.

### Torque calculator

Motor torque from Kv, voltage and current, and the propeller torque it has to
overcome. Worth deciding whether this belongs beside the existing stator volume
and prop tip speed tools, or whether the three fold into one motor page.

### Visual race timer

Time laps by detecting a single drone passing a fixed camera, in the browser via
`getUserMedia`. The hard parts are detection under varying light and rejecting
false triggers, not the timing. Start by deciding whether a gate or marker is
assumed, since that changes the problem entirely.

---

# App

## Fixes

### Deprecated edge-to-edge handling

Flagged by a Play Console notification. `MainActivity.kt` sets
`window.statusBarColor` and `window.navigationBarColor` (around lines 251-252)
to tint the system bars with the current theme. Both were deprecated in API 35
and **do nothing** on API 35 and above when the app targets it — and this app
sets `targetSdk = 36`.

The replacement is to go edge-to-edge deliberately: let content draw behind the
bars, then apply window insets as padding so the WebView is not underneath them.
The theme is `android:Theme.Material.NoActionBar`, so there is no AppCompat or
Material 3 behaviour to inherit here and the insets have to be handled
explicitly.

Worth checking on a device with gesture navigation and one with three-button
navigation, since the inset sizes differ.

### Uniform text input fields

Input fields do not look or behave the same across the tools — they have grown
separately, page by page. They should share one set of styles from `css/`, with
consistent sizing, focus states, numeric keypads on mobile where appropriate,
and the same validation treatment.

---

## Build and tooling

### Remove the manual asset copy

Every root file under `tools/`, `js/`, `css/`, `fonts/` plus `index.html`,
`menu.html` and `app_icon.png` exists twice: once at the repo root and again in
`android/app/src/main/assets/`. The second copy is made by hand, which is the
easiest mistake in this repository to make and the reason `test/sync.test.js`
exists.

A Gradle `Sync` task wired into the build would copy them into
`build/generated/webAssets/` and register that as an extra `assets.srcDir`. The
`src/main/assets/` folder could then be deleted outright — every file in it is a
duplicate — and nothing new needs adding to `.gitignore`, since `build/` is
already ignored. Gradle tasks are incremental, so repeat builds cost nothing.

Trade-offs to weigh first: the build would read files outside its own Gradle
root, so copying `android/` somewhere on its own would break it, and the assets
would no longer appear in the Android Studio project tree.

This does not replace `sync-tools.ps1`, which copies to the website repository
and is a separate concern.

---

## Testing

### Extend the test suite

`test/` runs with `node --test test/*.test.js` and currently covers CSV parsing,
the GPS filter, exports, map configuration and the Android asset sync. Two of
its files already apply to the whole repository — `sync.test.js` checks the
asset mirror and `mapconfig.test.js` covers the shared `js/map-config.js`.

**The other nine tools have nothing.** They should be *easier* targets than the
parser, not harder: the parser digests messy real-world data, while the rest are
calculators with one correct answer.

| Tool | What a test would pin down |
|---|---|
| `rate-converter.html` | Betaflight/KISS/Actual curves against values the firmware itself produces |
| `prop-tip-speed.html` | tip speed and Mach from diameter and RPM |
| `stator-volume.html` | volume from stator dimensions, and the comparison ratios |
| `tpa-comparison.html` | the attenuation curve at breakpoint, below it and above it |
| `pid-simulator.html` | step response stays stable; known gains give known overshoot |
| `frequency-planner.html` | channel separation and the conflicts it reports |
| `rf-calculators.html` | link budget, Fresnel zone, free-space path loss |
| `chirp-analyzer.html` | a synthesised sweep of known frequency comes back as that frequency |

`js/blackbox-decoder.js` is the strongest candidate of all: 722 lines of binary
frame decoding with predictors and no coverage whatsoever. Feed it a small
recorded `.bbl` and assert the decoded arrays.

`harness.js` names `tools/telemetry-parser.html` in one place. Parameterising
that is a few lines and everything else carries over unchanged.

Still missing on the parser itself:

- `isArmReset` and `detectFlights` segmentation, the subtlest logic in the file
  and full of tuned constants (50 m, 15 m, 3 rows, 2 m, 60 km/h).
- MSL offset detection against logs where it both does and does not fire.
- A large generated log through `updateStats`, guarding the stack overflow that
  `Math.max(...spread)` used to cause.
- Midnight rollover, and a log with no Date column.

Rendering stays out of scope: Leaflet and Chart.js are stubbed, so the suite
says nothing about how anything looks.

---

## Documentation

### JSDoc coverage

Only 6 of 36 top-level functions in `tools/telemetry-parser.html` carry a
`/** */` block. The rest are explained with ordinary `//` comments, which read
fine in place but give editors and tooling nothing to work with, and no
`@param` / `@returns`. The other tools have not been surveyed and are likely no
better.

Raised by the CodeRabbit docstring-coverage check on PR #31 and deliberately
left out of that PR: documenting two dozen untouched functions inside a bug-fix
diff mixes in churn nobody reviews carefully. It is a pass of its own.

Start with the parser's parsing and export path, where the argument types are
least obvious:

- `parseCSV`, `splitCsvLine`, `findCol`, `parseTime`
- `implausibleStep`, `isArmReset`, `detectFlights`, `summarizeFlight`
- `interpolateGPSPoints`, `processFlightPoints`
- `dedupeCoords`, `generateKML`, `generateGPX`, `escXml`, `cdata`

The UI helpers (`renderFlightList`, `setTelemetryTab`, `updateChartsTheme` and
the rest) matter less and can follow. `js/map-config.js` is already fully
documented and is the style to copy.

---

## Known copy issues

- The telemetry parser's sparse-GPS warning and help section both attribute slow
  GPS updates to a low **ExpressLRS** telemetry ratio. Crossfire has no such
  setting, and a Crossfire log can show the same symptom from downlink loss
  alone. The wording should cover both links.
