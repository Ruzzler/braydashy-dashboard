import { useState, useEffect, useMemo } from 'react';
import { renderToString } from 'react-dom/server';
import * as Icons from 'lucide-react';
import { formatIconName } from './lib/utils';
import { Config, AppItem, GlanceWidget } from './types';

import { DynamicBackground } from './components/DynamicBackground';
import { Header } from './components/Header';
import { WorkspaceViewer } from './components/WorkspaceViewer';
import { CommandPalette } from './components/CommandPalette';
import { GlanceWidgetsRow } from './components/GlanceWidgets';
import { AppCard } from './components/AppCard';
import { DesktopPet } from './components/DesktopPet';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

interface SortableAppCardProps {
  id: string;
  app: AppItem;
  style?: string;
  layout?: string;
  size?: string;
  onOpenWorkspace?: (app: AppItem) => void;
  isEditMode: boolean;
}

function SortableAppCard({ id, app, style, layout, size, onOpenWorkspace, isEditMode }: SortableAppCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode
  });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as const,
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

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [previewConfig, setPreviewConfig] = useState<Config | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<AppItem | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const activeConfig = previewConfig || config;

  // Load config from backend
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config', err));
  }, []);

  // Update document title and favicon based on config
  useEffect(() => {
    if (!activeConfig) return;
    document.title = activeConfig.serverName || 'BrayDashy';

    try {
      const iconKey = activeConfig.serverIcon ? formatIconName(activeConfig.serverIcon) : 'Server';
      const IconComp = ((Icons as unknown) as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[iconKey] || Icons.Server;
      const svgString = renderToString(<IconComp size={32} color="white" />);
      const dataUri = `data:image/svg+xml,${encodeURIComponent(svgString)}`;

      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = dataUri;
      link.type = 'image/svg+xml';
    } catch (err) {
      console.warn('Could not set dynamic favicon', err);
    }
  }, [activeConfig]);

  // Dynamic theme color injection via CSS variables
  useEffect(() => {
    if (!activeConfig?.themeColor) return;
    const root = document.documentElement;
    const isDarkMode = root.classList.contains('dark');

    const themes: Record<string, { primary: string; ring: string }> = {
      zinc: { primary: '240 5.9% 10%', ring: '240 10% 3.9%' },
      slate: { primary: '215.4 16.3% 46.9%', ring: '215.4 16.3% 46.9%' },
      emerald: { primary: '142.1 76.2% 36.3%', ring: '142.1 76.2% 36.3%' },
      blue: { primary: '221.2 83.2% 53.3%', ring: '221.2 83.2% 53.3%' },
      rose: { primary: '346.8 77.2% 49.8%', ring: '346.8 77.2% 49.8%' },
      violet: { primary: '262.1 83.3% 57.8%', ring: '262.1 83.3% 57.8%' },
      amber: { primary: '37.7 92.1% 50.2%', ring: '37.7 92.1% 50.2%' }
    };
    const darkThemes: Record<string, { primary: string; ring: string }> = {
      zinc: { primary: '0 0% 98%', ring: '240 4.9% 83.9%' },
      slate: { primary: '210 40% 98%', ring: '212.7 26.8% 83.9%' },
      emerald: { primary: '149.3 80.4% 90.2%', ring: '142.4 71.8% 29.2%' },
      blue: { primary: '210 40% 98%', ring: '217.2 32.6% 17.5%' },
      rose: { primary: '355.7 100% 97.3%', ring: '346.8 77.2% 49.8%' },
      violet: { primary: '255 92% 95%', ring: '262.1 83.3% 57.8%' },
      amber: { primary: '48 96% 89%', ring: '38 92% 50%' }
    };

    const theme = isDarkMode ? darkThemes[activeConfig.themeColor] : themes[activeConfig.themeColor];
    if (theme) {
      root.style.setProperty('--primary', theme.primary);
      root.style.setProperty('--ring', theme.ring);
    }
  }, [activeConfig?.themeColor]);

  // Global command palette keyboard shortcut
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

  const handleSaveConfig = async (newConfig: Config) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
        setPreviewConfig(null);
      }
    } catch (e) {
      console.error('Failed to save config', e);
    }
  };

  const handleWidgetsReorder = (newWidgetsArray: GlanceWidget[]) => {
    if (!activeConfig) return;
    handleSaveConfig({ ...activeConfig, glanceWidgets: newWidgetsArray });
  };

  const handleAppReorder = (_categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!activeConfig || active.id === over?.id || !over) return;
    const oldIndex = activeConfig.apps.findIndex(a => a.id === active.id);
    const newIndex = activeConfig.apps.findIndex(a => a.id === over.id);
    handleSaveConfig({ ...activeConfig, apps: arrayMove(activeConfig.apps, oldIndex, newIndex) });
  };

  const sortedCategories = useMemo(() => {
    if (!activeConfig) return [];
    return [...activeConfig.categories].sort((a, b) => a.order - b.order);
  }, [activeConfig]);

  if (!activeConfig) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading Dashboard Data...</div>;
  }

  const showBmo = activeConfig.showDesktopPet !== false &&
    (activeConfig.desktopPetType === 'bmo' || activeConfig.desktopPetType === 'both' || !activeConfig.desktopPetType);
  const showCoffee = activeConfig.showDesktopPet !== false &&
    (activeConfig.desktopPetType === 'coffee_mug' || activeConfig.desktopPetType === 'both');

  const visibleCategories = sortedCategories.filter(cat =>
    activeConfig.apps.some(a => a.categoryId === cat.id)
  );
  const firstVisibleCatId = visibleCategories[0]?.id;

  return (
    <>
      <DynamicBackground themeColor={activeConfig.themeColor} backgroundStyle={activeConfig.backgroundStyle} />

      {activeWorkspace && (
        <WorkspaceViewer app={activeWorkspace} onClose={() => setActiveWorkspace(null)} />
      )}

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        apps={activeConfig.apps}
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
                    <div className="relative group">
                      <h2 className="text-xl font-semibold text-muted-foreground border-b border-border pb-2">
                        {cat.name}
                      </h2>
                      {cat.id === firstVisibleCatId && (
                        <div className="absolute bottom-0 left-0 w-full h-0 pointer-events-none z-50">
                          {showBmo && <DesktopPet petType="bmo" />}
                          {showCoffee && <DesktopPet petType="coffee_mug" />}
                        </div>
                      )}
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleAppReorder(cat.id, e)}
                    >
                      <SortableContext items={categoryApps.map(a => a.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-6 ${activeConfig.appCardLayout === 'list'
                            ? 'grid-cols-1'
                            : activeConfig.appCardLayout === 'minimal'
                              ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
                              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                          }`}>
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
  );
}

export default App;
