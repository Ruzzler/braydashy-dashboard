export const SUPPORTED_APIS = [
    { id: 'sonarr', keyword: 'sonarr', apiKeyMap: 'SONARR_API_KEY', label: 'Sonarr API Key', widgets: [{ id: 'queue', label: 'Queue' }, { id: 'wanted', label: 'Wanted' }] },
    { id: 'radarr', keyword: 'radarr', apiKeyMap: 'RADARR_API_KEY', label: 'Radarr API Key', widgets: [{ id: 'queue', label: 'Queue' }, { id: 'wanted', label: 'Wanted' }] },
    { id: 'tautulli', keyword: 'tautulli', apiKeyMap: 'TAUTULLI_API_KEY', label: 'Tautulli API Key', widgets: [{ id: 'streams', label: 'Streams' }, { id: 'bandwidth', label: 'Bandwidth' }] },
    { id: 'adguard', keyword: 'adguard', apiKeyMap: 'ADGUARD_AUTH', label: 'AdGuard Auth (user:pass in base64)', widgets: [{ id: 'blocked_ratio', label: 'Blocked %' }, { id: 'total_queries', label: 'Total Queries' }] },
    { id: 'overseerr', keyword: 'overseerr', apiKeyMap: 'OVERSEERR_API_KEY', label: 'Overseerr API Key', widgets: [{ id: 'pending_requests', label: 'Pending' }, { id: 'approved_requests', label: 'Approved' }] },
    { id: 'speedtest', keyword: 'speedtest', apiKeyMap: 'SPEEDTEST_API_KEY', label: 'Speedtest Tracker API Key', widgets: [{ id: 'download', label: 'Download' }, { id: 'upload', label: 'Upload' }, { id: 'ping', label: 'Ping' }] },
    { id: 'pihole', keyword: 'pihole', apiKeyMap: 'PIHOLE_API_KEY', label: 'Pi-hole API Token / WEBPASSWORD', widgets: [{ id: 'ads_blocked', label: 'Ads Blocked' }, { id: 'ads_percentage', label: 'Block Ratio' }] },
    { id: 'qbittorrent', keyword: 'qbittorrent', apiKeyMap: 'QBITTORRENT_CREDS', label: 'qBittorrent (user:pass)', widgets: [{ id: 'dl_speed', label: 'DL Speed' }, { id: 'ul_speed', label: 'UL Speed' }] },
    { id: 'proxmox', keyword: 'proxmox', apiKeyMap: 'PROXMOX_TOKEN', label: 'Proxmox Token (USER@REALM!TOKEN=UUID)', widgets: [{ id: 'cpu', label: 'Avg CPU Load' }, { id: 'ram', label: 'Avg RAM Usage' }] }
];
