import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Check, ArrowRight, ArrowLeft, Loader2, Search, RefreshCw, Globe } from 'lucide-react';
import { Config, Category, AppItem, DiscoveredApp } from '../types';
import * as Icons from 'lucide-react';
import { DiscoveryCard } from './DiscoveryCard';

interface SetupWizardProps {
    onComplete: (config: Config) => void;
    onSkip: () => void;
    categories: Category[];
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 500 : -500,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 500 : -500,
        opacity: 0
    })
};

const springTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30
};

export function SetupWizard({ onComplete, onSkip, categories }: SetupWizardProps) {
    const [[step, direction], setStep] = useState([0, 0]);
    const [setupData, setSetupData] = useState<Partial<Config>>({
        serverName: 'My BrayDashy',
        serverIcon: 'Server',
        desktopPetType: 'bmo',
        showDesktopPet: true,
        themeColor: 'blue',
        appCardLayout: 'grid',
        appCardStyle: 'glass',
        appCardSize: 'medium',
        apps: [],
        categories: categories,
        glanceWidgets: [
            { id: 'clock', type: 'clock', label: 'Clock', url: '' },
            { id: 'system', type: 'system_stats', label: 'System', url: '' }
        ]
    });

    const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
    const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const scanForApps = async () => {
        setIsScanning(true);
        try {
            const [mdnsRes, dockerRes] = await Promise.all([
                fetch('/api/discovery/mdns').then(r => r.json()),
                fetch('/api/docker/containers').then(r => r.json())
            ]);

            const apps: DiscoveredApp[] = [];

            if (mdnsRes.success) {
                mdnsRes.services.forEach((s: { name: string; url: string }) => {
                    apps.push({
                        id: `mdns-${s.name}`,
                        name: s.name,
                        url: s.url,
                        type: 'mdns',
                        icon: 'Globe'
                    });
                });
            }

            if (dockerRes.success) {
                dockerRes.containers.forEach((c: { id: string; name: string; port: string; icon?: string }) => {
                    apps.push({
                        id: `docker-${c.id}`,
                        name: c.name,
                        url: `http://localhost:${c.port}`,
                        type: 'docker',
                        icon: c.icon || 'Container'
                    });
                });
            }

            setDiscoveredApps(apps);
        } catch (error) {
            console.error("Discovery failed", error);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        if (step === 4) {
            scanForApps();
        }
    }, [step]);

    const nextStep = () => setStep([step + 1, 1]);
    const prevStep = () => setStep([step - 1, -1]);

    const updateData = (data: Partial<Config>) => {
        setSetupData(prev => ({ ...prev, ...data }));
    };

    const steps = [
        // Step 0: Welcome
        <div key="welcome" className="flex flex-col items-center justify-center text-center space-y-8 py-12">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...springTransition, delay: 0.2 }}
                className="w-24 h-24 bg-blue-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30 backdrop-blur-xl"
            >
                <Sparkles className="w-12 h-12 text-blue-400" />
            </motion.div>
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white">Welcome to BrayDashy</h1>
                <p className="text-muted-foreground text-lg max-w-md">
                    Let's get your dashboard ready. This will only take a minute.
                </p>
            </div>
            <div className="flex flex-col items-center gap-4">
                <button
                    onClick={nextStep}
                    className="group relative px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all flex items-center gap-2 overflow-hidden"
                >
                    <span className="relative z-10">Get Started</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                    onClick={onSkip}
                    className="text-muted-foreground hover:text-white text-sm transition-colors"
                >
                    Skip setup & use defaults
                </button>
            </div>
        </div>,

        // Step 1: Identity
        <div key="identity" className="flex flex-col space-y-8 py-12 w-full max-w-md mx-auto">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="w-6 h-6 text-blue-500" /> Identity
                </h2>
                <p className="text-muted-foreground">What should we call your dashboard?</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Name</label>
                    <input
                        type="text"
                        value={setupData.serverName || ''}
                        onChange={e => updateData({ serverName: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="My Cloud Home"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Server Icon</label>
                    <div className="grid grid-cols-4 gap-4">
                        {['Server', 'Cloud', 'Database', 'HardDrive'].map(icon => {
                            const IconComp = (Icons as any)[icon];
                            return (
                                <button
                                    key={icon}
                                    onClick={() => updateData({ serverIcon: icon })}
                                    className={`p-4 rounded-xl border transition-all flex items-center justify-center ${setupData.serverIcon === icon ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'}`}
                                >
                                    <IconComp className="w-6 h-6" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 text-muted-foreground hover:bg-white/5 rounded-xl font-medium transition-all flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={nextStep} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>,

        // Step 2: Appearance
        <div key="appearance" className="flex flex-col space-y-8 py-12 w-full max-w-md mx-auto">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Icons.Palette className="w-6 h-6 text-pink-500" /> Appearance
                </h2>
                <p className="text-muted-foreground">Set the vibe for your dashboard.</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Theme Color</label>
                    <div className="grid grid-cols-5 gap-3">
                        {['blue', 'purple', 'emerald', 'rose', 'orange'].map(color => (
                            <button
                                key={color}
                                onClick={() => updateData({ themeColor: color as any })}
                                className={`w-full h-10 rounded-lg border-2 transition-all ${setupData.themeColor === color ? 'ring-2 ring-white/20 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: `var(--${color}-500, ${color})` }}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Background Style</label>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'orbs', name: 'Floating Orbs', desc: 'Dynamic & modern' },
                            { id: 'simple', name: 'Simple Dark', desc: 'Clean & minimalist' }
                        ].map(bg => (
                            <button
                                key={bg.id}
                                onClick={() => updateData({ backgroundStyle: bg.id as any })}
                                className={`p-4 rounded-xl border text-left transition-all ${setupData.backgroundStyle === bg.id ? 'bg-white/10 border-white/40 text-white' : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'}`}
                            >
                                <div className="font-bold">{bg.name}</div>
                                <div className="text-xs opacity-60">{bg.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 text-muted-foreground hover:bg-white/5 rounded-xl font-medium transition-all flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={nextStep} className="flex-1 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>,

        // Step 3: Mascot
        <div key="mascot" className="flex flex-col space-y-8 py-12 w-full max-w-lg mx-auto">
            <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold text-white">Choose Your Companion</h2>
                <p className="text-muted-foreground">Select a pet to live on your dashboard.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {[
                    { id: 'bmo', name: 'BMO', desc: 'Helping you manage your server with a smile.', img: '/pets/bmo_idle.png' },
                    { id: 'coffee_mug', name: 'Muggy', desc: 'Powered by caffeine and bad code.', img: '/pets/coffee_idle.png' },
                    { id: 'latte_art', name: 'Latte', desc: 'Elegant, smooth, and refined.', img: '/pets/latte_art_idle.png' },
                    { id: 'none', name: 'Ghost', desc: 'I prefer the solitude of the terminal.', img: '' }
                ].map(pet => (
                    <button
                        key={pet.id}
                        onClick={() => updateData({
                            desktopPetType: pet.id === 'none' ? undefined : (pet.id as any),
                            showDesktopPet: pet.id !== 'none'
                        })}
                        className={`group relative p-6 rounded-3xl border transition-all overflow-hidden ${setupData.desktopPetType === pet.id || (pet.id === 'none' && !setupData.showDesktopPet) ? 'bg-purple-500/20 border-purple-500 ring-4 ring-purple-500/10' : 'bg-card/40 border-border hover:border-white/20'}`}
                    >
                        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                            {pet.id !== 'none' ? (
                                <div className="w-20 h-20 relative mb-2 flex items-center justify-center">
                                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/20 rounded-full ${setupData.desktopPetType === pet.id ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                                    <img src={pet.img} alt={pet.name} className="w-16 h-16 object-contain image-rendering-pixelated group-hover:scale-110 transition-transform" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                    <Icons.UserX className="w-8 h-8 opacity-40" />
                                </div>
                            )}
                            <div className="font-bold text-xl text-white">{pet.name}</div>
                            <p className="text-xs text-muted-foreground/80 leading-relaxed px-2">{pet.desc}</p>
                        </div>
                        {setupData.desktopPetType === pet.id && (
                            <div className="absolute top-3 right-3">
                                <Check className="w-5 h-5 text-purple-400" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 text-muted-foreground hover:bg-white/5 rounded-xl font-medium transition-all flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={nextStep} className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>,

        // Step 4: Discovery
        <div key="discovery" className="flex flex-col space-y-6 py-4 w-full max-w-xl mx-auto h-[500px]">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Search className="w-6 h-6 text-blue-500" /> Discovery
                    </h2>
                    <p className="text-muted-foreground text-sm">We've found these services on your network.</p>
                </div>
                <button
                    onClick={scanForApps}
                    disabled={isScanning}
                    className={`p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isScanning ? 'animate-spin opacity-50' : ''}`}
                >
                    <RefreshCw className="w-4 h-4 text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {isScanning && discoveredApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-white/40 animate-pulse">Scanning network & Docker socket...</p>
                    </div>
                ) : discoveredApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                        <Globe className="w-16 h-16 text-white/5" />
                        <p className="text-white/40">No services discovered yet.<br />Try refreshing or add them manually later.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pb-4">
                        {discoveredApps.map(app => (
                            <DiscoveryCard
                                key={app.id}
                                app={app}
                                isSelected={selectedDiscoveredIds.includes(app.id)}
                                onToggle={() => {
                                    setSelectedDiscoveredIds(prev =>
                                        prev.includes(app.id)
                                            ? prev.filter(id => id !== app.id)
                                            : [...prev, app.id]
                                    );
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 text-muted-foreground hover:bg-white/5 rounded-xl font-medium transition-all flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                    onClick={nextStep}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                >
                    Review Config <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>,

        // Step 5: Review & Launch
        <div key="review" className="flex flex-col space-y-6 py-12 w-full max-w-lg mx-auto h-[600px]">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Check className="w-6 h-6 text-green-500" /> Ready to Launch?
                </h2>
                <p className="text-muted-foreground">Review your configuration before we finalize everything.</p>
            </div>

            <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                    <span className="text-xs font-mono text-muted-foreground">config.json</span>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    </div>
                </div>
                <div className="flex-1 p-4 font-mono text-xs text-blue-400 overflow-y-auto custom-scrollbar leading-relaxed">
                    <pre>{JSON.stringify({ ...setupData, apps: [...(setupData.apps || []), ...discoveredApps.filter(app => selectedDiscoveredIds.includes(app.id)).map(app => ({ id: app.id, name: app.name, url: app.url, icon: app.icon || 'Box' }))] }, null, 2)}</pre>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={prevStep} className="px-6 py-3 border border-white/10 text-muted-foreground hover:bg-white/5 rounded-xl font-medium transition-all flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                    onClick={() => {
                        const newApps: AppItem[] = discoveredApps
                            .filter(app => selectedDiscoveredIds.includes(app.id))
                            .map(app => ({
                                id: app.id,
                                name: app.name,
                                url: app.url,
                                iconType: 'icon' as const,
                                icon: app.icon || 'Box',
                                categoryId: categories[0]?.id || '1'
                            }));

                        onComplete({
                            ...setupData,
                            apps: [...(setupData.apps || []), ...newApps],
                            setupComplete: true
                        } as Config);
                    }}
                    className="flex-1 px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    Ignition <Icons.Rocket className="w-5 h-5" />
                </button>
            </div>
        </div>
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-3xl">
            <div className="relative w-full max-w-2xl px-6">
                {/* Progress Bar */}
                <div className="absolute top-0 left-6 right-6 h-1 bg-white/5 overflow-hidden rounded-full">
                    <motion.div
                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="relative overflow-hidden min-h-[500px] flex flex-col justify-center">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={springTransition}
                            className="w-full"
                        >
                            {steps[step]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
