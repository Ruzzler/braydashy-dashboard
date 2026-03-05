import { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { DynamicBackground } from './components/DynamicBackground';
import { Header } from './components/Header';
import * as Icons from 'lucide-react';
import { formatIconName } from './lib/utils';
import { WorkspaceViewer } from './components/WorkspaceViewer';
import { CommandPalette } from './components/CommandPalette';
import { GlanceWidget } from './data/apps';
import { GlanceWidgetsRow } from './components/GlanceWidgets';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AppItem {
  id: string;
  name: string;
  url: string;
  iconType: 'image' | 'icon';
  icon: string;
  categoryId: string;
  ignoreWorkspace?: boolean;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

interface Config {
  serverName: string;
  serverIcon?: string;
  backgroundStyle?: string;
  headerLayout?: "classic" | "minimalist" | "split" | "sidebar";
  themeColor?: "zinc" | "slate" | "emerald" | "blue" | "rose" | "violet" | "amber";
  appCardStyle?: "glass" | "solid" | "outline";
  appCardLayout?: "grid" | "list" | "minimal";
  appCardSize?: "small" | "medium" | "large";
  enableWeather?: boolean;
  enableWorkspaceMode?: boolean;
  weatherLocation?: string;
  weatherUnit?: string;
  categories: Category[];
  apps: AppItem[];
  glanceWidgets?: GlanceWidget[];
}

function SortableAppCard({ id, app, style, layout, size, onOpenWorkspace, isEditMode }: { id: string, app: AppItem, style?: string, layout?: string, size?: string, onOpenWorkspace?: (app: AppItem) => void, isEditMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id, disabled: !isEditMode });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={dndStyle} {...(isEditMode ? attributes : {})} {...(isEditMode ? listeners : {})}>
      <AppCard
        app={app}
        style={style}
        layout={layout}
        size={size}
        onOpenWorkspace={onOpenWorkspace}
        isEditMode={isEditMode}
      />
    </div>
  );
}

function AppCard({ app, style = 'glass', layout = 'grid', size = 'medium', onOpenWorkspace, isEditMode }: { app: AppItem, style?: string, layout?: string, size?: string, onOpenWorkspace?: (app: AppItem) => void, isEditMode?: boolean }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [stats, setStats] = useState<any[] | null>(null);

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
      } catch (e) {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [app.id]);

  let iconElement = null;
  const isMinimal = layout === 'minimal';
  const isList = layout === 'list';

  // --- Dynamic Sizing ---
  const sizeClasses = {
    small: {
      card: isMinimal ? "p-3" : isList ? "p-3 gap-3" : "p-4 gap-3",
      iconBox: isMinimal ? "w-10 h-10" : "w-10 h-10",
      iconAsset: "w-5 h-5",
      title: "text-base",
      stats: "text-[10px]"
    },
    medium: {
      card: isMinimal ? "p-4" : isList ? "p-4 gap-4" : "p-6 gap-5",
      iconBox: isMinimal ? "w-14 h-14" : "w-14 h-14",
      iconAsset: "w-8 h-8",
      title: "text-lg",
      stats: "text-xs"
    },
    large: {
      card: isMinimal ? "p-6" : isList ? "p-5 gap-6" : "p-8 gap-6",
      iconBox: isMinimal ? "w-20 h-20" : "w-16 h-16",
      iconAsset: "w-10 h-10",
      title: "text-xl",
      stats: "text-sm"
    }
  };
  const activeSizes = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.medium;

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
    // @ts-ignore dynamic icon fetch
    const IconComp = Icons[formatIconName(app.icon)] || Icons.Box;
    iconElement = <IconComp className={`${activeSizes.iconAsset} text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground`} />;
  }

  // --- Layout Architecture ---
  // Base classes always apply
  let baseClasses = `group relative rounded-2xl flex items-center transition-all duration-500 overflow-hidden cursor-pointer no-underline ${activeSizes.card}`;

  // If we are in 'minimal', we center everything and throw away the right-side text column unless hovered
  if (isMinimal) {
    baseClasses += " justify-center";
  } else {
    baseClasses += " justify-start";
  }

  // --- Fill Styles ---
  const fillClasses = {
    glass: "bg-card/40 border-border/50 backdrop-blur-xl hover:bg-card/80 hover:border-primary/50 border hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1",
    solid: "bg-card border-border hover:border-primary/50 hover:bg-primary/5 border shadow-sm hover:shadow-md hover:-translate-y-1",
    outline: "bg-transparent border-2 border-border/50 hover:border-primary hover:bg-primary/5 hover:-translate-y-1"
  };
  const activeFill = fillClasses[style as keyof typeof fillClasses] || fillClasses.glass;

  const iconBase = `${activeSizes.iconBox} flex items-center justify-center rounded-xl flex-shrink-0 relative z-10 transition-colors duration-300`;
  const iconStyle = {
    glass: "bg-background/50 border border-border/50 shadow-inner group-hover:bg-primary/10 group-hover:border-primary/30",
    solid: "bg-muted border border-border shadow-sm group-hover:bg-primary/10 group-hover:border-primary/30",
    outline: "bg-card/50 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30"
  };
  const currentIconStyle = iconStyle[style as keyof typeof iconStyle] || iconStyle.glass;

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

  return (
    <a href={app.url} target="_blank" rel="noreferrer" onClick={handleClick} className={`${baseClasses} ${activeFill} ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:border-primary ring-2 ring-transparent hover:ring-primary/20' : ''}`} title={isMinimal ? app.name : ''}>
      {/* Light sweep effect */}
      {style === 'glass' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>}

      <div className={`${iconBase} ${currentIconStyle}`}>
        {iconElement}
      </div>

      {!isMinimal && (
        <div className={`flex flex-col gap-1 relative z-10 w-full ${isList ? 'flex-row items-center justify-between gap-4' : ''}`}>
          <h3 className={`${activeSizes.title} font-semibold leading-tight m-0 tracking-tight text-foreground transition-colors group-hover:text-primary whitespace-nowrap overflow-hidden text-ellipsis ${isList ? 'flex-shrink-0 w-1/4' : ''}`}>{app.name}</h3>
          <p className={`${activeSizes.stats} text-muted-foreground flex items-center justify-between gap-1.5 w-full ${isList ? 'flex-1' : ''}`}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              {isOnline === null ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Checking...</>
              ) : isOnline ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online {latency !== null && !isList && <span className="opacity-60 text-[10px] ml-0.5 font-mono tracking-wider">({latency}ms)</span>}</>
              ) : (
                <><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Offline</>
              )}
            </span>
            {stats && stats.length > 0 && (
              <span className={`flex gap-2 font-mono opacity-80 flex-wrap justify-end ${isList ? 'flex-1' : 'mt-1 sm:mt-0'}`}>
                {stats.filter(s => {
                  if ((app as any).widgetPreferences === undefined) return true;
                  return (app as any).widgetPreferences.includes(s.id);
                }).map((s, i) => (
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

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [previewConfig, setPreviewConfig] = useState<Config | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<AppItem | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const activeConfig = previewConfig || config;

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Failed to load config", err));
  }, []);

  // Update Document Title and Favicon based on Config
  useEffect(() => {
    if (activeConfig) {
      document.title = activeConfig.serverName || "BrayDashy";

      try {
        const iconKey = activeConfig.serverIcon ? formatIconName(activeConfig.serverIcon) : 'Server';
        const IconComp = (Icons as any)[iconKey] || Icons.Server;
        // Render the lucide SVG element to a string and encode it for a Data URI
        const svgString = renderToString(<IconComp size={32} color="white" />);
        const encodedSvg = encodeURIComponent(svgString);
        const dataUri = `data:image/svg+xml,${encodedSvg}`;

        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = dataUri;
        link.type = "image/svg+xml";
      } catch (err) {
        console.warn("Could not set dynamic favicon", err);
      }
    }
  }, [activeConfig]);

  // Dynamic Theme Color Injection
  useEffect(() => {
    if (!activeConfig || !activeConfig.themeColor) return;
    const root = document.documentElement;

    const themes: Record<string, { primary: string, ring: string, background?: string }> = {
      zinc: { primary: "240 5.9% 10%", ring: "240 10% 3.9%" }, // default
      slate: { primary: "215.4 16.3% 46.9%", ring: "215.4 16.3% 46.9%" },
      emerald: { primary: "142.1 76.2% 36.3%", ring: "142.1 76.2% 36.3%" },
      blue: { primary: "221.2 83.2% 53.3%", ring: "221.2 83.2% 53.3%" },
      rose: { primary: "346.8 77.2% 49.8%", ring: "346.8 77.2% 49.8%" },
      violet: { primary: "262.1 83.3% 57.8%", ring: "262.1 83.3% 57.8%" },
      amber: { primary: "37.7 92.1% 50.2%", ring: "37.7 92.1% 50.2%" }
    };

    const darkThemes: Record<string, { primary: string, ring: string }> = {
      zinc: { primary: "0 0% 98%", ring: "240 4.9% 83.9%" }, // default dark
      slate: { primary: "210 40% 98%", ring: "212.7 26.8% 83.9%" },
      emerald: { primary: "149.3 80.4% 90.2%", ring: "142.4 71.8% 29.2%" },
      blue: { primary: "210 40% 98%", ring: "217.2 32.6% 17.5%" },
      rose: { primary: "355.7 100% 97.3%", ring: "346.8 77.2% 49.8%" },
      violet: { primary: "255 92% 95%", ring: "262.1 83.3% 57.8%" },
      amber: { primary: "48 96% 89%", ring: "38 92% 50%" }
    };

    const isDarkMode = root.classList.contains('dark');
    const selectedTheme = isDarkMode ? darkThemes[activeConfig.themeColor] : themes[activeConfig.themeColor];

    if (selectedTheme) {
      if (activeConfig.themeColor === 'zinc') {
        // Reset to exact Shadcn defaults
        root.style.setProperty('--primary', isDarkMode ? "0 0% 98%" : "240 5.9% 10%");
        root.style.setProperty('--ring', isDarkMode ? "240 4.9% 83.9%" : "240 10% 3.9%");
      } else {
        root.style.setProperty('--primary', selectedTheme.primary);
        root.style.setProperty('--ring', selectedTheme.ring);
      }
    }
  }, [activeConfig?.themeColor]);

  // Global Command Palette Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (!activeConfig) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading Dashboard Data...</div>;

  const sortedCategories = [...activeConfig.categories].sort((a, b) => a.order - b.order);

  const handleSaveConfig = async (newConfig: Config) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
        setPreviewConfig(null); // Clear preview when saved
      }
    } catch (e) {
      console.error("Failed to save config", e);
    }
  };

  const handleWidgetsReorder = (newWidgetsArray: GlanceWidget[]) => {
    const updatedConfig = { ...activeConfig, glanceWidgets: newWidgetsArray };
    handleSaveConfig(updatedConfig);
  };

  const handleAppReorder = (_categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      // Find the old and new indices *across the entire apps array*
      const oldIndex = activeConfig.apps.findIndex(a => a.id === active.id);
      const newIndex = activeConfig.apps.findIndex(a => a.id === over.id);

      // Only re-sort if they are swapping within the SAME category.
      // Easiest is to just re-sort the global array
      const newAppsArray = arrayMove(activeConfig.apps, oldIndex, newIndex);
      const updatedConfig = { ...activeConfig, apps: newAppsArray };
      handleSaveConfig(updatedConfig);
    }
  };

  return (
    <>
      <DynamicBackground themeColor={activeConfig?.themeColor} backgroundStyle={activeConfig?.backgroundStyle} />
      {activeWorkspace && (
        <WorkspaceViewer app={activeWorkspace} onClose={() => setActiveWorkspace(null)} />
      )}

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        apps={activeConfig?.apps || []}
      />

      <div className="relative z-10 w-full min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <Header
            config={activeConfig}
            onSaveConfig={handleSaveConfig}
            onPreviewConfig={setPreviewConfig}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
          />

          {activeConfig.glanceWidgets && activeConfig.glanceWidgets.length > 0 && (
            <GlanceWidgetsRow
              widgets={activeConfig.glanceWidgets}
              isEditMode={isEditMode}
              onWidgetsReorder={handleWidgetsReorder}
            />
          )}

          <main className="w-full">
            <div className="flex flex-col gap-12">
              {sortedCategories.map(cat => {
                const categoryApps = activeConfig.apps.filter(a => a.categoryId === cat.id);
                if (categoryApps.length === 0) return null;

                return (
                  <section key={cat.id} className="flex flex-col gap-5">
                    <h2 className="text-xl font-semibold text-muted-foreground border-b border-border pb-2">{cat.name}</h2>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleAppReorder(cat.id, e)}>
                      <SortableContext items={categoryApps.map(a => a.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-6 ${activeConfig.appCardLayout === 'list' ? 'grid-cols-1' : activeConfig.appCardLayout === 'minimal' ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                          {categoryApps.map(app => (
                            <SortableAppCard
                              key={app.id}
                              id={app.id}
                              app={app}
                              style={activeConfig.appCardStyle}
                              layout={activeConfig.appCardLayout}
                              size={activeConfig.appCardSize}
                              isEditMode={isEditMode}
                              onOpenWorkspace={
                                activeConfig.enableWorkspaceMode && !app.ignoreWorkspace
                                  ? (appItem) => setActiveWorkspace(appItem)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </section>
                );
              })}
            </div>
          </main>

          <footer className="w-full mt-24 mb-8 text-center">
            <a
              href="https://github.com/Ruzzler/braydashy-dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Icons.Github className="w-4 h-4" />
              <span>BrayDashy on GitHub</span>
            </a>
          </footer>
        </div>
      </div>
    </>
  )
}

export default App;
