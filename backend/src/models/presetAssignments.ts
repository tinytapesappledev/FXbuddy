import { AIModel, AIProvider } from '../types';

interface PresetModelAssignment {
  provider: AIProvider;
  model: AIModel;
}

/**
 * Maps preset IDs to the best model for that specific effect.
 * Update these assignments after running A/B comparisons.
 *
 * Defaults: all presets use Runway until comparison data proves otherwise.
 */
const PRESET_MODEL_ASSIGNMENTS: Record<string, PresetModelAssignment> = {
  'earth-zoomout': { provider: 'runway', model: 'gen4_turbo' },
  'fire': { provider: 'runway', model: 'gen4_turbo' },
  'explosion': { provider: 'runway', model: 'gen4_turbo' },
  'rain-storm': { provider: 'runway', model: 'gen4_turbo' },
  'glitch': { provider: 'runway', model: 'gen4_turbo' },
  'dolly-zoom': { provider: 'runway', model: 'gen4_turbo' },
  'crash-zoom': { provider: 'runway', model: 'gen4_turbo' },
  '360-orbit': { provider: 'runway', model: 'gen4_turbo' },
};

const DEFAULT_ASSIGNMENT: PresetModelAssignment = {
  provider: 'runway',
  model: 'gen4_turbo',
};

/**
 * Get the best model/provider for a given preset based on comparison data.
 * Returns the default assignment if no specific mapping exists.
 */
export function getModelForPreset(presetId: string): PresetModelAssignment {
  return PRESET_MODEL_ASSIGNMENTS[presetId] || DEFAULT_ASSIGNMENT;
}

/**
 * Get all preset assignments (for dev dashboard).
 */
export function getAllPresetAssignments(): Record<string, PresetModelAssignment> {
  return { ...PRESET_MODEL_ASSIGNMENTS };
}
