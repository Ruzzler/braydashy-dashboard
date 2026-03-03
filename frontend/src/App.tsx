import { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { Header } from './components/Header';
import * as Icons from 'lucide-react';
import { formatIconName } from './lib/utils';

interface AppItem {
  id: string;
  name: string;
  url: string;
  iconType: 'image' | 'icon';
  icon: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

interface Config {
  serverName: string;
  serverIcon?: string;
  headerLayout?: "classic" | "minimalist" | "split" | "sidebar";
  categories: Category[];
  apps: AppItem[];
}

function AppCard({ app }: { app: AppItem }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState<any[] | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/${app.id}/status`);
        if (res.ok) {
          const data = await res.json();
          setIsOnline(data.online);
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
  if (app.iconType === 'image') {
    iconElement = (
      <img
        src={app.icon}
        className="w-8 h-8 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110"
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
    iconElement = <IconComp className="w-8 h-8 text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground" />;
  }

  return (
    <a href={app.url} target="_blank" rel="noreferrer" className="group relative bg-card/40 border border-border/50 rounded-2xl p-6 flex items-center gap-5 backdrop-blur-xl transition-all duration-500 hover:bg-card/80 hover:border-border hover:shadow-2xl hover:-translate-y-1 overflow-hidden cursor-pointer no-underline">
      {/* Light sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>

      <div className="w-14 h-14 flex items-center justify-center bg-background/50 border border-border/50 shadow-inner rounded-xl flex-shrink-0 relative z-10 transition-colors duration-300 group-hover:bg-background/80">
        {iconElement}
      </div>
      <div className="flex flex-col gap-1 relative z-10 w-full">
        <h3 className="text-lg font-semibold leading-tight m-0 tracking-tight text-foreground transition-colors group-hover:text-primary">{app.name}</h3>
        <p className="text-sm text-muted-foreground flex items-center justify-between gap-1.5 w-full">
          <span className="flex items-center gap-1.5">
            {isOnline === null ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Checking...</>
            ) : isOnline ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Offline</>
            )}
          </span>
          {stats && stats.length > 0 && (
            <span className="flex gap-2 text-xs font-mono opacity-80">
              {stats.map((s, i) => (
                <span key={i} className="flex gap-1"><span style={{ color: s.color }}>{s.label}:</span>{s.value}</span>
              ))}
            </span>
          )}
        </p>
      </div>
    </a>
  );
}

function App() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Failed to load config", err));
  }, []);

  // Update Document Title and Favicon based on Config
  useEffect(() => {
    if (config) {
      document.title = config.serverName || "BrayServer";

      try {
        const iconKey = config.serverIcon ? formatIconName(config.serverIcon) : 'Server';
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
  }, [config]);

  if (!config) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading Dashboard Data...</div>;

  const sortedCategories = [...config.categories].sort((a, b) => a.order - b.order);

  const handleSaveConfig = async (newConfig: Config) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
      }
    } catch (e) {
      console.error("Failed to save config", e);
    }
  };

  return (
    <>
      <BackgroundOrbs />
      <div className="relative z-10 w-full min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <Header config={config} onSaveConfig={handleSaveConfig} />
          <main className="w-full">
            <div className="flex flex-col gap-12">
              {sortedCategories.map(cat => {
                const categoryApps = config.apps.filter(a => a.categoryId === cat.id);
                if (categoryApps.length === 0) return null;

                return (
                  <section key={cat.id} className="flex flex-col gap-5">
                    <h2 className="text-xl font-semibold text-muted-foreground border-b border-border pb-2">{cat.name}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {categoryApps.map(app => (
                        <AppCard key={app.id} app={app} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default App;
