import React from 'react';
import { Flame, Bomb, Shuffle, Camera, Palette } from 'lucide-react';

export type PresetCategory = 'all' | 'fire' | 'destruction' | 'morphing' | 'camera' | 'style';

interface CategoryFilterProps {
  activeCategory: PresetCategory;
  onCategoryChange: (category: PresetCategory) => void;
}

const categories: { id: PresetCategory; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All' },
  { id: 'fire', label: 'Fire', icon: <Flame size={11} /> },
  { id: 'destruction', label: 'Destruction', icon: <Bomb size={11} /> },
  { id: 'morphing', label: 'Morphing', icon: <Shuffle size={11} /> },
  { id: 'camera', label: 'Camera', icon: <Camera size={11} /> },
  { id: 'style', label: 'Style', icon: <Palette size={11} /> },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`
              flex items-center gap-1 h-7 px-2.5 rounded-pill
              text-caption font-medium whitespace-nowrap flex-shrink-0
              border transition-all duration-200 ease-out cursor-pointer
              ${isActive
                ? 'bg-glass-3 border-border-glass-active text-text-primary'
                : 'bg-glass-1 border-border-glass text-text-secondary hover:bg-glass-2 hover:border-border-glass-hover'
              }
            `}
          >
            {cat.icon}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};
