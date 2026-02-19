import React from 'react';
import { Wand2, LayoutGrid, ArrowLeftRight, Clock } from 'lucide-react';

export type TabId = 'generate' | 'presets' | 'transitions' | 'history';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'generate', label: 'Generate', icon: <Wand2 size={14} /> },
  { id: 'presets', label: 'Presets', icon: <LayoutGrid size={14} /> },
  { id: 'transitions', label: 'Transitions', icon: <ArrowLeftRight size={14} /> },
  { id: 'history', label: 'History', icon: <Clock size={14} /> },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="flex-shrink-0 px-3 pt-2 pb-1">
      <div className="flex items-center h-10 p-[3px] rounded-glass-lg bg-glass-1 border border-border-glass">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 h-full
                rounded-glass text-caption font-medium
                transition-all duration-[250ms] ease-out cursor-pointer
                ${isActive
                  ? 'bg-glass-3 border border-border-glass-hover text-text-primary'
                  : 'border border-transparent text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {tab.icon}
              <span className="hidden min-[300px]:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
