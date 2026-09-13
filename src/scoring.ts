import { SeededRandom, shuffle } from './random';
import { minMax, zScores } from './statistics';
import type { AppConfig, NumberFeature, ScoredNumber, Strategy } from './types';

interface NormalizedFeatures {
  momentum: number[];
  gap: number[];
  longTerm: number[];
  recentBalance: number[];
  pair: number[];
}

export function scoreNumbers(
  features: NumberFeature[],
  strategy: Strategy,
  seed: number,
  config: AppConfig,
): ScoredNumber[] {
  if (strategy === 'RANDOM') return randomScores(features, seed);
  const normalized = normalizeFeatures(features);
  const random = new SeededRandom(seed);
  const raw = features.map((_, index) => strategyScore(strategy, normalized, index, random.next(), config));
  const scaled = minMax(raw);
  return features.map((feature, index) => ({ feature, number: feature.number, score: scaled[index] }));
}

function normalizeFeatures(features: NumberFeature[]): NormalizedFeatures {
  const z20 = zScores(features.map((feature) => feature.freq20));
  const z50 = zScores(features.map((feature) => feature.freq50));
  const z100 = zScores(features.map((feature) => feature.freq100));
  return {
    momentum: z20.map((value, index) => value * 0.5 + z50[index] * 0.3 + z100[index] * 0.2),
    gap: zScores(features.map((feature) => feature.gapRatio)),
    longTerm: zScores(features.map((feature) => feature.longTermDeviation)),
    recentBalance: z20.map((value, index) => -Math.abs(value) * 0.6 - Math.abs(z50[index]) * 0.4),
    pair: zScores(features.map((feature) => feature.pairScore)),
  };
}

function strategyScore(
  strategy: Strategy,
  values: NormalizedFeatures,
  index: number,
  random: number,
  config: AppConfig,
): number {
  if (strategy === 'MOMENTUM') return values.momentum[index];
  if (strategy === 'COLD') return values.gap[index] * 0.8 - values.momentum[index] * 0.2;
  if (strategy === 'NEUTRAL') return values.recentBalance[index] - Math.abs(values.longTerm[index]) * 0.4;
  return hybridScore(values, index, random, config);
}

function hybridScore(values: NormalizedFeatures, index: number, random: number, config: AppConfig): number {
  const weights = config.numberWeights;
  return values.momentum[index] * weights.momentum
    + values.gap[index] * weights.gap
    - Math.abs(values.longTerm[index]) * weights.longTerm
    + values.recentBalance[index] * weights.recentBalance
    + values.pair[index] * weights.pair
    + (random - 0.5) * config.randomFactorWeight;
}

function randomScores(features: NumberFeature[], seed: number): ScoredNumber[] {
  const random = new SeededRandom(seed);
  return shuffle(features, random).map((feature, index) => ({
    feature,
    number: feature.number,
    score: 100 - index * (100 / features.length),
  }));
}
