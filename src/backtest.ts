import { generatePrediction } from './prediction';
import { DEFAULT_CONFIG } from './config';
import { mean, round } from './statistics';
import { SeededRandom, shuffle } from './random';
import type {
  BacktestRequest,
  BacktestResult,
  DrawEvaluation,
  LottoDraw,
  Strategy,
  StrategyEvaluation,
  AppConfig,
  RandomBaselineSummary,
} from './types';

const RANDOM_SIMULATIONS = 1000;
const LOTTO_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);

export function runBacktest(
  draws: LottoDraw[],
  request: BacktestRequest,
  config: AppConfig = DEFAULT_CONFIG,
): BacktestResult {
  validateBacktestRequest(draws, request);
  const startedAt = performance.now();
  const targets = draws.filter((draw) => draw.drawNo >= request.startDrawNo && draw.drawNo <= request.endDrawNo);
  const strategies = request.strategies.map((strategy) => evaluateStrategy(draws, targets, strategy, request, config));
  const randomBaseline = simulateRandomBaseline(targets, strategies, request);
  return { request, strategies, randomBaseline, elapsedMs: Math.round(performance.now() - startedAt) };
}

function simulateRandomBaseline(
  targets: LottoDraw[],
  strategies: StrategyEvaluation[],
  request: BacktestRequest,
): RandomBaselineSummary {
  const averages = Array.from({ length: RANDOM_SIMULATIONS }, (_, simulation) => {
    const random = new SeededRandom(request.seed + simulation * 7919);
    const hits = targets.map((target) => randomCandidateHits(target, request.candidateCount, random));
    return mean(hits);
  }).sort((left, right) => left - right);
  return {
    simulations: RANDOM_SIMULATIONS,
    theoreticalMean: round(6 * request.candidateCount / 45, 3),
    simulatedMean: round(mean(averages), 3),
    lower95: round(percentile(averages, 0.025), 3),
    upper95: round(percentile(averages, 0.975), 3),
    comparisons: strategies.map((strategy) => compareWithRandom(strategy, averages)),
  };
}

function randomCandidateHits(target: LottoDraw, count: number, random: SeededRandom): number {
  const candidates = shuffle(LOTTO_NUMBERS, random).slice(0, count);
  return matchCount(candidates, target.numbers);
}

function compareWithRandom(strategy: StrategyEvaluation, averages: number[]) {
  const equalOrBetter = averages.filter((average) => average >= strategy.averageCandidateHits).length;
  const belowOrEqual = averages.filter((average) => average <= strategy.averageCandidateHits).length;
  return {
    strategy: strategy.strategy,
    observedMean: strategy.averageCandidateHits,
    uplift: round(strategy.averageCandidateHits - mean(averages), 3),
    percentile: round((belowOrEqual / averages.length) * 100, 1),
    pValue: round((equalOrBetter + 1) / (averages.length + 1), 4),
  };
}

function percentile(sortedValues: number[], ratio: number): number {
  const index = Math.floor((sortedValues.length - 1) * ratio);
  return sortedValues[index];
}

function evaluateStrategy(
  draws: LottoDraw[],
  targets: LottoDraw[],
  strategy: Strategy,
  request: BacktestRequest,
  config: AppConfig,
): StrategyEvaluation {
  const evaluations = targets.map((target) => evaluateDraw(draws, target, strategy, request, config));
  return summarize(strategy, evaluations);
}

function evaluateDraw(
  draws: LottoDraw[],
  target: LottoDraw,
  strategy: Strategy,
  request: BacktestRequest,
  config: AppConfig,
): DrawEvaluation {
  const prediction = generatePrediction(draws, {
    baseDrawNo: target.drawNo - 1,
    strategy,
    candidateCount: request.candidateCount,
    gameCount: request.gameCount,
    seed: request.seed + target.drawNo,
    generationMode: 'EXHAUSTIVE',
  }, config);
  const candidateHits = matchCount(prediction.candidates.map((candidate) => candidate.number), target.numbers);
  const gameMatches = prediction.games.map((game) => matchCount(game.numbers, target.numbers));
  return {
    drawNo: target.drawNo,
    candidateHits,
    bestMatchCount: Math.max(...gameMatches),
    averageMatchCount: mean(gameMatches),
  };
}

function summarize(strategy: Strategy, draws: DrawEvaluation[]): StrategyEvaluation {
  return {
    strategy,
    drawCount: draws.length,
    averageCandidateHits: round(mean(draws.map((draw) => draw.candidateHits)), 3),
    candidateHitRates: thresholdRates(draws.map((draw) => draw.candidateHits), [3, 4, 5, 6]),
    averageBestMatch: round(mean(draws.map((draw) => draw.bestMatchCount)), 3),
    averageGameMatch: round(mean(draws.map((draw) => draw.averageMatchCount)), 3),
    gameHitRates: thresholdRates(draws.map((draw) => draw.bestMatchCount), [3, 4, 5]),
    draws,
  };
}

function thresholdRates(values: number[], thresholds: number[]): Record<number, number> {
  return Object.fromEntries(thresholds.map((threshold) => {
    const hits = values.filter((value) => value >= threshold).length;
    return [threshold, round((hits / values.length) * 100, 2)];
  }));
}

function matchCount(selected: number[], winning: number[]): number {
  return selected.filter((number) => winning.includes(number)).length;
}

function validateBacktestRequest(draws: LottoDraw[], request: BacktestRequest): void {
  if (request.startDrawNo < 101) throw new Error('백테스트는 최소 100회 학습 후 시작해야 합니다.');
  if (request.startDrawNo > request.endDrawNo) throw new Error('시작 회차는 종료 회차보다 작아야 합니다.');
  if (!draws.some((draw) => draw.drawNo === request.endDrawNo)) throw new Error('종료 회차 데이터가 없습니다.');
  if (request.strategies.length === 0) throw new Error('전략을 하나 이상 선택해야 합니다.');
}
