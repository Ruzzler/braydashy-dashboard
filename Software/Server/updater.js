// BrayDashy release updater (added 2026-11-07, replaces the W:\BrayDashy staged-update copy).
//
// How a release reaches the running app:
//   1. Riggs: `node Software/Deployment/release.mjs` builds, tags vX.Y.Z on Forgejo and
//      attaches braydashy-vX.Y.Z.tar.gz (+ .sha256) to a Forgejo release.
//   2. Unraid: the container mounts /mnt/user/Projects/deploy/braydashy at /app/deploy and
//      starts `node /app/deploy/run.js`, which runs releases/<tag>/ named in current.json.
//   3. "Update" (POST /api/update/apply) downloads the newest release, checks its sha256,
//      unpacks it next to the old one, points current.json at it and exits; Docker restarts
//      the container (restart: unless-stopped) on the new release. run.js rolls back to the
//      previous release by itself if the new one keeps crashing.
//
// The update check never reports an update it cannot prove: no release, no network,
// or an unknown installed version all mean updateAvailable = false.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const axios = require('axios');

const FORGEJO_URL = (process.env.FORGEJO_URL || 'http://192.168.0.100:3300').replace(/\/+$/, '');
const FORGEJO_REPO = process.env.FORGEJO_REPO || 'home/braydashy';
const DEPLOY_DIR = process.env.BRAYDASHY_DEPLOY_DIR || '/app/deploy';
const CHECK_TTL_MS = 10 * 60 * 1000;
const KEEP_RELEASES = 3;
const MAX_ASSET_BYTES = 80 * 1024 * 1024;

let latestCache = { at: 0, data: null };
let applying = false;

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
        return null;
    }
}

function writeJsonAtomic(file, data) {
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, file);
}

// version.json sits next to server.js in every release bundle (written by release.mjs).
function installedVersion(serverDir) {
    const v = readJson(path.join(serverDir, 'version.json')) || {};
    return {
        version: v.version || '',
        tag: v.tag || (v.version ? `v${v.version}` : ''),
        commit: v.commit || '',
        builtAt: v.builtAt || v.installedAt || ''
    };
}

function parseSemver(s) {
    const m = String(s || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// > 0 when a is newer than b. null when either side is not a version.
function compareSemver(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) return null;
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
}

async function fetchLatestRelease(force = false) {
    if (!force && latestCache.data && Date.now() - latestCache.at < CHECK_TTL_MS) {
        return latestCache.data;
    }
    const res = await axios.get(`${FORGEJO_URL}/api/v1/repos/${FORGEJO_REPO}/releases/latest`, {
        timeout: 4000,
        validateStatus: s => s === 200 || s === 404
    });
    let data = null;
    if (res.status === 200 && res.data && res.data.tag_name && !res.data.draft && !res.data.prerelease) {
        const assets = Array.isArray(res.data.assets) ? res.data.assets : [];
        const bundleName = `braydashy-${res.data.tag_name}.tar.gz`;
        const bundle = assets.find(a => a.name === bundleName);
        const sha = assets.find(a => a.name === `${bundleName}.sha256`);
        data = {
            tag: res.data.tag_name,
            version: res.data.tag_name.replace(/^v/i, ''),
            name: res.data.name || res.data.tag_name,
            notes: String(res.data.body || '').trim(),
            publishedAt: res.data.published_at || '',
            url: res.data.html_url || `${FORGEJO_URL}/${FORGEJO_REPO}/releases`,
            bundleUrl: bundle ? bundle.browser_download_url : '',
            bundleSize: bundle ? bundle.size : 0,
            shaUrl: sha ? sha.browser_download_url : ''
        };
    }
    latestCache = { at: Date.now(), data };
    return data;
}

function deployManaged() {
    return fs.existsSync(path.join(DEPLOY_DIR, 'current.json'));
}

async function checkForUpdate(serverDir) {
    const cur = installedVersion(serverDir);
    const out = {
        currentVersion: cur.version || 'dev',
        currentTag: cur.tag,
        currentCommit: cur.commit ? cur.commit.substring(0, 7) : '',
        builtAt: cur.builtAt,
        latestVersion: cur.version || '',
        latestTag: '',
        updateAvailable: false,
        canUpdate: deployManaged(),
        releaseNotes: '',
        url: `${FORGEJO_URL}/${FORGEJO_REPO}/releases`,
        checkError: ''
    };
    try {
        const latest = await fetchLatestRelease();
        if (latest) {
            out.latestVersion = latest.version;
            out.latestTag = latest.tag;
            const firstLine = latest.notes.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
            out.releaseNotes = (firstLine || latest.name).replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
            out.url = latest.url;
            const cmp = compareSemver(latest.version, cur.version);
            out.updateAvailable = Boolean(out.canUpdate && latest.bundleUrl && cmp !== null && cmp > 0);
        }
    } catch (e) {
        out.checkError = e.message;
    }
    return out;
}

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: 120000, ...opts }, (err, stdout, stderr) => {
            if (err) return reject(new Error(`${cmd} failed: ${stderr || err.message}`));
            resolve(stdout);
        });
    });
}

// Copies frontend/dist/assets files that the new release lacks (never overwrites).
function carryAssets(fromRelease, toRelease) {
    const from = path.join(fromRelease, 'frontend', 'dist', 'assets');
    const to = path.join(toRelease, 'frontend', 'dist', 'assets');
    if (!fs.existsSync(from) || !fs.existsSync(to)) return;
    for (const f of fs.readdirSync(from)) {
        const dest = path.join(to, f);
        if (!fs.existsSync(dest)) fs.copyFileSync(path.join(from, f), dest);
    }
}

function pruneOldReleases(releasesDir, keepTags) {
    const dirs = fs.readdirSync(releasesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && /^v\d+\.\d+\.\d+/.test(d.name))
        .map(d => d.name)
        .sort((a, b) => compareSemver(b, a));
    let kept = 0;
    for (const name of dirs) {
        if (keepTags.includes(name) || kept < KEEP_RELEASES) {
            kept++;
            continue;
        }
        fs.rmSync(path.join(releasesDir, name), { recursive: true, force: true });
    }
}

// Downloads, verifies and activates the newest release. Resolves with the new tag; the
// caller exits the process afterwards so Docker restarts on it.
async function applyLatest(serverDir) {
    if (applying) throw new Error('An update is already running');
    if (!deployManaged()) throw new Error(`Not running from a release deploy (${DEPLOY_DIR}/current.json missing)`);
    applying = true;
    const releasesDir = path.join(DEPLOY_DIR, 'releases');
    const incoming = path.join(DEPLOY_DIR, '.incoming');
    try {
        const latest = await fetchLatestRelease(true);
        if (!latest || !latest.bundleUrl || !latest.shaUrl) throw new Error('No release bundle on Forgejo');
        const cur = installedVersion(serverDir);
        const cmp = compareSemver(latest.version, cur.version);
        if (cmp !== null && cmp <= 0) throw new Error(`Already on ${cur.tag || cur.version}`);

        fs.mkdirSync(incoming, { recursive: true });
        fs.mkdirSync(releasesDir, { recursive: true });

        const bundleRes = await axios.get(latest.bundleUrl, {
            responseType: 'arraybuffer', timeout: 120000, maxContentLength: MAX_ASSET_BYTES
        });
        const bundle = Buffer.from(bundleRes.data);
        const shaRes = await axios.get(latest.shaUrl, { responseType: 'text', timeout: 10000 });
        const expected = String(shaRes.data).trim().split(/\s+/)[0].toLowerCase();
        const actual = crypto.createHash('sha256').update(bundle).digest('hex');
        if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actual) {
            throw new Error('Release bundle checksum does not match; not installing');
        }

        const tarFile = path.join(incoming, `braydashy-${latest.tag}.tar.gz`);
        fs.writeFileSync(tarFile, bundle);
        const staging = path.join(incoming, `${latest.tag}.partial`);
        fs.rmSync(staging, { recursive: true, force: true });
        fs.mkdirSync(staging, { recursive: true });
        // Relative names from inside .incoming (GNU tar on Windows reads "C:" as a host).
        await run('tar', ['-xzf', path.basename(tarFile), '-C', path.basename(staging)], { cwd: incoming });

        const v = readJson(path.join(staging, 'backend', 'version.json'));
        if (!fs.existsSync(path.join(staging, 'backend', 'server.js')) ||
            !fs.existsSync(path.join(staging, 'frontend', 'dist', 'index.html')) ||
            !v || v.tag !== latest.tag) {
            throw new Error('Release bundle is incomplete; not installing');
        }

        const current = readJson(path.join(DEPLOY_DIR, 'current.json')) || {};
        // Keep the running release's hashed assets too: a browser that still holds the old
        // index.html (open tab, cached page) can then still load its scripts.
        if (current.tag) carryAssets(path.join(releasesDir, current.tag), staging);

        const target = path.join(releasesDir, latest.tag);
        fs.rmSync(target, { recursive: true, force: true });
        fs.renameSync(staging, target);
        fs.rmSync(tarFile, { force: true });

        writeJsonAtomic(path.join(DEPLOY_DIR, 'current.json'), {
            tag: latest.tag,
            previous: current.tag && current.tag !== latest.tag ? current.tag : (current.previous || ''),
            switchedAt: new Date().toISOString(),
            switchedBy: 'api/update/apply'
        });
        try {
            pruneOldReleases(releasesDir, [latest.tag, current.tag].filter(Boolean));
        } catch (_) { }
        latestCache = { at: 0, data: null };
        return latest.tag;
    } finally {
        applying = false;
    }
}

module.exports = { checkForUpdate, applyLatest, installedVersion, compareSemver, DEPLOY_DIR };
