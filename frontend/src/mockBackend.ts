const originalFetch = window.fetch;

let mockConfig = {
    serverName: "BrayDashy (Live Demo)",
    serverIcon: "Rocket",
    headerLayout: "classic",
    categories: [
        { id: "media", name: "Media Delivery", order: 1 },
        { id: "manage", name: "Media Management", order: 2 },
        { id: "infra", name: "Infrastructure", order: 3 }
    ],
    apps: [
        { id: "plex", name: "Plex", url: "https://plex.tv", iconType: "icon", icon: "PlaySquare", categoryId: "media" },
        { id: "jellyfin", name: "Jellyfin", url: "https://jellyfin.org", iconType: "icon", icon: "Tv", categoryId: "media" },
        { id: "sonarr", name: "Sonarr", url: "https://sonarr.tv", iconType: "icon", icon: "DownloadCloud", categoryId: "manage" },
        { id: "radarr", name: "Radarr", url: "https://radarr.video", iconType: "icon", icon: "Film", categoryId: "manage" },
        { id: "tautulli", name: "Tautulli", url: "https://tautulli.com", iconType: "icon", icon: "Activity", categoryId: "infra" },
        { id: "kuma", name: "Uptime Kuma", url: "https://uptime.kuma", iconType: "icon", icon: "HeartPulse", categoryId: "infra" }
    ],
    apiKeys: {}
};

// Override window.fetch to intercept API requests from App.tsx
window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

    // Intercept Config reads/writes
    if (url.includes('/api/config')) {
        if (args[1] && args[1].method === 'POST') {
            const body = JSON.parse(args[1].body as string);
            mockConfig = { ...mockConfig, ...body };
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(mockConfig), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Intercept System Stats
    if (url.includes('/api/system/status')) {
        return new Response(JSON.stringify({
            cpu: Math.floor(Math.random() * 20 + 10) + "%",
            ram: Math.floor(Math.random() * 40 + 40) + "%",
            disk: "55%"
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Intercept App Status checks
    const appStatusMatch = url.match(/\/api\/(.+)\/status/);
    if (appStatusMatch) {
        const isOnline = Math.random() > 0.15; // 85% chance of being online in the demo
        let stats = null;

        if (isOnline) {
            if (url.includes('tautulli') || url.includes('plex')) {
                stats = [{ label: "Streams", value: Math.floor(Math.random() * 5).toString(), color: "var(--success)" }];
            } else if (url.includes('sonarr') || url.includes('radarr')) {
                stats = [{ label: "Queue", value: Math.floor(Math.random() * 10).toString(), color: "var(--warning)" }];
            }
        }
        return new Response(JSON.stringify({ online: isOnline, stats }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Fallback to real fetch for non-intercepted requests
    return originalFetch(...args);
};

export { };
