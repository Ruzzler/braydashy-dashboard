import React from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { formatIconName } from '../lib/utils';

interface AppItem {
    id: string;
    name: string;
    url: string;
    iconType: 'image' | 'icon';
    icon: string;
    categoryId: string;
}

interface WorkspaceViewerProps {
    app: AppItem;
    onClose: () => void;
}

export function WorkspaceViewer({ app, onClose }: WorkspaceViewerProps) {
    const [isLoading, setIsLoading] = React.useState(true);

    let iconElement = null;
    if (app.iconType === 'image') {
        iconElement = <img src={app.icon} className="w-5 h-5 object-contain" alt={app.name} />;
    } else {
        const iconKey = formatIconName(app.icon);
        const IconComp = (Icons as any)[iconKey] || Icons.Box;
        iconElement = <IconComp className="w-5 h-5 text-foreground" />;
    }

    const openInNewTab = () => {
        window.open(app.url, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Top Navigation Bar */}
            <div className="h-14 flex-shrink-0 border-b border-border/50 bg-card/50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center border border-border/50">
                        {iconElement}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-tight leading-none text-foreground">{app.name}</h2>
                        <a href={app.url} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5">
                            {new URL(app.url).host} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={openInNewTab}
                        className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 flex items-center gap-1.5 transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in New Tab
                    </button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* IFrame Container */}
            <div className="flex-1 w-full bg-white relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
                <iframe
                    src={app.url}
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                />
            </div>
        </div>
    );
}
