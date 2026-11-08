#!/usr/bin/env node
// Publish a BrayDashy release (added 2026-11-07). Run on Riggs from the project root:
//
//   node Software/Deployment/release.mjs            # build, tag, publish on Forgejo
//   node Software/Deployment/release.mjs --apply    # ...then tell the live app to install it
//   node Software/Deployment/release.mjs --dry-run  # build the bundle only
//
// Steps: bump "version" in Software/Dashboard/package.json and add a matching
// "## [x.y.z]" section to Management/Docs/CHANGELOG.md, commit on dev, then run this.
// It refuses to run with uncommitted changes, so every release is exactly one commit.
//
// Output: tag vX.Y.Z pushed (origin pushes to GitHub + Forgejo), and a Forgejo release on
// home/braydashy with braydashy-vX.Y.Z.tar.gz and its .sha256. The bundle holds
//   backend/server.js, backend/updater.js, backend/package.json, backend/version.json,
//   frontend/dist/, run.js
// version.json records version, tag and full commit, so the app always knows what it runs.
// Token: ~/.config/forgejo/token (never printed, never written anywhere).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FORGEJO = process.env.FORGEJO_URL || 'http://192.168.0.100:3300';
const REPO = process.env.FORGEJO_REPO || 'home/braydashy';
const LIVE = process.env.BRAYDASHY_URL || 'http://192.168.0.100:3050';
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');

const sh = (cmd, a, opts = {}) =>
    (execFileSync(cmd, a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' && cmd === 'npm', ...opts }) || '').trim();
const die = msg => { console.error(`release: ${msg}`); process.exit(1); };

// 1. Preconditions
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'Software/Dashboard/package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
if (!/^\d+\.\d+\.\d+$/.test(version)) die(`package.json version "${version}" is not x.y.z`);
const dirty = sh('git', ['status', '--porcelain', '--untracked-files=no']);
if (dirty && !DRY) die('uncommitted changes; commit first');
const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'dev' && !DRY) die(`on ${branch}; releases are cut from dev`);
const commit = sh('git', ['rev-parse', 'HEAD']);
if (!DRY && sh('git', ['tag', '--list', tag])) die(`tag ${tag} already exists; bump the version`);

const changelog = fs.readFileSync(path.join(ROOT, 'Management/Docs/CHANGELOG.md'), 'utf8');
const section = changelog.split(/^## /m).find(s => s.startsWith(`[${version}]`));
if (!section && !DRY) die(`Management/Docs/CHANGELOG.md has no "## [${version}]" section`);
const notes = section ? section.split('\n').slice(1).join('\n').trim() : '';

// 2. Build
console.log(`release: building ${tag} (${commit.slice(0, 7)})`);
sh('npm', ['run', 'build'], { cwd: path.join(ROOT, 'Software/Dashboard'), stdio: 'inherit' });

// 3. Bundle
const stage = fs.mkdtempSync(path.join(os.tmpdir(), `braydashy-${tag}-`));
const be = path.join(stage, 'backend');
fs.mkdirSync(be, { recursive: true });
for (const f of ['server.js', 'updater.js', 'package.json']) {
    fs.copyFileSync(path.join(ROOT, 'Software/Server', f), path.join(be, f));
}
fs.writeFileSync(path.join(be, 'version.json'), JSON.stringify({
    version, tag, commit, builtAt: new Date().toISOString()
}, null, 2) + '\n');
fs.cpSync(path.join(ROOT, 'Software/Dashboard/dist'), path.join(stage, 'frontend', 'dist'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'Software/Deployment/run.js'), path.join(stage, 'run.js'));

const outDir = path.join(ROOT, '.release');
fs.mkdirSync(outDir, { recursive: true });
const bundleName = `braydashy-${tag}.tar.gz`;
const bundlePath = path.join(outDir, bundleName);
// Relative paths only: Windows tar treats "C:" in an archive path as a remote host.
execFileSync('tar', ['-czf', bundleName, '-C', path.relative(outDir, stage).split(path.sep).join('/'), 'backend', 'frontend', 'run.js'], { cwd: outDir, stdio: 'inherit' });
fs.rmSync(stage, { recursive: true, force: true });
const bundle = fs.readFileSync(bundlePath);
const sha = createHash('sha256').update(bundle).digest('hex');
fs.writeFileSync(`${bundlePath}.sha256`, `${sha}  ${bundleName}\n`);
console.log(`release: ${bundleName} ${(bundle.length / 1024).toFixed(0)} KB sha256 ${sha}`);
if (DRY) process.exit(0);

// 4. Tag and push (origin has GitHub + Forgejo push URLs)
sh('git', ['tag', '-a', tag, '-m', `BrayDashy ${tag}`]);
sh('git', ['push', 'origin', 'dev', tag], { stdio: 'inherit' });

// 5. Forgejo release + assets
const token = fs.readFileSync(path.join(os.homedir(), '.config/forgejo/token'), 'utf8').trim();
const api = async (method, url, body, headers = {}) => {
    const res = await fetch(`${FORGEJO}/api/v1/repos/${REPO}${url}`, {
        method, body, headers: { Authorization: `token ${token}`, ...headers }
    });
    if (!res.ok) die(`${method} ${url} -> ${res.status} ${await res.text()}`);
    return res.json();
};
const rel = await api('POST', '/releases', JSON.stringify({
    tag_name: tag, target_commitish: commit, name: `BrayDashy ${tag}`, body: notes, draft: false, prerelease: false
}), { 'Content-Type': 'application/json' });
for (const [name, data, type] of [
    [bundleName, bundle, 'application/gzip'],
    [`${bundleName}.sha256`, Buffer.from(`${sha}  ${bundleName}\n`), 'text/plain']
]) {
    const form = new FormData();
    form.append('attachment', new Blob([data], { type }), name);
    await api('POST', `/releases/${rel.id}/assets?name=${encodeURIComponent(name)}`, form);
}
console.log(`release: published ${FORGEJO}/${REPO}/releases/tag/${tag}`);

// 6. Optional: install on the live app now
if (args.has('--apply')) {
    const res = await fetch(`${LIVE}/api/update/apply`, { method: 'POST' });
    console.log(`release: live apply -> ${res.status} ${await res.text()}`);
}
