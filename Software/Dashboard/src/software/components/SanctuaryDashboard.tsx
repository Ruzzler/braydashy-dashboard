import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { applyLatestRelease } from '../lib/update';
import * as Icons from 'lucide-react';
import { formatIconName } from '../lib/utils';
import { AppItem, HaEntityData, SanctuaryTheme } from '../types';
import { useConfig } from '../context/ConfigContext';
import { SettingsModal } from './SettingsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItem {
    uid: string;
    summary: string;
    status: 'needs_action' | 'completed';
}

interface MealIngredient {
    name: string;
    display?: string;
    note?: string;
}

interface MealieRecipeItem {
    id: string;
    name: string;
    slug: string;
    description?: string;
    recipeServings?: number;
    image?: string;
    tags?: string[];
    category?: string[];
    ingredients?: MealIngredient[];
}

interface MealPlanDay {
    date: string;
    dayLabel: string;
    formattedDate: string;
    mealplanId?: number | null;
    title: string;
    text?: string;
    recipeId?: string | null;
    slug?: string | null;
    servings?: number | null;
    tags?: string[];
    planned: boolean;
}

interface DinnerState {
    tonightTitle: string;
    tonightNotes: string;
    mealplanId?: number | null;
    recipeId?: string | null;
    recipe?: MealieRecipeItem | null;
    mealieUrl: string;
    weekPlan: MealPlanDay[];
    live?: boolean;
}

interface SanctuaryCardProps {
    app: AppItem;
    theme: SanctuaryTheme;
    isCompact?: boolean;
    isEditMode?: boolean;
    haEntity?: HaEntityData;
    onOpenWorkspace?: (app: AppItem) => void;
    bentoSpanClass?: string;
}

function SanctuaryAppCard({
    app,
    theme,
    isCompact = false,
    isEditMode = false,
    haEntity,
    onOpenWorkspace,
    bentoSpanClass = ''
}: SanctuaryCardProps) {
    const { currentProfile } = useConfig();
    const [isOnline, setIsOnline] = useState<boolean | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/${app.id}/status?profile=${encodeURIComponent(currentProfile)}`);
                if (res.ok) {
                    const data = await res.json();
                    setIsOnline(data.online);
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
    }, [app.id, currentProfile]);

    const iconKey = formatIconName(app.icon || 'Box');
    const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || Icons.Box;

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

    const renderIcon = (className: string) => {
        if (app.iconType === 'image' && app.icon) {
            return (
                <img
                    src={app.icon}
                    alt={app.name}
                    className={`${className} object-contain`}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=random&color=fff&rounded=true&bold=true`;
                    }}
                />
            );
        }
        return <IconComp className={className} />;
    };

    // Compact Secondary Dock Card
    if (isCompact) {
        const compactStyles: Record<SanctuaryTheme, string> = {
            editorial: 'bg-white/85 hover:bg-white border-[#E6DFD5] text-[#231F1D]',
            glass: 'bg-white/80 hover:bg-white border-white text-slate-800 shadow-sm backdrop-blur-xl',
            bento: 'bg-white hover:bg-[#F9FBF9] border-[#DCE3DC] text-[#1E2621]',
            velvet: 'bg-[#211E1C] hover:bg-[#2A2623] border-white/10 text-[#FAF5F0]'
        };
        const compactIconStyles: Record<SanctuaryTheme, string> = {
            editorial: 'bg-[#F4EBE1] text-[#B85D3B]',
            glass: 'bg-indigo-500/10 text-indigo-600',
            bento: 'bg-[#E8F2EC] text-[#26382E]',
            velvet: 'bg-amber-500/15 text-amber-300'
        };

        return (
            <a
                href={isEditMode ? undefined : app.url}
                target="_blank"
                rel="noreferrer"
                onClick={handleClick}
                className={`sanctuary-card-lift rounded-2xl px-4 py-3 border flex items-center gap-3 no-underline group ${compactStyles[theme]} ${isEditMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-amber-500/50' : 'cursor-pointer'}`}
            >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${compactIconStyles[theme]}`}>
                    {renderIcon('w-4 h-4')}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{app.name}</div>
                    <div className="text-[11px] opacity-65 truncate">{app.tag || app.description || 'Launch'}</div>
                </div>
                <Icons.ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
        );
    }

    // 1. Warm Editorial Primary Card
    if (theme === 'editorial') {
        return (
            <a
                href={isEditMode ? undefined : app.url}
                target="_blank"
                rel="noreferrer"
                onClick={handleClick}
                className={`sanctuary-card-lift h-full bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-[0_4px_20px_rgb(44,38,35,0.03)] flex flex-col justify-between no-underline group ${isEditMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#B85D3B]' : 'cursor-pointer'}`}
            >
                <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F4EBE1] border border-[#E5D5C5] text-[#B85D3B] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            {renderIcon('w-5 h-5')}
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5B7B6A] bg-[#5B7B6A]/10 px-2.5 py-0.5 rounded-full font-medium flex-shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline === false ? 'bg-amber-500' : 'bg-[#5B7B6A]'}`} />
                            {haEntity?.displayValue ? haEntity.displayValue : 'Ready'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B85D3B] block truncate">
                        {app.tag || 'Home Service'}
                    </span>
                    <h3 className="font-serif-editorial text-xl font-semibold text-[#231F1D] mt-0.5 group-hover:text-[#B85D3B] transition-colors">
                        {app.name}
                    </h3>
                    {app.description && (
                        <p className="text-xs text-[#6E655F] mt-1 leading-relaxed line-clamp-2">
                            {app.description}
                        </p>
                    )}
                </div>
                <div className="mt-3.5 pt-2.5 border-t border-[#F2ECE4] flex items-center justify-between text-[11px] text-[#8C7A6B]">
                    <span className="truncate">{app.tag || 'Local App'}</span>
                    <span className="font-semibold text-[#231F1D] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Open</span>
                        <Icons.ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </a>
        );
    }

    // 2. Daylight Glass Primary Card
    if (theme === 'glass') {
        return (
            <a
                href={isEditMode ? undefined : app.url}
                target="_blank"
                rel="noreferrer"
                onClick={handleClick}
                className={`sanctuary-card-lift h-full bg-white/75 hover:bg-white/95 backdrop-blur-2xl rounded-3xl p-5 border border-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] flex flex-col justify-between no-underline group ${isEditMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500' : 'cursor-pointer'}`}
            >
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {renderIcon('w-5 h-5')}
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                            {haEntity?.displayValue || app.tag || 'Home App'}
                        </span>
                    </div>
                    <h3 className="font-outfit text-lg font-bold text-slate-900">
                        {app.name}
                    </h3>
                    {app.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {app.description}
                        </p>
                    )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                    <span>Launch App</span>
                    <Icons.ArrowUpRight className="w-3.5 h-3.5" />
                </div>
            </a>
        );
    }

    // 3. Cozy Bento Primary Card
    if (theme === 'bento') {
        const isFeatured = app.featured;
        return (
            <a
                href={isEditMode ? undefined : app.url}
                target="_blank"
                rel="noreferrer"
                onClick={handleClick}
                className={`sanctuary-card-lift h-full ${bentoSpanClass} ${isFeatured ? 'bg-[#FFFDF9] border-[#E5DEC9]' : 'bg-white border-[#DCE3DC]'} rounded-3xl p-5 border shadow-sm flex flex-col justify-between no-underline group ${isEditMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#26382E]' : 'cursor-pointer'}`}
            >
                <div>
                    <div className="flex items-start justify-between gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0 ${isFeatured ? 'bg-[#FCECDD] text-[#B85D3B] border-[#F5D5B8]' : 'bg-[#E8F2EC] text-[#26382E] border-[#C8DFD1]'}`}>
                            {renderIcon('w-5 h-5')}
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${isFeatured ? 'bg-[#FCECDD] text-[#B0563B]' : 'bg-[#E8F2EC] text-[#26382E]'}`}>
                            <span>{haEntity?.displayValue || 'Open'}</span>
                            <Icons.ArrowUpRight className="w-3 h-3" />
                        </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block mt-3 ${isFeatured ? 'text-[#C86D51]' : 'text-[#3B6E52]'}`}>
                        {app.tag || 'Home Service'}
                    </span>
                    <h3 className="font-serif-editorial text-xl font-semibold text-[#1E2621] mt-0.5">
                        {app.name}
                    </h3>
                    {app.description && (
                        <p className="text-xs text-[#5A655E] mt-1 leading-relaxed line-clamp-2">
                            {app.description}
                        </p>
                    )}
                </div>
                <div className="mt-3.5 pt-2.5 border-t border-[#EEF2EE] flex items-center justify-between text-[11px] font-semibold text-[#26382E]">
                    <span>Open {app.name}</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
            </a>
        );
    }

    // 4. Velvet Evening Primary Card
    return (
        <a
            href={isEditMode ? undefined : app.url}
            target="_blank"
            rel="noreferrer"
            onClick={handleClick}
            className={`sanctuary-card-lift h-full bg-[#211E1C]/90 hover:bg-[#282422] rounded-2xl p-5 border border-white/10 hover:border-amber-400/40 flex flex-col justify-between no-underline group ${isEditMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-amber-400' : 'cursor-pointer'}`}
        >
            <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        {renderIcon('w-5 h-5')}
                    </div>
                    <span className="text-[11px] text-[#D6C9BE] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                        {haEntity?.displayValue || 'Ready'}
                    </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider block truncate">
                    {app.tag || 'Home Service'}
                </span>
                <h3 className="font-serif-editorial text-xl text-white mt-0.5 group-hover:text-amber-200 transition-colors">
                    {app.name}
                </h3>
                {app.description && (
                    <p className="text-xs text-[#A89C93] mt-1 leading-relaxed line-clamp-2">
                        {app.description}
                    </p>
                )}
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A89C93]">
                <span>{app.tag || 'Local App'}</span>
                <span className="text-amber-300 font-semibold inline-flex items-center gap-1">
                    <span>Open</span>
                    <Icons.ArrowUpRight className="w-3.5 h-3.5" />
                </span>
            </div>
        </a>
    );
}

function SortableSanctuaryCard(props: SanctuaryCardProps & { id: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: props.id,
        disabled: !props.isEditMode
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : ('auto' as const),
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div
            ref={setNodeRef}
            className={props.bentoSpanClass || 'h-full'}
            style={{ ...style, touchAction: props.isEditMode ? 'none' : 'auto' }}
            {...(props.isEditMode ? attributes : {})}
            {...(props.isEditMode ? listeners : {})}
        >
            <SanctuaryAppCard {...props} bentoSpanClass="h-full" />
        </div>
    );
}

const QUICK_DINNER_SUGGESTIONS = [
    'Tacos & Fajitas',
    'Chicken Stir Fry',
    'Homemade Pizza Night',
    'Salmon & Roasted Veggies',
    'Pasta Bolognese',
    'Grilled Burgers',
    'Slow Cooker Chili',
    'Takeout / Date Night'
];

export function SanctuaryDashboard({
    onOpenWorkspace,
    onRunSetup
}: {
    onOpenWorkspace?: (app: AppItem) => void;
    onRunSetup?: () => void;
}) {
    const {
        activeConfig,
        saveConfig,
        currentProfile,
        profiles,
        switchProfile,
        pinnedProfile,
        pinProfileForBrowser
    } = useConfig();

    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [now, setNow] = useState(new Date());
    const [haEntitiesMap, setHaEntitiesMap] = useState<Record<string, HaEntityData>>({});

    // Grocery List Modal & State
    const [groceryModalOpen, setGroceryModalOpen] = useState(false);
    const [groceryItems, setGroceryItems] = useState<TodoItem[]>([]);
    const [newGroceryText, setNewGroceryText] = useState('');
    const [inlineQuickGrocery, setInlineQuickGrocery] = useState('');
    const [editingItemUid, setEditingItemUid] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');

    // Dinner Modal & State (Mealie Integration)
    const [dinnerModalOpen, setDinnerModalOpen] = useState(false);
    const [dinnerState, setDinnerState] = useState<DinnerState>({
        tonightTitle: '',
        tonightNotes: '',
        mealplanId: null,
        recipeId: null,
        recipe: null,
        mealieUrl: 'http://192.168.0.100:9000',
        weekPlan: [],
        live: false
    });
    const [dinnerInputTitle, setDinnerInputTitle] = useState('');
    const [dinnerInputNotes, setDinnerInputNotes] = useState('');
    const [selectedDayDate, setSelectedDayDate] = useState<string>('');
    const [mealieRecipes, setMealieRecipes] = useState<MealieRecipeItem[]>([]);
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [selectedRecipeTag, setSelectedRecipeTag] = useState<string>('all');
    const [activeRecipeDetails, setActiveRecipeDetails] = useState<MealieRecipeItem | null>(null);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [isSavingDinner, setIsSavingDinner] = useState(false);
    const [dinnerModalTab, setDinnerModalTab] = useState<'recipes' | 'custom'>('recipes');
    const [versionInfo, setVersionInfo] = useState<{ updateAvailable?: boolean; latestVersion?: string; currentVersion?: string } | null>(null);
    const [applyingUpdate, setApplyingUpdate] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        const checkVer = async () => {
            try {
                const res = await fetch('/api/version/check');
                if (res.ok) setVersionInfo(await res.json());
            } catch (_) { }
        };
        checkVer();
        const verTimer = setInterval(checkVer, 15000);
        return () => {
            clearInterval(timer);
            clearInterval(verTimer);
        };
    }, []);

    const handleApplyUpdate = async () => {
        setApplyingUpdate(true);
        try {
            await applyLatestRelease();
        } catch (_) {
            setApplyingUpdate(false);
        }
    };

    // Fetch Grocery List (todo.mealie_groceries)
    const fetchGroceries = useCallback(async () => {
        try {
            const res = await fetch(`/api/homeassistant/todo?entityId=todo.mealie_groceries&profile=${encodeURIComponent(currentProfile)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) {
                    setGroceryItems(data.items);
                }
            }
        } catch (_) { }
    }, [currentProfile]);

    // Fetch Tonight's Dinner & Week Plan (Mealie API + calendar.mealie_dinner)
    const fetchDinner = useCallback(async () => {
        try {
            const res = await fetch(`/api/homeassistant/dinner?profile=${encodeURIComponent(currentProfile)}`);
            if (res.ok) {
                const data = await res.json();
                setDinnerState({
                    tonightTitle: data.tonightTitle || '',
                    tonightNotes: data.tonightNotes || '',
                    mealplanId: data.mealplanId || null,
                    recipeId: data.recipeId || null,
                    recipe: data.recipe || null,
                    mealieUrl: data.mealieUrl || 'http://192.168.0.100:9000',
                    weekPlan: data.weekPlan || [],
                    live: data.live
                });
                setDinnerInputTitle(data.tonightTitle || '');
                setDinnerInputNotes(data.tonightNotes || '');
                if (!selectedDayDate && Array.isArray(data.weekPlan) && data.weekPlan.length > 0) {
                    setSelectedDayDate(data.weekPlan[0].date);
                }
            }
        } catch (_) { }
    }, [currentProfile, selectedDayDate]);

    // Fetch All Mealie Recipes for the Interactive Picker
    const fetchMealieRecipes = useCallback(async () => {
        setLoadingRecipes(true);
        try {
            const res = await fetch(`/api/mealie/recipes?limit=100&profile=${encodeURIComponent(currentProfile)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.recipes)) {
                    setMealieRecipes(data.recipes);
                }
            }
        } catch (_) { }
        finally {
            setLoadingRecipes(false);
        }
    }, [currentProfile]);

    useEffect(() => {
        if (dinnerModalOpen) {
            fetchMealieRecipes();
            fetchDinner();
        }
    }, [dinnerModalOpen, fetchMealieRecipes, fetchDinner]);

    // Fetch Home Assistant entities for header & app badges
    useEffect(() => {
        if (!activeConfig) return;
        const appEntityIds = (activeConfig.apps || [])
            .map(a => a.haEntityId)
            .filter((id): id is string => Boolean(id));
        const widgetEntityIds = (activeConfig.glanceWidgets || [])
            .map(w => w.entityId)
            .filter((id): id is string => Boolean(id));
        const allIds = Array.from(new Set([
            ...appEntityIds,
            ...widgetEntityIds,
            'weather.forecast_home',
            'climate.thermostat_ecobee_premium_rumpusroom',
            'lock.side_entry_lock_schlage_be469zp_sideentry',
            'input_datetime.dogs_last_fed_time',
            'todo.mealie_groceries'
        ]));

        const fetchHaBatch = async () => {
            try {
                const res = await fetch(`/api/homeassistant/entities?ids=${encodeURIComponent(allIds.join(','))}&profile=${encodeURIComponent(currentProfile)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.entities) setHaEntitiesMap(data.entities);
                }
            } catch (_) { }
        };
        fetchHaBatch();
        fetchGroceries();
        fetchDinner();

        const interval = setInterval(() => {
            fetchHaBatch();
            fetchGroceries();
            fetchDinner();
        }, 20000);
        return () => clearInterval(interval);
    }, [activeConfig, currentProfile, fetchGroceries, fetchDinner]);

    const handleAddGroceryItem = async (textToAdd: string) => {
        const clean = textToAdd.trim();
        if (!clean) return;
        try {
            const res = await fetch('/api/homeassistant/todo/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: 'todo.mealie_groceries',
                    summary: clean,
                    profile: currentProfile
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) setGroceryItems(data.items);
            }
        } catch (_) { }
    };

    const handleToggleGroceryStatus = async (item: TodoItem) => {
        const nextStatus = item.status === 'completed' ? 'needs_action' : 'completed';
        try {
            const res = await fetch('/api/homeassistant/todo/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: 'todo.mealie_groceries',
                    uid: item.uid,
                    item: item.summary,
                    status: nextStatus,
                    profile: currentProfile
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) setGroceryItems(data.items);
            }
        } catch (_) { }
    };

    const handleSaveGroceryRename = async (item: TodoItem) => {
        const clean = editingItemText.trim();
        setEditingItemUid(null);
        if (!clean || clean === item.summary) return;
        try {
            const res = await fetch('/api/homeassistant/todo/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: 'todo.mealie_groceries',
                    uid: item.uid,
                    item: item.summary,
                    rename: clean,
                    profile: currentProfile
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) setGroceryItems(data.items);
            }
        } catch (_) { }
    };

    const handleRemoveGroceryItem = async (item: TodoItem) => {
        try {
            const res = await fetch('/api/homeassistant/todo/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: 'todo.mealie_groceries',
                    uid: item.uid,
                    item: item.summary,
                    profile: currentProfile
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) setGroceryItems(data.items);
            }
        } catch (_) { }
    };

    const handleClearCompletedGroceries = async () => {
        try {
            const res = await fetch('/api/homeassistant/todo/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityId: 'todo.mealie_groceries',
                    clearCompleted: true,
                    profile: currentProfile
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.items)) setGroceryItems(data.items);
            }
        } catch (_) { }
    };

    // Active Day in the 7-day meal plan
    const activeDay = useMemo(() => {
        if (!dinnerState.weekPlan.length) return null;
        return dinnerState.weekPlan.find(d => d.date === selectedDayDate) || dinnerState.weekPlan[0];
    }, [dinnerState.weekPlan, selectedDayDate]);

    // Fetch Recipe Details & Ingredients when viewing an active recipe
    useEffect(() => {
        if (!dinnerModalOpen) return;
        const currentRecipeSlug = (activeDay && activeDay.date === dinnerState.weekPlan[0]?.date && dinnerState.recipe?.slug)
            ? dinnerState.recipe.slug
            : activeDay?.slug;

        if (currentRecipeSlug) {
            if (activeDay?.date === dinnerState.weekPlan[0]?.date && dinnerState.recipe?.ingredients) {
                setActiveRecipeDetails(dinnerState.recipe);
                return;
            }
            setLoadingRecipeDetails(true);
            fetch(`/api/mealie/recipe/${encodeURIComponent(currentRecipeSlug)}?profile=${encodeURIComponent(currentProfile)}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.recipe) {
                        setActiveRecipeDetails(data.recipe);
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingRecipeDetails(false));
        } else {
            setActiveRecipeDetails(null);
        }
    }, [dinnerModalOpen, activeDay, dinnerState.recipe, dinnerState.weekPlan, currentProfile]);

    const isIngredientInGroceries = useCallback((ingName: string) => {
        const norm = ingName.toLowerCase().trim();
        return groceryItems.some(item =>
            item.status === 'needs_action' &&
            (item.summary.toLowerCase().includes(norm) || norm.includes(item.summary.toLowerCase()))
        );
    }, [groceryItems]);

    const handleToggleIngredientGrocery = async (ingName: string) => {
        const norm = ingName.toLowerCase().trim();
        const existing = groceryItems.find(item =>
            item.summary.toLowerCase().includes(norm) || norm.includes(item.summary.toLowerCase())
        );

        if (existing) {
            if (existing.status === 'needs_action') {
                await handleRemoveGroceryItem(existing);
            } else {
                await handleToggleGroceryStatus(existing);
            }
        } else {
            await handleAddGroceryItem(ingName);
        }
    };

    const handleSelectMealieRecipe = async (recipe: MealieRecipeItem, targetDate?: string) => {
        setIsSavingDinner(true);
        const dateToSet = targetDate || selectedDayDate || dinnerState.weekPlan[0]?.date || '';
        try {
            await fetch('/api/mealie/dinner/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateToSet,
                    recipeId: recipe.id,
                    profile: currentProfile
                })
            });
            await fetchDinner();
        } catch (_) {}
        finally {
            setIsSavingDinner(false);
        }
    };

    const handleSaveDinner = async (titleOverride?: string, notesOverride?: string) => {
        const nextTitle = titleOverride !== undefined ? titleOverride : dinnerInputTitle;
        const nextNotes = notesOverride !== undefined ? notesOverride : dinnerInputNotes;
        if (!nextTitle.trim()) return;
        setIsSavingDinner(true);
        const targetDate = selectedDayDate || dinnerState.weekPlan[0]?.date || '';
        try {
            await fetch('/api/mealie/dinner/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: targetDate,
                    title: nextTitle.trim(),
                    text: nextNotes.trim(),
                    profile: currentProfile
                })
            });
            await fetchDinner();
            setDinnerInputTitle('');
            setDinnerInputNotes('');
        } catch (_) { }
        finally {
            setIsSavingDinner(false);
        }
    };

    const handleClearDinnerForDate = async (targetDate?: string, mealplanId?: number | null) => {
        setIsSavingDinner(true);
        const dateToClear = targetDate || selectedDayDate || dinnerState.weekPlan[0]?.date || '';
        try {
            await fetch('/api/mealie/dinner/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateToClear,
                    mealplanId: mealplanId || activeDay?.mealplanId,
                    profile: currentProfile
                })
            });
            await fetchDinner();
            setActiveRecipeDetails(null);
        } catch (_) {}
        finally {
            setIsSavingDinner(false);
        }
    };

    const handleRandomDinner = async (targetDate?: string) => {
        setIsSavingDinner(true);
        const dateToSet = targetDate || selectedDayDate || dinnerState.weekPlan[0]?.date || '';
        try {
            await fetch('/api/mealie/dinner/random', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateToSet,
                    profile: currentProfile
                })
            });
            await fetchDinner();
        } catch (_) {}
        finally {
            setIsSavingDinner(false);
        }
    };

    const filteredRecipes = useMemo(() => {
        let list = mealieRecipes;
        if (recipeSearch.trim()) {
            const query = recipeSearch.toLowerCase().trim();
            list = list.filter(r =>
                r.name.toLowerCase().includes(query) ||
                (r.description && r.description.toLowerCase().includes(query)) ||
                (r.tags && r.tags.some(t => t.toLowerCase().includes(query)))
            );
        }
        if (selectedRecipeTag !== 'all') {
            list = list.filter(r =>
                (r.tags && r.tags.some(t => t.toLowerCase() === selectedRecipeTag.toLowerCase())) ||
                (r.category && r.category.some(c => c.toLowerCase() === selectedRecipeTag.toLowerCase()))
            );
        }
        return list;
    }, [mealieRecipes, recipeSearch, selectedRecipeTag]);

    const availableRecipeTags = useMemo(() => {
        const set = new Set<string>();
        mealieRecipes.forEach(r => {
            (r.tags || []).forEach(t => set.add(t));
        });
        return Array.from(set).slice(0, 8);
    }, [mealieRecipes]);

    const handleLogDogsFed = async () => {
        try {
            const res = await fetch('/api/homeassistant/dogs-fed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: currentProfile })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.entity) {
                    setHaEntitiesMap(prev => ({
                        ...prev,
                        'input_datetime.dogs_last_fed_time': data.entity
                    }));
                }
            }
        } catch (_) { }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const sortedCategories = useMemo(() => {
        if (!activeConfig) return [];
        return [...activeConfig.categories].sort((a, b) => a.order - b.order);
    }, [activeConfig]);

    if (!activeConfig) return null;

    const theme: SanctuaryTheme = activeConfig.sanctuaryTheme || 'editorial';
    const greetingName = activeConfig.greetingName?.trim() || '';
    const portalSubtitle = activeConfig.portalSubtitle || activeConfig.serverName || 'Home Hub';

    const hour = now.getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const formattedDate = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const enabledWidgets = activeConfig.glanceWidgets || [];
    const showDinnerCard = enabledWidgets.some(w => w.entityId === 'calendar.mealie_dinner');
    const showGroceryCard = enabledWidgets.some(w => w.entityId === 'todo.mealie_groceries');
    const statusPillWidgets = enabledWidgets.filter(
        w => w.entityId !== 'calendar.mealie_dinner' && w.entityId !== 'todo.mealie_groceries'
    );

    const neededGroceries = groceryItems.filter(i => i.status === 'needs_action');
    const completedGroceries = groceryItems.filter(i => i.status === 'completed');

    const renderStatusCapsule = () => {
        if (statusPillWidgets.length === 0) return null;

        const capsuleThemeClasses: Record<SanctuaryTheme, string> = {
            editorial: 'bg-white/90 border-[#E6DFD5] text-[#5C534E] divide-x divide-[#E6DFD5]',
            glass: 'bg-white/80 backdrop-blur-xl border-white text-slate-700 divide-x divide-slate-200/80',
            bento: 'bg-white/90 border-[#DCE3DC] text-[#26382E] divide-x divide-[#DCE3DC]',
            velvet: 'bg-[#211E1C]/90 border-white/10 text-[#D6C9BE] divide-x divide-white/10'
        };

        return (
            <div className="flex justify-center mb-3.5">
                <div className={`inline-flex flex-wrap items-center justify-center rounded-full border px-1.5 py-1 shadow-sm text-xs ${capsuleThemeClasses[theme]}`}>
                    {statusPillWidgets.map(widget => {
                        const entityId = widget.entityId || '';
                        const entity = haEntitiesMap[entityId];
                        const iconKey = formatIconName(widget.icon || 'Activity');
                        const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || Icons.Activity;

                        if (entityId === 'input_datetime.dogs_last_fed_time') {
                            return (
                                <button
                                    key={widget.id}
                                    type="button"
                                    onClick={handleLogDogsFed}
                                    title="Click to log Dogs Fed right now"
                                    className="h-7 px-3 inline-flex items-center gap-1.5 leading-none hover:opacity-100 opacity-90 transition-opacity"
                                >
                                    <Icons.Heart className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                    <span>Dogs Fed: <strong className="font-semibold">{entity ? `${entity.subtitle} ${entity.displayValue}` : '...'}</strong></span>
                                </button>
                            );
                        }

                        if (entityId === 'weather.forecast_home' || widget.type === 'weather') {
                            const weather = entity || haEntitiesMap['weather.forecast_home'];
                            return (
                                <span key={widget.id} className="h-7 px-3 inline-flex items-center gap-1.5 leading-none">
                                    <IconComp className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                                    <strong className="font-semibold">{weather?.displayValue || '...'}</strong>
                                    {weather?.subtitle && <span className="opacity-75 hidden sm:inline">· {weather.subtitle}</span>}
                                </span>
                            );
                        }

                        if (entityId === 'climate.thermostat_ecobee_premium_rumpusroom') {
                            return (
                                <span key={widget.id} className="h-7 px-3 inline-flex items-center gap-1.5 leading-none">
                                    <IconComp className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                                    <span>Inside <strong className="font-semibold">{entity?.displayValue || '...'}</strong></span>
                                </span>
                            );
                        }

                        return (
                            <span key={widget.id} className="h-7 px-3 inline-flex items-center gap-1.5 leading-none">
                                <IconComp className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                                <span>{widget.label || entity?.friendlyName || 'Status'}: <strong className="font-semibold">{entity?.displayValue || '...'}</strong></span>
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    const executeSearch = (rawQuery: string) => {
        const q = rawQuery.trim();
        if (!q) return;

        const searchProviders = activeConfig.searchProviders || [];
        const defaultProviderId = activeConfig.defaultSearchProvider || 'google';

        let searchUrl = '';
        const providerWithPrefix = searchProviders.find(p => q.startsWith(p.prefix + ' '));
        if (providerWithPrefix) {
            const actualQuery = q.substring(providerWithPrefix.prefix.length + 1).trim();
            searchUrl = providerWithPrefix.url.replace('{query}', encodeURIComponent(actualQuery));
        } else {
            const defaultProvider = searchProviders.find(p => p.id === defaultProviderId) || searchProviders[0];
            searchUrl = defaultProvider
                ? defaultProvider.url.replace('{query}', encodeURIComponent(q))
                : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        }

        window.open(searchUrl, '_blank');
        setSearchQuery('');
    };

    const handleAppReorder = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id === over?.id || !over) return;
        const oldIndex = activeConfig.apps.findIndex(a => a.id === active.id);
        const newIndex = activeConfig.apps.findIndex(a => a.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
            saveConfig({ ...activeConfig, apps: arrayMove(activeConfig.apps, oldIndex, newIndex) });
        }
    };

    const bgClasses: Record<SanctuaryTheme, string> = {
        editorial: 'sanctuary-editorial-bg text-[#2C2623]',
        glass: 'sanctuary-glass-bg text-slate-800',
        bento: 'sanctuary-bento-bg text-[#1E2621]',
        velvet: 'sanctuary-velvet-bg text-[#F5EFEA]'
    };

    const primaryCategory = sortedCategories[0];
    const secondaryCategories = sortedCategories.slice(1);
    const primaryApps = primaryCategory
        ? activeConfig.apps.filter(a => a.categoryId === primaryCategory.id)
        : activeConfig.apps;

    const searchChips = activeConfig.quickSearchChips && activeConfig.quickSearchChips.length > 0
        ? activeConfig.quickSearchChips
        : ['Dinner recipe ideas', '3D print models', 'Local weather forecast'];

    // Theme-matched styles for the interactive Dinner & Grocery strip cards
    const actionCardSurface: Record<SanctuaryTheme, string> = {
        editorial: 'bg-white rounded-2xl border-[#E6DFD5] text-[#231F1D] shadow-[0_4px_20px_rgb(44,38,35,0.03)]',
        glass: 'bg-white/80 hover:bg-white/95 rounded-3xl backdrop-blur-2xl border-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.05)]',
        bento: 'bg-white rounded-3xl border-[#DCE3DC] text-[#1E2621] shadow-sm',
        velvet: 'bg-[#211E1C]/90 hover:bg-[#282422] rounded-2xl border-white/10 text-[#FAF5F0]'
    };

    const actionIconSurface: Record<SanctuaryTheme, string> = {
        editorial: 'bg-[#F4EBE1] text-[#B85D3B] border-[#E5D5C5]',
        glass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        bento: 'bg-[#E8F2EC] text-[#26382E] border-[#C8DFD1]',
        velvet: 'bg-amber-500/15 text-amber-300 border-amber-400/30'
    };

    return (
        <div className={`min-h-screen w-full font-jakarta transition-colors duration-500 ${bgClasses[theme]} px-4 sm:px-8 py-5 md:py-7 flex flex-col justify-between`}>
            <div className="max-w-6xl w-full mx-auto space-y-5">

                {/* ========================================================= */}
                {/* 1. TOP HEADER BAR: CLEAN SINGLE ROW (LEFT vs RIGHT)       */}
                {/* ========================================================= */}
                <header className={`flex items-center justify-between gap-4 pb-3.5 border-b ${
                    theme === 'velvet' ? 'border-white/10 text-[#9E9289]' :
                    theme === 'glass' ? 'bg-white/70 backdrop-blur-xl border-white/80 rounded-2xl px-5 py-2.5 shadow-sm text-slate-600' :
                    theme === 'bento' ? 'border-[#DCE3DC] text-[#5C7065]' :
                    'border-[#E6DFD5] text-[#7A6F67]'
                }`}>
                    {/* Left: Portal Identity + Date & Time */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${theme === 'velvet' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-emerald-600'}`} />
                            <span className={`text-sm font-bold tracking-tight leading-none truncate ${theme === 'velvet' ? 'text-[#FAF5F0]' : theme === 'glass' ? 'text-slate-900' : 'text-[#231F1D]'}`}>
                                {portalSubtitle}
                            </span>
                        </div>
                        <span className="hidden sm:inline-block h-3.5 w-px bg-current/20 flex-shrink-0" />
                        <span className="hidden sm:inline-block text-xs font-medium leading-none opacity-80 truncate">
                            {formattedDate} · {formattedTime}
                        </span>
                    </div>

                    {/* Right: Unified 36px (h-9) Control Bar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {versionInfo?.updateAvailable && (
                            <button
                                type="button"
                                onClick={handleApplyUpdate}
                                disabled={applyingUpdate}
                                title="Install the newest BrayDashy release"
                                className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all animate-pulse"
                            >
                                <Icons.ArrowDownCircle className="w-3.5 h-3.5" />
                                <span>{applyingUpdate ? 'Updating...' : `Update Ready (${versionInfo.latestVersion || 'New'})`}</span>
                            </button>
                        )}
                        {/* Unified Profile Selector + Pin Capsule */}
                        <div className={`h-9 inline-flex items-center rounded-full border shadow-sm overflow-hidden ${
                            theme === 'velvet'
                                ? 'bg-[#211E1C] border-white/15 text-[#FAF5F0]'
                                : 'bg-white/85 border-black/10 text-neutral-800'
                        }`}>
                            <select
                                value={currentProfile}
                                onChange={(e) => switchProfile(e.target.value)}
                                title="Switch Dashboard Profile"
                                className={`h-full text-xs font-semibold pl-3.5 pr-2 focus:outline-none cursor-pointer ${
                                    theme === 'velvet' ? 'bg-[#211E1C] text-[#FAF5F0]' : 'bg-transparent text-neutral-800'
                                }`}
                            >
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => pinProfileForBrowser(pinnedProfile === currentProfile ? 'default' : currentProfile)}
                                title={pinnedProfile === currentProfile && currentProfile !== 'default'
                                    ? 'Pinned as default for this browser (Click to unpin)'
                                    : 'Set this profile as default for this browser'}
                                className={`h-full px-2.5 inline-flex items-center justify-center border-l transition-colors ${
                                    pinnedProfile === currentProfile && currentProfile !== 'default'
                                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-300'
                                        : theme === 'velvet'
                                            ? 'border-white/10 text-[#9E9289] hover:text-white hover:bg-white/5'
                                            : 'border-black/10 text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                                }`}
                            >
                                <Icons.Pin className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Edit Layout Button (Exact h-9 w-9 circle) */}
                        <button
                            type="button"
                            onClick={() => setIsEditMode(!isEditMode)}
                            title={isEditMode ? 'Done Rearranging' : 'Rearrange Cards'}
                            className={`h-9 w-9 rounded-full border inline-flex items-center justify-center transition-all shadow-sm ${
                                isEditMode
                                    ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                                    : theme === 'velvet'
                                        ? 'bg-white/10 border-white/15 text-[#D6C9BE] hover:bg-white/15'
                                        : 'bg-white/85 border-black/10 text-neutral-700 hover:bg-white'
                            }`}
                        >
                            {isEditMode ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.LayoutGrid className="w-3.5 h-3.5" />}
                        </button>

                        {/* Settings Modal Trigger (Exact h-9 pill) */}
                        <SettingsModal onRunSetup={onRunSetup} triggerLabel="Customize" />
                    </div>
                </header>

                {/* ========================================================= */}
                {/* 2. GREETING + UNIFIED HOME STATUS BAR + GOOGLE SEARCH     */}
                {/* ========================================================= */}
                {theme === 'bento' ? (
                    <div className="space-y-3">
                        {/* Centered Home Status Capsule for Bento */}
                        {renderStatusCapsule()}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-5 bg-[#26382E] text-[#F4F6F3] rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                                <div className="flex items-center justify-between text-xs text-[#A3B8AC]">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <Icons.Sparkles className="w-3.5 h-3.5 text-[#E4C59E]" />
                                        <span>{portalSubtitle}</span>
                                    </span>
                                    <span>{formattedDate}</span>
                                </div>
                                <div className="my-2">
                                    <h1 className="font-serif-editorial text-2xl md:text-3xl font-normal leading-snug">
                                        {salutation}{greetingName ? <>, <span className="italic text-[#E4C59E]">{greetingName}</span></> : ''}.
                                    </h1>
                                    <p className="text-xs text-[#C5D6CC] mt-1">
                                        Everything at home is right at your fingertips.
                                    </p>
                                </div>
                            </div>

                            <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#DCE3DC] flex flex-col justify-between shadow-sm">
                                <form onSubmit={(e) => { e.preventDefault(); executeSearch(searchQuery); }}>
                                    <div className="flex items-center bg-[#F5F7F5] rounded-2xl border border-[#D5DFD7] focus-within:border-[#26382E] focus-within:bg-white transition-all p-1.5 pl-4">
                                        <GoogleLogoIcon />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search Google for anything..."
                                            className="w-full bg-transparent text-[#1E2621] placeholder-[#7C8C82] text-sm md:text-base focus:outline-none"
                                        />
                                        <button type="submit" className="px-4 py-2 rounded-xl bg-[#26382E] text-white text-xs font-semibold hover:bg-[#375243] transition-colors flex-shrink-0">
                                            Search
                                        </button>
                                    </div>
                                </form>
                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-[#7C8C82] mr-1">Quick search:</span>
                                    {searchChips.map((chip, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => executeSearch(chip)}
                                            className="text-[11px] bg-[#F2F4F1] hover:bg-[#E3EAE4] text-[#35473D] px-2.5 py-0.5 rounded-full transition-colors"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center max-w-3xl mx-auto">
                        {/* Centered Unified Home Status Capsule */}
                        {renderStatusCapsule()}

                        <h1 className={`${theme === 'glass' ? 'font-outfit font-bold' : 'font-serif-editorial font-normal'} text-3xl md:text-4xl tracking-tight mb-4`}>
                            {salutation}{greetingName ? (
                                <>, <span className={`${theme === 'glass' ? 'text-indigo-600' : theme === 'velvet' ? 'italic text-amber-300' : 'italic text-[#B85D3B]'}`}>{greetingName}</span></>
                            ) : ''}.
                        </h1>

                        <form onSubmit={(e) => { e.preventDefault(); executeSearch(searchQuery); }} className="max-w-2xl mx-auto">
                            <div className={`flex items-center transition-all p-1.5 pl-4 ${
                                theme === 'velvet'
                                    ? 'bg-[#221F1D] rounded-2xl border border-white/10 shadow-xl focus-within:border-amber-400/50'
                                    : theme === 'glass'
                                        ? 'bg-white/85 backdrop-blur-2xl rounded-full border border-white shadow-[0_10px_30px_rgba(15,23,42,0.07)] focus-within:ring-4 focus-within:ring-indigo-500/15'
                                        : 'bg-white rounded-2xl border border-[#DFD7CC] shadow-[0_6px_24px_rgb(44,38,35,0.05)] focus-within:border-[#B85D3B] focus-within:ring-4 focus-within:ring-[#B85D3B]/10'
                            }`}>
                                <GoogleLogoIcon />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Google or type a question..."
                                    className={`w-full bg-transparent text-sm md:text-base focus:outline-none ${
                                        theme === 'velvet' ? 'text-[#FAF5F0] placeholder-[#786E67]' : 'text-neutral-800 placeholder-neutral-400'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    className={`ml-2 px-4 py-2 text-xs font-semibold transition-colors flex-shrink-0 inline-flex items-center gap-1.5 ${
                                        theme === 'velvet'
                                            ? 'rounded-xl bg-amber-400 text-[#161413] hover:bg-amber-300'
                                            : theme === 'glass'
                                                ? 'rounded-full bg-slate-900 text-white hover:bg-indigo-600 px-5 py-2.5'
                                                : 'rounded-xl bg-[#2C2623] text-[#FAF7F2] hover:bg-[#B85D3B]'
                                    }`}
                                >
                                    <span>Search</span>
                                    <Icons.ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </form>

                        {searchChips.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                                {searchChips.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => executeSearch(chip)}
                                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                                            theme === 'velvet'
                                                ? 'bg-white/5 border-white/10 text-[#D6C9BE] hover:bg-white/10'
                                                : 'bg-white/70 border-black/10 text-neutral-600 hover:bg-white hover:text-neutral-900'
                                        }`}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* 3. HOUSEHOLD ACTION STRIP: TONIGHT'S DINNER & GROCERIES   */}
                {/* ========================================================= */}
                {(showDinnerCard || showGroceryCard) && (
                <div className={`grid grid-cols-1 ${showDinnerCard && showGroceryCard ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl mx-auto w-full'} gap-4`}>
                    {/* Card A: Tonight's Dinner */}
                    {showDinnerCard && (
                    <div
                        onClick={() => setDinnerModalOpen(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDinnerModalOpen(true); }}
                        className={`sanctuary-card-lift rounded-2xl p-4 border flex items-center justify-between gap-4 cursor-pointer ${actionCardSurface[theme]}`}
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${actionIconSurface[theme]}`}>
                                <Icons.UtensilsCrossed className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-65">
                                        Tonight's Dinner
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        dinnerState.tonightTitle
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    }`}>
                                        {dinnerState.tonightTitle ? 'Planned' : 'Tap to Set'}
                                    </span>
                                </div>
                                <div className="font-serif-editorial text-lg font-semibold truncate mt-0.5">
                                    {dinnerState.tonightTitle || 'What’s for dinner tonight?'}
                                </div>
                                <div className="text-xs opacity-65 truncate">
                                    {dinnerState.tonightNotes || 'Click to pick a meal or open Mealie planner'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                                theme === 'velvet'
                                    ? 'bg-white/5 border-white/10 text-amber-300 hover:bg-white/10'
                                    : 'bg-black/5 border-black/10 hover:bg-black/10'
                            }`}>
                                {dinnerState.tonightTitle ? 'Change' : 'Plan Dinner'}
                            </span>
                        </div>
                    </div>
                    )}

                    {/* Card B: Interactive Grocery List (Home Assistant todo.mealie_groceries) */}
                    {showGroceryCard && (
                    <div
                        className={`sanctuary-card-lift rounded-2xl p-4 border flex items-center justify-between gap-3 ${actionCardSurface[theme]}`}
                    >
                        <div
                            onClick={() => setGroceryModalOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setGroceryModalOpen(true); }}
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                        >
                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 relative ${actionIconSurface[theme]}`}>
                                <Icons.ShoppingBag className="w-6 h-6" />
                                {neededGroceries.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                        {neededGroceries.length}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-65">
                                        Home Grocery List
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        {neededGroceries.length === 0 ? 'All stocked' : `${neededGroceries.length} needed`}
                                    </span>
                                </div>
                                <div className="font-serif-editorial text-lg font-semibold truncate mt-0.5">
                                    {neededGroceries.length > 0
                                        ? neededGroceries.map(i => i.summary).join(', ')
                                        : 'Grocery list is clear'}
                                </div>
                                <div className="text-xs opacity-65 truncate">
                                    Click to view, check off, or edit items ({completedGroceries.length} completed)
                                </div>
                            </div>
                        </div>

                        {/* Inline Quick-Add + Open List Button */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (inlineQuickGrocery.trim()) {
                                        handleAddGroceryItem(inlineQuickGrocery);
                                        setInlineQuickGrocery('');
                                    } else {
                                        setGroceryModalOpen(true);
                                    }
                                }}
                                className="hidden sm:flex items-center gap-1"
                            >
                                <input
                                    type="text"
                                    value={inlineQuickGrocery}
                                    onChange={(e) => setInlineQuickGrocery(e.target.value)}
                                    placeholder="+ Quick add..."
                                    className={`w-28 lg:w-32 text-xs px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                                        theme === 'velvet'
                                            ? 'bg-black/30 border-white/15 text-white placeholder-white/40'
                                            : 'bg-black/[0.03] border-black/10 text-neutral-800 placeholder-neutral-400 focus:bg-white'
                                    }`}
                                />
                            </form>
                            <button
                                type="button"
                                onClick={() => setGroceryModalOpen(true)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors inline-flex items-center gap-1.5 ${
                                    theme === 'velvet'
                                        ? 'bg-amber-400 text-[#161413] border-amber-400 hover:bg-amber-300'
                                        : 'bg-black/5 border-black/10 hover:bg-black/10'
                                }`}
                            >
                                <span>Open List</span>
                                <Icons.ListChecks className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    )}
                </div>
                )}

                {/* ========================================================= */}
                {/* 4. PRIMARY APPS ROW (4-COLUMN SINGLE-VIEWPORT GRID)       */}
                {/* ========================================================= */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-65">
                            {primaryCategory?.name || 'Everyday Favorites'}
                        </h2>
                        <span className="text-[11px] opacity-55">{primaryApps.length} Apps</span>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAppReorder}>
                        <SortableContext items={primaryApps.map(a => a.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {primaryApps.map((app) => (
                                    <SortableSanctuaryCard
                                        key={app.id}
                                        id={app.id}
                                        app={app}
                                        theme={theme}
                                        isEditMode={isEditMode}
                                        bentoSpanClass="h-full"
                                        haEntity={app.haEntityId ? haEntitiesMap[app.haEntityId] : undefined}
                                        onOpenWorkspace={
                                            activeConfig.enableWorkspaceMode && !app.ignoreWorkspace
                                                ? (appItem) => onOpenWorkspace?.(appItem)
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* ========================================================= */}
                {/* 5. SECONDARY / SHARED HOUSEHOLD MEDIA DOCK                */}
                {/* ========================================================= */}
                {secondaryCategories.map(cat => {
                    const catApps = (activeConfig.apps || []).filter(a => a.categoryId === cat.id);
                    if (catApps.length === 0) return null;
                    return (
                        <div key={cat.id} className={`pt-3.5 border-t ${theme === 'velvet' ? 'border-white/10' : 'border-black/10'}`}>
                            <div className="flex items-center justify-between mb-2.5">
                                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-65">
                                    {cat.name}
                                </h2>
                                <span className="text-[11px] opacity-55">{catApps.length} Apps</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {catApps.map(app => (
                                    <SanctuaryAppCard
                                        key={app.id}
                                        app={app}
                                        theme={theme}
                                        isCompact={true}
                                        isEditMode={isEditMode}
                                        onOpenWorkspace={
                                            activeConfig.enableWorkspaceMode && !app.ignoreWorkspace
                                                ? (appItem) => onOpenWorkspace?.(appItem)
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ============================================================= */}
            {/* POPUP MODAL 1: INTERACTIVE HOME ASSISTANT GROCERY LIST        */}
            {/* ============================================================= */}
            <Dialog open={groceryModalOpen} onOpenChange={setGroceryModalOpen}>
                <DialogContent className={`modal-theme-${theme} font-jakarta max-w-lg max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0 bg-background border-border shadow-2xl text-foreground`}>
                    <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-secondary/40">
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                                    <Icons.ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold">Home Grocery List</DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Synced with Home Assistant & Mealie Groceries
                                    </DialogDescription>
                                </div>
                            </div>
                            <a
                                href={dinnerState.mealieUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                            >
                                <span>Open Mealie</span>
                                <Icons.ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                        {/* Add New Grocery Item Bar */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (newGroceryText.trim()) {
                                    handleAddGroceryItem(newGroceryText);
                                    setNewGroceryText('');
                                }
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={newGroceryText}
                                onChange={(e) => setNewGroceryText(e.target.value)}
                                placeholder="Add an item (e.g. Eggs, Berries, Olive Oil)..."
                                className="bg-card h-10 text-sm"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                            >
                                <Icons.Plus className="w-4 h-4" />
                                <span>Add</span>
                            </button>
                        </form>

                        {/* Needs Action (To Buy) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    To Buy ({neededGroceries.length})
                                </span>
                            </div>

                            {neededGroceries.length === 0 ? (
                                <div className="p-6 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
                                    Nothing on the list right now! Type an item above or tap a recent item below to re-add it.
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {neededGroceries.map(item => (
                                        <div
                                            key={item.uid}
                                            className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between gap-3 group shadow-sm"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleToggleGroceryStatus(item)}
                                                title="Mark as completed"
                                                className="w-5 h-5 rounded-md border-2 border-primary/60 hover:border-primary flex items-center justify-center flex-shrink-0 transition-colors"
                                            />

                                            {editingItemUid === item.uid ? (
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleSaveGroceryRename(item);
                                                    }}
                                                    className="flex-1 flex gap-1.5"
                                                >
                                                    <Input
                                                        value={editingItemText}
                                                        onChange={(e) => setEditingItemText(e.target.value)}
                                                        onBlur={() => handleSaveGroceryRename(item)}
                                                        className="h-7 text-sm bg-background"
                                                        autoFocus
                                                    />
                                                </form>
                                            ) : (
                                                <span
                                                    onClick={() => {
                                                        setEditingItemUid(item.uid);
                                                        setEditingItemText(item.summary);
                                                    }}
                                                    title="Click to edit item name"
                                                    className="flex-1 text-sm font-semibold cursor-text hover:text-primary transition-colors"
                                                >
                                                    {item.summary}
                                                </span>
                                            )}

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingItemUid(item.uid);
                                                        setEditingItemText(item.summary);
                                                    }}
                                                    title="Rename item"
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                >
                                                    <Icons.Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveGroceryItem(item)}
                                                    title="Delete item"
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Icons.Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Items (1-Click to Re-Add!) */}
                        {completedGroceries.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Completed / Tap to Re-Add ({completedGroceries.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleClearCompletedGroceries}
                                        className="text-[11px] font-semibold text-rose-500 hover:underline"
                                    >
                                        Clear Completed
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {completedGroceries.map(item => (
                                        <div
                                            key={item.uid}
                                            className="px-3 py-2 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-between gap-2 text-muted-foreground"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleToggleGroceryStatus(item)}
                                                title="Tap to put back on To Buy list"
                                                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-foreground transition-colors"
                                            >
                                                <div className="w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                                                    <Icons.Check className="w-3 h-3" />
                                                </div>
                                                <span className="text-xs line-through truncate">{item.summary}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleGroceryStatus(item)}
                                                className="text-[10px] font-bold text-primary hover:underline flex-shrink-0"
                                            >
                                                + Re-add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================= */}
            {/* POPUP MODAL 2: TONIGHT'S DINNER & MEALIE PLANNER              */}
            {/* ============================================================= */}
            <Dialog open={dinnerModalOpen} onOpenChange={setDinnerModalOpen}>
                <DialogContent className={`modal-theme-${theme} font-jakarta max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background border-border shadow-2xl text-foreground`}>
                    <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-secondary/40">
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                                    <Icons.UtensilsCrossed className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <DialogTitle className="text-xl font-bold">Meal Planner & Dinner</DialogTitle>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                            Mealie Live
                                        </span>
                                    </div>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Plan dinners, pick from your saved recipes, and sync ingredients with your grocery list.
                                    </DialogDescription>
                                </div>
                            </div>
                            <a
                                href={dinnerState.mealieUrl ? `${dinnerState.mealieUrl}/household/mealplan/planner/view` : 'http://192.168.0.100:9000/household/mealplan/planner/view'}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 shadow-sm"
                            >
                                <span>Open Mealie</span>
                                <Icons.ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                        {/* 1. 7-DAY MEAL SCHEDULE STRIP */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                <span>7-Day Schedule</span>
                                <span className="text-[11px] font-normal lowercase opacity-75">Click a day to view or change</span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                {dinnerState.weekPlan.map((day) => {
                                    const isSelected = (selectedDayDate || dinnerState.weekPlan[0]?.date) === day.date;
                                    return (
                                        <button
                                            key={day.date}
                                            type="button"
                                            onClick={() => setSelectedDayDate(day.date)}
                                            className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[64px] ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary shadow-sm'
                                                    : 'bg-card border-border/70 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : ''}`}>
                                                    {day.dayLabel}
                                                </span>
                                                {day.planned && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Meal planned" />
                                                )}
                                            </div>
                                            <span className="text-[10px] opacity-75">{day.formattedDate.split(', ')[1] || day.formattedDate}</span>
                                            <span className={`text-[11px] font-semibold truncate mt-1 w-full ${day.planned ? 'text-foreground' : 'italic opacity-60'}`}>
                                                {day.title || 'Empty'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. ACTIVE DAY CARD: CURRENT MEAL & INGREDIENTS */}
                        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                            {activeDay?.dayLabel === 'Tonight' ? "Tonight's Dinner" : `${activeDay?.dayLabel}'s Dinner`} ({activeDay?.formattedDate})
                                        </span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            activeDay?.planned
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {activeDay?.planned ? 'Planned' : 'Not Set'}
                                        </span>
                                    </div>
                                    <div className="font-serif-editorial text-2xl font-bold mt-1 text-foreground">
                                        {activeDay?.title || 'What should we make for dinner?'}
                                    </div>
                                    {activeDay?.text && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{activeDay.text}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleRandomDinner(activeDay?.date)}
                                        disabled={isSavingDinner}
                                        title="Pick a random recipe from your Mealie library"
                                        className="h-8 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                                    >
                                        <Icons.Dices className="w-3.5 h-3.5 text-primary" />
                                        <span>Surprise Me</span>
                                    </button>
                                    {activeDay?.planned && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearDinnerForDate(activeDay.date, activeDay.mealplanId)}
                                            disabled={isSavingDinner}
                                            title="Clear dinner for this night"
                                            className="h-8 px-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                        >
                                            <Icons.Trash2 className="w-3.5 h-3.5" />
                                            <span>Clear</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tags / Servings */}
                            {(activeRecipeDetails?.recipeServings || (activeRecipeDetails?.tags && activeRecipeDetails.tags.length > 0)) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {Boolean(activeRecipeDetails?.recipeServings) && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium inline-flex items-center gap-1">
                                            <Icons.Users className="w-3 h-3 text-muted-foreground" />
                                            {activeRecipeDetails?.recipeServings} servings
                                        </span>
                                    )}
                                    {(activeRecipeDetails?.tags || []).slice(0, 4).map(tag => (
                                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Interactive Ingredients -> Add to Grocery List */}
                            {loadingRecipeDetails ? (
                                <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2">
                                    <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Fetching ingredients from Mealie...</span>
                                </div>
                            ) : (activeRecipeDetails?.ingredients && activeRecipeDetails.ingredients.length > 0) ? (
                                <div className="pt-2 border-t border-border/60 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Icons.ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                            Ingredients (Tap to add to Grocery List)
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {activeRecipeDetails.ingredients.length} items
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeRecipeDetails.ingredients.map(ing => {
                                            const onList = isIngredientInGroceries(ing.name);
                                            return (
                                                <button
                                                    key={ing.name}
                                                    type="button"
                                                    onClick={() => handleToggleIngredientGrocery(ing.name)}
                                                    className={`text-xs px-2.5 py-1 rounded-xl border transition-all inline-flex items-center gap-1.5 font-medium ${
                                                        onList
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                                                            : 'bg-background hover:bg-secondary border-border text-foreground'
                                                    }`}
                                                >
                                                    {onList ? (
                                                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Icons.Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                                    )}
                                                    <span>{ing.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* 3. MEAL PICKER: RECIPES TAB vs CUSTOM TAB */}
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDinnerModalTab('recipes')}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                            dinnerModalTab === 'recipes'
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Browse Mealie Recipes ({mealieRecipes.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDinnerModalTab('custom')}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                                            dinnerModalTab === 'custom'
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Quick / Custom Option
                                    </button>
                                </div>

                                {isSavingDinner && (
                                    <span className="text-xs text-primary font-semibold flex items-center gap-1.5">
                                        <Icons.Loader2 className="w-3 h-3 animate-spin" />
                                        Syncing with Mealie...
                                    </span>
                                )}
                            </div>

                            {dinnerModalTab === 'recipes' ? (
                                <div className="space-y-3">
                                    {/* Search Bar & Tag Filters */}
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Icons.Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                            <Input
                                                value={recipeSearch}
                                                onChange={(e) => setRecipeSearch(e.target.value)}
                                                placeholder="Search recipes by name, tag, or ingredient..."
                                                className="pl-9 h-10 bg-card text-sm"
                                            />
                                            {recipeSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRecipeSearch('')}
                                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {availableRecipeTags.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRecipeTag('all')}
                                                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                                                        selectedRecipeTag === 'all'
                                                            ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    All Recipes
                                                </button>
                                                {availableRecipeTags.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => setSelectedRecipeTag(tag)}
                                                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                                                            selectedRecipeTag === tag
                                                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                                : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recipe Grid / List */}
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                        {loadingRecipes && mealieRecipes.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                                <Icons.Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Loading your recipes from Mealie...</span>
                                            </div>
                                        ) : filteredRecipes.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-4">
                                                No recipes match "{recipeSearch}". Try another search or create a custom entry!
                                            </div>
                                        ) : (
                                            filteredRecipes.map(recipe => {
                                                const isCurrent = activeDay?.recipeId === recipe.id || activeDay?.title === recipe.name;
                                                return (
                                                    <div
                                                        key={recipe.id}
                                                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group shadow-sm ${
                                                            isCurrent
                                                                ? 'bg-primary/5 border-primary/50'
                                                                : 'bg-card border-border/70 hover:border-border hover:bg-secondary/40'
                                                        }`}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                                                    {recipe.name}
                                                                </h4>
                                                                {isCurrent && (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                                        Current
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {recipe.description && (
                                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                                    {recipe.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {recipe.recipeServings ? (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        Serves {recipe.recipeServings}
                                                                    </span>
                                                                ) : null}
                                                                {(recipe.tags || []).slice(0, 3).map(tag => (
                                                                    <span key={tag} className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectMealieRecipe(recipe)}
                                                            disabled={isSavingDinner || isCurrent}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-sm ${
                                                                isCurrent
                                                                    ? 'bg-secondary text-muted-foreground cursor-default'
                                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                            }`}
                                                        >
                                                            {isCurrent ? 'Selected' : `Plan for ${activeDay?.dayLabel || 'Dinner'}`}
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Custom Meal Title
                                        </label>
                                        <Input
                                            value={dinnerInputTitle}
                                            onChange={(e) => setDinnerInputTitle(e.target.value)}
                                            placeholder="e.g. Chicken Stir Fry, Homemade Pizza, Takeout..."
                                            className="bg-card h-10 text-sm font-semibold"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Prep Notes or Side Dish (Optional)
                                        </label>
                                        <Input
                                            value={dinnerInputNotes}
                                            onChange={(e) => setDinnerInputNotes(e.target.value)}
                                            placeholder="e.g. Defrost chicken at 4pm · Serve with salad"
                                            className="bg-card h-9 text-xs"
                                        />
                                    </div>

                                    {/* Quick Dinner Suggestions */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            1-Click Quick Ideas
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_DINNER_SUGGESTIONS.map(idea => (
                                                <button
                                                    key={idea}
                                                    type="button"
                                                    onClick={() => {
                                                        setDinnerInputTitle(idea);
                                                        handleSaveDinner(idea, dinnerInputNotes || 'Planned from Home Hub');
                                                    }}
                                                    className="text-xs px-3 py-1.5 rounded-xl border border-border bg-card hover:border-primary hover:text-primary transition-colors font-medium shadow-sm"
                                                >
                                                    {idea}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveDinner()}
                                            disabled={!dinnerInputTitle.trim() || isSavingDinner}
                                            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            Save to Mealie Planner
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">
                                Changes are immediately saved to Mealie on Unraid
                            </span>
                            <button
                                type="button"
                                onClick={() => setDinnerModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-all shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function GoogleLogoIcon() {
    return (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
        </svg>
    );
}
