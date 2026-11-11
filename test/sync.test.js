'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { REPO } = require('./harness');

// The Android app bundles its own copy of the web assets, kept in step by
// hand. That manual copy is the likeliest thing in this repository to go
// wrong, and when it does the app silently ships a different build from the
// website. One comparison catches it.

const MIRRORED = ['tools', 'js', 'css', 'fonts'];
const ASSETS = path.join(REPO, 'android', 'app', 'src', 'main', 'assets');

// Text files are compared by CONTENT, not raw bytes. Git rewrites line
// endings in the working tree on checkout (core.autocrlf, plus the eol rules
// in .gitattributes), so one copy can be CRLF on disk while the other is LF
// purely because of when each was last written. Both normalise to LF in the
// repository, so a byte difference there says nothing about what the app
// ships. Binary files are still compared byte for byte, where a single
// changed byte is a real corruption.

const TEXT = /\.(html?|js|css|json|txt|md|xml|svg)$/i;

/**
 * Reads a file for comparison: text normalised to LF, binaries untouched.
 * @param {string} file Absolute path.
 * @returns {Buffer} Comparable contents.
 */
function readForCompare(file) {
    const buf = fs.readFileSync(file);
    if (!TEXT.test(file)) return buf;
    return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

/**
 * Lists every file under a directory, relative to it.
 * @param {string} dir Directory to walk.
 * @returns {string[]} Sorted relative paths.
 */
function listFiles(dir) {
    const out = [];
    (function walk(d, prefix) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const rel = prefix ? prefix + '/' + entry.name : entry.name;
            if (entry.isDirectory()) walk(path.join(d, entry.name), rel);
            else out.push(rel);
        }
    })(dir, '');
    return out.sort();
}

describe('Android assets mirror the root folders', () => {
    for (const folder of MIRRORED) {
        const src = path.join(REPO, folder);
        const dst = path.join(ASSETS, folder);

        test(folder + '/ has the same files', () => {
            assert.ok(fs.existsSync(src), 'missing source folder ' + folder);
            assert.ok(fs.existsSync(dst), 'missing assets copy of ' + folder);
            assert.deepStrictEqual(listFiles(dst), listFiles(src),
                folder + '/ differs between the repo root and the Android assets');
        });

        test(folder + '/ contents match', () => {
            for (const rel of listFiles(src)) {
                const a = readForCompare(path.join(src, rel));
                const b = readForCompare(path.join(dst, rel));
                assert.ok(a.equals(b),
                    folder + '/' + rel + ' differs - re-copy it into android/app/src/main/assets/');
            }
        });
    }

    test('the shared root pages are mirrored too', () => {
        for (const file of ['index.html', 'menu.html']) {
            const a = readForCompare(path.join(REPO, file));
            const b = readForCompare(path.join(ASSETS, file));
            assert.ok(a.equals(b), file + ' differs between the repo root and the Android assets');
        }
    });
});
