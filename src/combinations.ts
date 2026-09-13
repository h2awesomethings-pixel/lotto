import type { PairLiftLookup } from './features';
import type { RandomSource } from './random';
import { mean } from './statistics';
import type { AppConfig, CombinationFeature, LottoDraw, ScoredGame, ScoredNumber } from './types';

const GAME_SIZE = 6;

export function generateAllCombinations(candidates: ScoredNumber[]): number[][] {
  const result: number[][] = [];
  combine(candidates.map((candidate) => candidate.number), 0, [], result);
  return result;
}

function combine(numbers: number[], start: number, selected: number[], result: number[][]): void {
  if (selected.length === GAME_SIZE) {
    result.push([...selected]);
    return;
  }
  const required = GAME_SIZE - selected.length;
  for (let index = start; index <= numbers.length - required; index += 1) {
    selected.push(numbers[index]);
    combine(numbers, index + 1, selected, result);
    selected.pop();
  }
}

export function generateWeightedCombinations(
  candidates: ScoredNumber[],
  count: number,
  random: RandomSource,
): number[][] {
  const unique = new Map<string, number[]>();
  const maximum = combinationCount(candidates.length, GAME_SIZE);
  const target = Math.min(count, maximum);
  for (let attempt = 0; unique.size < target && attempt < target * 20; attempt += 1) {
    const game = weightedGame(candidates, random).sort((left, right) => left - right);
    unique.set(game.join('-'), game);
  }
  return [...unique.values()];
}

function weightedGame(candidates: ScoredNumber[], random: RandomSource): number[] {
  const pool = [...candidates];
  const selected: number[] = [];
  while (selected.length < GAME_SIZE) {
    const index = weightedIndex(pool, random);
    selected.push(pool.splice(index, 1)[0].number);
  }
  return selected;
}

function weightedIndex(pool: ScoredNumber[], random: RandomSource): number {
  const weights = pool.map((candidate) => Math.max(candidate.score, 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random.next() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return index;
  }
  return pool.length - 1;
}

export function scoreGames(
  games: number[][],
  candidates: ScoredNumber[],
  previousDraw: LottoDraw,
  pairLookup: PairLiftLookup,
  config: AppConfig,
): ScoredGame[] {
  const scores = new Map(candidates.map((candidate) => [candidate.number, candidate.score]));
  return games.map((numbers) => scoreGame(numbers, scores, previousDraw, pairLookup, config));
}

function scoreGame(
  numbers: number[],
  numberScores: Map<number, number>,
  previousDraw: LottoDraw,
  pairLookup: PairLiftLookup,
  config: AppConfig,
): ScoredGame {
  const features = combinationFeatures(numbers, previousDraw, pairLookup, config);
  const numberScore = mean(numbers.map((number) => numberScores.get(number) ?? 0)) / 100;
  const weights = config.combinationWeights;
  const score = numberScore * weights.number + weightedFeatureScore(features, weights);
  return { numbers: [...numbers].sort((a, b) => a - b), features, score: score * 100 };
}

function weightedFeatureScore(features: CombinationFeature, weights: Record<string, number>): number {
  return features.oddEvenScore * weights.oddEven
    + features.sumScore * weights.sum
    + features.rangeDistributionScore * weights.range
    + features.consecutiveScore * weights.consecutive
    + features.previousDrawOverlapScore * weights.previousOverlap
    + features.endingDigitDiversityScore * weights.endingDigit
    + features.numberDistanceScore * weights.distance
    + features.pairCompatibilityScore * weights.pair;
}

export function combinationFeatures(
  numbers: number[],
  previousDraw: LottoDraw,
  pairLookup: PairLiftLookup,
  config: AppConfig,
): CombinationFeature {
  return {
    oddEvenScore: oddEvenScore(numbers),
    sumScore: gaussian(numbers.reduce((sum, value) => sum + value, 0), config.sumMean, config.sumSigma),
    rangeDistributionScore: rangeScore(numbers),
    consecutiveScore: consecutiveScore(numbers),
    previousDrawOverlapScore: overlapScore(numbers, previousDraw.numbers),
    endingDigitDiversityScore: new Set(numbers.map((number) => number % 10)).size / GAME_SIZE,
    numberDistanceScore: distanceScore(numbers),
    pairCompatibilityScore: pairCompatibility(numbers, pairLookup),
  };
}

function oddEvenScore(numbers: number[]): number {
  const oddCount = numbers.filter((number) => number % 2 === 1).length;
  return [0.1, 0.5, 0.9, 1, 0.9, 0.5, 0.1][oddCount];
}

function rangeScore(numbers: number[]): number {
  const counts = [0, 0, 0, 0, 0];
  numbers.forEach((number) => { counts[Math.min(Math.floor((number - 1) / 10), 4)] += 1; });
  const covered = counts.filter((count) => count > 0).length / 5;
  const concentrationPenalty = Math.max(...counts) >= 4 ? 0.35 : 0;
  return Math.max(0, covered - concentrationPenalty);
}

function consecutiveScore(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const pairs = sorted.slice(1).filter((number, index) => number === sorted[index] + 1).length;
  return [0.9, 1, 0.7, 0.5, 0.25, 0.1][Math.min(pairs, 5)];
}

function overlapScore(numbers: number[], previous: number[]): number {
  const overlap = numbers.filter((number) => previous.includes(number)).length;
  return [0.9, 1, 0.8, 0.4, 0.15, 0.05, 0.01][overlap];
}

function distanceScore(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((number, index) => number - sorted[index]);
  return gaussian(mean(gaps), 7.3, 3.5);
}

function pairCompatibility(numbers: number[], pairLookup: PairLiftLookup): number {
  const lifts: number[] = [];
  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      lifts.push(Math.min(pairLookup(numbers[left], numbers[right]), 2) / 2);
    }
  }
  return mean(lifts);
}

function gaussian(value: number, center: number, sigma: number): number {
  return Math.exp(-((value - center) ** 2) / (2 * sigma ** 2));
}

export function selectDiverseGames(games: ScoredGame[], count: number, maxOverlap: number): ScoredGame[] {
  const sorted = [...games].sort((left, right) => right.score - left.score);
  const selected: ScoredGame[] = [];
  for (const game of sorted) {
    if (selected.every((current) => overlapCount(current.numbers, game.numbers) <= maxOverlap)) {
      selected.push(game);
      if (selected.length === count) break;
    }
  }
  return selected;
}

function overlapCount(left: number[], right: number[]): number {
  return left.filter((number) => right.includes(number)).length;
}

function combinationCount(total: number, selected: number): number {
  let result = 1;
  for (let index = 1; index <= selected; index += 1) result = (result * (total - index + 1)) / index;
  return result;
}
