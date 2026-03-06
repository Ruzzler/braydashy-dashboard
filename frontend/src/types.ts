// Shared TypeScript interfaces for the entire frontend.
// Import from here rather than defining locally in components.

export interface AppStat {
    id: string;
    label: string;
    value: string;
    color: string;
}

export interface AppStatus {
    online: boolean;
    latency?: number;
    stats?: AppStat[] | null;
}

export interface AppItem {
    id: string;
    name: string;
    url: string;
    iconType: 'image' | 'icon';
    icon: string;
    categoryId: string;
    ignoreWorkspace?: boolean;
    widgetPreferences?: string[];
}

export interface Category {
    id: string;
    name: string;
    order: number;
}

export interface SearchProvider {
    id: string;
    name: string;
    url: string; // e.g. https://www.google.com/search?q={query}
    prefix: string; // e.g. !g
}

export interface Config {
    serverName: string;
    serverIcon?: string;
    backgroundStyle?: string;
    headerLayout?: 'classic' | 'minimalist' | 'split' | 'sidebar';
    themeColor?: 'zinc' | 'slate' | 'emerald' | 'blue' | 'rose' | 'violet' | 'amber';
    appCardStyle?: 'glass' | 'solid' | 'outline';
    appCardLayout?: 'grid' | 'list' | 'minimal';
    appCardSize?: 'small' | 'medium' | 'large';
    enableWeather?: boolean;
    enableWorkspaceMode?: boolean;
    weatherLocation?: string;
    weatherUnit?: string;
    categories: Category[];
    apps: AppItem[];
    glanceWidgets?: GlanceWidget[];
    showDesktopPet?: boolean;
    desktopPetType?: 'bmo' | 'coffee_mug' | 'latte_art' | 'french_press' | 'both';
    defaultSearchProvider?: string;
    searchProviders?: SearchProvider[];
    apiKeys?: Record<string, string>;
}

export interface GlanceWidget {
    id: string;
    type: 'clock' | 'system_stats' | 'weather' | 'rss' | 'calendar' | 'pet';
    label?: string;
    url?: string;
    size?: 'small' | 'medium' | 'large';
}
