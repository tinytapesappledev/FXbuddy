import React, { useState } from 'react';
import { Header } from './Header';
import { TabBar, TabId } from './TabBar';
import { SettingsDrawer } from './SettingsDrawer';
import { GeneratePanel } from '../generate/GeneratePanel';
import { PresetsPanel } from '../presets/PresetsPanel';
import { TransitionsPanel } from '../transitions/TransitionsPanel';
import { HistoryPanel } from '../history/HistoryPanel';
import { ProgressOverlay } from './ProgressOverlay';

export const Panel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Demo state -- in production these come from Zustand stores
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePresetSelect = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    setActiveTab('generate');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0);

    // Simulate generation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGenerating(false);
            setProgress(0);
          }, 2000);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 800);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <GeneratePanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        );
      case 'presets':
        return <PresetsPanel onPresetSelect={handlePresetSelect} />;
      case 'transitions':
        return <TransitionsPanel />;
      case 'history':
        return <HistoryPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: 'linear-gradient(165deg, #08080c 0%, #0f0f1a 50%, #0a0a14 100%)' }}
    >
      <Header
        creditsRemaining={142}
        creditsTotal={500}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {isGenerating && (
        <ProgressOverlay
          progress={Math.min(100, Math.round(progress))}
          completed={progress >= 100}
        />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 no-scrollbar">
        {renderTabContent()}
      </div>

      {settingsOpen && (
        <SettingsDrawer onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
};
