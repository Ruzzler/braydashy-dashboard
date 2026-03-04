import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Check, Loader2, Sparkles, Server } from 'lucide-react';

interface Container {
    id: string;
    name: string;
    state: string;
    port: string;
    image: string;
}

export function ImportWizardModal({ onImport, categories }: { onImport: (apps: any[]) => void, categories: any[] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [containers, setContainers] = useState<Container[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [jsonInput, setJsonInput] = useState('');
    const [importCategory, setImportCategory] = useState(categories[0]?.id || '');
    const [hostIp, setHostIp] = useState(window.location.hostname);

    // Fetch Docker containers when modal opens
    useEffect(() => {
        if (open) {
            fetchContainers();
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
                // Filter only running containers by default
                const running = data.containers.filter((c: any) => c.state === 'running');
                setContainers(running);
                // Pre-select all running
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

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleDockerImport = () => {
        const appsToImport = containers
            .filter(c => selectedIds.has(c.id))
            .map((c, idx) => {
                const cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return {
                    id: `app-docker-${Date.now()}-${idx}`,
                    name: c.name,
                    url: `http://${hostIp}${c.port ? ':' + c.port : ''}`,
                    iconType: 'image',
                    icon: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${cleanName}.png`,
                    categoryId: importCategory
                };
            });

        if (appsToImport.length > 0) {
            onImport(appsToImport);
            setOpen(false);
        }
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/50 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
                    <Download className="w-4 h-4 mr-2" /> Bulk Import
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Download className="w-6 h-6 text-blue-500" />
                        Import Wizard
                    </DialogTitle>
                    <DialogDescription>
                        Quickly add multiple applications automatically from Docker or via AI JSON data.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col space-y-4 mb-4 mt-2">
                    <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        Import Destination Category:
                    </label>
                    <select
                        value={importCategory}
                        onChange={e => setImportCategory(e.target.value)}
                        className="flex h-10 w-full sm:w-1/2 items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {categories.map((c: any) => (
                            <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">{c.name}</option>
                        ))}
                    </select>
                </div>

                <Tabs defaultValue="docker" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="docker" className="flex items-center gap-2">
                            <Server className="w-4 h-4" /> Docker Socket Auto-Discovery
                        </TabsTrigger>
                        <TabsTrigger value="json" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI JSON Paste (Unraid Paste)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="docker">
                        <div className="bg-black/20 border border-border rounded-xl p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pointer-events-auto">
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
                                            <div className="flex-1 flex justify-between items-center">
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

                    <TabsContent value="json">
                        <div className="bg-black/20 border border-border rounded-xl p-4 space-y-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                Paste the AI-generated JSON array of your Unraid applications here. Ensure it matches the requested format: <code className="bg-black/40 px-1 rounded text-xs text-blue-300">[{`{"name": "App", "url": "http://..", "icon": "appname"}`}]</code>
                            </p>
                            <textarea
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                className="w-full h-64 rounded-md border border-input bg-background/50 p-4 text-sm font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
