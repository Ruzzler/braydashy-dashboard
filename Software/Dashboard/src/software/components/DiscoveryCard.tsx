import { motion } from 'framer-motion';
import { Plus, Check, Globe, Container, Monitor } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { DiscoveredApp } from '../types';

interface DiscoveryCardProps {
    app: DiscoveredApp;
    isSelected: boolean;
    onToggle: () => void;
}

export function DiscoveryCard({ app, isSelected, onToggle }: DiscoveryCardProps) {
    const IconComponent = app.icon && (LucideIcons as any)[app.icon] ? (LucideIcons as any)[app.icon] :
        app.type === 'docker' ? Container :
            app.type === 'mdns' ? Globe : Monitor;

    return (
        <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onToggle}
            className={`relative group w-full flex items-center p-4 rounded-2xl border transition-all duration-300 ${isSelected
                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50 group-hover:bg-white/15'
                }`}>
                <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1 text-left min-w-0">
                <h3 className="text-white font-semibold truncate">{app.name}</h3>
                <p className="text-white/40 text-xs truncate uppercase tracking-widest">{app.type}</p>
                <p className="text-white/30 text-[10px] truncate mt-1">{app.url}</p>
            </div>

            <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${isSelected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-white/10 text-transparent group-hover:border-white/20'
                }`}>
                {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-white/20" />}
            </div>
        </motion.button>
    );
}
