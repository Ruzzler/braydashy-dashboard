import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, ExternalLink } from 'lucide-react';

interface AppItem {
    id: string;
    name: string;
    url: string;
    iconType: 'image' | 'icon';
    icon: string;
}

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    apps: AppItem[];
}

export function CommandPalette({ open, onOpenChange, apps }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            // Slight delay to allow modal to mount before focusing
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Filter apps based on query
    const filteredApps = apps.filter(app =>
        app.name.toLowerCase().includes(query.toLowerCase())
    );

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredApps.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredApps.length > 0) {
                const selectedApp = filteredApps[selectedIndex];
                onOpenChange(false);
                window.open(selectedApp.url, '_blank');
            }
        }
    };

    // Keep selected index valid when filtering changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-2xl border-border/50 shadow-2xl gap-0">
                <div className="sr-only">
                    <DialogTitle>Command Palette</DialogTitle>
                    <DialogDescription>Search and launch your local dashboard applications.</DialogDescription>
                </div>
                <div className="flex items-center px-4 py-3 border-b border-border/50 bg-background/50">
                    <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search for an app..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none text-base outline-none placeholder:text-muted-foreground text-foreground"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                        <span>ESC</span>
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted">
                    {filteredApps.length === 0 ? (
                        <div className="py-14 text-center text-sm text-muted-foreground">
                            No applications found.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {filteredApps.map((app, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <button
                                        key={app.id}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        onClick={() => {
                                            onOpenChange(false);
                                            window.open(app.url, '_blank');
                                        }}
                                        className={`flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors cursor-pointer w-full text-left
                                            ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {app.iconType === 'image' && app.icon ? (
                                                <img
                                                    src={app.icon}
                                                    className="w-6 h-6 object-contain rounded shadow-sm"
                                                    alt=""
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=random&color=fff&rounded=true&bold=true`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-6 h-6 flex items-center justify-center bg-primary/20 text-primary rounded border border-primary/20 shadow-inner">
                                                    <span className="text-[10px] font-bold uppercase">
                                                        {app.name.substring(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="font-medium">{app.name}</span>
                                        </div>
                                        <ExternalLink className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border/30 bg-background/30">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <span className="bg-muted px-1 rounded">↑</span>
                            <span className="bg-muted px-1 rounded">↓</span>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="bg-muted px-1 rounded">↵</span>
                            to launch
                        </span>
                    </div>
                    <span>Local Apps Only</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
