const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const net = require('net');
const si = require('systeminformation');
const fs = require('fs');
const https = require('https');

// For internal connections to self-signed tools like Proxmox or local Home Assistant
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

let mdns = null;
try {
    mdns = require('multicast-dns')();
} catch (_) {
    // multicast-dns is optional in minimal Alpine container environments
}

const app = express();
const PORT = process.env.PORT || 3050;

// mDNS Discovery Memory Store
let discoveredServices = new Map();

// Version Cache
let versionCache = {
    lastCheck: 0,
    data: null
};

// Hook into mDNS responses
if (mdns) {
    mdns.on('response', (response) => {
        response.answers.forEach(answer => {
            if (answer.type === 'PTR' && answer.name === '_http._tcp.local') {
                const serviceName = answer.data.toString().replace('._http._tcp.local', '');
                if (!discoveredServices.has(serviceName)) {
                    discoveredServices.set(serviceName, { name: serviceName, type: 'http', lastSeen: Date.now() });
                }
            }
        });

        response.additionals?.forEach(add => {
            if (add.type === 'SRV') {
                const name = add.name.replace('._http._tcp.local', '');
                if (discoveredServices.has(name)) {
                    const service = discoveredServices.get(name);
                    service.port = add.data.port;
                    service.host = add.data.target;
                }
            }
            if (add.type === 'A') {
                const name = add.name;
                for (let [, service] of discoveredServices) {
                    if (service.host === name) {
                        service.ip = add.data;
                    }
                }
            }
        });
    });
}

app.use(cors());
app.use(express.json());

// Resolve Dashboard dist directory across both Local Dev (../Dashboard/dist) and Unraid Docker (../frontend/dist)
const DIST_CANDIDATES = [
    process.env.DIST_DIR,
    path.join(__dirname, '../Dashboard/dist'),
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, './dist')
].filter(Boolean);
const DIST_DIR = DIST_CANDIDATES.find(p => fs.existsSync(p)) || path.join(__dirname, '../Dashboard/dist');

// Serve Dashboard (Primary Project) at root
app.use(express.static(DIST_DIR));

// Serve Marketing (Secondary Project) at /welcome
app.use('/welcome', express.static(path.join(__dirname, '../../Marketing/dist')));

// Resolve persistent Config directory across Unraid Docker (/app/data) and Local Dev (../Data)
const IS_UNRAID_DOCKER = fs.existsSync('/app/data');
const CONFIG_DIR = process.env.CONFIG_DIR || (IS_UNRAID_DOCKER ? '/app/data' : path.join(__dirname, '../Data'));
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const EXAMPLE_CONFIG_PATH = fs.existsSync(path.join(CONFIG_DIR, 'config.example.json'))
    ? path.join(CONFIG_DIR, 'config.example.json')
    : path.join(__dirname, 'seed-profiles/config.example.json');
const PROFILES_DIR = path.join(CONFIG_DIR, 'profiles');

// Ensure data & profiles directories exist
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Auto-seed default config.json and bundled profiles (e.g. bri.json) on first Unraid boot
const SEED_PROFILES_CANDIDATES = [
    path.join(__dirname, 'seed-profiles'),
    '/local-source/unraid-runtime/backend/seed-profiles',
    '/mnt/user/Projects/BrayDashy/unraid-runtime/backend/seed-profiles'
];
for (const seedDir of SEED_PROFILES_CANDIDATES) {
    if (fs.existsSync(seedDir)) {
        try {
            const seedDefaultConfig = path.join(seedDir, 'config.json');
            if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(seedDefaultConfig)) {
                fs.copyFileSync(seedDefaultConfig, CONFIG_PATH);
                console.log(`[BrayDashy] Seeded default Sysadmin config.json into ${CONFIG_PATH}`);
            }
            const seedFiles = fs.readdirSync(seedDir).filter(
                f => f.endsWith('.json') && f !== 'config.example.json' && f !== 'config.json'
            );
            for (const file of seedFiles) {
                const targetProfilePath = path.join(PROFILES_DIR, file);
                if (!fs.existsSync(targetProfilePath)) {
                    fs.copyFileSync(path.join(seedDir, file), targetProfilePath);
                    console.log(`[BrayDashy] Seeded profile ${file} into ${PROFILES_DIR}`);
                }
            }
        } catch (err) {
            console.warn('[BrayDashy] Seed profile check warning:', err.message);
        }
        break;
    }
}

function sanitizeProfileSlug(rawSlug) {
    if (!rawSlug || typeof rawSlug !== 'string') return null;
    const cleaned = rawSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleaned || cleaned === 'default' || cleaned === 'main') return null;
    return cleaned;
}

function resolveConfigFilePath(profileSlug) {
    const slug = sanitizeProfileSlug(profileSlug);
    if (!slug) return CONFIG_PATH;
    return path.join(PROFILES_DIR, `${slug}.json`);
}

function normalizeConfig(parsed, defaultConfig) {
    if (!parsed.serverName) parsed.serverName = defaultConfig.serverName;
    if (!parsed.backgroundStyle) parsed.backgroundStyle = defaultConfig.backgroundStyle;
    if (!parsed.headerLayout) parsed.headerLayout = defaultConfig.headerLayout;
    if (!parsed.defaultSearchProvider) parsed.defaultSearchProvider = defaultConfig.defaultSearchProvider;
    if (!parsed.searchProviders) parsed.searchProviders = defaultConfig.searchProviders;
    if (parsed.enableWorkspaceMode === undefined) parsed.enableWorkspaceMode = false;
    if (!parsed.themeColor) parsed.themeColor = defaultConfig.themeColor;
    if (!parsed.appCardLayout) parsed.appCardLayout = defaultConfig.appCardLayout;
    if (!parsed.appCardSize) parsed.appCardSize = defaultConfig.appCardSize;
    if (!parsed.glanceWidgets) parsed.glanceWidgets = [];
    if (!parsed.experienceMode) parsed.experienceMode = 'sysadmin';
    if (!parsed.sanctuaryTheme) parsed.sanctuaryTheme = 'editorial';
    if (parsed.showTelemetry === undefined) parsed.showTelemetry = parsed.experienceMode !== 'sanctuary';
    if (!parsed.apiKeys) parsed.apiKeys = {};
    return parsed;
}

// Helper to read config (supports optional profileSlug)
function readConfig(profileSlug) {
    const defaultConfig = {
        serverName: "BrayDashy",
        experienceMode: "sysadmin",
        sanctuaryTheme: "editorial",
        greetingName: "",
        portalSubtitle: "Home Sanctuary",
        showTelemetry: true,
        backgroundStyle: "orbs",
        headerLayout: "classic",
        defaultSearchProvider: "google",
        enableWorkspaceMode: false,
        themeColor: "zinc",
        appCardLayout: "grid",
        appCardSize: "medium",
        categories: [],
        apps: [],
        apiKeys: {},
        glanceWidgets: [],
        quickSearchChips: [
            "Dinner recipe ideas",
            "3D print models",
            "Local weather forecast"
        ],
        searchProviders: [
            { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', prefix: '!g' },
            { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}', prefix: '!ddg' },
            { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={query}', prefix: '!bing' },
            { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={query}', prefix: '!yt' }
        ]
    };

    try {
        const targetPath = resolveConfigFilePath(profileSlug);
        let fileToRead = targetPath;

        if (!fs.existsSync(fileToRead)) {
            if (fs.existsSync(CONFIG_PATH)) {
                fileToRead = CONFIG_PATH;
            } else if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
                fileToRead = EXAMPLE_CONFIG_PATH;
            } else {
                return defaultConfig;
            }
        }

        const data = fs.readFileSync(fileToRead, 'utf8');
        const parsed = normalizeConfig(JSON.parse(data), defaultConfig);

        // If reading a secondary profile, inherit shared apiKeys from root config.json when not overridden
        if (sanitizeProfileSlug(profileSlug) && fs.existsSync(CONFIG_PATH)) {
            try {
                const rootData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                parsed.apiKeys = { ...(rootData.apiKeys || {}), ...(parsed.apiKeys || {}) };
            } catch (_) {
                // ignore root merge error
            }
        }

        return parsed;
    } catch (e) {
        console.error("Critical error reading config:", e.message);
        return defaultConfig;
    }
}

// Helper to write config
function writeConfig(data, profileSlug) {
    try {
        const targetPath = resolveConfigFilePath(profileSlug);
        fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("Critical error writing config:", e.message);
        return false;
    }
}

// List available profiles
app.get('/api/profiles', (req, res) => {
    try {
        const mainConfig = readConfig(null);
        const profiles = [
            {
                id: 'default',
                name: mainConfig.serverName || 'Main Dashboard',
                experienceMode: mainConfig.experienceMode || 'sysadmin',
                sanctuaryTheme: mainConfig.sanctuaryTheme || 'editorial'
            }
        ];

        if (fs.existsSync(PROFILES_DIR)) {
            const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const slug = file.replace(/\.json$/, '');
                const cfg = readConfig(slug);
                profiles.push({
                    id: slug,
                    name: cfg.greetingName ? `${cfg.greetingName}'s Hub` : (cfg.serverName || slug),
                    experienceMode: cfg.experienceMode || 'sanctuary',
                    sanctuaryTheme: cfg.sanctuaryTheme || 'editorial'
                });
            }
        }

        res.json({ success: true, profiles });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to list profiles' });
    }
});

// Create or clone a profile
app.post('/api/profiles', (req, res) => {
    const { id, name, experienceMode = 'sanctuary', sanctuaryTheme = 'editorial', greetingName = '' } = req.body || {};
    const slug = sanitizeProfileSlug(id || name);
    if (!slug) {
        return res.status(400).json({ success: false, error: 'Valid profile name is required' });
    }

    const existingPath = resolveConfigFilePath(slug);
    if (fs.existsSync(existingPath)) {
        return res.json({ success: true, profileId: slug });
    }

    const baseTemplate = readConfig(null);
    const newProfileConfig = {
        ...baseTemplate,
        serverName: name || `${greetingName || slug}'s Hub`,
        experienceMode,
        sanctuaryTheme,
        greetingName: greetingName || name || '',
        showTelemetry: experienceMode !== 'sanctuary',
        showDesktopPet: experienceMode !== 'sanctuary'
    };

    const ok = writeConfig(newProfileConfig, slug);
    if (ok) {
        res.json({ success: true, profileId: slug });
    } else {
        res.status(500).json({ success: false, error: 'Failed to create profile' });
    }
});

// Get Config (supports ?profile=<slug>)
app.get('/api/config', (req, res) => {
    const profileSlug = req.query.profile;
    const config = readConfig(profileSlug);
    res.json(config);
});

// Save Config (supports ?profile=<slug>)
app.post('/api/config', (req, res) => {
    const profileSlug = req.query.profile;
    const success = writeConfig(req.body, profileSlug);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Failed to write configuration to disk' });
    }
});

// mDNS discovery endpoint
app.get('/api/discovery/mdns', (req, res) => {
    const now = Date.now();
    const active = Array.from(discoveredServices.values())
        .filter(s => now - s.lastSeen < 600000)
        .map(s => ({
            name: s.name,
            url: `http://${s.ip || s.host || s.name + '.local'}${s.port ? ':' + s.port : ''}`,
            type: s.type
        }));

    res.json({ success: true, services: active });
});

// Version check endpoint
app.get('/api/version/check', async (req, res) => {
    const now = Date.now();
    const cacheDuration = 6 * 60 * 60 * 1000; // 6 hours

    if (versionCache.data && (now - versionCache.lastCheck < cacheDuration)) {
        return res.json(versionCache.data);
    }

    try {
        const dashboardPkgPath = path.join(__dirname, '../Dashboard/package.json');
        const dashboardPkg = JSON.parse(fs.readFileSync(dashboardPkgPath, 'utf8'));
        const currentVersion = dashboardPkg.version;

        const response = await axios.get('https://api.github.com/repos/Ruzzler/braydashy-dashboard/releases/latest', {
            headers: { 'User-Agent': 'BrayDashy-Server' },
            timeout: 5000
        });

        const latestVersion = response.data.tag_name.replace(/^v/, '');
        const updateAvailable = latestVersion !== currentVersion;

        versionCache = {
            lastCheck: now,
            data: {
                currentVersion,
                latestVersion,
                updateAvailable,
                releaseNotes: response.data.body,
                url: response.data.html_url
            }
        };

        res.json(versionCache.data);
    } catch (error) {
        try {
            const dashboardPkgPath = path.join(__dirname, '../Dashboard/package.json');
            const dashboardPkg = JSON.parse(fs.readFileSync(dashboardPkgPath, 'utf8'));
            res.json({
                currentVersion: dashboardPkg.version,
                updateAvailable: false,
                error: 'Failed to reach GitHub'
            });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to check for updates' });
        }
    }
});

// App Gallery endpoint
app.get('/api/gallery', (req, res) => {
    try {
        const galleryPath = path.join(CONFIG_DIR, 'gallery.json');
        if (fs.existsSync(galleryPath)) {
            const data = fs.readFileSync(galleryPath, 'utf8');
            res.json({ success: true, apps: JSON.parse(data) });
        } else {
            res.json({ success: true, apps: [] });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to read gallery data' });
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
                resolve({ online: true, latency });
            });
        } catch (error) {
            resolve({ online: false });
        }
    });
}

// ─── Home Assistant Integration ──────────────────────────────────────────────

function getHomeAssistantCredentials(profileSlug) {
    const config = readConfig(profileSlug);
    const haApp = (config.apps || []).find(a =>
        a.id === 'homeassistant' ||
        a.name.toLowerCase().includes('home assistant') ||
        a.name.toLowerCase().includes('homeassistant')
    );
    const url = (
        config.apiKeys?.HOME_ASSISTANT_URL ||
        process.env.HOME_ASSISTANT_URL ||
        haApp?.url ||
        'http://192.168.0.100:8123'
    ).replace(/\/+$/, '');

    const token = config.apiKeys?.HOME_ASSISTANT_TOKEN || process.env.HOME_ASSISTANT_TOKEN || '';
    return { url, token };
}

function formatHaEntityPayload(rawEntity) {
    if (!rawEntity || !rawEntity.entity_id) return null;
    const entityId = rawEntity.entity_id;
    const domain = entityId.split('.')[0];
    const state = String(rawEntity.state ?? 'unknown');
    const attrs = rawEntity.attributes || {};
    const friendlyName = attrs.friendly_name || entityId;

    let displayValue = state;
    let subtitle = domain;

    if (domain === 'climate') {
        const currTemp = attrs.current_temperature ?? attrs.temperature;
        const targetTemp = attrs.temperature;
        displayValue = currTemp !== undefined ? `${currTemp}°` : state;
        const action = attrs.hvac_action || state;
        subtitle = targetTemp !== undefined ? `${action} · Set ${targetTemp}°` : String(action);
    } else if (domain === 'weather') {
        const temp = attrs.temperature;
        const unit = attrs.temperature_unit || '°';
        displayValue = temp !== undefined ? `${temp}${unit}` : state;
        const conditionMap = {
            partlycloudy: 'Partly Cloudy',
            sunny: 'Sunny',
            clear: 'Clear',
            cloudy: 'Cloudy',
            rainy: 'Rainy',
            snowy: 'Snowy'
        };
        subtitle = conditionMap[state.toLowerCase()] || state;
    } else if (domain === 'lock') {
        displayValue = state === 'locked' ? 'Locked' : state === 'unlocked' ? 'Unlocked' : state;
        subtitle = state === 'locked' ? 'Secure' : 'Check Door';
    } else if (domain === 'todo') {
        const count = Number(state);
        displayValue = !isNaN(count) ? `${count} ${count === 1 ? 'item' : 'items'}` : state;
        subtitle = 'To-Do List';
    } else if (domain === 'input_datetime') {
        try {
            const dt = new Date(state.replace(' ', 'T'));
            if (!isNaN(dt.getTime())) {
                const now = new Date();
                const isToday = dt.toDateString() === now.toDateString();
                const timeStr = dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const dayStr = isToday ? 'Today' : dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
                displayValue = timeStr;
                subtitle = dayStr;
            }
        } catch (_) {
            displayValue = state;
        }
    } else if (domain === 'sensor') {
        const unit = attrs.unit_of_measurement || '';
        displayValue = unit ? `${state} ${unit}` : state;
        subtitle = friendlyName;
    }

    return {
        entityId,
        domain,
        state,
        friendlyName,
        displayValue,
        subtitle,
        unit: attrs.unit_of_measurement || '',
        online: state !== 'unavailable' && state !== 'unknown'
    };
}

// Fallback snapshot for local preview before user pastes Long-Lived Access Token into Settings
const HA_PREVIEW_STATES = {
    'climate.thermostat_ecobee_premium_rumpusroom': {
        entity_id: 'climate.thermostat_ecobee_premium_rumpusroom',
        state: 'heat',
        attributes: {
            current_temperature: 21.6,
            temperature: 20.0,
            hvac_action: 'Heating',
            friendly_name: 'Main Floor Ecobee'
        }
    },
    'weather.forecast_home': {
        entity_id: 'weather.forecast_home',
        state: 'partlycloudy',
        attributes: {
            temperature: 1.1,
            temperature_unit: '°C',
            friendly_name: 'Home Forecast'
        }
    },
    'todo.mealie_groceries': {
        entity_id: 'todo.mealie_groceries',
        state: '1',
        attributes: {
            friendly_name: 'Mealie Groceries'
        }
    },
    'sensor.mealie_recipes': {
        entity_id: 'sensor.mealie_recipes',
        state: '60',
        attributes: {
            unit_of_measurement: 'recipes',
            friendly_name: 'Mealie Recipes'
        }
    },
    'lock.side_entry_lock_schlage_be469zp_sideentry': {
        entity_id: 'lock.side_entry_lock_schlage_be469zp_sideentry',
        state: 'locked',
        attributes: {
            friendly_name: 'Side Entry Lock'
        }
    },
    'lock.aqara_smart_lock_u400': {
        entity_id: 'lock.aqara_smart_lock_u400',
        state: 'locked',
        attributes: {
            friendly_name: 'Front Aqara Lock'
        }
    },
    'input_datetime.dogs_last_fed_time': {
        entity_id: 'input_datetime.dogs_last_fed_time',
        state: '2026-11-03 19:09:13',
        attributes: {
            friendly_name: 'Dogs Last Fed'
        }
    },
    'sensor.k2_plus_current_display_message': {
        entity_id: 'sensor.k2_plus_current_display_message',
        state: 'Ready',
        attributes: {
            friendly_name: 'K2 Plus Printer'
        }
    }
};

async function fetchSingleHaEntity(entityId, url, token) {
    if (token && url) {
        try {
            const response = await axios.get(`${url}/api/states/${encodeURIComponent(entityId)}`, {
                headers: { Authorization: `Bearer ${token}` },
                httpsAgent: insecureAgent,
                timeout: 3000
            });
            if (response.data) {
                return { ...formatHaEntityPayload(response.data), live: true };
            }
        } catch (err) {
            console.error(`Home Assistant entity fetch error (${entityId}):`, err.message);
        }
    }

    // Fallback to preview state if available
    if (HA_PREVIEW_STATES[entityId]) {
        return { ...formatHaEntityPayload(HA_PREVIEW_STATES[entityId]), live: false };
    }

    return {
        entityId,
        domain: entityId.split('.')[0] || 'sensor',
        state: 'unconfigured',
        friendlyName: entityId,
        displayValue: 'Configure HA Token',
        subtitle: 'Integrations Tab',
        unit: '',
        online: false,
        live: false
    };
}

app.get('/api/homeassistant/entity', async (req, res) => {
    const entityId = req.query.entityId;
    if (!entityId) return res.status(400).json({ error: 'entityId query parameter is required' });
    const { url, token } = getHomeAssistantCredentials(req.query.profile);
    const result = await fetchSingleHaEntity(entityId, url, token);
    res.json({ success: true, entity: result });
});

app.get('/api/homeassistant/entities', async (req, res) => {
    const rawIds = String(req.query.ids || '');
    const ids = rawIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.json({ success: true, entities: {} });

    const { url, token } = getHomeAssistantCredentials(req.query.profile);
    const results = await Promise.all(ids.map(id => fetchSingleHaEntity(id, url, token)));
    const map = {};
    results.forEach(item => {
        if (item && item.entityId) map[item.entityId] = item;
    });
    res.json({ success: true, entities: map });
});

// Interactive Grocery / Todo Store (synced with Home Assistant todo.mealie_groceries)
const localTodoStore = {
    'todo.mealie_groceries': [
        { uid: '788dbfea-19eb-4d5f-990e-e45dff682372', summary: 'Milk', status: 'needs_action' },
        { uid: '0d6da38d-f0cd-4aba-9aa6-50377e4566e1', summary: 'Potatoes', status: 'completed' },
        { uid: '7c0ab06b-5ed8-459e-ad1c-ffd8d7e798a5', summary: 'Frozen vegetables', status: 'completed' }
    ]
};

function syncTodoPreviewCount(entityId) {
    const list = localTodoStore[entityId] || [];
    const activeCount = list.filter(i => i.status === 'needs_action').length;
    if (HA_PREVIEW_STATES[entityId]) {
        HA_PREVIEW_STATES[entityId].state = String(activeCount);
    }
}

async function fetchHaTodoItems(entityId, url, token) {
    if (token && url) {
        try {
            const response = await axios.post(
                `${url}/api/services/todo/get_items?return_response=true`,
                { entity_id: entityId },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    httpsAgent: insecureAgent,
                    timeout: 4000
                }
            );
            const items =
                response.data?.service_response?.[entityId]?.items ||
                response.data?.[entityId]?.items;
            if (Array.isArray(items)) {
                localTodoStore[entityId] = items.map(it => ({
                    uid: it.uid || it.summary,
                    summary: it.summary,
                    status: it.status || 'needs_action'
                }));
                syncTodoPreviewCount(entityId);
                return localTodoStore[entityId];
            }
        } catch (err) {
            console.error(`Home Assistant todo fetch error (${entityId}):`, err.message);
        }
    }
    if (!localTodoStore[entityId]) {
        localTodoStore[entityId] = [];
    }
    return localTodoStore[entityId];
}

app.get('/api/homeassistant/todo', async (req, res) => {
    const entityId = String(req.query.entityId || 'todo.mealie_groceries');
    const { url, token } = getHomeAssistantCredentials(req.query.profile);
    const items = await fetchHaTodoItems(entityId, url, token);
    res.json({ success: true, entityId, items });
});

app.post('/api/homeassistant/todo/add', async (req, res) => {
    const { entityId = 'todo.mealie_groceries', summary, profile } = req.body || {};
    const cleanSummary = String(summary || '').trim();
    if (!cleanSummary) return res.status(400).json({ success: false, error: 'Item summary is required' });

    const { url, token } = getHomeAssistantCredentials(profile);
    if (token && url) {
        try {
            await axios.post(
                `${url}/api/services/todo/add_item`,
                { entity_id: entityId, item: cleanSummary },
                { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 4000 }
            );
            const items = await fetchHaTodoItems(entityId, url, token);
            return res.json({ success: true, items });
        } catch (err) {
            console.error('HA todo add_item error:', err.message);
        }
    }

    if (!localTodoStore[entityId]) localTodoStore[entityId] = [];
    localTodoStore[entityId].unshift({
        uid: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        summary: cleanSummary,
        status: 'needs_action'
    });
    syncTodoPreviewCount(entityId);
    res.json({ success: true, items: localTodoStore[entityId] });
});

app.post('/api/homeassistant/todo/update', async (req, res) => {
    const { entityId = 'todo.mealie_groceries', uid, item, rename, status, profile } = req.body || {};
    const targetId = uid || item;
    if (!targetId) return res.status(400).json({ success: false, error: 'Target item is required' });

    const { url, token } = getHomeAssistantCredentials(profile);
    if (token && url) {
        try {
            const payload = { entity_id: entityId, item: targetId };
            if (rename !== undefined) payload.rename = String(rename).trim();
            if (status !== undefined) payload.status = status;
            await axios.post(
                `${url}/api/services/todo/update_item`,
                payload,
                { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 4000 }
            );
            const items = await fetchHaTodoItems(entityId, url, token);
            return res.json({ success: true, items });
        } catch (err) {
            console.error('HA todo update_item error:', err.message);
        }
    }

    if (!localTodoStore[entityId]) localTodoStore[entityId] = [];
    localTodoStore[entityId] = localTodoStore[entityId].map(entry => {
        if (entry.uid === targetId || entry.summary === targetId) {
            return {
                ...entry,
                summary: rename !== undefined ? String(rename).trim() : entry.summary,
                status: status !== undefined ? status : entry.status
            };
        }
        return entry;
    });
    syncTodoPreviewCount(entityId);
    res.json({ success: true, items: localTodoStore[entityId] });
});

app.post('/api/homeassistant/todo/remove', async (req, res) => {
    const { entityId = 'todo.mealie_groceries', uid, item, clearCompleted = false, profile } = req.body || {};
    const { url, token } = getHomeAssistantCredentials(profile);

    if (token && url) {
        try {
            if (clearCompleted) {
                await axios.post(
                    `${url}/api/services/todo/remove_completed_items`,
                    { entity_id: entityId },
                    { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 4000 }
                );
            } else {
                const targetId = uid || item;
                await axios.post(
                    `${url}/api/services/todo/remove_item`,
                    { entity_id: entityId, item: targetId },
                    { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 4000 }
                );
            }
            const items = await fetchHaTodoItems(entityId, url, token);
            return res.json({ success: true, items });
        } catch (err) {
            console.error('HA todo remove error:', err.message);
        }
    }

    if (!localTodoStore[entityId]) localTodoStore[entityId] = [];
    if (clearCompleted) {
        localTodoStore[entityId] = localTodoStore[entityId].filter(entry => entry.status !== 'completed');
    } else {
        const targetId = uid || item;
        localTodoStore[entityId] = localTodoStore[entityId].filter(entry => entry.uid !== targetId && entry.summary !== targetId);
    }
    syncTodoPreviewCount(entityId);
    res.json({ success: true, items: localTodoStore[entityId] });
});

// Dinner & Meal Plan Store (synced with calendar.mealie_dinner & Mealie API)
let localDinnerStore = {
    tonightTitle: '',
    tonightNotes: '',
    weekPlan: []
};

app.get('/api/homeassistant/dinner', async (req, res) => {
    const profileSlug = req.query.profile;
    const config = readConfig(profileSlug);
    const { url, token } = getHomeAssistantCredentials(profileSlug);

    const mealieApp = (config.apps || []).find(a => a.name.toLowerCase().includes('mealie'));
    const mealieUrl = (mealieApp?.url || 'http://192.168.0.100:9000').replace(/\/+$/, '');
    const mealieToken = config.apiKeys?.MEALIE_API_KEY || '';

    // 1. Try Mealie today endpoint if API key is present
    if (mealieToken) {
        try {
            const todayRes = await axios.get(`${mealieUrl}/api/households/mealplans/today`, {
                headers: { Authorization: `Bearer ${mealieToken}` },
                httpsAgent: insecureAgent,
                timeout: 3000
            });
            if (Array.isArray(todayRes.data) && todayRes.data.length > 0) {
                const dinnerEntry = todayRes.data.find(e => e.entryType === 'dinner') || todayRes.data[0];
                const title = dinnerEntry?.recipe?.name || dinnerEntry?.title || '';
                if (title) {
                    return res.json({
                        success: true,
                        tonightTitle: title,
                        tonightNotes: dinnerEntry?.text || 'From Mealie Meal Plan',
                        mealieUrl,
                        weekPlan: localDinnerStore.weekPlan
                    });
                }
            }
        } catch (_) { }
    }

    // 2. Try Home Assistant calendar.mealie_dinner if HA token is present
    if (token && url) {
        try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            const calRes = await axios.get(
                `${url}/api/calendars/calendar.mealie_dinner?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
                { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 3500 }
            );
            if (Array.isArray(calRes.data) && calRes.data.length > 0) {
                const todayIso = new Date().toISOString().slice(0, 10);
                const tonightEvent = calRes.data.find(ev => {
                    const evDate = String(ev.start?.date || ev.start?.dateTime || '').slice(0, 10);
                    return evDate === todayIso;
                });
                return res.json({
                    success: true,
                    tonightTitle: tonightEvent?.summary || localDinnerStore.tonightTitle || '',
                    tonightNotes: tonightEvent?.description || localDinnerStore.tonightNotes || '',
                    mealieUrl,
                    weekPlan: calRes.data.map(ev => ({
                        date: String(ev.start?.date || ev.start?.dateTime || '').slice(0, 10),
                        summary: ev.summary,
                        description: ev.description || ''
                    }))
                });
            }
        } catch (_) { }
    }

    res.json({
        success: true,
        tonightTitle: localDinnerStore.tonightTitle,
        tonightNotes: localDinnerStore.tonightNotes,
        mealieUrl,
        weekPlan: localDinnerStore.weekPlan
    });
});

app.post('/api/homeassistant/dinner', async (req, res) => {
    const { tonightTitle = '', tonightNotes = '' } = req.body || {};
    localDinnerStore.tonightTitle = String(tonightTitle).trim();
    localDinnerStore.tonightNotes = String(tonightNotes).trim();
    res.json({
        success: true,
        tonightTitle: localDinnerStore.tonightTitle,
        tonightNotes: localDinnerStore.tonightNotes
    });
});

app.post('/api/homeassistant/dogs-fed', async (req, res) => {
    const { profile } = req.body || {};
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const { url, token } = getHomeAssistantCredentials(profile);
    if (token && url) {
        try {
            await axios.post(
                `${url}/api/services/input_datetime/set_datetime`,
                {
                    entity_id: 'input_datetime.dogs_last_fed_time',
                    datetime: formatted
                },
                { headers: { Authorization: `Bearer ${token}` }, httpsAgent: insecureAgent, timeout: 4000 }
            );
        } catch (err) {
            console.error('HA set_datetime error:', err.message);
        }
    }

    if (HA_PREVIEW_STATES['input_datetime.dogs_last_fed_time']) {
        HA_PREVIEW_STATES['input_datetime.dogs_last_fed_time'].state = formatted;
    }

    const updated = formatHaEntityPayload({
        entity_id: 'input_datetime.dogs_last_fed_time',
        state: formatted,
        attributes: { friendly_name: 'Dogs Last Fed' }
    });
    res.json({ success: true, entity: updated });
});

const handleHomeAssistantStatus = async (req, res) => {
    const { url, token } = getHomeAssistantCredentials(req.query.profile);
    try {
        const pingResult = await checkServiceReachable(url);
        let stats = [];
        if (token && pingResult.online) {
            try {
                const climate = await fetchSingleHaEntity('climate.thermostat_ecobee_premium_rumpusroom', url, token);
                if (climate?.displayValue) {
                    stats.push({ id: 'climate', label: 'Temp', value: climate.displayValue, color: '#10b981' });
                }
            } catch (_) {}
        }
        res.json({ online: pingResult.online, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (_) {
        res.json({ online: false });
    }
};

const handleMealieStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = (config.apps || []).find(a => a.id.includes('mealie') || a.name.toLowerCase().includes('mealie'));
    if (!appInfo) return res.json({ online: false });

    const pingResult = await checkServiceReachable(appInfo.url);
    const { url: haUrl, token: haToken } = getHomeAssistantCredentials(req.query.profile);
    const recipeEntity = await fetchSingleHaEntity('sensor.mealie_recipes', haUrl, haToken);
    const groceryEntity = await fetchSingleHaEntity('todo.mealie_groceries', haUrl, haToken);

    const stats = [];
    if (recipeEntity && recipeEntity.displayValue) {
        stats.push({ id: 'recipes', label: 'Recipes', value: recipeEntity.state, color: '#ea580c' });
    }
    if (groceryEntity && groceryEntity.state) {
        stats.push({ id: 'groceries', label: 'Groceries', value: groceryEntity.state, color: '#10b981' });
    }

    res.json({
        online: pingResult.online || Boolean(recipeEntity?.online),
        latency: pingResult.latency ?? 12,
        stats: stats.length > 0 ? stats : null
    });
};

// Specialized Service Status Handlers
const handleSonarrStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'sonarr' || a.name.toLowerCase().includes('sonarr'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const apiKey = config.apiKeys.SONARR_API_KEY;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (apiKey) {
            try {
                const queueRes = await axios.get(`${url}/api/v3/queue`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                stats.push({ id: 'queue', label: 'Queue', value: queueRes.data.totalRecords || '0', color: 'var(--warning)' });
                const wantedRes = await axios.get(`${url}/api/v3/wanted/missing`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                stats.push({ id: 'wanted', label: 'Wanted', value: wantedRes.data.totalRecords || '0', color: 'var(--destructive)' });
            } catch (e) { console.error('Sonarr API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleRadarrStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'radarr' || a.name.toLowerCase().includes('radarr'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const apiKey = config.apiKeys.RADARR_API_KEY;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (apiKey) {
            try {
                const queueRes = await axios.get(`${url}/api/v3/queue`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                stats.push({ id: 'queue', label: 'Queue', value: queueRes.data.totalRecords || '0', color: 'var(--warning)' });
                const wantedRes = await axios.get(`${url}/api/v3/wanted/missing`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                stats.push({ id: 'wanted', label: 'Wanted', value: wantedRes.data.totalRecords || '0', color: 'var(--destructive)' });
            } catch (e) { console.error('Radarr API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleAdGuardStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'adguard' || a.name.toLowerCase().includes('adguard'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const authString = config.apiKeys.ADGUARD_AUTH;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (authString) {
            try {
                const statsRes = await axios.get(`${url}/control/stats`, { headers: { 'Authorization': `Basic ${authString}` }, timeout: 3000 });
                if (statsRes.data) {
                    const blockRate = statsRes.data.num_dns_queries > 0 ? ((statsRes.data.num_blocked_filtering / statsRes.data.num_dns_queries) * 100).toFixed(1) + '%' : '0%';
                    stats.push({ id: 'blocked_ratio', label: 'Blocked', value: blockRate, color: 'var(--success)' });
                    if (statsRes.data.num_dns_queries) stats.push({ id: 'total_queries', label: 'Queries', value: (statsRes.data.num_dns_queries / 1000).toFixed(1) + 'k', color: 'var(--primary)' });
                }
            } catch (e) { console.error('AdGuard API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleTautulliStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'tautulli' || a.name.toLowerCase().includes('tautulli'));
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
                if (actRes.data?.response?.data) {
                    const data = actRes.data.response.data;
                    stats.push({ id: 'streams', label: 'Streams', value: data.stream_count || '0', color: '#10b981' });
                    stats.push({ id: 'bandwidth', label: 'Bandwidth', value: data.total_bandwidth ? Math.round(data.total_bandwidth / 1000) + ' Mbps' : '0 Mbps', color: '#3b82f6' });
                }
            } catch (e) { console.error('Tautulli API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleOverseerrStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'overseerr' || a.name.toLowerCase().includes('overseerr'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const apiKey = config.apiKeys.OVERSEERR_API_KEY;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (apiKey) {
            try {
                const pendingRes = await axios.get(`${url}/api/v1/request?filter=pending`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                if (pendingRes.data?.pageInfo) stats.push({ id: 'pending', label: 'Pending', value: pendingRes.data.pageInfo.results, color: '#f59e0b' });
                const approvedRes = await axios.get(`${url}/api/v1/request?filter=approved`, { headers: { 'X-Api-Key': apiKey }, timeout: 3000 });
                if (approvedRes.data?.pageInfo) stats.push({ id: 'approved', label: 'Approved', value: approvedRes.data.pageInfo.results, color: '#10b981' });
            } catch (e) { console.error('Overseerr API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleSpeedtestStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'speedtest' || a.name.toLowerCase().includes('speedtest'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const apiKey = config.apiKeys.SPEEDTEST_API_KEY;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (apiKey) {
            try {
                const speedRes = await axios.get(`${url}/api/speedtest/latest`, { headers: { 'Authorization': `Bearer ${apiKey}` }, timeout: 3000 });
                if (speedRes.data?.data) {
                    const data = speedRes.data.data;
                    stats.push({ id: 'dl', label: 'DL', value: (data.download / 125000).toFixed(0) + ' Mbps', color: '#10b981' });
                    stats.push({ id: 'ul', label: 'UL', value: (data.upload / 125000).toFixed(0) + ' Mbps', color: '#3b82f6' });
                }
            } catch (e) { console.error('Speedtest API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handlePiholeStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'pihole' || a.name.toLowerCase().includes('pihole'));
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
                    stats.push({ id: 'blocked', label: 'Blocked', value: sumRes.data.ads_blocked_today || '0', color: '#10b981' });
                    stats.push({ id: 'ratio', label: 'Ratio', value: sumRes.data.ads_percentage_today?.toFixed(1) + '%', color: '#3b82f6' });
                }
            } catch (e) { console.error('Pi-hole API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleQbittorrentStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'qbittorrent' || a.name.toLowerCase().includes('qbittorrent'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const creds = config.apiKeys.QBITTORRENT_CREDS;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (creds?.includes(':')) {
            const [user, pass] = creds.split(':');
            try {
                const loginRes = await axios.post(`${url}/api/v2/auth/login`, `username=${user}&password=${pass}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 3000 });
                const syncRes = await axios.get(`${url}/api/v2/sync/maindata`, { headers: { 'Cookie': loginRes.headers['set-cookie']?.join('; ') }, timeout: 3000 });
                if (syncRes.data?.server_state) {
                    const data = syncRes.data.server_state;
                    stats.push({ id: 'dl', label: 'DL', value: (data.dl_info_speed / 1024 / 1024).toFixed(1) + ' MB/s', color: '#10b981' });
                    stats.push({ id: 'ul', label: 'UL', value: (data.up_info_speed / 1024 / 1024).toFixed(1) + ' MB/s', color: '#3b82f6' });
                }
            } catch (e) { console.error('qBittorrent error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

const handleProxmoxStatus = async (req, res) => {
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === 'proxmox' || a.name.toLowerCase().includes('proxmox'));
    if (!appInfo) return res.json({ online: false });
    const url = appInfo.url;
    const token = config.apiKeys.PROXMOX_TOKEN;
    try {
        const pingResult = await checkServiceReachable(url);
        if (!pingResult.online) return res.json({ online: false });
        let stats = [];
        if (token) {
            try {
                const nodesRes = await axios.get(`${url}/api2/json/nodes`, { headers: { 'Authorization': `PVEAPIToken=${token}` }, httpsAgent: insecureAgent, timeout: 3000 });
                if (nodesRes.data?.data) {
                    let totalCpu = 0, totalMem = 0, maxMem = 0;
                    nodesRes.data.data.forEach(node => {
                        totalCpu += node.cpu || 0;
                        totalMem += node.mem || 0;
                        maxMem += node.maxmem || 0;
                    });
                    if (nodesRes.data.data.length > 0) {
                        const avgCpu = (totalCpu / nodesRes.data.data.length * 100).toFixed(1) + '%';
                        const memPct = (totalMem / maxMem * 100).toFixed(1) + '%';
                        stats.push({ id: 'cpu', label: 'CPU', value: avgCpu, color: '#f59e0b' });
                        stats.push({ id: 'ram', label: 'RAM', value: memPct, color: '#10b981' });
                    }
                }
            } catch (e) { console.error('Proxmox API error:', e.message); }
        }
        res.json({ online: true, latency: pingResult.latency, stats: stats.length > 0 ? stats : null });
    } catch (e) { res.json({ online: false }); }
};

// Specialized Service Routes
app.get('/api/homeassistant/status', handleHomeAssistantStatus);
app.get('/api/mealie/status', handleMealieStatus);
app.get('/api/sonarr/status', handleSonarrStatus);
app.get('/api/radarr/status', handleRadarrStatus);
app.get('/api/adguard/status', handleAdGuardStatus);
app.get('/api/tautulli/status', handleTautulliStatus);
app.get('/api/overseerr/status', handleOverseerrStatus);
app.get('/api/speedtest/status', handleSpeedtestStatus);
app.get('/api/pihole/status', handlePiholeStatus);
app.get('/api/qbittorrent/status', handleQbittorrentStatus);
app.get('/api/proxmox/status', handleProxmoxStatus);

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
            if (c.Ports && c.Ports.length > 0) {
                const publicPort = c.Ports.find(p => p.PublicPort);
                if (publicPort) {
                    port = publicPort.PublicPort;
                } else {
                    port = c.Ports[0].PrivatePort;
                }
            }

            let name = c.Names && c.Names.length > 0 ? c.Names[0].replace(/^\//, '') : 'Unknown';

            let icon = 'Container';
            const lowerName = name.toLowerCase();
            if (lowerName.includes('sonarr')) icon = 'Radio';
            else if (lowerName.includes('radarr')) icon = 'Film';
            else if (lowerName.includes('plex')) icon = 'Play';
            else if (lowerName.includes('pihole')) icon = 'Shield';
            else if (lowerName.includes('mealie')) icon = 'UtensilsCrossed';
            else if (lowerName.includes('transmission') || lowerName.includes('qbittorrent')) icon = 'Download';

            return {
                id: c.Id.substring(0, 12),
                name: name,
                state: c.State,
                status: c.Status,
                port: port,
                image: c.Image,
                icon: icon
            };
        });

        res.json({ success: true, containers });
    } catch (e) {
        res.json({
            success: false,
            error: 'Docker socket not found or permission denied.',
            details: e.message
        });
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

// =========================================================================
// LOCAL UPDATE & UNRAID SYNC ENDPOINTS
// =========================================================================
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        for (const child of fs.readdirSync(src)) {
            copyRecursiveSync(path.join(src, child), path.join(dest, child));
        }
    } else {
        const parentDir = path.dirname(dest);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

function getDefaultLocalSyncPath() {
    if (process.env.LOCAL_SYNC_PATH) return process.env.LOCAL_SYNC_PATH;
    if (process.platform === 'win32') {
        if (fs.existsSync('W:\\')) return 'W:\\BrayDashy';
        return '\\\\192.168.0.100\\Projects\\BrayDashy';
    }
    if (fs.existsSync('/local-source')) return '/local-source';
    return '/mnt/user/Projects/BrayDashy';
}

app.get('/api/local-sync/status', (req, res) => {
    const requestedPath = req.query.path ? String(req.query.path).trim() : '';
    const targetPath = requestedPath || getDefaultLocalSyncPath();
    const reachable = fs.existsSync(targetPath);

    let manifest = null;
    const manifestPath = path.join(targetPath, 'manifest.json');
    if (reachable && fs.existsSync(manifestPath)) {
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (_) { }
    }

    let runtimeIndexMtime = null;
    const indexHtmlPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        try {
            runtimeIndexMtime = fs.statSync(indexHtmlPath).mtime.toISOString();
        } catch (_) { }
    }

    res.json({
        environment: IS_UNRAID_DOCKER ? 'unraid-docker' : (process.platform === 'win32' ? 'windows-dev' : 'linux'),
        defaultPath: getDefaultLocalSyncPath(),
        targetPath,
        reachable,
        manifest,
        runtimeDistDir: DIST_DIR,
        runtimeConfigDir: CONFIG_DIR,
        runtimeIndexMtime
    });
});

// Push current local build & profiles to Unraid share (e.g. \\192.168.0.100\Projects\BrayDashy)
app.post('/api/local-sync/push', (req, res) => {
    try {
        const targetPath = (req.body?.targetPath || getDefaultLocalSyncPath()).trim();
        const includeBriProfile = req.body?.includeBriProfile !== false;

        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const runtimeRoot = path.join(targetPath, 'unraid-runtime');
        const runtimeBackend = path.join(runtimeRoot, 'backend');
        const runtimeSeedProfiles = path.join(runtimeBackend, 'seed-profiles');
        const runtimeDist = path.join(runtimeRoot, 'frontend', 'dist');

        fs.mkdirSync(runtimeSeedProfiles, { recursive: true });
        fs.mkdirSync(runtimeDist, { recursive: true });

        // 1. Copy backend server.js
        fs.copyFileSync(__filename, path.join(runtimeBackend, 'server.js'));

        // 2. Copy built frontend dist
        copyRecursiveSync(DIST_DIR, runtimeDist);

        // 3. Copy seed profiles (config.json + bri.json) so Unraid has both Sysadmin & Bri's Hub ready
        if (fs.existsSync(CONFIG_PATH)) {
            fs.copyFileSync(CONFIG_PATH, path.join(runtimeSeedProfiles, 'config.json'));
        }
        if (includeBriProfile && fs.existsSync(PROFILES_DIR)) {
            for (const f of fs.readdirSync(PROFILES_DIR)) {
                if (f.endsWith('.json')) {
                    fs.copyFileSync(path.join(PROFILES_DIR, f), path.join(runtimeSeedProfiles, f));
                }
            }
        }
        if (fs.existsSync(EXAMPLE_CONFIG_PATH)) {
            fs.copyFileSync(EXAMPLE_CONFIG_PATH, path.join(runtimeSeedProfiles, 'config.example.json'));
        }

        // 4. Write manifest.json
        const manifest = {
            version: '0.9.0-home-hub',
            syncedAt: new Date().toISOString(),
            sourcePlatform: process.platform,
            filesSynced: ['unraid-runtime/backend/server.js', 'unraid-runtime/frontend/dist', 'unraid-runtime/backend/seed-profiles']
        };
        fs.writeFileSync(path.join(targetPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

        res.json({
            success: true,
            targetPath,
            manifest,
            message: `Published latest build & profiles to ${targetPath}`
        });
    } catch (error) {
        console.error('[LocalSync Push Error]:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pull latest build & profiles from mounted local folder (e.g. /local-source on Unraid)
app.post('/api/local-sync/pull', (req, res) => {
    try {
        const sourcePath = (req.body?.sourcePath || getDefaultLocalSyncPath()).trim();
        const overwriteProfiles = Boolean(req.body?.overwriteProfiles);
        const restartServer = Boolean(req.body?.restartServer);

        const runtimeRoot = fs.existsSync(path.join(sourcePath, 'unraid-runtime'))
            ? path.join(sourcePath, 'unraid-runtime')
            : sourcePath;

        const sourceServerJs = [
            path.join(runtimeRoot, 'backend', 'server.js'),
            path.join(sourcePath, 'Software', 'Server', 'server.js')
        ].find(p => fs.existsSync(p));

        const sourceDistDir = [
            path.join(runtimeRoot, 'frontend', 'dist'),
            path.join(sourcePath, 'Software', 'Dashboard', 'dist')
        ].find(p => fs.existsSync(p));

        const sourceSeedProfilesDir = [
            path.join(runtimeRoot, 'backend', 'seed-profiles'),
            path.join(sourcePath, 'Software', 'Data', 'profiles')
        ].find(p => fs.existsSync(p));

        if (!sourceDistDir && !sourceServerJs) {
            return res.status(404).json({
                success: false,
                error: `No valid BrayDashy bundle found at ${sourcePath}. Make sure the folder is mounted and contains unraid-runtime/ or Software/.`
            });
        }

        // 1. Copy frontend dist if source and destination differ
        if (sourceDistDir && path.resolve(sourceDistDir) !== path.resolve(DIST_DIR)) {
            copyRecursiveSync(sourceDistDir, DIST_DIR);
        }

        // 2. Copy seed profiles (e.g. bri.json) without touching main config.json
        if (sourceSeedProfilesDir && fs.existsSync(sourceSeedProfilesDir)) {
            for (const f of fs.readdirSync(sourceSeedProfilesDir)) {
                if (f.endsWith('.json') && f !== 'config.example.json' && f !== 'config.json') {
                    const destProfile = path.join(PROFILES_DIR, f);
                    if (overwriteProfiles || !fs.existsSync(destProfile)) {
                        fs.copyFileSync(path.join(sourceSeedProfilesDir, f), destProfile);
                    }
                }
            }
        }

        // 3. Copy backend server.js if source and destination differ
        if (sourceServerJs && path.resolve(sourceServerJs) !== path.resolve(__filename)) {
            fs.copyFileSync(sourceServerJs, __filename);
        }

        let manifest = null;
        const manifestPath = path.join(sourcePath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            } catch (_) { }
        }

        res.json({
            success: true,
            sourcePath,
            manifest,
            restarting: restartServer && IS_UNRAID_DOCKER,
            message: `Pulled latest update from ${sourcePath}`
        });

        // If running inside Unraid Docker (with restart: unless-stopped), gracefully exit so Docker restarts with new server.js
        if (restartServer && IS_UNRAID_DOCKER) {
            setTimeout(() => {
                console.log('[BrayDashy] Restarting container to apply pulled local update...');
                process.exit(0);
            }, 600);
        }
    } catch (error) {
        console.error('[LocalSync Pull Error]:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// AI / AGENT CONTROL API
// Allows AI assistants or scripts to inspect and patch any profile live
// =========================================================================
app.get('/api/agent/state', (req, res) => {
    try {
        const profilesMap = {
            default: readConfig('default')
        };
        if (fs.existsSync(PROFILES_DIR)) {
            for (const f of fs.readdirSync(PROFILES_DIR)) {
                if (f.endsWith('.json')) {
                    const slug = f.replace(/\.json$/i, '');
                    profilesMap[slug] = readConfig(slug);
                }
            }
        }
        res.json({
            success: true,
            environment: IS_UNRAID_DOCKER ? 'unraid-docker' : (process.platform === 'win32' ? 'windows-dev' : 'linux'),
            configDir: CONFIG_DIR,
            distDir: DIST_DIR,
            profiles: profilesMap
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/agent/patch', (req, res) => {
    try {
        const profileSlug = req.body?.profile || 'default';
        const patch = req.body?.patch || {};
        const upsertApps = Array.isArray(req.body?.upsertApps) ? req.body.upsertApps : [];
        const removeAppIds = Array.isArray(req.body?.removeAppIds) ? req.body.removeAppIds : [];

        const current = readConfig(profileSlug);
        const updated = { ...current, ...patch };

        if (removeAppIds.length > 0 && Array.isArray(updated.apps)) {
            updated.apps = updated.apps.filter(a => !removeAppIds.includes(a.id));
        }

        if (upsertApps.length > 0) {
            const apps = Array.isArray(updated.apps) ? [...updated.apps] : [];
            for (const item of upsertApps) {
                const idx = apps.findIndex(a => a.id === item.id || a.name.toLowerCase() === String(item.name || '').toLowerCase());
                if (idx >= 0) {
                    apps[idx] = { ...apps[idx], ...item };
                } else {
                    apps.push({
                        id: item.id || `app-${Math.random().toString(36).substr(2, 6)}`,
                        iconType: 'icon',
                        icon: 'Box',
                        categoryId: updated.categories?.[0]?.id || 'default',
                        ...item
                    });
                }
            }
            updated.apps = apps;
        }

        const targetFile = resolveConfigFilePath(profileSlug);
        fs.writeFileSync(targetFile, JSON.stringify(updated, null, 2), 'utf8');

        res.json({
            success: true,
            profile: profileSlug,
            config: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generic route for any other app
app.get('/api/:appId/status', async (req, res) => {
    const { appId } = req.params;
    const config = readConfig(req.query.profile);
    const appInfo = config.apps.find(a => a.id === appId);
    if (!appInfo) return res.status(404).json({ error: 'App not found' });

    const name = appInfo.name.toLowerCase();

    if (name.includes('mealie')) return handleMealieStatus(req, res);
    if (name.includes('home assistant') || name.includes('homeassistant')) return handleHomeAssistantStatus(req, res);
    if (name.includes('sonarr')) return handleSonarrStatus(req, res);
    if (name.includes('radarr')) return handleRadarrStatus(req, res);
    if (name.includes('adguard')) return handleAdGuardStatus(req, res);
    if (name.includes('tautulli')) return handleTautulliStatus(req, res);
    if (name.includes('overseerr')) return handleOverseerrStatus(req, res);
    if (name.includes('speedtest')) return handleSpeedtestStatus(req, res);
    if (name.includes('pihole')) return handlePiholeStatus(req, res);
    if (name.includes('qbittorrent')) return handleQbittorrentStatus(req, res);
    if (name.includes('proxmox')) return handleProxmoxStatus(req, res);

    // Default simple reachability check
    const start = Date.now();
    try {
        const ping = await checkServiceReachable(appInfo.url);
        if (ping.online) {
            return res.json({ online: true, latency: ping.latency });
        }
        await axios.get(appInfo.url, { timeout: 3000, httpsAgent: insecureAgent });
        res.json({
            online: true,
            latency: Date.now() - start
        });
    } catch (error) {
        res.json({
            online: false,
            latency: null
        });
    }
});

// Start the server
app.get(['/bri', '/p/:profile'], (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT} (DIST_DIR=${DIST_DIR}, CONFIG_DIR=${CONFIG_DIR})`);
});
