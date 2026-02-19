import React from 'react';
import { HistoryCard, Generation } from './HistoryCard';
import { Clock } from 'lucide-react';

// Demo data
const demoGenerations: Generation[] = [
  {
    id: '1',
    prompt: 'Add intense fire and flames erupting around the car',
    model: 'Gen-4 Turbo',
    status: 'completed',
    credits: 5,
    timeAgo: '2m ago',
  },
  {
    id: '2',
    prompt: 'The subject disintegrates into particles like Thanos snap',
    model: 'Gen-4 Aleph',
    status: 'processing',
    credits: 15,
    timeAgo: '5m ago',
  },
  {
    id: '3',
    prompt: 'Lightning strikes the ground behind the rapper with electric energy crackling',
    model: 'Gen-4 Turbo',
    status: 'completed',
    credits: 5,
    timeAgo: '12m ago',
  },
  {
    id: '4',
    prompt: 'Neon cyberpunk lighting with glowing outlines on everything',
    model: 'Gen-4 Turbo',
    status: 'failed',
    credits: 0,
    timeAgo: '18m ago',
  },
  {
    id: '5',
    prompt: 'Camera orbits 360 degrees around the subject in slow motion',
    model: 'Gen-4 Aleph',
    status: 'completed',
    credits: 15,
    timeAgo: '1h ago',
  },
  {
    id: '6',
    prompt: 'Scene transforms into comic book style with bold outlines and halftone',
    model: 'Gen-4 Turbo',
    status: 'completed',
    credits: 5,
    timeAgo: '2h ago',
  },
];

export const HistoryPanel: React.FC = () => {
  return (
    <div className="space-y-2 pt-2 animate-fade-in">
      {demoGenerations.length > 0 ? (
        demoGenerations.map((gen) => (
          <HistoryCard key={gen.id} generation={gen} />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Clock size={32} className="mb-3 opacity-40" />
          <span className="text-body">No generations yet</span>
          <span className="text-caption mt-1">Your VFX history will appear here</span>
        </div>
      )}
    </div>
  );
};
