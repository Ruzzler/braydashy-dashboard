// Release updates (2026-11-07). The server checks Forgejo releases (/api/version/check) and
// installs the newest one (/api/update/apply), then restarts on it.

export interface VersionInfo {
    currentVersion?: string;
    currentTag?: string;
    currentCommit?: string;
    builtAt?: string;
    latestVersion?: string;
    latestTag?: string;
    updateAvailable?: boolean;
    canUpdate?: boolean;
    releaseNotes?: string;
    url?: string;
    checkError?: string;
}

export async function fetchVersionInfo(): Promise<VersionInfo | null> {
    try {
        const res = await fetch('/api/version/check');
        return res.ok ? await res.json() : null;
    } catch (_) {
        return null;
    }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Installs the newest release, waits for the restarted server to report it, then reloads.
// Throws with the server's reason when nothing was installed.
export async function applyLatestRelease(): Promise<string> {
    const res = await fetch('/api/update/apply', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');

    const tag: string = data.tag;
    for (let i = 0; i < 60; i++) {
        await sleep(2000);
        const info = await fetchVersionInfo();
        if (info?.currentTag === tag) break;
    }
    window.location.reload();
    return tag;
}
