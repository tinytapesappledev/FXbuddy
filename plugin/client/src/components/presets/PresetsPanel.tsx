import React, { useState, useMemo } from 'react';
import { CategoryFilter, PresetCategory } from './CategoryFilter';
import { PresetCard, Preset } from './PresetCard';

// 15 preset definitions with gradient placeholders for thumbnails
const presets: Preset[] = [
  // Fire / Energy
  {
    id: 'flame_burst',
    name: 'Flame Burst',
    category: 'fire',
    prompt: 'The subject suddenly catches fire with intense, realistic flames erupting from within. Fire and embers spread dramatically across the scene.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #1a0500 0%, #8b2500 30%, #ff4500 60%, #ff8c00 100%)',
  },
  {
    id: 'fire_transition',
    name: 'Fire Transition',
    category: 'fire',
    prompt: 'The scene erupts in a massive wall of realistic fire and flames. As the fire intensifies and fills the entire frame, it begins to clear and dissipate, revealing a completely new scene.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #2d1b00 0%, #cc4400 40%, #ff6600 70%, #ffaa00 100%)',
  },
  {
    id: 'lightning_strike',
    name: 'Lightning Strike',
    category: 'fire',
    prompt: 'A massive bolt of lightning strikes the subject with electric energy crackling and arcing across the frame. Bright electrical sparks illuminate the entire scene.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a5e 30%, #4444ff 60%, #88ccff 100%)',
  },
  // Destruction
  {
    id: 'explosion',
    name: 'Explosion',
    category: 'destruction',
    prompt: 'The subject explodes outward in a massive, cinematic explosion with fire, debris, and shockwave expanding outward from the center.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #1a0000 0%, #660000 25%, #ff2200 50%, #ffcc00 100%)',
  },
  {
    id: 'disintegration',
    name: 'Disintegration',
    category: 'destruction',
    prompt: 'The subject slowly breaks apart into thousands of tiny particles and dust, disintegrating from one side to the other in a dramatic, surreal effect.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #2a1a2a 30%, #553355 60%, #886688 100%)',
  },
  {
    id: 'shatter',
    name: 'Shatter',
    category: 'destruction',
    prompt: 'The entire scene cracks like glass, then shatters into thousands of sharp fragments that fly toward the camera with dramatic lighting reflections on each piece.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a2a3a 30%, #3a5a7a 60%, #8ab4e8 100%)',
  },
  // Morphing
  {
    id: 'morph_transition',
    name: 'Morph Transition',
    category: 'morphing',
    prompt: 'The scene smoothly morphs and warps, with elements flowing and transforming fluidly into a completely new scene in a seamless, organic transition.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #1a002e 0%, #3d0066 30%, #7700cc 60%, #cc44ff 100%)',
  },
  {
    id: 'liquid_metal',
    name: 'Liquid Metal',
    category: 'morphing',
    prompt: 'The subject transforms with a liquid metal effect, surface becoming reflective chrome that ripples and morphs while maintaining the overall shape.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #3a3a5e 30%, #8888aa 60%, #ccccee 100%)',
  },
  {
    id: 'smoke_transform',
    name: 'Smoke Transform',
    category: 'morphing',
    prompt: 'The subject dissolves into thick, swirling smoke that billows and drifts dramatically before reforming into a new shape or clearing to reveal the next scene.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2a 30%, #2a3a4a 60%, #4a5a6a 100%)',
  },
  // Camera
  {
    id: 'earth_zoom_out',
    name: 'Earth Zoom Out',
    category: 'camera',
    prompt: 'The camera rapidly pulls back and up from the scene, ascending through the atmosphere until the curvature of the Earth is visible from space with clouds and city lights below.',
    supportsTransition: true,
    gradient: 'linear-gradient(135deg, #001a00 0%, #003300 25%, #0066cc 60%, #0a0a2e 100%)',
  },
  {
    id: 'drone_pull_up',
    name: 'Drone Pull-Up',
    category: 'camera',
    prompt: 'The camera rapidly pulls upward in a vertical movement, revealing the full landscape below as the perspective shifts from ground level to an aerial bird\'s eye view.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #1a2a1a 0%, #2a4a3a 30%, #4a8a6a 60%, #88ccaa 100%)',
  },
  {
    id: 'spin_360',
    name: '360 Spin',
    category: 'camera',
    prompt: 'The camera rapidly orbits around the subject in a 360-degree rotation while the subject remains perfectly centered, creating a dramatic cinematic reveal.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #0a1a2e 0%, #1a3a5e 30%, #2a5a8e 60%, #4a8acc 100%)',
  },
  // Style
  {
    id: 'freeze_frame',
    name: 'Freeze Frame',
    category: 'style',
    prompt: 'The action suddenly freezes in place while the camera continues to move smoothly around the frozen scene, examining it from multiple dramatic angles.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 30%, #3a3a6a 60%, #6a6aaa 100%)',
  },
  {
    id: 'comic_book',
    name: 'Comic Book',
    category: 'style',
    prompt: 'The entire scene transforms into a vivid comic book or manga style with bold outlines, halftone dots, dramatic action lines, and vibrant flat colors.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #2a0a0a 0%, #cc2200 25%, #ffcc00 50%, #0066cc 100%)',
  },
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    category: 'style',
    prompt: 'The subject and environment gain intense neon and cyberpunk lighting with glowing outlines, vibrant pink, blue, and purple light sources, and reflective wet surfaces.',
    supportsTransition: false,
    gradient: 'linear-gradient(135deg, #0a001a 0%, #1a0033 25%, #ff0088 50%, #00ccff 100%)',
  },
];

interface PresetsPanelProps {
  onPresetSelect: (prompt: string) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ onPresetSelect }) => {
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('all');

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'all') return presets;
    return presets.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="space-y-3 pt-2 animate-fade-in">
      {/* Category Filter */}
      <CategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Preset Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onSelect={onPresetSelect}
          />
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
          <span className="text-body">No presets in this category</span>
        </div>
      )}
    </div>
  );
};
