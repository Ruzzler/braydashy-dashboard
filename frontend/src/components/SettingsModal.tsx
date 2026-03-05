import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ImportWizardModal } from './ImportWizardModal';

export function SettingsModal({ config, onSave, onPreviewConfig }: { config: any, onSave: (newConfig: any) => void, onPreviewConfig?: (newConfig: any) => void }) {
    const [open, setOpen] = useState(false);
    const [localConfig, setLocalConfig] = useState(JSON.parse(JSON.stringify(config)));
    const [testStatuses, setTestStatuses] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'failed' }>({});

    // Map keywords to specific API keys and available widgets
    const SUPPORTED_APIS = [
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

    // Helper to find all supported apps the user currently has added
    const activeIntegrations = SUPPORTED_APIS.filter(api =>
        localConfig.apps.some((a: any) => a.name.toLowerCase().includes(api.keyword) || a.id.includes(api.keyword))
    );

    // Sync if config prop changes
    React.useEffect(() => {
        if (open) {
            setLocalConfig(JSON.parse(JSON.stringify(config)));
        } else if (onPreviewConfig) {
            // Revert preview if closed without saving
            onPreviewConfig(config);
        }
    }, [config, open]);

    // Broadcast live previews when localConfig changes (only while modal is open)
    React.useEffect(() => {
        if (open && onPreviewConfig) {
            onPreviewConfig(localConfig);
        }
    }, [localConfig, open]);

    const handleSave = () => {
        onSave(localConfig);
        setOpen(false);
    };

    const handleApiKeyChange = (key: string, value: string) => {
        setLocalConfig({
            ...localConfig,
            apiKeys: {
                ...localConfig.apiKeys,
                [key]: value
            }
        });
        // Reset status if they change the key
        setTestStatuses(prev => ({ ...prev, [key]: 'idle' }));
    };

    const handleWidgetToggle = (appId: string, widgetId: string, checked: boolean) => {
        setLocalConfig({
            ...localConfig,
            apps: localConfig.apps.map((a: any) => {
                if (a.name.toLowerCase().includes(appId) || a.id.includes(appId)) {
                    const currentPrefs = a.widgetPreferences || [];
                    let newPrefs;
                    if (checked) {
                        newPrefs = [...currentPrefs, widgetId];
                    } else {
                        newPrefs = currentPrefs.filter((w: string) => w !== widgetId);
                    }
                    return { ...a, widgetPreferences: newPrefs };
                }
                return a;
            })
        });
    };

    const testConnection = async (appName: string, integrationId: string) => {
        setTestStatuses(prev => ({ ...prev, [integrationId]: 'testing' }));
        try {
            // First save config temporarily (or hit a dedicated test route). 
            // For now, testing via the standard proxy if the backend allows on-the-fly or relies on saved.
            // *Note: Because backend relies on saved config, we must save first.*
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localConfig)
            });

            // Trigger the status ping
            const response = await fetch(`/api/${appName}/status`);
            const data = await response.json();

            if (data.online && data.stats) {
                setTestStatuses(prev => ({ ...prev, [integrationId]: 'success' }));
            } else {
                setTestStatuses(prev => ({ ...prev, [integrationId]: 'failed' }));
            }
        } catch (e) {
            setTestStatuses(prev => ({ ...prev, [integrationId]: 'failed' }));
        }
    };

    const handleCategoryChange = (id: string, field: string, value: any) => {
        setLocalConfig({
            ...localConfig,
            categories: localConfig.categories.map((c: any) => c.id === id ? { ...c, [field]: value } : c)
        });
    };

    const addCategory = () => {
        const newCat = { id: `cat-${Date.now()}`, name: 'New Category', order: localConfig.categories.length };
        setLocalConfig({ ...localConfig, categories: [...localConfig.categories, newCat] });
    };

    const removeCategory = (id: string) => {
        setLocalConfig({
            ...localConfig,
            categories: localConfig.categories.filter((c: any) => c.id !== id),
            // also optionally remove apps that belonged to it or orphan them
            apps: localConfig.apps.filter((a: any) => a.categoryId !== id)
        });
    };

    const handleAppChange = (id: string, field: string, value: any) => {
        setLocalConfig({
            ...localConfig,
            apps: localConfig.apps.map((a: any) => a.id === id ? { ...a, [field]: value } : a)
        });
    };

    const addApp = () => {
        const defaultCategory = localConfig.categories[0]?.id || '';
        const newApp = {
            id: `app-${Date.now()}`,
            name: 'New App',
            url: 'http://',
            iconType: 'image',
            icon: '',
            categoryId: defaultCategory
        };
        setLocalConfig({ ...localConfig, apps: [...localConfig.apps, newApp] });
    };

    const removeApp = (id: string) => {
        setLocalConfig({
            ...localConfig,
            apps: localConfig.apps.filter((a: any) => a.id !== id)
        });
    };

    const handleBulkImport = (newApps: any[]) => {
        setLocalConfig((prev: any) => ({
            ...prev,
            apps: [...prev.apps, ...newApps]
        }));
    };

    const handleWidgetChange = (id: string, field: string, value: any) => {
        setLocalConfig({
            ...localConfig,
            glanceWidgets: (localConfig.glanceWidgets || []).map((w: any) => w.id === id ? { ...w, [field]: value } : w)
        });
    };

    const addWidget = () => {
        const newWidget = { id: `widget-${Date.now()}`, type: 'clock' };
        setLocalConfig({ ...localConfig, glanceWidgets: [...(localConfig.glanceWidgets || []), newWidget] });
    };

    const removeWidget = (id: string) => {
        setLocalConfig({
            ...localConfig,
            glanceWidgets: (localConfig.glanceWidgets || []).filter((w: any) => w.id !== id)
        });
    };

    const handleGeneralChange = (field: string, value: string | boolean) => {
        setLocalConfig({
            ...localConfig,
            [field]: value
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex-shrink-0 bg-secondary/80 border border-border text-foreground w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-secondary hover:scale-110 backdrop-blur-md">
                    <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card border-border backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Dashboard Settings</DialogTitle>
                    <DialogDescription>
                        Manage your categories, app links, and API integrations in real-time.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-6 mb-8">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="apps">Apps</TabsTrigger>
                        <TabsTrigger value="integrations">API Keys</TabsTrigger>
                        <TabsTrigger value="widgets">Widgets</TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general">
                        <Card className="bg-transparent border-border">
                            <CardHeader>
                                <CardTitle>General Settings</CardTitle>
                                <CardDescription>Customize the core dashboard identity.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="serverName" className="font-semibold text-muted-foreground tracking-wider">Server Name</Label>
                                        <Input
                                            id="serverName"
                                            placeholder="e.g. BrayServer"
                                            value={localConfig.serverName || ''}
                                            onChange={(e) => handleGeneralChange('serverName', e.target.value)}
                                            className="bg-black/20"
                                        />
                                        <p className="text-xs text-muted-foreground">This name is displayed prominently at the top of the dashboard.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="serverIcon" className="font-semibold text-muted-foreground tracking-wider">Server Icon (Lucide Name)</Label>
                                        <Input
                                            id="serverIcon"
                                            placeholder="e.g. Server, HardDrive, Cpu, Cloud"
                                            value={localConfig.serverIcon || ''}
                                            onChange={(e) => handleGeneralChange('serverIcon', e.target.value)}
                                            className="bg-black/20"
                                        />
                                        <p className="text-xs text-muted-foreground">Type a <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="underline text-primary hover:text-foreground transition-colors">Lucide React Icon</a> name to customize the main logo.</p>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="defaultSearchProvider" className="font-semibold text-muted-foreground tracking-wider">Default Web Search Engine</Label>
                                        <select
                                            id="defaultSearchProvider"
                                            value={localConfig.defaultSearchProvider || 'google'}
                                            onChange={(e) => handleGeneralChange('defaultSearchProvider', e.target.value)}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="google" className="bg-popover text-popover-foreground">Google</option>
                                            <option value="duckduckgo" className="bg-popover text-popover-foreground">DuckDuckGo</option>
                                            <option value="bing" className="bg-popover text-popover-foreground">Bing</option>
                                            <option value="youtube" className="bg-popover text-popover-foreground">YouTube</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">Hitting Enter in the search bar routes queries here (Supports <code className="bg-muted px-1 rounded">!g</code>, <code className="bg-muted px-1 rounded">!yt</code>, <code className="bg-muted px-1 rounded">!ddg</code>, <code className="bg-muted px-1 rounded">!bing</code> shortcuts).</p>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-border mt-4">
                                        <h4 className="font-semibold text-muted-foreground tracking-wider mb-2">Workspace Integration</h4>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id="enableWorkspaceMode"
                                                checked={localConfig.enableWorkspaceMode || false}
                                                onChange={(e) => handleGeneralChange('enableWorkspaceMode', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                            />
                                            <Label htmlFor="enableWorkspaceMode" className="font-medium cursor-pointer">Enable Workspace Mode (IFrame Application Viewer)</Label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">When enabled, clicking an application opens it inside a dashboard overlay instead of a new tab.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* API Integrations Tab */}
                    <TabsContent value="integrations">
                        <Card className="bg-transparent border-border">
                            <CardHeader>
                                <CardTitle>API Integrations</CardTitle>
                                <CardDescription>
                                    Enter your API keys for dashboard widget live stats. These are stored locally in config.json.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {activeIntegrations.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No supported applications detected.</p>
                                        <p className="text-xs mt-2">Add apps like Sonarr, Radarr, or Tautulli to your dashboard to configure their API keys here.</p>
                                    </div>
                                ) : (
                                    activeIntegrations.map(integration => {
                                        const status = testStatuses[integration.apiKeyMap] || 'idle';

                                        // Find the corresponding app instance from localConfig to check widget pres
                                        const appInstance = localConfig.apps.find((a: any) => a.name.toLowerCase().includes(integration.keyword) || a.id.includes(integration.keyword));
                                        const activeWidgets = appInstance?.widgetPreferences || [];

                                        return (
                                            <div key={integration.id} className="flex flex-col gap-4 bg-black/20 p-4 rounded-lg border border-border">
                                                <div className="flex items-end gap-3">
                                                    <div className="flex-1 space-y-1.5">
                                                        <Label htmlFor={integration.apiKeyMap} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{integration.label}</Label>
                                                        <Input
                                                            id={integration.apiKeyMap}
                                                            type="password"
                                                            placeholder={`Enter ${integration.label}`}
                                                            value={localConfig.apiKeys?.[integration.apiKeyMap] || ''}
                                                            onChange={(e) => handleApiKeyChange(integration.apiKeyMap, e.target.value)}
                                                            className="bg-background/50"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => testConnection(integration.keyword, integration.apiKeyMap)}
                                                        disabled={status === 'testing' || !localConfig.apiKeys?.[integration.apiKeyMap]}
                                                        className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 flex items-center gap-2 transition-colors disabled:opacity-50"
                                                    >
                                                        {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                                                        {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                        {status === 'failed' && <XCircle className="w-4 h-4 text-rose-500" />}
                                                        {status === 'idle' && 'Test Connection'}
                                                        {status !== 'idle' && status !== 'testing' && 'Retest'}
                                                    </button>
                                                </div>

                                                <div className="space-y-2 mt-2 pt-3 border-t border-border/50">
                                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visible App Card Widgets</Label>
                                                    <div className="flex flex-wrap gap-4">
                                                        {integration.widgets.map(w => (
                                                            <div key={w.id} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`${integration.id}-${w.id}`}
                                                                    // Default to checked if widgetPreferences is strictly undefined (meaning they haven't set it yet, so show all)
                                                                    checked={appInstance?.widgetPreferences === undefined ? true : activeWidgets.includes(w.id)}
                                                                    onChange={(e) => handleWidgetToggle(integration.keyword, w.id, e.target.checked)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary bg-background"
                                                                />
                                                                <Label htmlFor={`${integration.id}-${w.id}`} className="text-sm cursor-pointer">{w.label}</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Categories Tab */}
                    <TabsContent value="categories">
                        <Card className="bg-transparent border-border">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Categories</CardTitle>
                                    <CardDescription>Manage your dashboard sections.</CardDescription>
                                </div>
                                <button onClick={addCategory} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
                                    <Plus className="w-4 h-4 mr-2" /> Add Category
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {localConfig.categories.sort((a: any, b: any) => a.order - b.order).map((cat: any) => (
                                    <div key={cat.id} className="flex items-center gap-4 bg-black/20 p-3 rounded-lg border border-border">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs text-muted-foreground">Name</Label>
                                            <Input value={cat.name} onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)} className="bg-background/50" />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-xs text-muted-foreground">Order</Label>
                                            <Input type="number" value={cat.order} onChange={e => handleCategoryChange(cat.id, 'order', parseInt(e.target.value))} className="bg-background/50" />
                                        </div>
                                        <div className="pt-5">
                                            <button onClick={() => removeCategory(cat.id)} className="text-destructive hover:text-destructive/80 p-2">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="apps">
                        <Card className="bg-transparent border-border">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>App Links</CardTitle>
                                    <CardDescription>Manage the applications displayed on your dashboard.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ImportWizardModal onImport={handleBulkImport} categories={localConfig.categories} />
                                    <button onClick={addApp} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
                                        <Plus className="w-4 h-4 mr-2" /> Add App
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {localConfig.apps.map((app: any) => (
                                    <div key={app.id} className="flex flex-col gap-3 bg-black/20 p-4 rounded-lg border border-border">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-muted-foreground">App Name</Label>
                                                <Input value={app.name} onChange={e => handleAppChange(app.id, 'name', e.target.value)} className="bg-background/50 h-8" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Category</Label>
                                                <select
                                                    value={app.categoryId}
                                                    onChange={e => handleAppChange(app.id, 'categoryId', e.target.value)}
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {localConfig.categories.map((c: any) => (
                                                        <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="pt-5">
                                                <button onClick={() => removeApp(app.id)} className="text-destructive hover:text-destructive/80 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-[2] space-y-1">
                                                <Label className="text-xs text-muted-foreground">URL</Label>
                                                <Input value={app.url} onChange={e => handleAppChange(app.id, 'url', e.target.value)} className="bg-background/50 h-8 font-mono text-xs" />
                                                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/30">
                                                    <input
                                                        type="checkbox"
                                                        id={`ignoreWorkspace-${app.id}`}
                                                        checked={app.ignoreWorkspace || false}
                                                        onChange={e => handleAppChange(app.id, 'ignoreWorkspace', e.target.checked)}
                                                        className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                                    />
                                                    <Label htmlFor={`ignoreWorkspace-${app.id}`} className="text-[10px] text-muted-foreground cursor-pointer">Force New Tab (Bypass Workspace)</Label>
                                                </div>
                                            </div>
                                            <div className="flex-[2] space-y-1">
                                                <Label className="text-xs text-muted-foreground">Icon URL / Lucide Name</Label>
                                                <Input value={app.icon} onChange={e => handleAppChange(app.id, 'icon', e.target.value)} className="bg-background/50 h-8 text-xs" />
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Type</Label>
                                                <select
                                                    value={app.iconType}
                                                    onChange={e => handleAppChange(app.id, 'iconType', e.target.value)}
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background/50 px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                >
                                                    <option value="image" className="bg-popover text-popover-foreground">Image</option>
                                                    <option value="icon" className="bg-popover text-popover-foreground">Icon</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Widgets Tab */}
                    <TabsContent value="widgets">
                        <Card className="bg-transparent border-border">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Glance Widgets</CardTitle>
                                    <CardDescription>Add quick info cards to the top of your dashboard.</CardDescription>
                                </div>
                                <button onClick={addWidget} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
                                    <Plus className="w-4 h-4 mr-2" /> Add Widget
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(localConfig.glanceWidgets || []).map((widget: any) => (
                                    <div key={widget.id} className="flex flex-col gap-4 bg-black/20 p-4 rounded-lg border border-border">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-[1] space-y-1">
                                                <Label className="text-xs text-muted-foreground">Widget Type</Label>
                                                <select
                                                    value={widget.type}
                                                    onChange={e => handleWidgetChange(widget.id, 'type', e.target.value)}
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                >
                                                    <option value="clock" className="bg-popover text-popover-foreground">Digital Clock</option>
                                                    <option value="system_stats" className="bg-popover text-popover-foreground">Local System Stats</option>
                                                    <option value="weather" className="bg-popover text-popover-foreground">Live Weather</option>
                                                    <option value="rss" className="bg-popover text-popover-foreground">RSS Feed</option>
                                                    <option value="pet" className="bg-popover text-popover-foreground">Interactive Desktop Pet</option>
                                                </select>
                                            </div>
                                            <div className="flex-[1] space-y-1">
                                                <Label className="text-xs text-muted-foreground">Size Preference</Label>
                                                <select
                                                    value={widget.size || 'medium'}
                                                    onChange={e => handleWidgetChange(widget.id, 'size', e.target.value)}
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                >
                                                    <option value="small" className="bg-popover text-popover-foreground">Small</option>
                                                    <option value="medium" className="bg-popover text-popover-foreground">Medium</option>
                                                    <option value="large" className="bg-popover text-popover-foreground">Large</option>
                                                </select>
                                            </div>
                                            <div className="pt-5">
                                                <button onClick={() => removeWidget(widget.id)} className="text-destructive hover:text-destructive/80 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {widget.type === 'weather' && (
                                            <div className="flex items-start gap-4">
                                                <div className="flex-[2] space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Location (City, Country)</Label>
                                                    <Input placeholder="e.g. London, UK" value={widget.label || ''} onChange={e => handleWidgetChange(widget.id, 'label', e.target.value)} className="bg-background/50 h-8 text-xs" />
                                                </div>
                                                <div className="flex-[1] space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Unit</Label>
                                                    <select
                                                        value={widget.url === 'C' ? 'C' : 'F'}
                                                        onChange={e => handleWidgetChange(widget.id, 'url', e.target.value)}
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                    >
                                                        <option value="F" className="bg-popover text-popover-foreground">Fahrenheit (°F)</option>
                                                        <option value="C" className="bg-popover text-popover-foreground">Celsius (°C)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        {widget.type === 'rss' && (
                                            <div className="flex items-start gap-4">
                                                <div className="flex-[1] space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Feed Label</Label>
                                                    <Input placeholder="e.g. HackerNews" value={widget.label || ''} onChange={e => handleWidgetChange(widget.id, 'label', e.target.value)} className="bg-background/50 h-8 text-xs" />
                                                </div>
                                                <div className="flex-[2] space-y-1">
                                                    <Label className="text-xs text-muted-foreground">RSS XML URL</Label>
                                                    <Input placeholder="https://..." value={widget.url || ''} onChange={e => handleWidgetChange(widget.id, 'url', e.target.value)} className="bg-background/50 h-8 font-mono text-xs" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!localConfig.glanceWidgets || localConfig.glanceWidgets.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No widgets configured.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Appearance Tab */}
                    <TabsContent value="appearance">
                        <Card className="bg-transparent border-border">
                            <CardHeader>
                                <CardTitle>Appearance & Theming</CardTitle>
                                <CardDescription>Customize the visual layout, sizing, and color palette of your dashboard.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-muted-foreground tracking-wider border-b border-border/50 pb-2">Global Theming</h4>
                                    <div className="space-y-3">
                                        <Label className="font-semibold text-muted-foreground tracking-wider">Primary Theme Color</Label>
                                        <div className="flex flex-wrap gap-4">
                                            {[
                                                { id: 'zinc', bg: 'bg-zinc-500' },
                                                { id: 'slate', bg: 'bg-slate-500' },
                                                { id: 'emerald', bg: 'bg-emerald-500' },
                                                { id: 'blue', bg: 'bg-blue-500' },
                                                { id: 'rose', bg: 'bg-rose-500' },
                                                { id: 'violet', bg: 'bg-violet-500' },
                                                { id: 'amber', bg: 'bg-amber-500' }
                                            ].map(theme => (
                                                <div
                                                    key={theme.id}
                                                    onClick={() => handleGeneralChange('themeColor', theme.id)}
                                                    className={`w-10 h-10 rounded-full cursor-pointer transition-all border-4 flex items-center justify-center ${theme.bg} ${localConfig.themeColor === theme.id ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                                    title={theme.id}
                                                >
                                                    {localConfig.themeColor === theme.id && <div className="w-2 h-2 rounded-full bg-white shadow-sm"></div>}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground pt-1">Changes the default active states, Orbs, and CSS variables across all components.</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <h4 className="font-semibold text-muted-foreground tracking-wider border-b border-border/50 pb-2">Dynamic Backgrounds</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { id: 'orbs', label: 'Floating Orbs', icon: '✨' },
                                            { id: 'grid', label: 'Blueprint Grid', icon: '▦' },
                                            { id: 'waves', label: 'Waves', icon: '〰' },
                                            { id: 'dots', label: 'Dotted Paint', icon: '⠿' },
                                            { id: 'none', label: 'Solid Flat', icon: '⬛' }
                                        ].map(bg => (
                                            <div
                                                key={bg.id}
                                                onClick={() => handleGeneralChange('backgroundStyle', bg.id)}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer border-2 transition-all text-center gap-2 ${localConfig.backgroundStyle === bg.id || (!localConfig.backgroundStyle && bg.id === 'orbs') ? 'border-primary shadow-md bg-primary/10 text-primary' : 'border-border/50 hover:border-border hover:bg-card/50 bg-background/50 text-muted-foreground'}`}
                                            >
                                                <div className="text-2xl">{bg.icon}</div>
                                                <span className={`text-xs font-semibold ${localConfig.backgroundStyle === bg.id || (!localConfig.backgroundStyle && bg.id === 'orbs') ? 'text-foreground' : ''}`}>{bg.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <h4 className="font-semibold text-muted-foreground tracking-wider border-b border-border/50 pb-2">Header Structure</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { id: 'classic', label: 'Classic' },
                                            { id: 'minimalist', label: 'Minimalist' },
                                            { id: 'split', label: 'Split View' },
                                            { id: 'sidebar', label: 'Sidebar' }
                                        ].map(layout => (
                                            <div
                                                key={layout.id}
                                                onClick={() => handleGeneralChange('headerLayout', layout.id)}
                                                className={`flex items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all text-center ${localConfig.headerLayout === layout.id ? 'border-primary shadow-md bg-primary/10 text-foreground' : 'border-border/50 hover:border-border hover:bg-card/50 text-muted-foreground'}`}
                                            >
                                                <span className="text-sm font-medium">{layout.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <h4 className="font-semibold text-muted-foreground tracking-wider border-b border-border/50 pb-2">App Card Styling</h4>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Card Layout Structure</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'grid', label: 'Grid' },
                                                { id: 'list', label: 'Compact List' },
                                                { id: 'minimal', label: 'Minimal Icon' }
                                            ].map(layout => (
                                                <div
                                                    key={layout.id}
                                                    onClick={() => handleGeneralChange('appCardLayout', layout.id)}
                                                    className={`p-2 rounded-lg cursor-pointer border-2 transition-all text-center ${localConfig.appCardLayout === layout.id ? 'border-primary shadow-md bg-primary/10 text-foreground' : 'border-border/50 hover:border-border hover:bg-card/50 text-muted-foreground'}`}
                                                >
                                                    <span className="text-xs font-medium">{layout.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Base Size Variant</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'small', label: 'Small' },
                                                { id: 'medium', label: 'Medium' },
                                                { id: 'large', label: 'Large' }
                                            ].map(size => (
                                                <div
                                                    key={size.id}
                                                    onClick={() => handleGeneralChange('appCardSize', size.id)}
                                                    className={`p-2 rounded-lg cursor-pointer border-2 transition-all text-center ${localConfig.appCardSize === size.id ? 'border-primary shadow-md bg-primary/10 text-foreground' : 'border-border/50 hover:border-border hover:bg-card/50 text-muted-foreground'}`}
                                                >
                                                    <span className="text-xs font-medium">{size.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Card Fill Aesthetic</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'glass', label: 'Glassmorphism' },
                                                { id: 'solid', label: 'Solid Minimalist' },
                                                { id: 'outline', label: 'Clean Outline' }
                                            ].map(style => (
                                                <div
                                                    key={style.id}
                                                    onClick={() => handleGeneralChange('appCardStyle', style.id)}
                                                    className={`p-2 rounded-lg cursor-pointer border-2 transition-all text-center ${localConfig.appCardStyle === style.id ? 'border-primary shadow-md bg-primary/10 text-foreground' : 'border-border/50 hover:border-border hover:bg-card/50 text-muted-foreground'}`}
                                                >
                                                    <span className="text-xs font-medium">{style.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                    <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary text-muted-foreground">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex gap-2 items-center">
                        <Save className="w-4 h-4" /> Save Configuration
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
