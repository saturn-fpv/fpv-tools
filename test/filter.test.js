'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadParser } = require('./harness');
const F = require('./fixtures');

const P = loadParser([
    'parseCSV', 'detectFlights', 'processFlightPoints', 'haversine', 'parseTime', 'dedupeCoords'
]);

/** Largest gap in metres between consecutive points. */
function longestStep(points) {
    let max = 0;
    for (let i = 1; i < points.length; i++) {
        const d = P.haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
        if (d > max) max = d;
    }
    return max;
}

describe('GPS jump filter', () => {
    test('a lone impossible fix is rejected', () => {
        const log = F.strayFix(F.straightFlight({ n: 30 }), 15);   // 40 km sideways for one row
        const rows = P.parseCSV(log.csv);
        assert.strictEqual(rows.length, 29, 'only the stray row goes');
        assert.strictEqual(rows._diagnostics.droppedGpsJump, 1);
    });

    test('a fast but possible move is kept', () => {
        // 50 m per second is 180 km/h: fast, entirely real.
        const rows = P.parseCSV(F.straightFlight({ n: 20, dLat: 0.00045, dLon: 0 }).csv);
        assert.strictEqual(rows.length, 20);
        assert.strictEqual(rows._diagnostics.droppedGpsJump, 0);
    });

    test('a held position followed by a long move is kept, not treated as a jump', () => {
        // The classic sparse-GPS case: the fix freezes for 20 s, then catches
        // up in one row. Measured against the frozen row it looks impossible;
        // measured from where that position began it is ordinary.
        const log = F.freeze(F.straightFlight({ n: 40 }), 10, 20);
        const rows = P.parseCSV(log.csv);
        assert.strictEqual(rows._diagnostics.droppedGpsJump, 0, 'catching up after a dropout is not a jump');
        assert.strictEqual(rows.length, 40);
    });
});

describe('the first fix is not trusted blindly', () => {
    test('a stale seed is overruled by the real track', () => {
        const log = F.strayFix(F.straightFlight({ n: 40 }), 0);
        const rows = P.parseCSV(log.csv);
        assert.strictEqual(rows.length, 39, 'only the bad seed is lost');
        const [la] = log.rows[1].GPS.split(' ').map(Number);
        assert.ok(Math.abs(rows[0].lat - la) < 1e-6, 'the track restarts at the real position');
    });

    test('a stray fix that merely repeats cannot overrule a good seed', () => {
        // One bad position held for several rows must not look like several
        // agreeing fixes. With sparse telemetry a held fix repeats for
        // 20-50 rows, so this is the normal case rather than a corner case.
        for (const repeats of [1, 2, 3, 5, 10]) {
            const base = F.straightFlight({ n: 40 });
            const rows = base.rows.map(r => Object.assign({}, r));
            const [la, lo] = rows[0].GPS.split(' ').map(Number);
            const stray = (la + 0.36).toFixed(6) + ' ' + lo.toFixed(6);
            for (let k = 1; k <= repeats; k++) rows[k].GPS = stray;

            const out = P.parseCSV(F.toCsv(base.headers, rows));
            assert.ok(Math.abs(out[0].lat - la) < 1e-6,
                `the real seed must survive ${repeats} repeated stray rows`);
            assert.strictEqual(out.length, 40 - repeats,
                `only the ${repeats} stray rows should be dropped`);
        }
    });
});

describe('interpolation', () => {
    test('fills a dropout and marks what it invented', () => {
        const log = F.freeze(F.straightFlight({ n: 40 }), 10, 20);
        const rows = P.parseCSV(log.csv);
        const flight = P.detectFlights(rows)[0];

        const raw = P.processFlightPoints(flight, flight.preArmAlt, true, false);
        const smooth = P.processFlightPoints(flight, flight.preArmAlt, true, true);

        assert.ok(longestStep(smooth) < longestStep(raw),
            'interpolation should shorten the longest straight run');
        assert.ok(smooth.some(p => p.interpolated), 'generated points must be flagged');
        assert.ok(raw.every(p => !p.interpolated), 'nothing is invented when it is switched off');
    });

    test('places points by elapsed time, not row index', () => {
        // Rows deleted during parsing collapse the row gap while the clock
        // keeps running. Spreading distance across rows instead of seconds is
        // what produced a phantom 497.9 km/h reading.
        const log = F.freeze(F.straightFlight({ n: 40 }), 10, 20);
        const flight = P.detectFlights(P.parseCSV(log.csv))[0];
        const pts = P.processFlightPoints(flight, flight.preArmAlt, true, true);

        let worst = 0;
        for (let i = 1; i < pts.length; i++) {
            const d = P.haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
            const dt = (P.parseTime(pts[i].date, pts[i].time) - P.parseTime(pts[i - 1].date, pts[i - 1].time)) / 1000;
            if (dt > 0) worst = Math.max(worst, (d / dt) * 3.6);
        }
        assert.ok(worst < 360, 'no interpolated step may imply more than 360 km/h, got ' + worst.toFixed(0));
    });
});

describe('dedupeCoords', () => {
    test('collapses runs and leaves nothing adjacent repeated', () => {
        const out = P.dedupeCoords(['a', 'a', 'a', 'b', 'b', 'c']);
        assert.deepStrictEqual(out, ['a', 'b', 'c']);
    });

    test('keeps a value that recurs after something else', () => {
        assert.deepStrictEqual(P.dedupeCoords(['a', 'b', 'a']), ['a', 'b', 'a']);
    });

    test('is idempotent and keeps both endpoints', () => {
        const input = ['x', 'x', 'y', 'z', 'z', 'z'];
        const once = P.dedupeCoords(input);
        assert.deepStrictEqual(P.dedupeCoords(once), once);
        assert.strictEqual(once[0], input[0]);
        assert.strictEqual(once[once.length - 1], input[input.length - 1]);
    });

    test('handles empty and single-element input', () => {
        assert.deepStrictEqual(P.dedupeCoords([]), []);
        assert.deepStrictEqual(P.dedupeCoords(['only']), ['only']);
    });
});
