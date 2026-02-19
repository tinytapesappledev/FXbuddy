import fs from 'fs';
import path from 'path';
import { AIModel, AIProvider } from '../types';

const LOGS_DIR = path.join(__dirname, '../../logs');
const COST_LOG_PATH = path.join(LOGS_DIR, 'cost-tracking.json');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export interface GenerationCostEntry {
  timestamp: string;
  jobId: string;
  model: AIModel;
  provider: AIProvider;
  durationSec: number;
  costUsd: number;
  resolution?: string;
}

export interface DailyMetrics {
  date: string;
  totalGenerations: number;
  generationsByModel: Record<string, number>;
  totalCostUsd: number;
  costByModel: Record<string, number>;
}

/**
 * Log a completed generation's cost to the tracking file.
 */
export async function logGeneration(
  jobId: string,
  model: AIModel,
  provider: AIProvider,
  durationSec: number,
  costUsd: number,
  resolution?: string,
): Promise<void> {
  const entry: GenerationCostEntry = {
    timestamp: new Date().toISOString(),
    jobId,
    model,
    provider,
    durationSec,
    costUsd,
    resolution,
  };

  let entries: GenerationCostEntry[] = [];
  try {
    if (fs.existsSync(COST_LOG_PATH)) {
      const raw = fs.readFileSync(COST_LOG_PATH, 'utf-8');
      entries = JSON.parse(raw);
    }
  } catch {
    entries = [];
  }

  entries.push(entry);
  fs.writeFileSync(COST_LOG_PATH, JSON.stringify(entries, null, 2));
  console.log(`[CostTracker] Logged: ${model} ${durationSec}s = $${costUsd.toFixed(3)}`);
}

/**
 * Get aggregated daily metrics for a given date (YYYY-MM-DD).
 */
export function getDailyMetrics(date: string): DailyMetrics {
  let entries: GenerationCostEntry[] = [];
  try {
    if (fs.existsSync(COST_LOG_PATH)) {
      const raw = fs.readFileSync(COST_LOG_PATH, 'utf-8');
      entries = JSON.parse(raw);
    }
  } catch {
    entries = [];
  }

  const dayEntries = entries.filter((e) => e.timestamp.startsWith(date));

  const generationsByModel: Record<string, number> = {};
  const costByModel: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const entry of dayEntries) {
    generationsByModel[entry.model] = (generationsByModel[entry.model] || 0) + 1;
    costByModel[entry.model] = (costByModel[entry.model] || 0) + entry.costUsd;
    totalCostUsd += entry.costUsd;
  }

  return {
    date,
    totalGenerations: dayEntries.length,
    generationsByModel,
    totalCostUsd,
    costByModel,
  };
}

/**
 * Get all cost entries (for dev dashboard).
 */
export function getAllCostEntries(): GenerationCostEntry[] {
  try {
    if (fs.existsSync(COST_LOG_PATH)) {
      const raw = fs.readFileSync(COST_LOG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}
