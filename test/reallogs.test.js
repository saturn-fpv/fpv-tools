'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { REPO, loadParser } = require('./harness');

// Tests against real radio logs.
//
// Real logs stay in temp/, which is gitignored: they carry the coordinates of
// actual flying sites and have no business in a public repository. Everything
// here therefore SKIPS when that folder is empty, which is what happens on a
// fresh clone and in CI. On the developer's machine it runs and catches the
// messy real-world quirks no synthetic fixture reproduces - truncated unit
// suffixes, arm-event altitude resets, stale repeats, sparse telemetry.
//
// Drop any EdgeTX .csv into temp/ and it is picked up automatically.

// FPV_TEST_LOGS points somewhere else if you keep logs outside the repo.
const LOGS_DIR = process.env.FPV_TEST_LOGS || path.join(REPO, 'temp');
const logs = fs.existsSync(LOGS_DIR)
    ? fs.readdirSync(LOGS_DIR).filter(f => f.toLowerCase().endsWith('.csv')).sort()
    : [];

const P = loadParser([
    'parseCSV', 'detectFlights', 'processFlightPoints', 'generateKML', 'haversine', 'parseTime'
]);

describe('real logs', () => {
    if (logs.length === 0) {
        // Register one visible skip rather than silently running nothing, so a
        // clean checkout says why the richest tests did not run.
        test('skipped: no .csv files in ' + LOGS_DIR, { skip: 'drop EdgeTX logs there to enable these' }, () => {});
        return;
    }

    for (const name of logs) {
        const csv = () => fs.readFileSync(path.join(LOGS_DIR, name), 'utf8');

        test(name + ': parses without throwing and keeps rows', () => {
            const rows = P.parseCSV(csv());
            assert.ok(rows._diagnostics, 'diagnostics missing');
            assert.ok(rows.length > 0, 'no usable rows - if this log really has no GPS, move it out of temp/');
        });

        test(name + ': timestamps never go backwards', () => {
            const rows = P.parseCSV(csv());
            for (let i = 1; i < rows.length; i++) {
                const prev = P.parseTime(rows[i - 1].date, rows[i - 1].time);
                const cur = P.parseTime(rows[i].date, rows[i].time);
                if (!isNaN(prev) && !isNaN(cur)) assert.ok(cur >= prev, 'time went backwards at row ' + i);
            }
        });

        test(name + ': the filter keeps the overwhelming majority of rows', () => {
            const rows = P.parseCSV(csv());
            const d = rows._diagnostics;
            const dropped = d.droppedGpsJump;
            assert.ok(dropped <= d.totalDataRows * 0.05,
                `dropped ${dropped} of ${d.totalDataRows} rows as GPS jumps - the filter is too aggressive`);
        });

        test(name + ': every detected flight exports clean KML', () => {
            const flights = P.detectFlights(P.parseCSV(csv()));
            assert.ok(flights.length > 0, 'no flight segments detected');
            for (const f of flights) {
                if (f.rows.length < 2) continue;
                const pts = P.processFlightPoints(f, f.preArmAlt, true, false);
                const kml = P.generateKML(pts, {
                    name: name, color: '#ff0000', width: 4, altMode: 'absolute', extrude: false
                });
                const block = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(kml);
                assert.ok(block, 'no coordinates block');
                const tuples = block[1].trim().split(/\s+/);
                for (let i = 1; i < tuples.length; i++) {
                    assert.notStrictEqual(tuples[i], tuples[i - 1],
                        'zero-length segment at index ' + i + ' would break Google Earth Web');
                }
                tuples.forEach(t => {
                    const [lon, lat, alt] = t.split(',').map(Number);
                    assert.ok(isFinite(lon) && isFinite(lat) && isFinite(alt), 'non-finite coordinate: ' + t);
                    assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, 'coordinate out of range: ' + t);
                });
            }
        });

        test(name + ': interpolation never implies an impossible speed', () => {
            const flights = P.detectFlights(P.parseCSV(csv()));
            let biggest = flights[0];
            for (const f of flights) if (f.rows.length > biggest.rows.length) biggest = f;
            const pts = P.processFlightPoints(biggest, biggest.preArmAlt, true, true);
            let worst = 0;
            for (let i = 1; i < pts.length; i++) {
                const d = P.haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
                const dt = (P.parseTime(pts[i].date, pts[i].time) - P.parseTime(pts[i - 1].date, pts[i - 1].time)) / 1000;
                if (dt > 0) worst = Math.max(worst, (d / dt) * 3.6);
            }
            assert.ok(worst < 400, 'implied ' + worst.toFixed(0) + ' km/h between points');
        });
    }
});
