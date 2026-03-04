import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { GlanceWidget } from '../data/apps';

function ClockWidget() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex-shrink-0 w-[240px] h-28 bg-card/60 rounded-xl border border-border/50 p-5 flex flex-col justify-center backdrop-blur-md shadow-sm snap-start">
            <div className="text-4xl font-black tracking-tighter text-foreground tabular-nums leading-none mb-1">
                {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
        </div>
    );
}

function SystemStatsWidget() {
    const [stats, setStats] = useState<{ cpu: string, ram: string, disk: string } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system/status');
                if (res.ok) setStats(await res.json());
            } catch (e) { }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const ring = (val: string, label: string) => {
        const pct = parseInt(val) || 0;
        return (
            <div className="flex flex-col items-center gap-1.5 h-full justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-foreground/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-primary transition-all duration-1000 ease-out" strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <text x="18" y="22" className="text-[10px] fill-foreground font-bold font-mono" textAnchor="middle">{pct}%</text>
                </svg>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
        )
    };

    return (
        <div className="flex-shrink-0 w-[300px] h-28 bg-card/60 rounded-xl border border-border/50 px-6 flex items-center justify-between backdrop-blur-md shadow-sm snap-start">
            {ring(stats?.cpu || '0%', 'CPU')}
            {ring(stats?.ram || '0%', 'RAM')}
            {ring(stats?.disk || '0%', 'DSK')}
        </div>
    );
}

function RSSWidget({ widget }: { widget: GlanceWidget }) {
    const [items, setItems] = useState<{ title: string, link: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!widget.url) { setLoading(false); return; }
        const fetchRSS = async () => {
            try {
                const res = await fetch(`/api/rss?url=${encodeURIComponent(widget.url!)}`);
                const data = await res.json();
                if (data.success && data.items) {
                    setItems(data.items);
                }
            } catch (e) { }
            setLoading(false);
        };
        fetchRSS();
        const interval = setInterval(fetchRSS, 300000); // 5 mins
        return () => clearInterval(interval);
    }, [widget.url]);

    return (
        <div className="flex-shrink-0 w-[400px] h-28 bg-card/60 rounded-xl border border-border/50 p-4 flex flex-col backdrop-blur-md shadow-sm overflow-hidden relative group snap-start">
            <div className="flex items-center gap-2 mb-2 text-primary">
                <Icons.Rss className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">{widget.label || 'RSS Feed'}</span>
            </div>
            {loading ? (
                <div className="text-sm flex h-full items-center text-muted-foreground animate-pulse font-medium">Fetching feed...</div>
            ) : items.length > 0 ? (
                <div className="flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] absolute top-10 bottom-3 left-4 right-4 text-sm">
                    {items.map((item, i) => (
                        <a key={i} href={item.link} target="_blank" rel="noreferrer" className="block text-muted-foreground hover:text-foreground hover:underline truncate transition-colors leading-tight font-medium opacity-80 hover:opacity-100">
                            • {item.title}
                        </a>
                    ))}
                </div>
            ) : (
                <div className="text-sm flex h-full items-center text-muted-foreground opacity-50 font-medium">No items found.</div>
            )}
        </div>
    );
}

export function GlanceWidgetsRow({ widgets }: { widgets: GlanceWidget[] }) {
    if (!widgets || widgets.length === 0) return null;

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory items-center w-full mask-edges">
            {widgets.map(w => {
                if (w.type === 'clock') return <ClockWidget key={w.id} />;
                if (w.type === 'system_stats') return <SystemStatsWidget key={w.id} />;
                if (w.type === 'rss') return <RSSWidget key={w.id} widget={w} />;
                return null;
            })}
        </div>
    );
}
