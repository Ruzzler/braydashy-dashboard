import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Config, ProfileSummary } from '../types';

interface ConfigContextType {
    config: Config | null;
    previewConfig: Config | null;
    activeConfig: Config | null;
    setConfig: (config: Config) => void;
    setPreviewConfig: (config: Config | null) => void;
    saveConfig: (newConfig: Config) => Promise<boolean>;
    isLoading: boolean;
    isDark: boolean;
    setIsDark: (isDark: boolean) => void;
    toggleTheme: () => void;
    currentProfile: string;
    profiles: ProfileSummary[];
    switchProfile: (profileId: string) => void;
    pinnedProfile: string;
    pinProfileForBrowser: (profileId: string) => void;
    refreshProfiles: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

function getInitialProfileId(): string {
    if (typeof window === 'undefined') return 'default';
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('profile');
    if (fromQuery) return fromQuery;

    // Also support /bri pathname shortcut
    const pathSlug = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (pathSlug && pathSlug !== 'welcome') return pathSlug;

    const pinned = localStorage.getItem('braydashy_default_profile');
    if (pinned) return pinned;
    return 'default';
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfigState] = useState<Config | null>(null);
    const [previewConfig, setPreviewConfig] = useState<Config | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentProfile, setCurrentProfile] = useState<string>(getInitialProfileId);
    const [pinnedProfile, setPinnedProfile] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('braydashy_default_profile') || 'default';
        }
        return 'default';
    });
    const [profiles, setProfiles] = useState<ProfileSummary[]>([
        { id: 'default', name: 'Main Dashboard', experienceMode: 'sysadmin', sanctuaryTheme: 'editorial' },
        { id: 'bri', name: "Bri's Hub", experienceMode: 'sanctuary', sanctuaryTheme: 'editorial' }
    ]);

    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('braydashy_theme');
            const systemDark = typeof window.matchMedia === 'function'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : true;
            const initialDark = saved !== null ? saved === 'dark' : systemDark;

            if (initialDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
            return initialDark;
        }
        return true;
    });

    const activeConfig = previewConfig || config;

    useEffect(() => {
        localStorage.setItem('braydashy_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    useEffect(() => {
        const shouldUseDark = activeConfig?.experienceMode === 'sanctuary'
            ? activeConfig.sanctuaryTheme === 'velvet'
            : isDark;

        if (shouldUseDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
    }, [isDark, activeConfig?.experienceMode, activeConfig?.sanctuaryTheme]);

    const refreshProfiles = useCallback(async () => {
        try {
            const res = await fetch('/api/profiles');
            if (res.ok) {
                const data = await res.json();
                if (data.profiles) setProfiles(data.profiles);
            }
        } catch (_) {
            // fallback to default profile list
        }
    }, []);

    const loadProfileConfig = useCallback(async (profileId: string) => {
        setIsLoading(true);
        try {
            const query = profileId && profileId !== 'default' ? `?profile=${encodeURIComponent(profileId)}` : '';
            const res = await fetch(`/api/config${query}`);
            const data = await res.json();
            setConfigState(data);
        } catch (err) {
            console.error('Failed to load config', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfileConfig(currentProfile);
        refreshProfiles();
    }, [currentProfile, loadProfileConfig, refreshProfiles]);

    const switchProfile = useCallback((profileId: string) => {
        const normalized = profileId || 'default';
        setCurrentProfile(normalized);
        setPreviewConfig(null);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (normalized === 'default') {
                url.searchParams.delete('profile');
            } else {
                url.searchParams.set('profile', normalized);
            }
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    const pinProfileForBrowser = useCallback((profileId: string) => {
        const normalized = profileId || 'default';
        setPinnedProfile(normalized);
        if (typeof window !== 'undefined') {
            if (normalized === 'default') {
                localStorage.removeItem('braydashy_default_profile');
            } else {
                localStorage.setItem('braydashy_default_profile', normalized);
            }
        }
    }, []);

    const saveConfig = async (newConfig: Config) => {
        try {
            const query = currentProfile && currentProfile !== 'default' ? `?profile=${encodeURIComponent(currentProfile)}` : '';
            const res = await fetch(`/api/config${query}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            if (res.ok) {
                setConfigState(newConfig);
                setPreviewConfig(null);
                refreshProfiles();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to save config', e);
            return false;
        }
    };

    return (
        <ConfigContext.Provider value={{
            config,
            previewConfig,
            activeConfig,
            setConfig: setConfigState,
            setPreviewConfig,
            saveConfig,
            isLoading,
            isDark,
            setIsDark,
            toggleTheme: () => {
                const next = !isDark;
                setIsDark(next);
                if (next) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                }
            },
            currentProfile,
            profiles,
            switchProfile,
            pinnedProfile,
            pinProfileForBrowser,
            refreshProfiles
        }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
