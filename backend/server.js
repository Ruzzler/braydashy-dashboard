const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const net = require('net');
const si = require('systeminformation');
const fs = require('fs');
const https = require('https');

// For internal connections to self-signed tools like Proxmox
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const app = express();
const PORT = process.env.PORT || 3050; // Changed from 3000 to avoid conflicts

app.use(cors());
app.use(express.json());

// Serve static frontend files (Vite build output)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, '../data');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Helper to read config
function readConfig() {
    const defaultConfig = {
        serverName: "BrayDashy",
        headerLayout: "classic",
        defaultSearchProvider: "google",
        enableWorkspaceMode: false,
        categories: [], apps: [], apiKeys: {},
        glanceWidgets: []
    };

    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return defaultConfig;
        }
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.serverName) parsed.serverName = "BrayDashy";
        if (!parsed.headerLayout) parsed.headerLayout = "classic";
        if (!parsed.defaultSearchProvider) parsed.defaultSearchProvider = "google";
        if (parsed.enableWorkspaceMode === undefined) parsed.enableWorkspaceMode = false;
        if (!parsed.glanceWidgets) parsed.glanceWidgets = [];
        return parsed;
    } catch (e) {
        console.error("Critical error reading config.json:", e.message);
        return defaultConfig;
    }
}

// Helper to write config
function writeConfig(data) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("Critical error writing config.json:", e.message);
        return false;
    }
}

// Get Config
app.get('/api/config', (req, res) => {
    const config = readConfig();
    res.json(config);
});

// Save Config
app.post('/api/config', (req, res) => {
    const success = writeConfig(req.body);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Failed to write configuration to disk' });
    }
});

// Basic test proxy route
app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// Helper function to check if a service is reachable
async function checkServiceReachable(urlStr) {
    return new Promise((resolve) => {
        try {
            const parsedUrl = new URL(urlStr);
            const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
            const host = parsedUrl.hostname;

            const socket = new net.Socket();
            const onError = () => {
                socket.destroy();
                resolve({ online: false });
            };

            const startTime = Date.now();

            socket.setTimeout(2000);
            socket.on('error', onError);
            socket.on('timeout', onError);

            socket.connect(port, host, () => {
                const latency = Date.now() - startTime;
                socket.end();
                resolve({ online: true, latency }); // TCP connection was successful!
            });
        } catch (error) {
            resolve({ online: false });
        }
    });
}

// Specific route for Sonarr (LIVE API)
app.get('/api/sonarr/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'sonarr');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.SONARR_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey && apiKey !== '') {
            try {
                // Fetch Queue
                const queueRes = await axios.get(`${url}/api/v3/queue`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                stats.push({ id: 'queue', label: 'Queue', value: queueRes.data.totalRecords || '0', color: 'var(--warning)' });

                // Fetch Wanted (Missing)
                const wantedRes = await axios.get(`${url}/api/v3/wanted/missing`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                stats.push({ id: 'wanted', label: 'Wanted', value: wantedRes.data.totalRecords || '0', color: 'var(--destructive)' });

            } catch (e) { console.error('Sonarr API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Radarr (LIVE API)
app.get('/api/radarr/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'radarr');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.RADARR_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey && apiKey !== '') {
            try {
                // Fetch Queue
                const queueRes = await axios.get(`${url}/api/v3/queue`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                stats.push({ id: 'queue', label: 'Queue', value: queueRes.data.totalRecords || '0', color: 'var(--warning)' });

                // Fetch Wanted (Missing)
                const wantedRes = await axios.get(`${url}/api/v3/wanted/missing`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                stats.push({ id: 'wanted', label: 'Wanted', value: wantedRes.data.totalRecords || '0', color: 'var(--destructive)' });

            } catch (e) { console.error('Radarr API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for AdGuard Home (LIVE API)
app.get('/api/adguard/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'adguard');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const authString = config.apiKeys.ADGUARD_AUTH;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (authString && authString !== '') {
            try {
                const statsRes = await axios.get(`${url}/control/stats`, {
                    headers: { 'Authorization': `Basic ${authString}` },
                    timeout: 3000
                });

                if (statsRes.data) {
                    const blockRate = statsRes.data.num_dns_queries > 0
                        ? ((statsRes.data.num_blocked_filtering / statsRes.data.num_dns_queries) * 100).toFixed(1) + '%'
                        : '0%';

                    stats.push({ id: 'blocked_ratio', label: 'Blocked', value: blockRate, color: 'var(--success)' });

                    if (statsRes.data.num_dns_queries) {
                        stats.push({ id: 'total_queries', label: 'Queries', value: (statsRes.data.num_dns_queries / 1000).toFixed(1) + 'k', color: 'var(--primary)' });
                    }
                }
            } catch (e) {
                console.error('AdGuard API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Tautulli (LIVE API)
app.get('/api/tautulli/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'tautulli');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.TAUTULLI_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey) {
            try {
                const actRes = await axios.get(`${url}/api/v2?apikey=${apiKey}&cmd=get_activity`, { timeout: 3000 });
                if (actRes.data && actRes.data.response && actRes.data.response.data) {
                    const data = actRes.data.response.data;
                    stats.push({ id: 'streams', label: 'Streams', value: data.stream_count || '0', color: 'var(--success)' });
                    stats.push({ id: 'bandwidth', label: 'Bandwidth', value: data.total_bandwidth ? Math.round(data.total_bandwidth / 1000) + ' Mbps' : '0 Mbps', color: 'var(--primary)' });
                }
            } catch (e) { console.error('Tautulli API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Overseerr (LIVE API)
app.get('/api/overseerr/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'overseerr');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.OVERSEERR_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey) {
            try {
                const pendingRes = await axios.get(`${url}/api/v1/request?filter=pending`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                if (pendingRes.data && pendingRes.data.pageInfo) {
                    stats.push({ id: 'pending_requests', label: 'Pending', value: pendingRes.data.pageInfo.results || '0', color: 'var(--warning)' });
                }

                const approvedRes = await axios.get(`${url}/api/v1/request?filter=approved`, {
                    headers: { 'X-Api-Key': apiKey },
                    timeout: 3000
                });
                if (approvedRes.data && approvedRes.data.pageInfo) {
                    stats.push({ id: 'approved_requests', label: 'Approved', value: approvedRes.data.pageInfo.results || '0', color: 'var(--success)' });
                }

            } catch (e) {
                console.error('Overseerr API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Speedtest Tracker (LIVE API)
app.get('/api/speedtest/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'speedtest');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.SPEEDTEST_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey) {
            try {
                const speedRes = await axios.get(`${url}/api/speedtest/latest`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 3000
                });

                if (speedRes.data && speedRes.data.data) {
                    const dl = (speedRes.data.data.download / 125000).toFixed(0);
                    const ul = (speedRes.data.data.upload / 125000).toFixed(0);
                    const ping = Math.round(speedRes.data.data.ping);

                    stats.push({ id: 'download', label: 'DL', value: dl + ' Mbps', color: 'var(--success)' });
                    stats.push({ id: 'upload', label: 'UL', value: ul + ' Mbps', color: 'var(--primary)' });
                    stats.push({ id: 'ping', label: 'Ping', value: ping + ' ms', color: 'var(--warning)' });
                }
            } catch (e) {
                console.error('Speedtest API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Pi-hole (LIVE API)
app.get('/api/pihole/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'pihole');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const apiKey = config.apiKeys.PIHOLE_API_KEY;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (apiKey) {
            try {
                const sumRes = await axios.get(`${url}/admin/api.php?summaryRaw&auth=${apiKey}`, { timeout: 3000 });
                if (sumRes.data) {
                    stats.push({ id: 'ads_blocked', label: 'Blocked', value: sumRes.data.ads_blocked_today?.toString() || '0', color: 'var(--success)' });
                    if (sumRes.data.ads_percentage_today) {
                        stats.push({ id: 'ads_percentage', label: 'Ratio', value: sumRes.data.ads_percentage_today.toFixed(1) + '%', color: 'var(--primary)' });
                    }
                }
            } catch (e) {
                console.error('Pi-hole API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for qBittorrent (LIVE API)
app.get('/api/qbittorrent/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'qbittorrent');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const creds = config.apiKeys.QBITTORRENT_CREDS;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (creds && creds.includes(':')) {
            const [username, password] = creds.split(':');
            try {
                const loginUrl = new URL(url);
                const baseUrl = `${loginUrl.protocol}//${loginUrl.host}`;

                const loginRes = await axios.post(`${baseUrl}/api/v2/auth/login`,
                    `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 3000 }
                );

                const cookies = loginRes.headers['set-cookie'];
                if (cookies) {
                    const syncRes = await axios.get(`${baseUrl}/api/v2/sync/maindata`, {
                        headers: { 'Cookie': cookies.join('; ') },
                        timeout: 3000
                    });

                    if (syncRes.data && syncRes.data.server_state) {
                        const dlMsg = (syncRes.data.server_state.dl_info_speed / 1024 / 1024).toFixed(1) + ' MB/s';
                        const ulMsg = (syncRes.data.server_state.up_info_speed / 1024 / 1024).toFixed(1) + ' MB/s';
                        stats.push({ id: 'dl_speed', label: 'DL', value: dlMsg, color: 'var(--success)' });
                        stats.push({ id: 'ul_speed', label: 'UL', value: ulMsg, color: 'var(--primary)' });
                    }
                }
            } catch (e) {
                console.error('qBittorrent API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for Proxmox (LIVE API)
app.get('/api/proxmox/status', async (req, res) => {
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === 'proxmox');
    if (!appInfo) return res.json({ online: false });

    const url = appInfo.url;
    const token = config.apiKeys.PROXMOX_TOKEN;

    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });

        let stats = [];
        if (token) {
            try {
                const nodeRes = await axios.get(`${url}/api2/json/nodes`, {
                    headers: { 'Authorization': `PVEAPIToken=${token}` },
                    httpsAgent: insecureAgent,
                    timeout: 3000
                });

                if (nodeRes.data && nodeRes.data.data) {
                    let totalCpu = 0, totalMem = 0, maxMem = 0;
                    nodeRes.data.data.forEach(node => {
                        totalCpu += node.cpu || 0;
                        totalMem += node.mem || 0;
                        maxMem += node.maxmem || 0;
                    });
                    if (nodeRes.data.data.length > 0) {
                        const avgCpu = (totalCpu / nodeRes.data.data.length * 100).toFixed(1) + '%';
                        const memPct = (totalMem / maxMem * 100).toFixed(1) + '%';
                        stats.push({ id: 'cpu', label: 'CPU', value: avgCpu, color: 'var(--primary)' });
                        stats.push({ id: 'ram', label: 'RAM', value: memPct, color: 'var(--warning)' });
                    }
                }
            } catch (e) {
                console.error('Proxmox API error:', e.message);
            }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (error) {
        const fb = await checkServiceReachable(url);
        res.json({ online: fb.online, latency: fb.latency });
    }
});

// Specific route for System Stats
app.get('/api/system/status', async (req, res) => {
    try {
        const cpuLoad = await si.currentLoad();
        const mem = await si.mem();
        const fsSize = await si.fsSize();

        const cpuPercent = Math.round(cpuLoad.currentLoad) + '%';
        const ramPercent = Math.round((mem.active / mem.total) * 100) + '%';

        let diskPercent = '--%';
        if (fsSize && fsSize.length > 0) {
            const primaryDisk = fsSize.find(d => d.mount === '/' || d.mount.startsWith('C:')) || fsSize[0];
            diskPercent = Math.round(primaryDisk.use) + '%';
        }

        res.json({ cpu: cpuPercent, ram: ramPercent, disk: diskPercent });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({ cpu: '--%', ram: '--%', disk: '--%' });
    }
});

// Docker Socket Integration
app.get('/api/docker/containers', async (req, res) => {
    try {
        let socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
        if (process.env.DOCKER_SOCKET) {
            socketPath = process.env.DOCKER_SOCKET;
        }

        const response = await axios({
            method: 'get',
            url: 'http://localhost/v1.41/containers/json?all=true',
            socketPath: socketPath
        });

        const containers = response.data.map(c => {
            let port = '';
            // Try to find a public mapped port first
            if (c.Ports && c.Ports.length > 0) {
                const publicPort = c.Ports.find(p => p.PublicPort);
                if (publicPort) {
                    port = publicPort.PublicPort;
                } else {
                    port = c.Ports[0].PrivatePort;
                }
            }

            let name = c.Names && c.Names.length > 0 ? c.Names[0].replace(/^\//, '') : 'Unknown';

            return {
                id: c.Id.substring(0, 12),
                name: name,
                state: c.State,
                status: c.Status,
                port: port,
                image: c.Image
            };
        });

        res.json({ success: true, containers });
    } catch (e) {
        console.error("Docker API error:", e.message);
        res.status(500).json({ success: false, error: 'Failed to communicate with Docker socket. Is it mapped?' });
    }
});

// RSS Proxy Integration
app.get('/api/rss', async (req, res) => {
    const feedUrl = req.query.url;
    if (!feedUrl) return res.status(400).json({ error: 'URL parameter is required' });

    try {
        const response = await axios.get(feedUrl, { timeout: 3000 });
        const xml = response.data;

        let items = [];
        const itemRegex = /<item>[\s\S]*?<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;

        let match;
        // Limit to top 5 items for performance
        while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
            const itemBlock = match[0];
            const titleMatch = itemBlock.match(titleRegex);
            const linkMatch = itemBlock.match(linkRegex);

            if (titleMatch) {
                const title = (titleMatch[1] || titleMatch[2]).trim();
                const link = linkMatch ? linkMatch[1].trim() : '';
                items.push({ title, link });
            }
        }
        res.json({ success: true, items });
    } catch (e) {
        console.error("RSS API error:", e.message);
        res.status(500).json({ success: false, error: 'Failed to fetch RSS feed' });
    }
});

// Generic route for any other app
app.get('/api/:app/status', async (req, res) => {
    const appName = req.params.app;
    const config = readConfig();
    const appInfo = config.apps.find(a => a.id === appName);

    if (!appInfo) {
        return res.status(404).json({ online: false, error: 'App not found in config' });
    }

    const url = appInfo.url;
    const pingResult = await checkServiceReachable(url);
    res.json(pingResult);
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
