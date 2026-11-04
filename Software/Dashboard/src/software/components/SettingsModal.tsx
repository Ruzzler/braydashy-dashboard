import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/software/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/software/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/software/components/ui/card';
import { Input } from '@/software/components/ui/input';
import { Label } from '@/software/components/ui/label';
import {
    Settings,
    Save,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    Loader2,
    Sparkles,
    Download,
    Upload,
    Layout,
    Boxes,
    ListFilter,
    Users,
    Pin,
    Home,
    Terminal,
    Check
} from 'lucide-react';
import { ThemePreview, SanctuaryMiniPreview } from './ThemePreview';
import { Config, AppItem, GlanceWidget, SanctuaryTheme } from '../types';
import { SUPPORTED_APIS, COMMON_HA_ENTITIES } from '../constants';
import { formatIconName } from '../lib/utils';
import { useConfig } from '../context/ConfigContext';

const QUICK_ICON_CHOICES = [
    'UtensilsCrossed',
    'Box',
    'FileCheck2',
    'ShieldCheck',
    'Film',
    'Headphones',
    'Play',
    'Home',
    'ShoppingBag',
    'BookOpen',
    'Camera',
    'Heart'
];

export function SettingsModal({
    onRunSetup,
    triggerLabel
}: {
    onRunSetup?: () => void;
    triggerLabel?: string;
}) {
    const {
        config,
        saveConfig,
        setPreviewConfig,
        currentProfile,
        profiles,
        switchProfile,
        pinnedProfile,
        pinProfileForBrowser,
        refreshProfiles
    } = useConfig();

    const [open, setOpen] = useState(false);
    const [localConfig, setLocalConfig] = useState<Config>(
        JSON.parse(JSON.stringify(config || { categories: [], apps: [], glanceWidgets: [] }))
    );
    const [settingsViewMode, setSettingsViewMode] = useState<'home' | 'sysadmin'>('home');
    const [expandedHomeAppId, setExpandedHomeAppId] = useState<string | null>(null);
    const [testStatuses, setTestStatuses] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'failed' }>({});
    const [dashboardSubTab, setDashboardSubTab] = useState<'apps' | 'widgets' | 'categories'>('apps');
    const [newProfileName, setNewProfileName] = useState('');
    const [localSyncPath, setLocalSyncPath] = useState('');
    const [localSyncInfo, setLocalSyncInfo] = useState<{
        environment?: string;
        reachable?: boolean;
        manifest?: { version?: string; syncedAt?: string };
        busy?: boolean;
        message?: string;
        error?: string;
    }>({});

    const checkLocalSyncStatus = async (customPath?: string) => {
        try {
            const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
            const res = await fetch(`/api/local-sync/status${q}`);
            if (res.ok) {
                const data = await res.json();
                if (!customPath && data.targetPath) {
                    setLocalSyncPath(data.targetPath);
                }
                setLocalSyncInfo(prev => ({
                    ...prev,
                    environment: data.environment,
                    reachable: data.reachable,
                    manifest: data.manifest
                }));
            }
        } catch (_) { }
    };

    const handleLocalSyncPush = async () => {
        setLocalSyncInfo(prev => ({ ...prev, busy: true, message: undefined, error: undefined }));
        try {
            const res = await fetch('/api/local-sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPath: localSyncPath, includeBriProfile: true })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setLocalSyncInfo(prev => ({
                    ...prev,
                    busy: false,
                    reachable: true,
                    manifest: data.manifest,
                    message: data.message
                }));
            } else {
                setLocalSyncInfo(prev => ({
                    ...prev,
                    busy: false,
                    error: data.error || 'Failed to push build to Unraid share'
                }));
            }
        } catch (err: any) {
            setLocalSyncInfo(prev => ({ ...prev, busy: false, error: err.message }));
        }
    };

    const handleLocalSyncPull = async () => {
        setLocalSyncInfo(prev => ({ ...prev, busy: true, message: undefined, error: undefined }));
        try {
            const res = await fetch('/api/local-sync/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourcePath: localSyncPath,
                    overwriteProfiles: false,
                    restartServer: true
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setLocalSyncInfo(prev => ({
                    ...prev,
                    busy: false,
                    manifest: data.manifest,
                    message: `${data.message}. Reloading dashboard...`
                }));
                await refreshProfiles();
                setTimeout(() => window.location.reload(), 1200);
            } else {
                setLocalSyncInfo(prev => ({
                    ...prev,
                    busy: false,
                    error: data.error || 'Failed to pull from local path'
                }));
            }
        } catch (err: any) {
            setLocalSyncInfo(prev => ({ ...prev, busy: false, error: err.message }));
        }
    };

    useEffect(() => {
        if (open && config) {
            const copy = JSON.parse(JSON.stringify(config));
            setLocalConfig(copy);
            setSettingsViewMode(copy.experienceMode === 'sanctuary' ? 'home' : 'sysadmin');
            checkLocalSyncStatus();
        }
    }, [open, config]);

    // Live-preview theme changes on the page behind the modal
    const updateLocalAndPreview = (updater: (prev: Config) => Config) => {
        setLocalConfig(prev => {
            const next = updater(prev);
            setPreviewConfig(next);
            return next;
        });
    };

    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            setPreviewConfig(null);
        }
        setOpen(nextOpen);
    };

    const handleSave = async () => {
        const success = await saveConfig(localConfig);
        if (success) {
            setOpen(false);
        }
    };

    const handleSwitchMode = (mode: 'home' | 'sysadmin') => {
        setSettingsViewMode(mode);
        setLocalConfig(prev => {
            const next: Config = {
                ...prev,
                experienceMode: mode === 'home' ? 'sanctuary' : 'sysadmin',
                showTelemetry: mode === 'sysadmin'
            };
            setPreviewConfig(next);
            saveConfig(next);
            return next;
        });
    };

    const handleCreateProfile = async () => {
        const name = newProfileName.trim();
        if (!name) return;
        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    greetingName: name,
                    experienceMode: 'sanctuary',
                    sanctuaryTheme: 'editorial'
                })
            });
            const data = await res.json();
            if (data.success && data.profileId) {
                setNewProfileName('');
                await refreshProfiles();
                switchProfile(data.profileId);
            }
        } catch (err) {
            console.error('Failed to create profile', err);
        }
    };

    const handleTestAPI = async (apiId: string) => {
        setTestStatuses(prev => ({ ...prev, [apiId]: 'testing' }));
        try {
            const vals = getIntegrationValue(apiId, '');
            const url = vals.url;
            if (!url && apiId !== 'homeassistant') throw new Error('No URL configured');

            if (apiId === 'homeassistant') {
                const res = await fetch(`/api/homeassistant/status?profile=${encodeURIComponent(currentProfile)}`);
                const data = await res.json();
                if (data.online) {
                    setTestStatuses(prev => ({ ...prev, [apiId]: 'success' }));
                    handleSave();
                } else {
                    throw new Error('Home Assistant unreachable');
                }
                return;
            }

            const app = localConfig.apps?.find(a =>
                a.id === apiId || a.name.toLowerCase().includes(apiId.toLowerCase())
            );

            if (!app) throw new Error('Matching app not found');

            const response = await fetch(`/api/${app.id}/status?profile=${encodeURIComponent(currentProfile)}`);
            const data = await response.json();

            if (data.online) {
                setTestStatuses(prev => ({ ...prev, [apiId]: 'success' }));
                handleSave();
            } else {
                throw new Error('Connection failed');
            }
        } catch (e: any) {
            setTestStatuses(prev => ({ ...prev, [apiId]: 'failed' }));
            console.error(`Test failed for ${apiId}:`, e.message);
        }
    };

    // Category Management
    const handleUpdateCategoryName = (id: string, name: string) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            categories: prev.categories.map(c => c.id === id ? { ...c, name } : c)
        }));
    };

    const handleUpdateCategoryOrder = (id: string, order: number) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            categories: prev.categories.map(c => c.id === id ? { ...c, order } : c)
        }));
    };

    const handleRemoveCategory = (id: string) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            categories: prev.categories.filter(c => c.id !== id)
        }));
    };

    const handleAddCategory = () => {
        const id = Math.random().toString(36).substr(2, 9);
        updateLocalAndPreview(prev => ({
            ...prev,
            categories: [...prev.categories, { id, name: 'New Category', order: prev.categories.length }]
        }));
    };

    // App Management
    const handleAddApp = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newApp: AppItem = {
            id,
            name: 'New App',
            url: 'http://192.168.0.100:',
            iconType: 'icon',
            icon: 'Box',
            tag: 'Home App',
            description: '',
            categoryId: localConfig.categories[0]?.id || 'default'
        };
        updateLocalAndPreview(prev => ({
            ...prev,
            apps: [...(prev.apps || []), newApp]
        }));
        setExpandedHomeAppId(id);
    };

    const handleUpdateApp = (id: string, updates: Partial<AppItem>) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            apps: (prev.apps || []).map(a => a.id === id ? { ...a, ...updates } : a)
        }));
    };

    const handleRemoveApp = (id: string) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            apps: (prev.apps || []).filter(a => a.id !== id)
        }));
    };

    // Simple 1-click Home Assistant Glance Toggle for Home Mode
    const isHaPresetEnabled = (entityId: string) => {
        return (localConfig.glanceWidgets || []).some(w => w.entityId === entityId);
    };

    const toggleHaPresetWidget = (preset: { entityId: string; label: string; icon: string }) => {
        setLocalConfig(prev => {
            const exists = (prev.glanceWidgets || []).some(w => w.entityId === preset.entityId);
            const nextWidgets = exists
                ? (prev.glanceWidgets || []).filter(w => w.entityId !== preset.entityId)
                : [
                    ...(prev.glanceWidgets || []),
                    {
                        id: `ha-${Math.random().toString(36).substr(2, 6)}`,
                        type: 'ha_entity' as const,
                        label: preset.label,
                        entityId: preset.entityId,
                        icon: preset.icon,
                        size: 'medium' as const
                    }
                ];
            const next = { ...prev, glanceWidgets: nextWidgets };
            setPreviewConfig(next);
            saveConfig(next);
            return next;
        });
    };

    const resetRecommendedHaWidgets = () => {
        const defaultIds = [
            'calendar.mealie_dinner',
            'todo.mealie_groceries',
            'weather.forecast_home',
            'climate.thermostat_ecobee_premium_rumpusroom',
            'lock.side_entry_lock_schlage_be469zp_sideentry',
            'input_datetime.dogs_last_fed_time'
        ];
        const nextWidgets: GlanceWidget[] = COMMON_HA_ENTITIES
            .filter(p => defaultIds.includes(p.entityId))
            .map(p => ({
                id: `ha-${Math.random().toString(36).substr(2, 6)}`,
                type: 'ha_entity',
                label: p.label,
                entityId: p.entityId,
                icon: p.icon,
                size: 'medium'
            }));
        setLocalConfig(prev => {
            const next = { ...prev, glanceWidgets: nextWidgets };
            setPreviewConfig(next);
            saveConfig(next);
            return next;
        });
    };

    // Widget Management
    const handleAddWidget = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const newWidget: GlanceWidget = {
            id,
            type: localConfig.experienceMode === 'sanctuary' ? 'ha_entity' : 'clock',
            label: localConfig.experienceMode === 'sanctuary' ? 'Main Floor Climate' : 'New Widget',
            entityId: localConfig.experienceMode === 'sanctuary' ? 'climate.thermostat_ecobee_premium_rumpusroom' : '',
            icon: 'Thermometer',
            size: 'medium'
        };
        updateLocalAndPreview(prev => ({
            ...prev,
            glanceWidgets: [...(prev.glanceWidgets || []), newWidget]
        }));
    };

    const handleUpdateWidget = (id: string, updates: Partial<GlanceWidget>) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            glanceWidgets: (prev.glanceWidgets || []).map(w => w.id === id ? { ...w, ...updates } : w)
        }));
    };

    const handleRemoveWidget = (id: string) => {
        updateLocalAndPreview(prev => ({
            ...prev,
            glanceWidgets: (prev.glanceWidgets || []).filter(w => w.id !== id)
        }));
    };

    const handleExportConfig = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localConfig, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `braydashy-${currentProfile}-config.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                updateLocalAndPreview(() => imported);
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };

    const getIntegrationValue = (id: string, apiKeyMap: string) => {
        if (id === 'homeassistant') {
            return {
                url: localConfig.apiKeys?.HOME_ASSISTANT_URL || 'http://192.168.0.100:8123',
                token: localConfig.apiKeys?.[apiKeyMap] || ''
            };
        }
        const app = localConfig.apps?.find(a => a.id === id || a.name.toLowerCase().includes(id.toLowerCase()));
        const token = localConfig.apiKeys?.[apiKeyMap] || '';
        return { url: app?.url || '', token };
    };

    const updateIntegration = (id: string, apiKeyMap: string, field: 'url' | 'token', value: string) => {
        if (field === 'token') {
            setLocalConfig(prev => ({
                ...prev,
                apiKeys: { ...(prev.apiKeys || {}), [apiKeyMap]: value }
            }));
        } else if (id === 'homeassistant') {
            setLocalConfig(prev => ({
                ...prev,
                apiKeys: { ...(prev.apiKeys || {}), HOME_ASSISTANT_URL: value }
            }));
        } else {
            setLocalConfig(prev => {
                const apps = [...(prev.apps || [])];
                const index = apps.findIndex(a => a.id === id || a.name.toLowerCase().includes(id.toLowerCase()));
                if (index !== -1) {
                    apps[index] = { ...apps[index], url: value };
                }
                return { ...prev, apps };
            });
        }
    };

    const modalThemeClass = (settingsViewMode === 'home' || localConfig.experienceMode === 'sanctuary')
        ? `modal-theme-${localConfig.sanctuaryTheme || 'editorial'} font-jakarta`
        : '';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                {triggerLabel ? (
                    <button className="h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-2 border border-current/15 bg-white/85 dark:bg-white/10 text-xs font-semibold leading-none hover:bg-white dark:hover:bg-white/15 transition-all shadow-sm">
                        <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{triggerLabel}</span>
                    </button>
                ) : (
                    <button className="flex-shrink-0 bg-card border border-border text-muted-foreground w-11 h-11 rounded-full flex items-center justify-center transition-all hover:text-foreground hover:border-muted-foreground hover:rotate-90 hover:scale-110 backdrop-blur-md shadow-sm">
                        <Settings className="w-5 h-5" />
                    </button>
                )}
            </DialogTrigger>

            <DialogContent className={`${modalThemeClass} max-w-5xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background/95 backdrop-blur-xl border-border/70 shadow-2xl text-foreground transition-colors duration-300`}>
                {/* Top Modal Header with Instant Home Mode vs Sysadmin Mode Switcher */}
                <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-secondary/40">
                    <div className="flex flex-wrap items-center justify-between gap-4 pr-6">
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    {settingsViewMode === 'home' ? 'Customize Home Hub' : 'Sysadmin & Advanced Settings'}
                                </DialogTitle>
                                <select
                                    value={currentProfile}
                                    onChange={(e) => switchProfile(e.target.value)}
                                    title="Switch Profile"
                                    className="text-xs font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25 cursor-pointer focus:outline-none"
                                >
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id} className="bg-background text-foreground">
                                            Profile: {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <DialogDescription className="text-muted-foreground mt-1">
                                {settingsViewMode === 'home'
                                    ? 'Pick a visual theme, personalize your greeting, and manage your everyday apps in seconds.'
                                    : 'Configure server telemetry, multi-profile routing, API integrations, and advanced grid layouts.'}
                            </DialogDescription>
                        </div>

                        {/* Mode Flip Pill */}
                        <div className="flex items-center bg-card p-1 rounded-xl border border-border shadow-sm">
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('home')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                                    settingsViewMode === 'home'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>Home Mode</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSwitchMode('sysadmin')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                                    settingsViewMode === 'sysadmin'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Sysadmin Mode</span>
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                {/* ================================================================= */}
                {/* VIEW 1: SIMPLE, TABBED HOME MODE SETTINGS                         */}
                {/* ================================================================= */}
                {settingsViewMode === 'home' ? (
                    <Tabs defaultValue="theme" className="flex-1 overflow-hidden flex flex-col">
                        <div className="px-6 py-2.5 border-b border-border/60 bg-secondary/20">
                            <TabsList className="bg-transparent gap-2 h-auto p-0">
                                <TabsTrigger
                                    value="theme"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Icons.Palette className="w-3.5 h-3.5" />
                                    <span>Theme & Greeting</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="apps"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Icons.LayoutGrid className="w-3.5 h-3.5" />
                                    <span>My Apps ({(localConfig.apps || []).length})</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="status"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Icons.Activity className="w-3.5 h-3.5" />
                                    <span>Home Status ({(localConfig.glanceWidgets || []).length})</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border">
                            {/* HOME TAB 1: THEME & GREETING */}
                            <TabsContent value="theme" className="mt-0 space-y-5 animate-in fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {(['editorial', 'glass', 'bento', 'velvet'] as SanctuaryTheme[]).map(themeKey => (
                                        <SanctuaryMiniPreview
                                            key={themeKey}
                                            theme={themeKey}
                                            greetingName={localConfig.greetingName || 'Bri'}
                                            selected={(localConfig.sanctuaryTheme || 'editorial') === themeKey}
                                            onSelect={() => {
                                                setLocalConfig(prev => {
                                                    const next: Config = {
                                                        ...prev,
                                                        experienceMode: 'sanctuary',
                                                        sanctuaryTheme: themeKey
                                                    };
                                                    setPreviewConfig(next);
                                                    saveConfig(next);
                                                    return next;
                                                });
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs font-bold">Your Name (for Greeting)</Label>
                                        <Input
                                            value={localConfig.greetingName || ''}
                                            onChange={(e) => updateLocalAndPreview(prev => ({ ...prev, greetingName: e.target.value }))}
                                            placeholder="e.g. Bri"
                                            className="bg-background h-9"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs font-bold">Page Title</Label>
                                        <Input
                                            value={localConfig.serverName || ''}
                                            onChange={(e) => updateLocalAndPreview(prev => ({
                                                ...prev,
                                                serverName: e.target.value,
                                                portalSubtitle: e.target.value
                                            }))}
                                            placeholder="e.g. Home Hub"
                                            className="bg-background h-9"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs font-bold">Quick Search Shortcuts</Label>
                                        <Input
                                            value={(localConfig.quickSearchChips || []).join(', ')}
                                            onChange={(e) => updateLocalAndPreview(prev => ({
                                                ...prev,
                                                quickSearchChips: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                            }))}
                                            placeholder="Dinner ideas, 3D models, Weather"
                                            className="bg-background h-9"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* HOME TAB 2: MY APPS (COMPACT ROWS WITH EXPANDABLE DETAILS) */}
                            <TabsContent value="apps" className="mt-0 space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">Your Apps & Links</h3>
                                        <p className="text-xs text-muted-foreground">Click an app's icon or "Details" button to change its icon and description.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddApp}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Add App
                                    </button>
                                </div>

                                <div className="grid gap-2.5">
                                    {(localConfig.apps || []).map(app => {
                                        const iconKey = formatIconName(app.icon || 'Box');
                                        const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || Icons.Box;
                                        const isExpanded = expandedHomeAppId === app.id;

                                        return (
                                            <div key={app.id} className="p-3 rounded-2xl border border-border/70 bg-card shadow-sm flex flex-col gap-2.5 transition-all">
                                                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1.3fr_1fr_auto_auto] gap-2.5 items-center">
                                                    {/* Clickable Icon Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedHomeAppId(isExpanded ? null : app.id)}
                                                        title="Click to change icon & description"
                                                        className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform"
                                                    >
                                                        <IconComp className="w-5 h-5" />
                                                    </button>

                                                    <Input
                                                        value={app.name}
                                                        onChange={(e) => handleUpdateApp(app.id, { name: e.target.value })}
                                                        placeholder="App Name"
                                                        className="h-9 text-sm font-semibold bg-background"
                                                    />

                                                    <Input
                                                        value={app.url}
                                                        onChange={(e) => handleUpdateApp(app.id, { url: e.target.value })}
                                                        placeholder="http://192.168.0.100:..."
                                                        className="h-9 text-sm bg-background"
                                                    />

                                                    <select
                                                        value={app.categoryId}
                                                        onChange={(e) => handleUpdateApp(app.id, { categoryId: e.target.value })}
                                                        className="h-9 text-xs font-medium bg-background border border-border rounded-md px-2.5 text-foreground"
                                                    >
                                                        {localConfig.categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedHomeAppId(isExpanded ? null : app.id)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                            isExpanded
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-secondary/60 border-border text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        {isExpanded ? 'Done' : 'Icon & Info'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveApp(app.id)}
                                                        title="Remove App"
                                                        className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {isExpanded && (
                                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 pt-2.5 border-t border-border/50 animate-in fade-in">
                                                        <div className="grid gap-1">
                                                            <Label className="text-xs text-muted-foreground">Category Badge Label</Label>
                                                            <Input
                                                                value={app.tag || ''}
                                                                onChange={(e) => handleUpdateApp(app.id, { tag: e.target.value })}
                                                                placeholder="e.g. Kitchen & Recipes"
                                                                className="h-8 text-xs bg-background"
                                                            />
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <Label className="text-xs text-muted-foreground">Short Card Description</Label>
                                                            <Input
                                                                value={app.description || ''}
                                                                onChange={(e) => handleUpdateApp(app.id, { description: e.target.value })}
                                                                placeholder="What is this app for?"
                                                                className="h-8 text-xs bg-background"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2 grid gap-1.5">
                                                            <Label className="text-xs text-muted-foreground">Choose Icon</Label>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {QUICK_ICON_CHOICES.map(ic => {
                                                                    const ChoiceComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[ic] || Icons.Box;
                                                                    const isActive = app.icon === ic;
                                                                    return (
                                                                        <button
                                                                            key={ic}
                                                                            type="button"
                                                                            onClick={() => handleUpdateApp(app.id, { icon: ic, iconType: 'icon' })}
                                                                            title={ic}
                                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                                                                                isActive
                                                                                    ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-sm'
                                                                                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                                                                            }`}
                                                                        >
                                                                            <ChoiceComp className="w-4 h-4" />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* HOME TAB 3: AT-A-GLANCE HOME STATUS */}
                            <TabsContent value="status" className="mt-0 space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">At-a-Glance Home Status</h3>
                                        <p className="text-xs text-muted-foreground">Click any card below to immediately turn Home Assistant status pills and action cards on or off.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetRecommendedHaWidgets}
                                        className="px-3 py-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground transition-colors flex-shrink-0"
                                    >
                                        Restore Defaults
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                    {COMMON_HA_ENTITIES.map(preset => {
                                        const active = isHaPresetEnabled(preset.entityId);
                                        const isActionCard = preset.entityId === 'calendar.mealie_dinner' || preset.entityId === 'todo.mealie_groceries';
                                        const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[preset.icon] || Icons.Activity;
                                        return (
                                            <button
                                                key={preset.entityId}
                                                type="button"
                                                onClick={() => toggleHaPresetWidget(preset)}
                                                className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                                                    active
                                                        ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                                                        : 'border-border/70 bg-card text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                                                    }`}>
                                                        <IconComp className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold truncate">{preset.label}</div>
                                                        <div className="text-[11px] opacity-70 truncate">
                                                            {active ? 'Shown on page' : 'Hidden'} · {isActionCard ? 'Action Card' : 'Status Pill'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                    active ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                                                }`}>
                                                    {active && <Check className="w-3 h-3" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    /* ================================================================= */
                    /* VIEW 2: SYSADMIN / ADVANCED MODE SETTINGS                         */
                    /* ================================================================= */
                    <Tabs defaultValue="appearance" className="flex-1 overflow-hidden flex flex-col">
                        <div className="px-6 py-2 border-b border-border/50 bg-secondary/10">
                            <TabsList className="bg-transparent gap-2 h-auto p-0">
                                <TabsTrigger value="appearance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg transition-all">Themes & Previews</TabsTrigger>
                                <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg transition-all">Apps & Widgets</TabsTrigger>
                                <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg transition-all">Profiles & Backup</TabsTrigger>
                                <TabsTrigger value="integrations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg transition-all">API Integrations</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 pt-4 scrollbar-thin scrollbar-thumb-border">
                            {/* APPEARANCE TAB WITH VISUAL PREVIEW BOXES FOR ALL OPTIONS */}
                            <TabsContent value="appearance" className="mt-0 space-y-6 animate-in fade-in slide-in-from-left-4">
                                <ThemePreview config={localConfig} />

                                {/* Home Mode Themes Preview Grid (Available from Sysadmin view too) */}
                                <Card className="border-border/50 bg-card/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Home Mode Themes (Click to Preview & Switch)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {(['editorial', 'glass', 'bento', 'velvet'] as SanctuaryTheme[]).map(themeKey => (
                                            <SanctuaryMiniPreview
                                                key={themeKey}
                                                theme={themeKey}
                                                greetingName={localConfig.greetingName || 'Bri'}
                                                selected={localConfig.experienceMode === 'sanctuary' && localConfig.sanctuaryTheme === themeKey}
                                                onSelect={() => updateLocalAndPreview(prev => ({
                                                    ...prev,
                                                    experienceMode: 'sanctuary',
                                                    sanctuaryTheme: themeKey
                                                }))}
                                            />
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Sysadmin Theme Colors with Visual Mini-Card Previews */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="border-border/50 bg-card/50">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sysadmin Accent Palette</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {([
                                                { id: 'zinc', label: 'Zinc', hex: '#27272a' },
                                                { id: 'slate', label: 'Slate', hex: '#475569' },
                                                { id: 'emerald', label: 'Emerald', hex: '#10b981' },
                                                { id: 'blue', label: 'Blue', hex: '#3b82f6' },
                                                { id: 'rose', label: 'Rose', hex: '#f43f5e' },
                                                { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
                                                { id: 'amber', label: 'Amber', hex: '#f59e0b' }
                                            ] as const).map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => updateLocalAndPreview(prev => ({ ...prev, experienceMode: 'sysadmin', themeColor: c.id }))}
                                                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                                                        localConfig.themeColor === c.id && localConfig.experienceMode !== 'sanctuary'
                                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                                                            : 'border-border/60 bg-background/40 hover:bg-background/80'
                                                    }`}
                                                >
                                                    <div className="w-full h-7 rounded-lg flex items-center px-2 gap-1.5 bg-zinc-900 border border-white/10">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                                                        <span className="h-1.5 w-10 rounded-full" style={{ backgroundColor: c.hex, opacity: 0.7 }} />
                                                    </div>
                                                    <span className="text-xs font-bold">{c.label}</span>
                                                </button>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* Background Style Visual Previews */}
                                    <Card className="border-border/50 bg-card/50">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sysadmin Background Surface</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {([
                                                { id: 'orbs', label: 'Animated Orbs' },
                                                { id: 'themed_orbs', label: 'Themed Orbs' },
                                                { id: 'grid', label: 'Cyber Grid' },
                                                { id: 'dots', label: 'Modern Dots' },
                                                { id: 'none', label: 'Solid Surface' }
                                            ] as const).map(bg => (
                                                <button
                                                    key={bg.id}
                                                    type="button"
                                                    onClick={() => updateLocalAndPreview(prev => ({ ...prev, experienceMode: 'sysadmin', backgroundStyle: bg.id }))}
                                                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                                                        (localConfig.backgroundStyle || 'orbs') === bg.id && localConfig.experienceMode !== 'sanctuary'
                                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                                                            : 'border-border/60 bg-background/40 hover:bg-background/80'
                                                    }`}
                                                >
                                                    <div className="w-full h-9 rounded-lg bg-zinc-950 border border-white/10 relative overflow-hidden flex items-center justify-center">
                                                        {bg.id === 'orbs' && (
                                                            <>
                                                                <span className="w-6 h-6 rounded-full bg-indigo-500/50 blur-sm absolute -top-1 -left-1" />
                                                                <span className="w-6 h-6 rounded-full bg-pink-500/50 blur-sm absolute -bottom-1 -right-1" />
                                                            </>
                                                        )}
                                                        {bg.id === 'themed_orbs' && (
                                                            <span className="w-8 h-8 rounded-full bg-primary/50 blur-sm" />
                                                        )}
                                                        {bg.id === 'grid' && (
                                                            <div className="inset-0 absolute bg-grid-pattern opacity-30 text-white" />
                                                        )}
                                                        {bg.id === 'dots' && (
                                                            <div className="inset-0 absolute bg-dots-pattern opacity-40 text-white" />
                                                        )}
                                                        <span className="text-[10px] text-white/80 font-mono relative z-10">{bg.label.split(' ')[0]}</span>
                                                    </div>
                                                    <span className="text-xs font-bold">{bg.label}</span>
                                                </button>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* Card Style Visual Previews */}
                                    <Card className="border-border/50 bg-card/50">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sysadmin Card Style</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-3 gap-2.5">
                                            {(['glass', 'solid', 'outline'] as const).map(style => (
                                                <button
                                                    key={style}
                                                    type="button"
                                                    onClick={() => updateLocalAndPreview(prev => ({ ...prev, appCardStyle: style }))}
                                                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                                                        localConfig.appCardStyle === style
                                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                                                            : 'border-border/60 bg-background/40 hover:bg-background/80'
                                                    }`}
                                                >
                                                    <div className={`w-full h-8 rounded-lg flex items-center px-2 gap-1.5 ${
                                                        style === 'glass'
                                                            ? 'bg-white/10 backdrop-blur-md border border-white/20'
                                                            : style === 'solid'
                                                                ? 'bg-card border border-border shadow-sm'
                                                                : 'bg-transparent border-2 border-foreground/40'
                                                    }`}>
                                                        <span className="w-3 h-3 rounded bg-primary/60" />
                                                        <span className="w-8 h-1.5 rounded bg-foreground/40" />
                                                    </div>
                                                    <span className="text-xs font-bold capitalize">{style}</span>
                                                </button>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* Card Layout Visual Previews */}
                                    <Card className="border-border/50 bg-card/50">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sysadmin Grid Density</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-3 gap-2.5">
                                            {(['grid', 'list', 'minimal'] as const).map(layout => (
                                                <button
                                                    key={layout}
                                                    type="button"
                                                    onClick={() => updateLocalAndPreview(prev => ({ ...prev, appCardLayout: layout }))}
                                                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                                                        localConfig.appCardLayout === layout
                                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                                                            : 'border-border/60 bg-background/40 hover:bg-background/80'
                                                    }`}
                                                >
                                                    <div className="w-full h-8 rounded-lg bg-secondary/40 p-1.5 flex items-center justify-center gap-1">
                                                        {layout === 'grid' && (
                                                            <div className="grid grid-cols-2 gap-1 w-full h-full">
                                                                <span className="bg-primary/50 rounded-sm" />
                                                                <span className="bg-primary/50 rounded-sm" />
                                                            </div>
                                                        )}
                                                        {layout === 'list' && (
                                                            <div className="flex flex-col gap-1 w-full">
                                                                <span className="h-1.5 w-full bg-primary/50 rounded-sm" />
                                                                <span className="h-1.5 w-full bg-primary/50 rounded-sm" />
                                                            </div>
                                                        )}
                                                        {layout === 'minimal' && (
                                                            <div className="flex gap-1">
                                                                <span className="w-3 h-3 bg-primary/50 rounded-sm" />
                                                                <span className="w-3 h-3 bg-primary/50 rounded-sm" />
                                                                <span className="w-3 h-3 bg-primary/50 rounded-sm" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold capitalize">{layout}</span>
                                                </button>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* APPS, WIDGETS & CATEGORIES TAB */}
                            <TabsContent value="dashboard" className="mt-0 flex gap-6 animate-in fade-in slide-in-from-left-4">
                                <div className="w-48 flex flex-col gap-1 border-r border-border/50 pr-4">
                                    <button
                                        onClick={() => setDashboardSubTab('apps')}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${dashboardSubTab === 'apps' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                                    >
                                        <Boxes className="w-4 h-4" /> Apps
                                    </button>
                                    <button
                                        onClick={() => setDashboardSubTab('widgets')}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${dashboardSubTab === 'widgets' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                                    >
                                        <Layout className="w-4 h-4" /> HA & Widgets
                                    </button>
                                    <button
                                        onClick={() => setDashboardSubTab('categories')}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${dashboardSubTab === 'categories' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                                    >
                                        <ListFilter className="w-4 h-4" /> Categories
                                    </button>
                                </div>

                                <div className="flex-1 space-y-4">
                                    {dashboardSubTab === 'apps' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold flex items-center gap-2.5">
                                                    <Boxes className="w-5 h-5 text-primary" /> Application Cards
                                                </h3>
                                                <button
                                                    onClick={handleAddApp}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all text-xs font-bold ring-1 ring-primary/20"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Application
                                                </button>
                                            </div>

                                            <div className="grid gap-3">
                                                {(localConfig.apps || []).map(app => (
                                                    <Card key={app.id} className="border-border/40 bg-card/30 overflow-hidden group">
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1fr_1fr_40px] gap-3 items-center">
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Name</Label>
                                                                    <Input
                                                                        value={app.name}
                                                                        onChange={(e) => handleUpdateApp(app.id, { name: e.target.value })}
                                                                        className="h-8 text-sm"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">URL</Label>
                                                                    <Input
                                                                        value={app.url}
                                                                        onChange={(e) => handleUpdateApp(app.id, { url: e.target.value })}
                                                                        className="h-8 text-sm font-mono"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Lucide Icon / URL</Label>
                                                                    <Input
                                                                        value={app.icon}
                                                                        onChange={(e) => handleUpdateApp(app.id, {
                                                                            icon: e.target.value,
                                                                            iconType: e.target.value.startsWith('http') ? 'image' : 'icon'
                                                                        })}
                                                                        placeholder="UtensilsCrossed, Box..."
                                                                        className="h-8 text-sm"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Category</Label>
                                                                    <select
                                                                        value={app.categoryId}
                                                                        onChange={(e) => handleUpdateApp(app.id, { categoryId: e.target.value })}
                                                                        className="h-8 text-sm bg-background border border-border rounded-md px-2 text-foreground"
                                                                    >
                                                                        {localConfig.categories.map(cat => (
                                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveApp(app.id)}
                                                                    className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors mt-4 md:mt-0"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1.2fr] gap-3 pt-2 border-t border-border/30">
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Badge Tag</Label>
                                                                    <Input
                                                                        value={app.tag || ''}
                                                                        onChange={(e) => handleUpdateApp(app.id, { tag: e.target.value })}
                                                                        placeholder="e.g. Kitchen & Recipes"
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Description</Label>
                                                                    <Input
                                                                        value={app.description || ''}
                                                                        onChange={(e) => handleUpdateApp(app.id, { description: e.target.value })}
                                                                        placeholder="Short description shown on Home Mode cards..."
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Optional HA Entity Badge</Label>
                                                                    <Input
                                                                        value={app.haEntityId || ''}
                                                                        onChange={(e) => handleUpdateApp(app.id, { haEntityId: e.target.value })}
                                                                        placeholder="e.g. sensor.mealie_recipes"
                                                                        className="h-8 text-xs font-mono"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {dashboardSubTab === 'widgets' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold flex items-center gap-2.5">
                                                    <Layout className="w-5 h-5 text-primary" /> Home Assistant & Glance Widgets
                                                </h3>
                                                <button
                                                    onClick={handleAddWidget}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-xs font-bold"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Widget
                                                </button>
                                            </div>

                                            <div className="grid gap-3">
                                                {(localConfig.glanceWidgets || []).map(widget => (
                                                    <Card key={widget.id} className="border-border/40 bg-card/30 overflow-hidden group">
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_1fr_40px] gap-3 items-center">
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Label</Label>
                                                                    <Input
                                                                        value={widget.label || ''}
                                                                        onChange={(e) => handleUpdateWidget(widget.id, { label: e.target.value })}
                                                                        className="h-8 text-sm"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Type</Label>
                                                                    <select
                                                                        value={widget.type}
                                                                        onChange={(e) => handleUpdateWidget(widget.id, { type: e.target.value as any })}
                                                                        className="h-8 text-sm bg-background border border-border rounded-md px-2 text-foreground"
                                                                    >
                                                                        <option value="ha_entity">Home Assistant Entity</option>
                                                                        <option value="clock">Clock</option>
                                                                        <option value="weather">Weather (Open-Meteo)</option>
                                                                        <option value="system_stats">System Stats</option>
                                                                        <option value="rss">RSS Feed</option>
                                                                    </select>
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">
                                                                        {widget.type === 'ha_entity' ? 'HA Entity ID' : 'Data / URL'}
                                                                    </Label>
                                                                    {widget.type === 'ha_entity' ? (
                                                                        <div className="flex gap-1.5">
                                                                            <Input
                                                                                value={widget.entityId || ''}
                                                                                onChange={(e) => handleUpdateWidget(widget.id, { entityId: e.target.value })}
                                                                                placeholder="climate.thermostat_..."
                                                                                className="h-8 text-xs font-mono flex-1"
                                                                            />
                                                                            <select
                                                                                value=""
                                                                                onChange={(e) => {
                                                                                    const preset = COMMON_HA_ENTITIES.find(item => item.entityId === e.target.value);
                                                                                    if (preset) {
                                                                                        handleUpdateWidget(widget.id, {
                                                                                            entityId: preset.entityId,
                                                                                            label: preset.label,
                                                                                            icon: preset.icon
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="h-8 w-24 text-xs bg-background border border-border rounded-md px-1"
                                                                            >
                                                                                <option value="">Presets...</option>
                                                                                {COMMON_HA_ENTITIES.map(item => (
                                                                                    <option key={item.entityId} value={item.entityId}>{item.label}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    ) : (
                                                                        <Input
                                                                            value={widget.url || ''}
                                                                            onChange={(e) => handleUpdateWidget(widget.id, { url: e.target.value })}
                                                                            placeholder={widget.type === 'weather' ? 'Unit (C or F)' : 'Source URL'}
                                                                            className="h-8 text-sm font-mono"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="grid gap-1">
                                                                    <Label className="text-xs font-bold text-muted-foreground/70">Icon (Lucide)</Label>
                                                                    <Input
                                                                        value={widget.icon || ''}
                                                                        onChange={(e) => handleUpdateWidget(widget.id, { icon: e.target.value })}
                                                                        placeholder="Thermometer, Lock..."
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveWidget(widget.id)}
                                                                    className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors mt-4 md:mt-0"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {dashboardSubTab === 'categories' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold flex items-center gap-2.5">
                                                    <ListFilter className="w-5 h-5 text-primary" /> Display Categories
                                                </h3>
                                                <button
                                                    onClick={handleAddCategory}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-xs font-bold"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Category
                                                </button>
                                            </div>

                                            <div className="grid gap-3">
                                                {localConfig.categories.map((cat) => (
                                                    <div key={cat.id} className="flex items-center gap-3 p-3 bg-secondary/10 rounded-xl border border-border/50 group hover:border-primary/50 transition-all">
                                                        <div className="grid flex-1 gap-1">
                                                            <Input
                                                                value={cat.name}
                                                                onChange={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                                                                className="h-8 text-sm font-medium bg-transparent border-none focus-visible:ring-0 p-0"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                value={cat.order}
                                                                onChange={(e) => handleUpdateCategoryOrder(cat.id, parseInt(e.target.value))}
                                                                className="w-12 h-8 text-xs bg-background/50 text-center"
                                                            />
                                                            <button
                                                                onClick={() => handleRemoveCategory(cat.id)}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* PROFILES & GENERAL TAB */}
                            <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-left-4">
                                <Card className="border-border/50 bg-card/50">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" /> Dashboard Profiles
                                        </CardTitle>
                                        <CardDescription>
                                            Switch between your Sysadmin profile and separate Home Mode profiles for family or shared computers.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {profiles.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => switchProfile(p.id)}
                                                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                                                        currentProfile === p.id
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                                            : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <span>{p.name}</span>
                                                    <span className="opacity-60 font-mono">({p.experienceMode === 'sanctuary' ? 'Home Mode' : 'Sysadmin'})</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                                            <button
                                                onClick={() => pinProfileForBrowser(pinnedProfile === currentProfile ? 'default' : currentProfile)}
                                                className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                                                    pinnedProfile === currentProfile && currentProfile !== 'default'
                                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                                                        : 'bg-secondary text-secondary-foreground border-border'
                                                }`}
                                            >
                                                <Pin className="w-3.5 h-3.5" />
                                                <span>
                                                    {pinnedProfile === currentProfile && currentProfile !== 'default'
                                                        ? `Pinned "${currentProfile}" as Default on This Browser`
                                                        : `Pin "${currentProfile}" as Default on This Browser`}
                                                </span>
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={newProfileName}
                                                    onChange={(e) => setNewProfileName(e.target.value)}
                                                    placeholder="New profile name (e.g. Kitchen)"
                                                    className="h-9 w-52 text-xs bg-background/50"
                                                />
                                                <button
                                                    onClick={handleCreateProfile}
                                                    className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Create Profile
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/50 bg-card/50">
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Icons.FolderSync className="w-5 h-5 text-primary" /> Local Source & Unraid Sync
                                                </CardTitle>
                                                <CardDescription>
                                                    Publish builds from your Gaming PC to your Unraid <code className="text-xs font-mono">Projects</code> share, or pull updates directly from a mounted local folder without pushing to public GitHub.
                                                </CardDescription>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                                                localSyncInfo.reachable
                                                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${localSyncInfo.reachable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {localSyncInfo.reachable ? 'Share Reachable' : 'Path Not Found'}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Input
                                                value={localSyncPath}
                                                onChange={(e) => setLocalSyncPath(e.target.value)}
                                                onBlur={() => checkLocalSyncStatus(localSyncPath)}
                                                placeholder="\\192.168.0.100\Projects\BrayDashy or /local-source"
                                                className="font-mono text-xs bg-background/60 flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleLocalSyncPush}
                                                disabled={localSyncInfo.busy}
                                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Push Build to Unraid Share</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLocalSyncPull}
                                                disabled={localSyncInfo.busy}
                                                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Pull Update from Local Path</span>
                                            </button>
                                        </div>

                                        {localSyncInfo.manifest?.syncedAt && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>Latest bundle in folder:</span>
                                                <strong className="text-foreground font-mono">{localSyncInfo.manifest.version || 'local'}</strong>
                                                <span>·</span>
                                                <span>{new Date(localSyncInfo.manifest.syncedAt).toLocaleString()}</span>
                                            </div>
                                        )}

                                        {localSyncInfo.message && (
                                            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-medium">
                                                {localSyncInfo.message}
                                            </div>
                                        )}
                                        {localSyncInfo.error && (
                                            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-medium">
                                                {localSyncInfo.error}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-border/50 bg-card/50">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Backup, Restore & Onboarding</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleExportConfig}
                                                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all text-sm font-medium border border-border"
                                            >
                                                <Download className="w-4 h-4" /> Export Profile JSON
                                            </button>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImportConfig}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all text-sm font-medium border border-border">
                                                    <Upload className="w-4 h-4" /> Import JSON
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleClose(false);
                                                onRunSetup?.();
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-all text-sm font-medium"
                                        >
                                            <Sparkles className="w-4 h-4" /> Run Setup Wizard
                                        </button>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* INTEGRATIONS TAB */}
                            <TabsContent value="integrations" className="mt-0 space-y-6 animate-in fade-in slide-in-from-left-4">
                                {SUPPORTED_APIS.map(api => {
                                    const vals = getIntegrationValue(api.id, api.apiKeyMap);
                                    return (
                                        <Card key={api.id} className="border-border/50 bg-card/50 overflow-hidden group relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <div className="flex flex-col gap-1">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {api.id === 'homeassistant' ? 'Home Assistant' : api.id.charAt(0).toUpperCase() + api.id.slice(1)}
                                                        {testStatuses[api.id] === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                        {testStatuses[api.id] === 'failed' && <XCircle className="w-4 h-4 text-rose-500" />}
                                                    </CardTitle>
                                                    <CardDescription className="text-muted-foreground dark:text-slate-400">
                                                        {api.id === 'homeassistant'
                                                            ? 'Connect your Home Assistant instance to power live entity glance widgets and card badges.'
                                                            : `Configure credentials for ${api.id} services.`}
                                                    </CardDescription>
                                                </div>
                                                <button
                                                    onClick={() => handleTestAPI(api.id)}
                                                    disabled={testStatuses[api.id] === 'testing'}
                                                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all text-xs font-semibold border border-border flex items-center gap-2"
                                                >
                                                    {testStatuses[api.id] === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Test & Save
                                                </button>
                                            </CardHeader>
                                            <CardContent className="grid gap-4 pt-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">API URL / Host</Label>
                                                    <Input
                                                        value={vals.url}
                                                        onChange={(e) => updateIntegration(api.id, api.apiKeyMap, 'url', e.target.value)}
                                                        placeholder="http://192.168.0.100:8123"
                                                        className="bg-background/30 text-foreground"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">{api.label}</Label>
                                                    <Input
                                                        type="password"
                                                        value={vals.token}
                                                        onChange={(e) => updateIntegration(api.id, api.apiKeyMap, 'token', e.target.value)}
                                                        placeholder="••••••••••••••••"
                                                        className="bg-background/30 text-foreground"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </TabsContent>
                        </div>
                    </Tabs>
                )}

                <div className="p-5 border-t border-border/50 bg-secondary/30 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => handleClose(false)}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all text-sm font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)] active:scale-95"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
