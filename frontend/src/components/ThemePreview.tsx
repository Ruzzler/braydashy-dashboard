import React from 'react';
import { AppCard } from './AppCard';
import { Config, AppItem } from '../types';
import { LatteArtPet } from './LatteArtPet';
import { FrenchPressPet } from './FrenchPressPet';

// Mock app for preview
const mockApp: AppItem = {
    id: 'preview-app',
    name: 'Dashboard App',
    url: '#',
    icon: 'Layout',
    iconType: 'icon',
    categoryId: 'preview'
};

const petComponentMap: Record<string, React.ComponentType<any>> = {
    latte_art: LatteArtPet,
    french_press: FrenchPressPet
};

export function ThemePreview({ config }: { config: Config }) {
    const ActivePet = petComponentMap[config.desktopPetType || 'bmo'];

    return (
        <div className={`relative w-full rounded-2xl overflow-hidden border border-border/50 aspect-video mb-8 transition-all duration-700 ${config.themeColor ? `theme-${config.themeColor}` : ''}`}>
            {/* Background Preview */}
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
                        <div className={`orb orb-1 colorful absolute w-32 h-32 -top-10 -left-10 opacity-20 blur-3xl`} />
                        <div className={`orb orb-2 colorful absolute w-24 h-24 bottom-10 -right-10 opacity-20 blur-3xl`} />
                    </div>
                )}
            </div>

            {/* Content Preview */}
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

                {/* Pet Preview Area */}
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
                                    <span className="text-[10px] font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap w-full text-center">{config.desktopPetType === 'both' ? 'Party!' : config.desktopPetType}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] uppercase font-bold text-white tracking-widest border border-white/10">
                Live Preview
            </div>
        </div>
    );
}
