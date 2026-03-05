import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { GlanceWidget } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, FileWarning } from 'lucide-react';

function ClockWidget({ isEditMode, isLarge }: { isEditMode?: boolean, isLarge?: boolean }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`flex-shrink-0 ${isLarge ? 'w-[400px]' : 'w-[240px]'} h-28 bg-card/60 rounded-xl border border-border/50 p-5 flex flex-col justify-center backdrop-blur-md shadow-sm snap-start ${isEditMode ? 'cursor-grab active:cursor-grabbing border-primary ring-4 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/80 transition-all font-medium ring-offset-2 ring-offset-background/10' : ''}`}>
            <div className="text-4xl font-black tracking-tighter text-foreground tabular-nums leading-none mb-1">
                {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
        </div>
    );
}

function SystemStatsWidget({ isEditMode, isLarge }: { isEditMode?: boolean, isLarge?: boolean }) {
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
            <div className={`flex flex-col items-center gap-1.5 h-full justify-center ${isLarge ? 'scale-125 mx-2' : ''}`}>
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
        <div className={`flex-shrink-0 ${isLarge ? 'w-[450px]' : 'w-[300px]'} h-28 bg-card/60 rounded-xl border border-border/50 px-6 flex items-center justify-between backdrop-blur-md shadow-sm snap-start ${isEditMode ? 'cursor-grab active:cursor-grabbing border-primary ring-4 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/80 transition-all ring-offset-2 ring-offset-background/10' : ''}`}>
            {ring(stats?.cpu || '0%', 'CPU')}
            {ring(stats?.ram || '0%', 'RAM')}
            {ring(stats?.disk || '0%', 'DSK')}
        </div>
    );
}

function RSSWidget({ widget, isEditMode, isLarge }: { widget: GlanceWidget, isEditMode?: boolean, isLarge?: boolean }) {
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
        <div className={`flex-shrink-0 ${isLarge ? 'w-[600px]' : 'w-[400px]'} h-28 bg-card/60 rounded-xl border border-border/50 p-4 flex flex-col backdrop-blur-md shadow-sm overflow-hidden relative group snap-start ${isEditMode ? 'cursor-grab active:cursor-grabbing border-primary ring-4 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/80 transition-all ring-offset-2 ring-offset-background/10' : ''}`}>
            <div className="flex items-center gap-2 mb-2 text-primary">
                <Icons.Rss className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">{widget.label || 'RSS Feed'}</span>
            </div>
            {loading ? (
                <div className="text-sm flex h-full items-center text-muted-foreground animate-pulse font-medium">Fetching feed...</div>
            ) : items.length > 0 ? (
                <div className="flex flex-col gap-1.5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] absolute top-10 bottom-3 left-4 right-4 text-sm">
                    {items.map((item, i) => (
                        <a key={i} href={isEditMode ? undefined : item.link} target="_blank" rel="noreferrer" className={`block text-muted-foreground hover:text-foreground hover:underline truncate transition-velocity duration-200 leading-tight font-medium opacity-80 hover:opacity-100 ${isEditMode ? 'pointer-events-none' : ''}`}>
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

function WeatherGlanceWidget({ widget, isEditMode, isLarge }: { widget: GlanceWidget, isEditMode?: boolean, isLarge?: boolean }) {
    const [weatherData, setWeatherData] = useState<any>(null);
    const [_loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const location = widget.label; // We'll hijack the 'label' prop to store the location string
    const unit = widget.url === 'C' ? 'C' : 'F'; // We'll hijack the 'url' prop to store the unit ('C' or 'F')

    useEffect(() => {
        if (!location) {
            setError('Location not set');
            return;
        }

        const fetchWeather = async () => {
            setLoading(true);
            setError('');
            try {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    setError('Location not found');
                    setLoading(false);
                    return;
                }

                const { latitude, longitude, name, admin1 } = geoData.results[0];
                const locName = `${name}${admin1 ? `, ${admin1}` : ''}`;
                const tempUnit = unit === 'F' ? 'fahrenheit' : 'celsius';

                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`);
                const weatherInfo = await weatherRes.json();

                if (weatherInfo.current) {
                    setWeatherData({
                        temp: Math.round(weatherInfo.current.temperature_2m),
                        code: weatherInfo.current.weather_code,
                        name: locName
                    });
                }
            } catch (err) {
                console.error("Failed to fetch weather", err);
                setError('Failed to load');
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins
        return () => clearInterval(interval);
    }, [location, unit]);

    const getWeatherIcon = (code: number) => {
        if (code === 0 || code === 1) return <Sun className="text-yellow-500 w-8 h-8" />;
        if (code >= 2 && code <= 4) return <Cloud className="text-gray-400 w-8 h-8" />;
        if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400 w-8 h-8" />;
        if (code >= 71 && code <= 77) return <Snowflake className="text-cyan-300 w-8 h-8" />;
        if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-400 w-8 h-8" />;
        return <Cloud className="text-gray-400 w-8 h-8" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return 'Clear';
        if (code === 1 || code === 2) return 'Partly Cloudy';
        if (code === 3) return 'Overcast';
        if (code === 45 || code === 48) return 'Foggy';
        if (code >= 51 && code <= 67) return 'Rain';
        if (code >= 71 && code <= 77) return 'Snow';
        if (code >= 95 && code <= 99) return 'Thunderstorm';
        return 'Unknown';
    };

    return (
        <div className={`flex-shrink-0 ${isLarge ? 'w-[400px]' : 'w-[280px]'} h-28 bg-card/60 rounded-xl border border-border/50 px-6 py-4 flex items-center gap-5 backdrop-blur-md shadow-sm snap-start ${isEditMode ? 'cursor-grab active:cursor-grabbing border-primary ring-4 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/80 transition-all ring-offset-2 ring-offset-background/10' : ''}`}>
            {weatherData ? (
                <>
                    <div className={isLarge ? 'scale-150 ml-4 mr-2' : ''}>{getWeatherIcon(weatherData.code)}</div>
                    <div className={`flex flex-col ${isLarge ? 'ml-6' : ''}`}>
                        <span className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-bold leading-none`}>{weatherData.temp}°{unit}</span>
                        <span className={`${isLarge ? 'text-sm' : 'text-[11px]'} text-muted-foreground uppercase tracking-widest mt-1 truncate max-w-[150px]`}>{getWeatherDescription(weatherData.code)} &bull; {weatherData.name}</span>
                    </div>
                </>
            ) : error ? (
                <div className="text-sm text-destructive flex items-center justify-center gap-2 w-full"><FileWarning className="w-5 h-5" /> {error}</div>
            ) : (
                <div className="text-sm text-muted-foreground animate-pulse w-full text-center">Loading weather...</div>
            )}
        </div>
    );
}

function SortableWidgetItem({ id, widget, isEditMode }: { id: string, widget: GlanceWidget, isEditMode: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const isLarge = widget.size === 'large';

    return (
        <div ref={setNodeRef} style={style} {...(isEditMode ? attributes : {})} {...(isEditMode ? listeners : {})}>
            {widget.type === 'clock' && <ClockWidget isEditMode={isEditMode} isLarge={isLarge} />}
            {widget.type === 'system_stats' && <SystemStatsWidget isEditMode={isEditMode} isLarge={isLarge} />}
            {widget.type === 'rss' && <RSSWidget widget={widget} isEditMode={isEditMode} isLarge={isLarge} />}
            {widget.type === 'weather' && <WeatherGlanceWidget widget={widget} isEditMode={isEditMode} isLarge={isLarge} />}
            {isEditMode && (
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-primary/20 text-primary backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icons.GripHorizontal className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}

export function GlanceWidgetsRow({ widgets, isEditMode, onWidgetsReorder }: { widgets: GlanceWidget[], isEditMode?: boolean, onWidgetsReorder?: (newArray: GlanceWidget[]) => void }) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    if (!widgets || widgets.length === 0) return null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = widgets.findIndex((w) => w.id === active.id);
            const newIndex = widgets.findIndex((w) => w.id === over.id);
            const newArray = arrayMove(widgets, oldIndex, newIndex);
            if (onWidgetsReorder) {
                onWidgetsReorder(newArray);
            }
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map(w => w.id)} strategy={horizontalListSortingStrategy}>
                <div className={`flex gap-4 overflow-x-auto pb-4 mb-4 ${!isEditMode ? '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory mask-edges' : ''} items-center w-full`}>
                    {widgets.map(w => (
                        <SortableWidgetItem key={w.id} id={w.id} widget={w} isEditMode={!!isEditMode} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}



