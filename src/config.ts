import type { AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  candidateCount: 15,
  gameCount: 5,
  maxGameOverlap: 3,
  weightedSampleCount: 10000,
  sumMean: 138,
  sumSigma: 35,
  randomFactorWeight: 0.05,
  numberWeights: {
    momentum: 0.35,
    gap: 0.2,
    longTerm: 0.15,
    recentBalance: 0.15,
    pair: 0.1,
  },
  combinationWeights: {
    number: 0.35,
    oddEven: 0.1,
    sum: 0.12,
    range: 0.1,
    consecutive: 0.08,
    previousOverlap: 0.08,
    endingDigit: 0.06,
    distance: 0.05,
    pair: 0.06,
  },
};

export const STRATEGIES = ['HYBRID', 'MOMENTUM', 'COLD', 'NEUTRAL', 'RANDOM'] as const;

export async function loadConfig(): Promise<AppConfig> {
  const response = await fetch(`${import.meta.env.BASE_URL}config/strategy-config.json`);
  if (!response.ok) throw new Error(`전략 설정을 불러오지 못했습니다. (${response.status})`);
  return (await response.json()) as AppConfig;
}
