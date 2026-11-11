'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { loadMapConfig } = require('./harness');

describe('MapConfig', () => {
    test('uses OpenStreetMap where the browser will send a Referer', () => {
        const mc = loadMapConfig('https:');
        assert.match(mc.resolveStreet().url, /tile\.openstreetmap\.org/);
    });

    test('falls back to Esri from a file:// origin', () => {
        // tile.openstreetmap.org answers a 403 block tile when no Referer is
        // sent, and browsers send none from file://.
        const mc = loadMapConfig('file:');
        assert.match(mc.resolveStreet().url, /arcgisonline\.com/);
    });

    test('does not use the deprecated OSM subdomain hosts', () => {
        const mc = loadMapConfig('https:');
        assert.ok(mc.tiles.osm.url.indexOf('{s}') === -1,
            'the OSM tile policy deprecates the a/b/c hostnames');
    });

    test('never points at CARTO, which key-gates every basemap', () => {
        const mc = loadMapConfig('https:');
        Object.keys(mc.tiles).forEach(k => {
            assert.ok(mc.tiles[k].url.indexOf('cartocdn') === -1,
                k + ' must not use a CARTO endpoint: it returns a watermark with HTTP 200');
        });
    });

    test('every layer carries an attribution', () => {
        const mc = loadMapConfig('https:');
        Object.keys(mc.tiles).forEach(k => {
            const a = mc.tiles[k].attribution;
            assert.ok(typeof a === 'string' && a.length > 0, k + ' has no attribution');
        });
    });

    test('Esri layers credit the data sources, not just Esri', () => {
        const mc = loadMapConfig('https:');
        assert.match(mc.tiles.satellite.attribution, /Earthstar Geographics/);
        assert.match(mc.tiles.esriStreet.attribution, /HERE|Garmin/);
    });

    test('Topo is capped at its real maximum zoom', () => {
        const mc = loadMapConfig('https:');
        assert.strictEqual(mc.tiles.topo.maxNativeZoom, 17,
            'OpenTopoMap has no tiles past z17; without this the map goes blank');
    });

    test('sendsReferer reflects the page protocol', () => {
        assert.strictEqual(loadMapConfig('https:').sendsReferer(), true);
        assert.strictEqual(loadMapConfig('http:').sendsReferer(), true);
        assert.strictEqual(loadMapConfig('file:').sendsReferer(), false);
    });

    test('every tile URL is https', () => {
        const mc = loadMapConfig('https:');
        Object.keys(mc.tiles).forEach(k => {
            assert.match(mc.tiles[k].url, /^https:\/\//, k + ' must be served over https');
        });
    });
});
