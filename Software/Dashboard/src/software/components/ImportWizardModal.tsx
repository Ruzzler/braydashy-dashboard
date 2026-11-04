import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/software/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/software/components/ui/tabs';
import { Download, Check, Loader2, Sparkles, Server, Search } from 'lucide-react';

interface Container {
    id: string;
    name: string;
    state: string;
    port: string;
    image: string;
}

interface DiscoveredService {
    name: string;
    url: string;
    type: string;
}

interface GalleryApp {
    id: string;
    name: string;
    description: string;
    defaultPort: number;
    icon: string;
    category: string;
}

export function ImportWizardModal({
    onImport,
    categories,
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}: {
    onImport: (apps: any[]) => void,
    categories: any[],
    open?: boolean,
    onOpenChange?: (open: boolean) => void
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const [loading, setLoading] = useState(false);
    const [containers, setContainers] = useState<Container[]>([]);
    const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);
    const [galleryApps, setGalleryApps] = useState<GalleryApp[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
    const [jsonInput, setJsonInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [importCategory, setImportCategory] = useState(categories[0]?.id || '');
    const [hostIp, setHostIp] = useState(window.location.hostname);

    // Fetch data when modal opens
    useEffect(() => {
        if (open) {
            fetchContainers();
            fetchDiscovery();
            fetchGallery();
        }
    }, [open]);

    // Ensure category is selected
    useEffect(() => {
        if (categories.length > 0 && !importCategory) {
            setImportCategory(categories[0].id);
        }
    }, [categories, importCategory]);

    const fetchContainers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/docker/containers');
            const data = await res.json();
            if (data.success && data.containers) {
                const running = data.containers.filter((c: any) => c.state === 'running');
                setContainers(running);
                setSelectedIds(new Set(running.map((c: any) => c.id)));
            } else {
                setError(data.error || 'Failed to fetch containers.');
            }
        } catch (e) {
            setError('Network error: Unable to contact Docker socket API.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDiscovery = async () => {
        try {
            const res = await fetch('/api/discovery/mdns');
            const data = await res.json();
            if (data.success && data.services) {
                setDiscoveredServices(data.services);
                setSelectedServiceIds(new Set(data.services.map((s: any) => s.name)));
            }
        } catch (e) {
            console.error('Failed to fetch mDNS services', e);
        }
    };

    const fetchGallery = async () => {
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            if (data.success && data.apps) {
                setGalleryApps(data.apps);
            }
        } catch (e) {
            console.error('Failed to fetch gallery apps', e);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleServiceSelection = (id: string) => {
        const newSet = new Set(selectedServiceIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedServiceIds(newSet);
    };

    const handleDockerImport = () => {
        const appsToImport = containers
            .filter(c => selectedIds.has(c.id))
            .map((c, idx) => {
                const cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Check if we have a gallery entry for accurate icons
                const galleryMatch = galleryApps.find(g => c.image.toLowerCase().includes(g.id) || c.name.toLowerCase().includes(g.id));
                const iconName = galleryMatch ? galleryMatch.icon : cleanName;

                return {
                    id: `app-docker-${Date.now()}-${idx}`,
                    name: c.name,
                    url: `http://${hostIp}${c.port ? ':' + c.port : ''}`,
                    iconType: 'image',
                    icon: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${iconName}.png`,
                    categoryId: importCategory
                };
            });

        if (appsToImport.length > 0) {
            onImport(appsToImport);
            setOpen(false);
        }
    };

    const handleDiscoveryImport = () => {
        const appsToImport = discoveredServices
            .filter(s => selectedServiceIds.has(s.name))
            .map((s, idx) => {
                const cleanName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const galleryMatch = galleryApps.find(g => s.name.toLowerCase().includes(g.id));
                const iconName = galleryMatch ? galleryMatch.icon : cleanName;

                return {
                    id: `app-discovery-${Date.now()}-${idx}`,
                    name: s.name,
                    url: s.url,
                    iconType: 'image',
                    icon: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${iconName}.png`,
                    categoryId: importCategory
                };
            });

        if (appsToImport.length > 0) {
            onImport(appsToImport);
            setOpen(false);
        }
    };

    const handleGalleryAdd = (app: GalleryApp) => {
        const newApp = {
            id: `app-gallery-${Date.now()}`,
            name: app.name,
            url: `http://${hostIp}:${app.defaultPort}`,
            iconType: 'image' as const,
            icon: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${app.icon}.png`,
            categoryId: importCategory
        };
        onImport([newApp]);
        setOpen(false);
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");

            const appsToImport = parsed.map((item: any, idx) => ({
                id: `app-json-${Date.now()}-${idx}`,
                name: item.name || 'Unknown App',
                url: item.url || 'http://',
                iconType: 'image',
                icon: item.icon ? `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${item.icon.toLowerCase().replace(/[^a-z0-9]/g, '')}.png` : '',
                categoryId: importCategory
            }));

            if (appsToImport.length > 0) {
                onImport(appsToImport);
                setOpen(false);
                setJsonInput('');
            }
        } catch (e: any) {
            alert("Invalid JSON format: " + e.message);
        }
    };

    const filteredGallery = galleryApps.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {externalOpen === undefined && (
                <DialogTrigger asChild>
                    <button className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/50 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Wizard
                    </button>
                </DialogTrigger>
            )}

            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-card border-border backdrop-blur-xl flex flex-col p-0">
                <div className="p-6 pb-0">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-blue-500" />
                                    One-Click Discovery
                                </DialogTitle>
                                <DialogDescription>
                                    Add your server apps automatically from Docker, the network, or our curated gallery.
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-border">
                                <label className="text-xs font-bold text-muted-foreground uppercase opacity-70">Category:</label>
                                <select
                                    value={importCategory}
                                    onChange={e => setImportCategory(e.target.value)}
                                    className="bg-transparent text-sm font-semibold focus:outline-none"
                                >
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="gallery" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden mt-6">
                    <div className="px-6 border-b border-border/50">
                        <TabsList className="bg-transparent border-b-0 gap-6 h-auto p-0">
                            <TabsTrigger value="gallery" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-3 text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> App Gallery
                            </TabsTrigger>
                            <TabsTrigger value="discovery" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-3 text-sm flex items-center gap-2">
                                <Server className="w-4 h-4" /> Network Scan
                            </TabsTrigger>
                            <TabsTrigger value="docker" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-3 text-sm flex items-center gap-2">
                                <Download className="w-4 h-4" /> Docker Socket
                            </TabsTrigger>
                            <TabsTrigger value="json" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 pb-3 text-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4" /> Advanced JSON
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <TabsContent value="gallery" className="mt-0">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search for an app (e.g. Plex, Radarr...)"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/20 border border-border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredGallery.map(app => (
                                        <div key={app.id} className="group bg-black/20 border border-border rounded-xl p-4 flex gap-4 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/5">
                                            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                <img src={`https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${app.icon}.png`} alt={app.name} className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h4 className="font-bold truncate">{app.name}</h4>
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">{app.category}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed opacity-70">{app.description}</p>
                                                <button
                                                    onClick={() => handleGalleryAdd(app)}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition-all"
                                                >
                                                    Add to Dashboard
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="discovery" className="mt-0">
                            <div className="bg-black/20 border border-border rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="font-bold">mDNS Discovery</h4>
                                        <p className="text-xs text-muted-foreground">Scanning your local network for compatible web services.</p>
                                    </div>
                                    <button onClick={fetchDiscovery} className="px-4 py-2 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80 flex items-center gap-2">
                                        Refresh
                                    </button>
                                </div>

                                {discoveredServices.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-border rounded-xl opacity-50">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm">Scanning for services...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {discoveredServices.map((s) => (
                                            <div key={s.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/30 hover:bg-background/60 transition-colors cursor-pointer" onClick={() => toggleServiceSelection(s.name)}>
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedServiceIds.has(s.name) ? 'bg-blue-500 border-blue-500 text-white' : 'border-border'}`}>
                                                    {selectedServiceIds.has(s.name) && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 flex justify-between items-center px-1">
                                                    <div className="font-medium">{s.name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded">{s.url}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-border mt-4">
                                    <button
                                        onClick={handleDiscoveryImport}
                                        disabled={selectedServiceIds.size === 0}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> Import {selectedServiceIds.size} Network Services
                                    </button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="docker" className="mt-0">
                            <div className="bg-black/20 border border-border rounded-xl p-4 space-y-4">
                                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm p-3 rounded-lg mb-2">
                                    <strong>How it works:</strong> This feature connects directly to your host's Docker socket to auto-discover running containers. <br />
                                    <span className="opacity-80"><em>Note:</em> You must map <code>/var/run/docker.sock</code> to the same path inside this container.</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="space-y-1 w-full sm:w-1/2 px-1">
                                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Base Host IP (for links)</label>
                                        <input
                                            type="text"
                                            value={hostIp}
                                            onChange={e => setHostIp(e.target.value)}
                                            className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                    </div>
                                    <button onClick={fetchContainers} className="px-4 py-2 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80 flex items-center gap-2">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
                                        {error}
                                    </div>
                                )}

                                {!loading && !error && containers.length > 0 && (
                                    <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {containers.map((c) => (
                                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/30 hover:bg-background/60 transition-colors cursor-pointer" onClick={() => toggleSelection(c.id)}>
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedIds.has(c.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-border'}`}>
                                                    {selectedIds.has(c.id) && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 flex justify-between items-center px-1">
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded">Port: {c.port || 'N/A'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!loading && !error && containers.length === 0 && (
                                    <div className="text-center p-8 text-muted-foreground text-sm">
                                        No running containers found.
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-border mt-4">
                                    <button
                                        onClick={handleDockerImport}
                                        disabled={selectedIds.size === 0}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> Import {selectedIds.size} Containers
                                    </button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="json" className="mt-0">
                            <div className="bg-black/20 border border-border rounded-xl p-4 space-y-4">
                                <div className="bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm p-3 rounded-lg mb-2 space-y-2">
                                    <p><strong>How to use AI to import your Unraid apps:</strong></p>
                                    <ol className="list-decimal pl-5 space-y-1 opacity-80">
                                        <li>Take a screenshot of your Unraid Docker page.</li>
                                        <li>Open <a href="https://gemini.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 font-semibold hover:underline">Google Gemini</a> and paste the screenshot.</li>
                                        <li>Use this prompt: <code>Extract the apps from this screenshot. Format as raw JSON array: {'['}{'{"name": "App", "url": "http://IP:PORT", "icon": "appname"}'}{']'}</code></li>
                                    </ol>
                                </div>
                                <textarea
                                    value={jsonInput}
                                    onChange={e => setJsonInput(e.target.value)}
                                    className="w-full h-48 rounded-md border border-input bg-background/50 p-4 text-sm font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder={`[\n  {\n    "name": "Plex",\n    "url": "http://192.168.1.100:32400",\n    "icon": "plex"\n  }\n]`}
                                />

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleJsonImport}
                                        disabled={!jsonInput.trim()}
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> Process & Import JSON
                                    </button>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
