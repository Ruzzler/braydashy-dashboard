import {
    Play, BarChart2, BookOpen, Tv, Film, Eye, Search, Download,
    Youtube, Home, Shield, Activity, Gauge, FolderOpen, Flame, Bot,
    LucideIcon
} from 'lucide-react';

export interface AppStat {
    id: string;
    label: string;
    value: string;
    color: string;
}

export interface AppStatus {
    online: boolean;
    stats?: AppStat[] | null;
}

export interface AppItem {
    id: string;
    name: string;
    url: string;
    iconUrl?: string;
    icon: LucideIcon;
    widgetPreferences?: string[];
    ignoreWorkspace?: boolean;
}

export interface GlanceWidget {
    id: string;
    type: 'rss' | 'system_stats' | 'clock';
    url?: string;
    label?: string;
}

export interface AppCategory {
    title: string;
    apps: AppItem[];
}

export const appCategories: AppCategory[] = [
    {
        title: "Media Delivery",
        apps: [
            { id: "plex", name: "Plex", url: "http://192.168.0.100:32400/web", iconUrl: "https://dashy.to/icons/plex.png", icon: Play },
            { id: "tautulli", name: "Tautulli", url: "http://192.168.0.100:8181", iconUrl: "https://dashy.to/icons/tautulli.png", icon: BarChart2 },
            { id: "audiobookshelf", name: "Audiobookshelf", url: "http://192.168.0.100:13378", iconUrl: "https://dashy.to/icons/audiobookshelf.png", icon: BookOpen },
        ]
    },
    {
        title: "Media Management",
        apps: [
            { id: "sonarr", name: "Sonarr", url: "http://192.168.0.100:8989", iconUrl: "https://dashy.to/icons/sonarr.png", icon: Tv },
            { id: "radarr", name: "Radarr", url: "http://192.168.0.100:7878", iconUrl: "https://dashy.to/icons/radarr.png", icon: Film },
            { id: "overseerr", name: "Overseerr", url: "http://192.168.0.100:5055", iconUrl: "https://dashy.to/icons/overseerr.png", icon: Eye },
            { id: "prowlarr", name: "Prowlarr", url: "http://192.168.0.100:9696", iconUrl: "https://dashy.to/icons/prowlarr.png", icon: Search },
        ]
    },
    {
        title: "Downloaders",
        apps: [
            { id: "qbittorrent", name: "qBittorrent", url: "http://192.168.0.100:8080", iconUrl: "https://dashy.to/icons/qbittorrent.png", icon: Download },
            { id: "sabnzbd", name: "SABnzbd", url: "http://192.168.0.100:8282", iconUrl: "https://dashy.to/icons/sabnzbd.png", icon: Download },
            { id: "transmission", name: "Transmission", url: "http://192.168.0.100:9091", iconUrl: "https://dashy.to/icons/transmission.png", icon: Download },
            { id: "metube", name: "MeTube", url: "http://192.168.0.100:8081", icon: Youtube },
        ]
    },
    {
        title: "Home & Infrastructure",
        apps: [
            { id: "homeassistant", name: "Home Assistant", url: "http://homeassistant.local:8123", iconUrl: "https://dashy.to/icons/home-assistant.png", icon: Home },
            { id: "adguard", name: "AdGuard Home", url: "http://192.168.0.100:3000", iconUrl: "https://dashy.to/icons/adguard-home.png", icon: Shield },
            { id: "uptimekuma", name: "Uptime Kuma", url: "http://192.168.0.100:3001", iconUrl: "https://dashy.to/icons/uptime-kuma.png", icon: Activity },
            { id: "speedtest", name: "Speedtest Tracker", url: "http://192.168.0.100:88", icon: Gauge },
        ]
    },
    {
        title: "Tools & Utilities",
        apps: [
            { id: "krusader", name: "Krusader", url: "http://192.168.0.100:6080", icon: FolderOpen },
            { id: "flaresolverr", name: "Flaresolverr", url: "http://192.168.0.100:8191", icon: Flame },
            { id: "agregarr", name: "agregarr", url: "http://192.168.0.100:7171", icon: Bot },
        ]
    }
];
