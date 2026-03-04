import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { ChangelogModal } from './ChangelogModal';
import { formatIconName } from '../lib/utils';

const SUBTITLES = [
    "Home Server & App Dashboard",
    "Where packets go to party",
    "It works on my machine",
    "Have you tried turning it off and on again?",
    "Powered by coffee and stack overflow",
    "There's no place like 127.0.0.1",
    "I'm sorry Dave, I'm afraid I can't do that",
    "99% Uptime, 100% Luck",
    "Hold on, I'm fixing a bug",
    "Running on hopes and dreams",
    "Digital hoarding at its finest",
    "Clicking buttons until it works",
    "A sysadmin's favorite dashboard",
    "sudo make me a sandwich",
    "I read your email, I just didn't reply",
    "My code doesn't work, I have no idea why. My code works, I have no idea why.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "Hardware is the part of the computer you can kick",
    "I'm not procrastinating, I'm compiling.",
    "There are 10 types of people in the world: those who understand binary, and those who don't.",
    "To understand recursion, you must first understand recursion.",
    "I would love to change the world, but they won't give me the source code.",
    "A bug is just an undocumented feature.",
    "Warning: May contain nuts... and bolts.",
    "The cloud is just someone else's computer.",
    "Trust me, I'm an engineer.",
    "It’s not a bug, it’s a feature. At least, that's what I told the client.",
    "I put the 'pro' in procrastinate... and 'crastinate' in my code.",
    "I solemnly swear that I am up to no good... coding.",
    "My other computer is a data center.",
    "I don't need anger management, I just need people to stop breaking my code.",
    "Error 404: Motivation not found.",
    "Just one more commit...",
    "Why do Java programmers have to wear glasses? Because they don't C#.",
    "I'm fluent in three languages: English, Sarcasm, and JavaScript."
];

export function Header({ config, onSaveConfig = () => { } }: { config?: any, onSaveConfig?: (newConfig: any) => void }) {
    const [time, setTime] = useState("");
    const [isDark, setIsDark] = useState(true);
    const [systemStats, setSystemStats] = useState<{ cpu: string, ram: string, disk: string } | null>(null);
    const [subtitleIndex, setSubtitleIndex] = useState(0);
    const [changelogOpen, setChangelogOpen] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system/status');
                if (res.ok) setSystemStats(await res.json());
            } catch (e) {
                // silently fail
            }
        };

        fetchStats();
        const statsInterval = setInterval(fetchStats, 5000);

        // Rotate subtitles every 8 seconds
        const subInterval = setInterval(() => {
            setSubtitleIndex(prev => (prev + 1) % SUBTITLES.length);
        }, 8000);

        return () => {
            clearInterval(timer);
            clearInterval(statsInterval);
            clearInterval(subInterval);
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    const layout = config?.headerLayout || 'classic';
    const iconKey = config?.serverIcon ? formatIconName(config.serverIcon) : 'Server';
    const IconComp = (Icons as any)[iconKey] || Icons.Server;

    const renderServerIdentity = (center = false) => (
        <div className={`flex flex-col ${center ? 'items-center text-center' : 'items-start'}`}>
            <h1 className={`text-4xl font-bold tracking-tight flex items-center gap-4 w-fit ${center ? 'justify-center mx-auto' : ''}`}>
                <div className="flex items-center justify-center bg-card border border-border/60 rounded-xl w-12 h-12 shadow-sm backdrop-blur-xl">
                    <IconComp className="w-6 h-6 text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                </div>
                <span className="text-gradient">
                    {config?.serverName || "BrayDashy"}
                </span>
            </h1>
            <div className={`mt-2 space-y-2 ${center ? 'flex flex-col items-center' : ''}`}>
                <div className="h-5 relative overflow-hidden flex items-center justify-center">
                    <p
                        key={subtitleIndex}
                        className="text-muted-foreground text-sm md:text-base font-normal animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                        {SUBTITLES[subtitleIndex]}
                    </p>
                </div>
                <div className="inline-flex items-center">
                    <button
                        onClick={() => setChangelogOpen(true)}
                        className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-sm hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                        v{import.meta.env.VITE_APP_VERSION}
                    </button>
                    <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
                </div>
            </div>
        </div>
    );

    const renderServerStats = (horizontal = false) => (
        <div className={`flex ${horizontal ? 'items-center gap-6' : 'flex-col items-end gap-1'}`}>
            <div className={`flex gap-4 text-xs text-muted-foreground font-medium ${horizontal ? '' : 'justify-end mb-1'}`}>
                <span className="flex items-center gap-1 opacity-70"><Icons.Cpu className="w-3 h-3" /> {systemStats?.cpu || '--%'}</span>
                <span className="flex items-center gap-1 opacity-70"><Icons.MemoryStick className="w-3 h-3" /> {systemStats?.ram || '--%'}</span>
                <span className="flex items-center gap-1 opacity-70"><Icons.HardDrive className="w-3 h-3" /> {systemStats?.disk || '--%'}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="inline-flex items-center text-muted-foreground text-sm font-medium gap-2 hidden md:flex">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block pulse"></span> Server Online
                </div>
                {!horizontal && <div className="text-2xl font-semibold tracking-tight">{time}</div>}
            </div>
        </div>
    );

    const renderUtilities = () => (
        <div className="flex gap-4 items-center w-full md:w-auto justify-end">
            <div className="relative w-full md:w-64 hidden sm:block">
                <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Filter apps..."
                    className="w-full py-2.5 px-4 pl-10 rounded-full border border-border bg-card text-foreground text-sm backdrop-blur-md transition-all focus:outline-none focus:border-ring focus:bg-white/10 dark:focus:bg-black/10"
                />
            </div>
            <button
                onClick={toggleTheme}
                className="flex-shrink-0 bg-card border border-border text-muted-foreground w-11 h-11 rounded-full flex items-center justify-center transition-all hover:text-foreground hover:border-muted-foreground hover:-rotate-12 hover:scale-110 backdrop-blur-md"
            >
                {isDark ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
            </button>
            <SettingsModal config={config} onSave={onSaveConfig} />
        </div>
    );

    // Sidebar specifically for layout === 'sidebar'
    const renderSidebar = () => (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-3 rounded-full bg-card/60 backdrop-blur-2xl border border-border/50 shadow-2xl z-50">
            <button className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all">
                <Icons.Search className="w-5 h-5" />
            </button>
            <div className="w-8 h-[1px] bg-border/50"></div>
            <button onClick={toggleTheme} className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all">
                {isDark ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-[1px] bg-border/50"></div>
            <SettingsModal config={config} onSave={onSaveConfig} />
        </div>
    );

    if (layout === 'minimalist') {
        return (
            <header className="flex flex-col mb-20 gap-12 relative w-full pt-4">
                {/* Top Minimal Bar */}
                <div className="flex justify-between items-center w-full px-4 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/30 py-2">
                    {renderServerStats(true)}
                    {renderUtilities()}
                </div>
                {/* Hero Center */}
                <div className="flex justify-center w-full mt-4">
                    {renderServerIdentity(true)}
                </div>
                <div className="absolute top-32 right-8 text-3xl font-bold tracking-tighter opacity-10 pointer-events-none hidden md:block">{time}</div>
            </header>
        );
    }

    if (layout === 'split') {
        return (
            <header className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-start w-full">
                {/* Left Side */}
                <div className="flex justify-start">
                    {renderServerIdentity()}
                </div>
                {/* Right Side */}
                <div className="flex flex-col items-end gap-6">
                    {renderUtilities()}
                    <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm">
                        {renderServerStats(true)}
                    </div>
                </div>
            </header>
        );
    }

    if (layout === 'sidebar') {
        return (
            <>
                {renderSidebar()}
                <header className="flex justify-between items-start mb-20 gap-6 md:pl-28 pt-8">
                    {renderServerIdentity()}
                    <div className="text-right flex flex-col items-end">
                        <div className="text-4xl font-bold tracking-tighter mb-2">{time}</div>
                        <div className="inline-flex items-center text-muted-foreground text-sm font-medium gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block pulse"></span> Online
                        </div>
                    </div>
                </header>
            </>
        );
    }

    // Classic Default Layout
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
            {renderServerIdentity()}
            <div className="flex flex-col items-end gap-4 relative w-full md:w-auto">
                {renderServerStats()}
                {renderUtilities()}
            </div>
        </header>
    );
}
