'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadParser } = require('./harness');
const F = require('./fixtures');

const P = loadParser(['parseCSV', 'splitCsvLine', 'findCol', 'parseTime', 'haversine']);

describe('splitCsvLine', () => {
    test('splits plain fields', () => {
        assert.deepStrictEqual(P.splitCsvLine('a,b,c'), ['a', 'b', 'c']);
    });

    test('keeps commas inside quotes', () => {
        assert.deepStrictEqual(P.splitCsvLine('a,"b,c",d'), ['a', 'b,c', 'd']);
    });

    test('unescapes doubled quotes', () => {
        assert.deepStrictEqual(P.splitCsvLine('a,"d""e",f'), ['a', 'd"e', 'f']);
    });

    test('preserves a trailing empty field', () => {
        assert.deepStrictEqual(P.splitCsvLine('a,b,'), ['a', 'b', '']);
    });

    test('preserves empty fields in the middle', () => {
        assert.deepStrictEqual(P.splitCsvLine('a,,c'), ['a', '', 'c']);
    });
});

describe('header matching', () => {
    test('finds EdgeTX truncated unit suffixes', () => {
        const h = F.HEADERS_CRSF;
        assert.notStrictEqual(P.findCol(h, ['Alt']), -1, 'Alt(s k) should match Alt');
        assert.notStrictEqual(P.findCol(h, ['GSpd']), -1, 'GSpd(cm/) should match GSpd');
        assert.notStrictEqual(P.findCol(h, ['Sats']), -1);
    });

    test('returns -1 for a column that is not there', () => {
        assert.strictEqual(P.findCol(F.HEADERS_ELRS, ['NoSuchSensor']), -1);
    });
});

describe('parseCSV', () => {
    test('keeps every row of a clean flight', () => {
        const log = F.straightFlight({ n: 40 });
        const rows = P.parseCSV(log.csv);
        assert.strictEqual(rows.length, 40);
        assert.strictEqual(rows._diagnostics.droppedGpsJump, 0);
        assert.strictEqual(rows._diagnostics.droppedLowSats, 0);
        assert.strictEqual(rows._diagnostics.totalDataRows, 40);
    });

    test('is deterministic', () => {
        const csv = F.straightFlight({ n: 30 }).csv;
        const a = P.parseCSV(csv), b = P.parseCSV(csv);
        assert.deepStrictEqual(
            a.map(r => [r.lat, r.lon, r.alt]),
            b.map(r => [r.lat, r.lon, r.alt])
        );
    });

    test('preserves input order and never invents rows', () => {
        const rows = P.parseCSV(F.straightFlight({ n: 25 }).csv);
        assert.ok(rows.length <= 25);
        for (let i = 1; i < rows.length; i++) {
            const prev = P.parseTime(rows[i - 1].date, rows[i - 1].time);
            const cur = P.parseTime(rows[i].date, rows[i].time);
            assert.ok(cur >= prev, 'timestamps must not go backwards at row ' + i);
        }
    });

    test('converts feet to metres', () => {
        const m = P.parseCSV(F.straightFlight({ headers: F.HEADERS_ELRS, alt: 1000, dAlt: 0, n: 5 }).csv);
        const ft = P.parseCSV(F.straightFlight({ headers: F.HEADERS_FEET, alt: 1000, dAlt: 0, n: 5 }).csv);
        assert.strictEqual(Math.round(m[0].alt), 1000, 'metres stay as they are');
        assert.strictEqual(Math.round(ft[0].alt), Math.round(1000 * 0.3048), 'feet convert to metres');
    });

    test('drops rows with too few satellites', () => {
        const rows = P.parseCSV(F.straightFlight({ n: 10, sats: 3 }).csv);
        assert.strictEqual(rows.length, 0);
        assert.strictEqual(rows._diagnostics.droppedLowSats, 10);
    });

    test('a blank Sats cell does not discard a good fix', () => {
        const log = F.straightFlight({ n: 10 });
        log.rows.forEach(r => { r.Sats = ''; });
        const rows = P.parseCSV(F.toCsv(log.headers, log.rows));
        assert.strictEqual(rows.length, 10, 'unknown satellite count is not a reason to drop a row');
        assert.strictEqual(rows._diagnostics.droppedLowSats, 0);
    });
});

describe('unusable logs are explained, not silently empty', () => {
    test('no GPS column at all', () => {
        const headers = ['Date', 'Time', 'Alt(m)', 'Thr'];
        const rows = [];
        for (let i = 0; i < 5; i++) {
            rows.push({ Date: '2026-01-01', Time: F.clock(36000000 + i * 1000), 'Alt(m)': 100 + i, Thr: 50 });
        }
        const out = P.parseCSV(F.toCsv(headers, rows));
        assert.strictEqual(out.length, 0);
        assert.ok(out._diagnostics, 'diagnostics must be present so the UI can explain itself');
        assert.strictEqual(out._diagnostics.totalDataRows, 5);
    });

    test('GPS column present but never a fix', () => {
        const log = F.straightFlight({ n: 8 });
        log.rows.forEach(r => { r.GPS = ''; });
        const out = P.parseCSV(F.toCsv(log.headers, log.rows));
        assert.strictEqual(out.length, 0);
        assert.strictEqual(out._diagnostics.droppedNoGps, 8);
    });

    test('empty input and header-only input do not throw', () => {
        assert.strictEqual(P.parseCSV('').length, 0);
        assert.strictEqual(P.parseCSV(F.HEADERS_CRSF.join(',') + '\n').length, 0);
    });

    test('a single data row does not throw', () => {
        const rows = P.parseCSV(F.straightFlight({ n: 1 }).csv);
        assert.strictEqual(rows.length, 1);
    });
});
