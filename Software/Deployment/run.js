// BrayDashy launcher (added 2026-11-07). Lives at the root of the deploy folder on Unraid:
//   /mnt/user/Projects/deploy/braydashy/run.js   (mounted in the container at /app/deploy)
// The container command is `node /app/deploy/run.js`.
//
// current.json says which release to run: { "tag": "v0.9.3", "previous": "v0.9.2" }.
// Each release is a folder releases/<tag>/ with backend/ and frontend/dist/.
// If a release fails to start three times in a row (it never stays up for 90 s), the
// launcher switches current.json back to the previous release by itself, so a bad
// release cannot keep Bri's page down. Keep this file small and dependency-free: the
// updater never replaces it.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CURRENT = path.join(ROOT, 'current.json');
const BOOT = path.join(ROOT, 'boot.json');
const HEALTHY_AFTER_MS = 90 * 1000;
const MAX_FAILED_BOOTS = 3;

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}
function writeJson(file, data) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
}
function releaseOk(tag) {
    if (!tag) return false;
    const dir = path.join(ROOT, 'releases', tag);
    return fs.existsSync(path.join(dir, 'backend', 'server.js')) &&
        fs.existsSync(path.join(dir, 'frontend', 'dist', 'index.html'));
}

let current = readJson(CURRENT) || {};
let boot = readJson(BOOT) || {};

// A boot that never reached "healthy" counts as a failure of that tag.
const failures = boot.tag === current.tag && !boot.healthy ? (boot.failures || 0) + 1 : 1;
if (failures > MAX_FAILED_BOOTS && releaseOk(current.previous)) {
    console.error(`[run.js] ${current.tag} failed to start ${failures - 1} times; rolling back to ${current.previous}`);
    current = {
        tag: current.previous,
        previous: '',
        failedTag: current.tag,
        switchedAt: new Date().toISOString(),
        switchedBy: 'run.js auto-rollback'
    };
    writeJson(CURRENT, current);
    boot = {};
}

let tag = current.tag;
if (!releaseOk(tag)) {
    console.error(`[run.js] release ${tag || '(none)'} missing or incomplete`);
    tag = releaseOk(current.previous) ? current.previous : '';
}

if (!tag) {
    console.error('[run.js] no usable release; starting the server built into the image');
    require('/app/backend/server.js');
} else {
    writeJson(BOOT, { tag, failures: tag === current.tag ? failures : 1, healthy: false, startedAt: new Date().toISOString() });
    setTimeout(() => {
        writeJson(BOOT, { tag, failures: 0, healthy: true, startedAt: new Date().toISOString() });
    }, HEALTHY_AFTER_MS).unref();

    const dir = path.join(ROOT, 'releases', tag);
    process.env.DIST_DIR = path.join(dir, 'frontend', 'dist');
    console.log(`[run.js] starting BrayDashy ${tag}`);
    require(path.join(dir, 'backend', 'server.js'));
}
