'use strict';
// Synthetic EdgeTX logs, built in code rather than committed as files.
//
// These are deliberately committed-and-generated rather than recorded: they
// carry no flight data, they run anywhere, and each one isolates a single
// quirk. Real logs stay in the gitignored temp/ folder and are used by
// reallogs.test.js when they happen to be present.
//
// The header spellings matter. EdgeTX truncates sensor unit suffixes to a
// fixed width, so real files contain names like `Alt(s k)` and `GSpd(cm/)`
// rather than anything tidy, and the parser has to cope with both.

/** EdgeTX CRSF header, with the truncated unit suffixes a radio really writes. */
const HEADERS_CRSF = ['Date', 'Time', '1RSS(dB)', 'RQly(  f)', 'TPWR(mW)',
    'GPS', 'GSpd(cm/)', 'Alt(s k)', 'Sats', 'Thr'];

/** Tidier ELRS-style header with explicit units. */
const HEADERS_ELRS = ['Date', 'Time', 'GPS', 'GSpd(kmh)', 'Alt(m)', 'Sats', 'Thr'];

/** Same, but altitude in feet - the parser must convert to metres. */
const HEADERS_FEET = ['Date', 'Time', 'GPS', 'GSpd(kmh)', 'Alt(ft)', 'Sats', 'Thr'];

/**
 * Formats milliseconds since midnight as EdgeTX writes it.
 * @param {number} ms Milliseconds since midnight.
 * @returns {string} HH:MM:SS.mmm
 */
function clock(ms) {
    const p = (n, w) => String(n).padStart(w || 2, '0');
    const h = Math.floor(ms / 3600000) % 24;
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    return p(h) + ':' + p(m) + ':' + p(s) + '.' + p(ms % 1000, 3);
}

/**
 * Builds a CSV from row objects.
 * @param {string[]} headers Column names, in order.
 * @param {Array<Object>} rows Row objects keyed by column name.
 * @returns {string} CSV text.
 */
function toCsv(headers, rows) {
    const body = rows.map(r => headers.map(h => (r[h] === undefined ? '' : String(r[h]))).join(','));
    return [headers.join(','), ...body].join('\n') + '\n';
}

/**
 * A straight, steadily climbing flight - the baseline every other fixture
 * varies from.
 * @param {Object} [opt] Overrides.
 * @returns {{headers: string[], rows: Array<Object>, csv: string}} The log.
 */
function straightFlight(opt) {
    const o = Object.assign({
        n: 40,
        headers: HEADERS_CRSF,
        lat: 52.70, lon: -119.12,
        dLat: 0.0004, dLon: 0.0003,     // about 50 m per step
        alt: 100, dAlt: 3,
        sats: 11, speed: 45, thr: 60,
        startMs: 36000000,              // 10:00:00.000
        stepMs: 1000,
        date: '2026-01-01'
    }, opt || {});

    const altKey = o.headers.find(h => h.indexOf('Alt') === 0);
    const spdKey = o.headers.find(h => h.indexOf('GSpd') === 0);
    const rows = [];
    for (let i = 0; i < o.n; i++) {
        const row = {
            Date: o.date,
            Time: clock(o.startMs + i * o.stepMs),
            GPS: (o.lat + i * o.dLat).toFixed(6) + ' ' + (o.lon + i * o.dLon).toFixed(6),
            Sats: o.sats,
            Thr: o.thr
        };
        row[altKey] = o.alt + i * o.dAlt;
        row[spdKey] = o.speed;
        if (o.headers.indexOf('1RSS(dB)') !== -1) { row['1RSS(dB)'] = 95; row['RQly(  f)'] = 100; row['TPWR(mW)'] = 250; }
        rows.push(row);
    }
    return { headers: o.headers, rows, csv: toCsv(o.headers, rows) };
}

/**
 * Freezes a span of rows the way a telemetry downlink dropout really looks.
 *
 * Every value that comes from the flight controller holds - position,
 * satellites, altitude and ground speed alike - because the radio has nothing
 * new to write and repeats what it last heard, once per log row. Link-side
 * sensors such as RQly and 1RSS keep updating, since the receiver produces
 * those itself; that contrast is how a dropout is told apart from a genuine
 * hover. Freezing only the GPS would be a fixture no radio ever produces.
 *
 * @param {{headers: string[], rows: Array<Object>}} log Log to modify.
 * @param {number} from First row index to freeze.
 * @param {number} count How many rows hold their values.
 * @returns {{headers: string[], rows: Array<Object>, csv: string}} New log.
 */
function freeze(log, from, count) {
    const rows = log.rows.map(r => Object.assign({}, r));
    const held = rows[from];
    const fcSensors = log.headers.filter(h =>
        h === 'GPS' || h === 'Sats' || h.indexOf('Alt') === 0 || h.indexOf('GSpd') === 0);
    for (let i = from; i < Math.min(from + count, rows.length); i++) {
        fcSensors.forEach(k => { rows[i][k] = held[k]; });
    }
    return { headers: log.headers, rows, csv: toCsv(log.headers, rows) };
}

/**
 * Moves one row's fix far away, simulating a stale cache entry from a previous
 * power-up.
 * @param {{headers: string[], rows: Array<Object>}} log Log to modify.
 * @param {number} index Row to corrupt.
 * @param {number} [offsetDeg] Degrees of latitude to shift by.
 * @returns {{headers: string[], rows: Array<Object>, csv: string}} New log.
 */
function strayFix(log, index, offsetDeg) {
    const rows = log.rows.map(r => Object.assign({}, r));
    const [la, lo] = rows[index].GPS.split(' ').map(Number);
    rows[index].GPS = (la + (offsetDeg || 0.36)).toFixed(6) + ' ' + lo.toFixed(6);
    return { headers: log.headers, rows, csv: toCsv(log.headers, rows) };
}

module.exports = {
    HEADERS_CRSF, HEADERS_ELRS, HEADERS_FEET,
    clock, toCsv, straightFlight, freeze, strayFix
};
