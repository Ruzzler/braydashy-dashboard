import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';
import { ImportWizardModal } from './ImportWizardModal';

export function SettingsModal({ config, onSave }: { config: any, onSave: (newConfig: any) => void }) {
    const [open, setOpen] = useState(false);
    const [localConfig, setLocalConfig] = useState(JSON.parse(JSON.stringify(config)));

    // Sync if config prop changes
    React.useEffect(() => {
        if (open) setLocalConfig(JSON.parse(JSON.stringify(config)));
    }, [config, open]);

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
                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="apps">Apps</TabsTrigger>
                        <TabsTrigger value="integrations">API Keys</TabsTrigger>
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
                                        <Label htmlFor="headerLayout" className="font-semibold text-muted-foreground tracking-wider">Header Layout Style</Label>
                                        <select
                                            id="headerLayout"
                                            value={localConfig.headerLayout || 'classic'}
                                            onChange={(e) => handleGeneralChange('headerLayout', e.target.value)}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="classic" className="bg-popover text-popover-foreground">Classic (Default)</option>
                                            <option value="minimalist" className="bg-popover text-popover-foreground">Minimalist (Centered Hero)</option>
                                            <option value="split" className="bg-popover text-popover-foreground">Split View (Left/Right Grid)</option>
                                            <option value="sidebar" className="bg-popover text-popover-foreground">Dynamic Sidebar</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">Choose the architectural structure of the top header area.</p>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="appCardStyle" className="font-semibold text-muted-foreground tracking-wider">App Card Style</Label>
                                        <select
                                            id="appCardStyle"
                                            value={localConfig.appCardStyle || 'glass'}
                                            onChange={(e) => handleGeneralChange('appCardStyle', e.target.value)}
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="glass" className="bg-popover text-popover-foreground">Glassmorphism (Default)</option>
                                            <option value="solid" className="bg-popover text-popover-foreground">Solid Minimalist</option>
                                            <option value="outline" className="bg-popover text-popover-foreground">Clean Outline</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">Customize the visual style of the application buttons.</p>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-border mt-4">
                                        <h4 className="font-semibold text-muted-foreground tracking-wider mb-2">Weather Widget Integration</h4>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                type="checkbox"
                                                id="enableWeather"
                                                checked={localConfig.enableWeather || false}
                                                onChange={(e) => handleGeneralChange('enableWeather', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <Label htmlFor="enableWeather" className="font-medium cursor-pointer">Enable Local Weather Panel</Label>
                                        </div>
                                        {localConfig.enableWeather && (
                                            <div className="space-y-2">
                                                <div className="flex gap-3">
                                                    <div className="flex-1 space-y-2">
                                                        <Label htmlFor="weatherLocation" className="text-xs text-muted-foreground">Location (City, Country)</Label>
                                                        <Input
                                                            id="weatherLocation"
                                                            placeholder="e.g. New York, US or London, UK"
                                                            value={localConfig.weatherLocation || ''}
                                                            onChange={(e) => handleGeneralChange('weatherLocation', e.target.value)}
                                                            className="bg-black/20"
                                                        />
                                                    </div>
                                                    <div className="w-24 space-y-2">
                                                        <Label htmlFor="weatherUnit" className="text-xs text-muted-foreground">Unit</Label>
                                                        <select
                                                            id="weatherUnit"
                                                            value={localConfig.weatherUnit || 'F'}
                                                            onChange={(e) => handleGeneralChange('weatherUnit', e.target.value)}
                                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        >
                                                            <option value="F" className="bg-popover text-popover-foreground">°F</option>
                                                            <option value="C" className="bg-popover text-popover-foreground">°C</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Used to fetch real-time public weather data via Open-Meteo.</p>
                                            </div>
                                        )}
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
                                {Object.keys(localConfig?.apiKeys || {}).map(key => (
                                    <div key={key} className="flex flex-col space-y-1.5">
                                        <Label htmlFor={key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</Label>
                                        <Input
                                            id={key}
                                            type="password"
                                            placeholder={`Enter ${key}`}
                                            value={localConfig.apiKeys[key] || ''}
                                            onChange={(e) => handleApiKeyChange(key, e.target.value)}
                                            className="bg-black/20"
                                        />
                                    </div>
                                ))}
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
