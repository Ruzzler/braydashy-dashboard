import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { formatIconName } from '../lib/utils';
import { AppItem } from '../types';

interface AppCardProps {
    app: AppItem;
    style?: string;
    layout?: string;
    size?: string;
    onOpenWorkspace?: (app: AppItem) => void;
    isEditMode?: boolean;
}

export function AppCard({ app, style = 'glass', layout = 'grid', size = 'medium', onOpenWorkspace, isEditMode }: AppCardProps) {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [latency, setLatency] = useState<number | null>(null);
    const [stats, setStats] = useState<{ id: string; label: string; value: string; color: string }[] | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/${app.id}/status`);
                if (res.ok) {
                    const data = await res.json();
                    setIsOnline(data.online);
                    setLatency(data.latency ?? null);
                    if (data.stats) setStats(data.stats);
                } else {
                    setIsOnline(false);
                }
            } catch {
                setIsOnline(false);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [app.id]);

    const isMinimal = layout === 'minimal';
    const isList = layout === 'list';

    const sizeClasses = {
        small: {
            card: isMinimal ? 'p-3' : isList ? 'p-3 gap-3' : 'p-4 gap-3',
            iconBox: 'w-10 h-10',
            iconAsset: 'w-5 h-5',
            title: 'text-base',
            stats: 'text-[10px]'
        },
        medium: {
            card: isMinimal ? 'p-4' : isList ? 'p-4 gap-4' : 'p-6 gap-5',
            iconBox: isMinimal ? 'w-14 h-14' : 'w-14 h-14',
            iconAsset: 'w-8 h-8',
            title: 'text-lg',
            stats: 'text-xs'
        },
        large: {
            card: isMinimal ? 'p-6' : isList ? 'p-5 gap-6' : 'p-8 gap-6',
            iconBox: isMinimal ? 'w-20 h-20' : 'w-16 h-16',
            iconAsset: 'w-10 h-10',
            title: 'text-xl',
            stats: 'text-sm'
        }
    };
    const activeSizes = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.medium;

    let iconElement: React.ReactNode = null;
    if (app.iconType === 'image') {
        iconElement = (
            <img
                src={app.icon}
                className={`${activeSizes.iconAsset} object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110`}
                alt={app.name}
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${app.name}&background=random&color=fff&rounded=true&bold=true`;
                }}
            />
        );
    } else {
        const iconKey = formatIconName(app.icon);
        const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || Icons.Box;
        iconElement = <IconComp className={`${activeSizes.iconAsset} text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground`} />;
    }

    let baseClasses = `group relative rounded-2xl flex items-center transition-all duration-500 overflow-hidden cursor-pointer no-underline ${activeSizes.card}`;
    baseClasses += isMinimal ? ' justify-center' : ' justify-start';

    const fillClasses: Record<string, string> = {
        glass: 'bg-card/40 border-border/50 backdrop-blur-xl hover:bg-card/80 hover:border-primary/50 border hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1',
        solid: 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 border shadow-sm hover:shadow-md hover:-translate-y-1',
        outline: 'bg-transparent border-2 border-border/50 hover:border-primary hover:bg-primary/5 hover:-translate-y-1'
    };
    const activeFill = fillClasses[style] || fillClasses.glass;

    const iconBase = `${activeSizes.iconBox} flex items-center justify-center rounded-xl flex-shrink-0 relative z-10 transition-colors duration-300`;
    const iconStyles: Record<string, string> = {
        glass: 'bg-background/50 border border-border/50 shadow-inner group-hover:bg-primary/10 group-hover:border-primary/30',
        solid: 'bg-muted border border-border shadow-sm group-hover:bg-primary/10 group-hover:border-primary/30',
        outline: 'bg-card/50 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30'
    };
    const currentIconStyle = iconStyles[style] || iconStyles.glass;

    const handleClick = (e: React.MouseEvent) => {
        if (isEditMode) {
            e.preventDefault();
            return;
        }
        if (onOpenWorkspace) {
            e.preventDefault();
            onOpenWorkspace(app);
        }
    };

    const visibleStats = stats?.filter(s => {
        if (app.widgetPreferences === undefined) return true;
        return app.widgetPreferences.includes(s.id);
    });

    return (
        <a
            href={isEditMode ? undefined : app.url}
            target="_blank"
            rel="noreferrer"
            onClick={handleClick}
            className={`${baseClasses} ${activeFill} ${isEditMode ? 'cursor-grab active:cursor-grabbing border-primary ring-4 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]' : ''}`}
            title={isMinimal ? app.name : ''}
        >
            {/* Light sweep effect */}
            {style === 'glass' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />}

            <div className={`${iconBase} ${currentIconStyle}`}>
                {iconElement}
            </div>

            {!isMinimal && (
                <div className={`flex flex-col gap-1 relative z-10 w-full ${isList ? 'flex-row items-center justify-between gap-4' : ''}`}>
                    <h3 className={`${activeSizes.title} font-semibold leading-tight m-0 tracking-tight text-foreground transition-colors group-hover:text-primary whitespace-nowrap overflow-hidden text-ellipsis ${isList ? 'flex-shrink-0 w-1/4' : ''}`}>
                        {app.name}
                    </h3>
                    <p className={`${activeSizes.stats} text-muted-foreground flex items-center justify-between gap-1.5 w-full ${isList ? 'flex-1' : ''}`}>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                            {isOnline === null ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Checking...</>
                            ) : isOnline ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online {latency !== null && !isList && <span className="opacity-60 text-[10px] ml-0.5 font-mono tracking-wider">({latency}ms)</span>}</>
                            ) : (
                                <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline</>
                            )}
                        </span>
                        {visibleStats && visibleStats.length > 0 && (
                            <span className={`flex gap-2 font-mono opacity-80 flex-wrap justify-end ${isList ? 'flex-1' : 'mt-1 sm:mt-0'}`}>
                                {visibleStats.map((s, i) => (
                                    <span key={i} className="flex gap-1"><span style={{ color: s.color }}>{s.label}:</span>{s.value}</span>
                                ))}
                            </span>
                        )}
                    </p>
                </div>
            )}
        </a>
    );
}
