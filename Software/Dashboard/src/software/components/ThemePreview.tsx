import React from 'react';
import * as Icons from 'lucide-react';
import { AppCard } from './AppCard';
import { Config, AppItem, SanctuaryTheme } from '../types';
import { LatteArtPet } from './LatteArtPet';

const mockApp: AppItem = {
    id: 'preview-app',
    name: 'Mealie',
    url: '#',
    icon: 'UtensilsCrossed',
    iconType: 'icon',
    tag: 'Kitchen & Recipes',
    description: 'Browse saved family recipes and plan dinners.',
    categoryId: 'preview'
};

const petComponentMap: Record<string, React.ComponentType<any>> = {
    latte_art: LatteArtPet
};

export function SanctuaryMiniPreview({
    theme,
    selected,
    onSelect,
    greetingName = 'Bri'
}: {
    theme: SanctuaryTheme;
    selected: boolean;
    onSelect: () => void;
    greetingName?: string;
}) {
    const meta: Record<SanctuaryTheme, {
        title: string;
        subtitle: string;
        canvasClass: string;
        searchClass: string;
        cardClass: string;
        iconClass: string;
        pillClass: string;
        accentText: string;
    }> = {
        editorial: {
            title: 'Warm Editorial',
            subtitle: 'Alabaster linen, serif greeting & warm terracotta accents',
            canvasClass: 'bg-[#FAF7F2] text-[#231F1D] border-[#E6DFD5]',
            searchClass: 'bg-white border border-[#DFD7CC] text-[#2C2623]',
            cardClass: 'bg-white border border-[#E6DFD5] text-[#231F1D] shadow-sm',
            iconClass: 'bg-[#F4EBE1] text-[#B85D3B] border border-[#E5D5C5]',
            pillClass: 'bg-[#2C2623] text-[#FAF7F2]',
            accentText: 'font-serif-editorial italic text-[#B85D3B]'
        },
        glass: {
            title: 'Daylight Glass',
            subtitle: 'Airy frosted glass cards over a soft pastel mesh gradient',
            canvasClass: 'sanctuary-glass-bg text-slate-900 border-slate-200',
            searchClass: 'bg-white/90 border border-white rounded-full text-slate-800 shadow-sm',
            cardClass: 'bg-white/80 backdrop-blur-md border border-white text-slate-900 shadow-sm rounded-2xl',
            iconClass: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
            pillClass: 'bg-slate-900 text-white rounded-full',
            accentText: 'font-outfit font-bold text-indigo-600'
        },
        bento: {
            title: 'Cozy Bento',
            subtitle: 'Sage & cream modular Bento layout with welcome tile',
            canvasClass: 'bg-[#F2F4F1] text-[#1E2621] border-[#DCE3DC]',
            searchClass: 'bg-white border border-[#D5DFD7] text-[#1E2621]',
            cardClass: 'bg-[#FFFDF9] border border-[#E5DEC9] text-[#1E2621] shadow-sm',
            iconClass: 'bg-[#FCECDD] text-[#B85D3B] border border-[#F5D5B8]',
            pillClass: 'bg-[#26382E] text-white',
            accentText: 'font-serif-editorial italic text-[#26382E]'
        },
        velvet: {
            title: 'Velvet Evening',
            subtitle: 'Warm espresso dark mode with champagne amber highlights',
            canvasClass: 'bg-[#161413] text-[#FAF5F0] border-white/15',
            searchClass: 'bg-[#221F1D] border border-white/10 text-[#FAF5F0]',
            cardClass: 'bg-[#211E1C] border border-white/10 text-[#FAF5F0] shadow-md',
            iconClass: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
            pillClass: 'bg-amber-400 text-[#161413] font-bold',
            accentText: 'font-serif-editorial italic text-amber-300'
        }
    };

    const m = meta[theme];

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`group relative rounded-2xl border-2 p-3 text-left transition-all flex flex-col justify-between overflow-hidden ${
                selected
                    ? 'border-primary ring-4 ring-primary/15 bg-primary/5 shadow-lg scale-[1.01]'
                    : 'border-border/60 bg-card/40 hover:border-primary/50 hover:bg-card/80'
            }`}
        >
            {/* Visual Mini Dashboard Preview Box */}
            <div className={`w-full rounded-xl border p-3.5 mb-3 transition-transform duration-300 group-hover:scale-[1.01] ${m.canvasClass}`}>
                {theme === 'bento' ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5 bg-[#26382E] text-[#F4F6F3] rounded-lg p-2 flex flex-col justify-between">
                                <span className="text-[10px] text-[#A3B8AC]">Home Hub</span>
                                <div className="font-serif-editorial text-xs leading-tight mt-1">
                                    Hi, <span className="italic text-[#E4C59E]">{greetingName || 'Friend'}</span>
                                </div>
                            </div>
                            <div className="col-span-7 bg-white rounded-lg p-2 border border-[#DCE3DC] flex flex-col justify-between">
                                <span className="text-[10px] font-semibold text-[#5C7065]">Google Search</span>
                                <div className="flex items-center justify-between bg-[#F5F7F5] rounded px-2 py-1 border border-[#D5DFD7] mt-1">
                                    <span className="text-[10px] text-[#7C8C82]">Search web...</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#26382E] text-white">Go</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`rounded-lg p-2 flex items-center gap-2 ${m.cardClass}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${m.iconClass}`}>
                                    <Icons.UtensilsCrossed className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold truncate">Mealie</div>
                                    <div className="text-[9px] opacity-65 truncate">Recipes</div>
                                </div>
                            </div>
                            <div className="rounded-lg p-2 bg-white border border-[#DCE3DC] flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[#E8F2EC] text-[#26382E] flex items-center justify-center">
                                    <Icons.Box className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold truncate">STL Quest</div>
                                    <div className="text-[9px] opacity-65 truncate">3D Models</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {/* Mini Greeting */}
                        <div className="text-center">
                            <div className="text-xs font-medium">
                                Good morning, <span className={m.accentText}>{greetingName || 'Friend'}</span>
                            </div>
                            {/* Mini Search Bar */}
                            <div className={`mt-1.5 flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] ${m.searchClass}`}>
                                <span className="opacity-60 truncate">Search Google...</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] ${m.pillClass}`}>Search</span>
                            </div>
                        </div>

                        {/* Mini 2-Card Row */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`rounded-lg p-2 flex items-center gap-2 ${m.cardClass}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${m.iconClass}`}>
                                    <Icons.UtensilsCrossed className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold truncate">Mealie</div>
                                    <div className="text-[9px] opacity-65 truncate">Recipes</div>
                                </div>
                            </div>
                            <div className={`rounded-lg p-2 flex items-center gap-2 ${m.cardClass}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${m.iconClass}`}>
                                    <Icons.ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold truncate">Warranties</div>
                                    <div className="text-[9px] opacity-65 truncate">Coverage</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Label & Selection Indicator */}
            <div className="flex items-start justify-between gap-2 px-1">
                <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>{m.title}</span>
                        {selected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                Active
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.subtitle}</p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
                }`}>
                    {selected && <Icons.Check className="w-3 h-3" />}
                </div>
            </div>
        </button>
    );
}

export function ThemePreview({ config }: { config: Config }) {
    const ActivePet = petComponentMap[config.desktopPetType || 'bmo'];

    if (config.experienceMode === 'sanctuary') {
        const theme: SanctuaryTheme = config.sanctuaryTheme || 'editorial';
        const greeting = config.greetingName?.trim() || 'Bri';
        const bgMap: Record<SanctuaryTheme, string> = {
            editorial: 'sanctuary-editorial-bg text-[#231F1D] border-[#E6DFD5]',
            glass: 'sanctuary-glass-bg text-slate-900 border-white',
            bento: 'sanctuary-bento-bg text-[#1E2621] border-[#DCE3DC]',
            velvet: 'sanctuary-velvet-bg text-[#FAF5F0] border-white/15'
        };

        return (
            <div className={`relative w-full rounded-2xl overflow-hidden border p-6 mb-4 transition-all duration-500 ${bgMap[theme]}`}>
                <div className="flex items-center justify-between text-xs opacity-70 mb-4 pb-2 border-b border-current/10">
                    <span className="font-semibold">{config.serverName || 'Home Hub'}</span>
                    <span>Live Theme Preview</span>
                </div>
                <div className="max-w-md mx-auto text-center mb-5">
                    <div className={`${theme === 'glass' ? 'font-outfit font-bold' : 'font-serif-editorial'} text-2xl mb-3`}>
                        Good morning, <span className={theme === 'velvet' ? 'italic text-amber-300' : theme === 'glass' ? 'text-indigo-600' : 'italic text-[#B85D3B]'}>{greeting}</span>.
                    </div>
                    <div className={`flex items-center justify-between px-4 py-2 rounded-xl text-xs border ${
                        theme === 'velvet' ? 'bg-[#221F1D] border-white/10 text-[#FAF5F0]' : 'bg-white border-black/10 text-neutral-700 shadow-sm'
                    }`}>
                        <span className="opacity-60">Search Google...</span>
                        <span className={`px-3 py-1 rounded-lg font-semibold ${
                            theme === 'velvet' ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-white'
                        }`}>Search</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <div className={`rounded-xl p-3.5 border flex items-center gap-3 ${
                        theme === 'velvet' ? 'bg-[#211E1C] border-white/10' : 'bg-white/90 border-black/10 shadow-sm'
                    }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            theme === 'velvet' ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-500/10 text-[#B85D3B]'
                        }`}>
                            <Icons.UtensilsCrossed className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold">Mealie</div>
                            <div className="text-xs opacity-70">Kitchen & Recipes</div>
                        </div>
                    </div>
                    <div className={`rounded-xl p-3.5 border flex items-center gap-3 ${
                        theme === 'velvet' ? 'bg-[#211E1C] border-white/10' : 'bg-white/90 border-black/10 shadow-sm'
                    }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            theme === 'velvet' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700'
                        }`}>
                            <Icons.Box className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold">STL Quest</div>
                            <div className="text-xs opacity-70">3D Printing & Models</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full rounded-2xl overflow-hidden border border-border/50 aspect-[2.5/1] mb-4 transition-all duration-700 ${config.themeColor ? `theme-${config.themeColor}` : ''}`}>
            <div className="absolute inset-0 z-0">
                {config.backgroundStyle === 'grid' && (
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 text-foreground" />
                )}
                {config.backgroundStyle === 'dots' && (
                    <div className="absolute inset-0 bg-dots-pattern opacity-10 text-foreground" />
                )}
                {config.backgroundStyle === 'none' && (
                    <div className="absolute inset-0 bg-background" />
                )}
                {(config.backgroundStyle === 'orbs' || config.backgroundStyle === 'themed_orbs' || !config.backgroundStyle) && (
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="orb orb-1 colorful absolute w-32 h-32 -top-10 -left-10 opacity-20 blur-3xl" />
                        <div className="orb orb-2 colorful absolute w-24 h-24 bottom-10 -right-10 opacity-20 blur-3xl" />
                    </div>
                )}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 gap-6 bg-background/20 backdrop-blur-sm">
                <div className="w-full max-w-xs scale-90 sm:scale-100 transform transition-transform duration-500">
                    <AppCard
                        app={mockApp}
                        style={config.appCardStyle}
                        layout={config.appCardLayout}
                        size={config.appCardSize}
                        isEditMode={false}
                    />
                </div>

                {config.showDesktopPet !== false && (
                    <div className="absolute bottom-4 right-4 animate-bounce-slow">
                        <div className="scale-[0.5] origin-bottom-right opacity-80 backdrop-blur-md bg-background/40 p-2 rounded-xl border border-border shadow-xl">
                            {ActivePet ? (
                                <div className="w-16 h-16 flex items-center justify-center">
                                    <ActivePet />
                                </div>
                            ) : (
                                <div className="w-16 h-16 flex flex-col items-center justify-center gap-1">
                                    <div className="w-8 h-8 rounded bg-primary/40 animate-pulse" />
                                    <span className="text-xs font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap w-full text-center">
                                        {config.desktopPetType === 'both' ? 'Party!' : config.desktopPetType}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-md text-xs uppercase font-bold text-white tracking-wider border border-white/10">
                Live Preview
            </div>
        </div>
    );
}
