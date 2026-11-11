'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadParser } = require('./harness');
const F = require('./fixtures');

const P = loadParser([
    'parseCSV', 'detectFlights', 'processFlightPoints', 'generateKML', 'generateGPX',
    'haversine', 'escXml', 'cdata', 'toIsoLocal'
]);

/**
 * Minimal well-formedness check: every tag closes, in order, and no bare
 * angle bracket survives in text. Enough to catch the escaping mistakes that
 * actually happen, without pulling in an XML parser.
 * @param {string} xml Document text.
 * @returns {{ok: boolean, why: string}} Result.
 */
function wellFormed(xml) {
    const stripped = xml
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
        .replace(/<\?[\s\S]*?\?>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
    const stack = [];
    const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g;
    let m, last = 0;
    while ((m = re.exec(stripped)) !== null) {
        const text = stripped.slice(last, m.index);
        if (text.indexOf('<') !== -1) return { ok: false, why: 'unescaped < in text' };
        last = re.lastIndex;
        if (m[4] === '/') continue;                       // self-closing
        if (m[1] === '/') {
            if (stack.pop() !== m[2]) return { ok: false, why: 'mismatched </' + m[2] + '>' };
        } else {
            stack.push(m[2]);
        }
    }
    if (stripped.slice(last).indexOf('<') !== -1) return { ok: false, why: 'unescaped < in trailing text' };
    return stack.length ? { ok: false, why: 'unclosed <' + stack[stack.length - 1] + '>' } : { ok: true, why: '' };
}

/** Builds a processed flight from a synthetic log. */
function points(opt, smooth) {
    const log = (opt && opt.log) || F.straightFlight({ n: 30 });
    const flight = P.detectFlights(P.parseCSV(log.csv))[0];
    return P.processFlightPoints(flight, flight.preArmAlt, true, !!smooth);
}

const baseOpts = { name: 'Test Flight', color: '#ff0000', width: 4, altMode: 'absolute', extrude: false };

describe('KML export', () => {
    test('is well formed', () => {
        const kml = P.generateKML(points(), baseOpts);
        const r = wellFormed(kml);
        assert.ok(r.ok, 'KML not well formed: ' + r.why);
    });

    test('every coordinate is a well-formed lon,lat,alt tuple', () => {
        const kml = P.generateKML(points(), baseOpts);
        const block = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(kml);
        assert.ok(block, 'no <coordinates> block');
        const tuples = block[1].trim().split(/\s+/);
        assert.ok(tuples.length > 0);
        tuples.forEach(t => {
            const parts = t.split(',').map(Number);
            assert.strictEqual(parts.length, 3, 'tuple must be lon,lat,alt: ' + t);
            assert.ok(parts.every(isFinite), 'non-finite value in ' + t);
        });
    });

    test('collapses repeated coordinates from a dropout', () => {
        // A held GPS position is written once per log row, so a 20 s dropout
        // becomes 20 identical tuples - 19 zero-length segments. Those have no
        // direction vector and Google Earth Web drops the segment that follows
        // each one, breaking the track. The fixture must therefore CONTAIN
        // repeats, or this test passes no matter what the exporter does.
        const log = F.freeze(F.straightFlight({ n: 40 }), 10, 20);
        const pts = points({ log }, false);

        const repeatsInInput = pts.filter((p, i) =>
            i > 0 && p.lat === pts[i - 1].lat && p.lon === pts[i - 1].lon).length;
        assert.ok(repeatsInInput > 0, 'fixture is wrong: it must contain repeated positions');

        const tuples = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(
            P.generateKML(pts, baseOpts))[1].trim().split(/\s+/);

        assert.ok(tuples.length < pts.length,
            'the export must be shorter than the point list once repeats are collapsed');
        for (let i = 1; i < tuples.length; i++) {
            assert.notStrictEqual(tuples[i], tuples[i - 1],
                'zero-length segment at index ' + i + ' breaks Google Earth Web');
        }
    });

    test('honours the extrude setting', () => {
        const pts = points();
        assert.match(P.generateKML(pts, Object.assign({}, baseOpts, { extrude: false })), /<extrude>0<\/extrude>/);
        assert.match(P.generateKML(pts, Object.assign({}, baseOpts, { extrude: true })), /<extrude>1<\/extrude>/);
    });

    test('survives a name containing XML metacharacters', () => {
        const kml = P.generateKML(points(), Object.assign({}, baseOpts, { name: 'A & B <tag> "q" \'s\'' }));
        const r = wellFormed(kml);
        assert.ok(r.ok, 'KML not well formed: ' + r.why);
    });

    test('survives a name containing a CDATA terminator', () => {
        const kml = P.generateKML(points(), Object.assign({}, baseOpts, { name: 'evil ]]> payload' }));
        const r = wellFormed(kml);
        assert.ok(r.ok, 'KML not well formed: ' + r.why);
    });

    test('round-trips: exported geometry matches the processed points', () => {
        const pts = points();
        const kml = P.generateKML(pts, baseOpts);
        const tuples = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(kml)[1].trim().split(/\s+/);
        const first = tuples[0].split(',').map(Number);
        const last = tuples[tuples.length - 1].split(',').map(Number);
        assert.ok(P.haversine(first[1], first[0], pts[0].lat, pts[0].lon) < 1,
            'first exported point must be the first processed point');
        assert.ok(P.haversine(last[1], last[0], pts[pts.length - 1].lat, pts[pts.length - 1].lon) < 1,
            'last exported point must be the last processed point');
    });
});

describe('GPX export', () => {
    test('is well formed', () => {
        const r = wellFormed(P.generateGPX(points(), baseOpts));
        assert.ok(r.ok, 'GPX not well formed: ' + r.why);
    });

    test('emits one trkpt per point', () => {
        const pts = points();
        const gpx = P.generateGPX(pts, baseOpts);
        assert.strictEqual((gpx.match(/<trkpt /g) || []).length, pts.length);
    });

    test('timestamps carry a real offset rather than a false Z', () => {
        const gpx = P.generateGPX(points(), baseOpts);
        const times = gpx.match(/<time>([^<]+)<\/time>/g) || [];
        assert.ok(times.length > 0, 'no <time> elements');
        times.forEach(t => {
            assert.ok(/[+-]\d{2}:\d{2}<|Z</.test(t) === true || /[+-]\d{2}:\d{2}/.test(t),
                'timestamp must state its zone: ' + t);
        });
        // The log has no timezone, so claiming UTC would be a lie unless the
        // machine really is on UTC.
        if (new Date().getTimezoneOffset() !== 0) {
            assert.ok(!/>\d{4}-\d{2}-\d{2}T[\d:.]+Z</.test(gpx),
                'local times must not be labelled Z');
        }
    });

    test('keeps repeated positions, unlike KML', () => {
        // A held position is meaningful time-series data in GPX: tools use it
        // to work out stopped time. Only KML LineStrings suffer from the
        // zero-length segments.
        const log = F.freeze(F.straightFlight({ n: 30 }), 5, 10);
        const pts = points({ log });
        const gpx = P.generateGPX(pts, baseOpts);
        assert.strictEqual((gpx.match(/<trkpt /g) || []).length, pts.length);
    });
});

describe('escaping helpers', () => {
    test('escXml covers the five XML metacharacters', () => {
        assert.strictEqual(P.escXml('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
    });

    test('cdata neutralises a terminator', () => {
        assert.ok(P.cdata('a]]>b').indexOf(']]>') !== 0);
        assert.ok(wellFormed('<x><![CDATA[' + P.cdata('a]]>b') + ']]></x>').ok);
    });

    test('toIsoLocal states an offset and round-trips to the same instant', () => {
        const s = P.toIsoLocal('2026-01-01', '10:00:00.000');
        assert.match(s, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
        assert.strictEqual(new Date(s).getTime(), new Date(2026, 0, 1, 10, 0, 0, 0).getTime());
    });
});
