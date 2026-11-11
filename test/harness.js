'use strict';
// Loads the telemetry parser's inline script so its functions can be tested
// directly, with no browser and no dependencies.
//
// The tools are plain HTML pages with no build step and no module system, so
// there is nothing to `require`. Rather than pick functions out of the file by
// brace-matching - which breaks on regex literals and string edge cases - this
// evaluates the WHOLE script once against stubbed browser globals and returns
// the functions by name. If the page parses in a browser, it parses here.

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

/**
 * A stand-in for any browser object. Every property access returns another
 * stub, every call returns a stub, and assignment is accepted. That is enough
 * for the page's top-level wiring (addEventListener, L.GridLayer.extend, and
 * so on) to run without a DOM.
 * @param {string} name Debug label, shown if a stub is stringified.
 * @returns {Proxy} A permissive stand-in object.
 */
function deepStub(name) {
    const target = function () {};
    target.__stub = name;
    return new Proxy(target, {
        get(t, prop) {
            if (typeof prop === 'symbol') {
                if (prop === Symbol.toPrimitive) return () => '';
                return undefined;                       // not iterable, not a thenable
            }
            if (prop === 'then') return undefined;
            if (Object.prototype.hasOwnProperty.call(t, prop)) return t[prop];
            if (prop in t) return t[prop];
            return deepStub(name + '.' + prop);
        },
        set(t, prop, value) { t[prop] = value; return true; },
        apply() { return deepStub(name + '()'); },
        construct() { return deepStub('new ' + name); }
    });
}

/**
 * A working in-memory Storage, rather than a stub: the page reads a saved
 * theme on load and must get a real string back.
 * @returns {Object} An object with the Storage methods the page uses.
 */
function memoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
        clear: () => map.clear()
    };
}

/**
 * Returns the largest inline <script> block of an HTML file - the page's own
 * code, as opposed to the one-liners that wire up the help panel.
 * @param {string} html Full page source.
 * @returns {string} JavaScript source.
 */
function mainScript(html) {
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
    let m, best = '';
    while ((m = re.exec(html)) !== null) {
        if (m[1].length > best.length) best = m[1];
    }
    if (!best) throw new Error('no inline <script> found');
    return best;
}

/**
 * Loads tools/telemetry-parser.html and returns the named functions.
 * Names that do not exist come back undefined rather than throwing, so a
 * renamed function shows up as a clear failure in the test that uses it.
 * @param {string[]} names Function names to expose.
 * @returns {Object<string, Function>} The requested functions.
 */
function loadParser(names) {
    const file = path.join(REPO, 'tools', 'telemetry-parser.html');
    const src = mainScript(fs.readFileSync(file, 'utf8'));
    const ret = 'return {' +
        names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(',') +
        '};';
    const factory = new Function(
        'window', 'document', 'L', 'Chart', 'JSZip', 'navigator', 'location', 'alert',
        'URL', 'Blob', 'localStorage', 'sessionStorage', 'FileReader', 'matchMedia',
        'getComputedStyle', 'requestAnimationFrame', 'fetch',
        src + '\n' + ret
    );
    return factory(
        deepStub('window'),
        deepStub('document'),
        deepStub('L'),
        deepStub('Chart'),
        deepStub('JSZip'),
        { onLine: false, userAgent: 'node' },
        { protocol: 'https:', href: 'https://example.test/' },
        function alert() {},
        deepStub('URL'),
        deepStub('Blob'),
        memoryStorage(),
        memoryStorage(),
        deepStub('FileReader'),
        () => ({ matches: false, addEventListener() {}, addListener() {} }),
        () => ({ getPropertyValue: () => '' }),
        (fn) => { if (typeof fn === 'function') fn(0); return 0; },
        () => Promise.reject(new Error('network disabled in tests'))
    );
}

/**
 * Loads js/map-config.js under a chosen page protocol.
 * @param {string} protocol e.g. 'https:' or 'file:'.
 * @returns {Object} The MapConfig object the file defines.
 */
function loadMapConfig(protocol) {
    const src = fs.readFileSync(path.join(REPO, 'js', 'map-config.js'), 'utf8');
    const win = {};
    new Function('window', 'location', 'L', src)(
        win,
        { protocol: protocol },
        deepStub('L')
    );
    if (!win.MapConfig) throw new Error('map-config.js did not define window.MapConfig');
    return win.MapConfig;
}

module.exports = { REPO, deepStub, mainScript, loadParser, loadMapConfig };
