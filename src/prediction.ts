import {
  generateAllCombinations,
  generateWeightedCombinations,
  scoreGames,
  selectDiverseGames,
} from './combinations';
import { DEFAULT_CONFIG } from './config';
import { historyThrough } from './data';
import { calculateNumberFeatures, createPairLiftLookup } from './features';
import { SeededRandom } from './random';
import { scoreNumbers } from './scoring';
import type { AppConfig, LottoDraw, PredictionRequest, PredictionResult, ScoredNumber } from './types';

export function generatePrediction(
  draws: LottoDraw[],
  request: PredictionRequest,
  config: AppConfig = DEFAULT_CONFIG,
): PredictionResult {
  validateRequest(request);
  const history = historyThrough(draws, request.baseDrawNo);
  const features = calculateNumberFeatures(history);
  const candidates = selectCandidates(scoreNumbers(features, request.strategy, request.seed, config), request.candidateCount);
  const pairLookup = createPairLiftLookup(history);
  const games = createGames(candidates, request, config);
  const evaluated = scoreGames(games, candidates, history.at(-1)!, pairLookup, config);
  const scored = request.strategy === 'RANDOM' ? randomizeGameScores(evaluated, request) : evaluated;
  const selected = selectDiverseGames(scored, request.gameCount, config.maxGameOverlap);
  if (selected.length < request.gameCount) throw new Error('다양성 조건을 만족하는 게임이 부족합니다.');
  return { ...request, candidates, games: selected };
}

function selectCandidates(scores: ScoredNumber[], count: number): ScoredNumber[] {
  return [...scores].sort((left, right) => right.score - left.score).slice(0, count);
}

function createGames(candidates: ScoredNumber[], request: PredictionRequest, config: AppConfig): number[][] {
  if (request.generationMode === 'EXHAUSTIVE') return generateAllCombinations(candidates);
  const random = new SeededRandom(request.seed + request.baseDrawNo);
  return generateWeightedCombinations(candidates, config.weightedSampleCount, random);
}

function randomizeGameScores(
  games: ReturnType<typeof scoreGames>,
  request: PredictionRequest,
): ReturnType<typeof scoreGames> {
  const random = new SeededRandom(request.seed + request.baseDrawNo * 31);
  return games.map((game) => ({ ...game, score: random.next() * 100 }));
}

function validateRequest(request: PredictionRequest): void {
  if (request.candidateCount < 12 || request.candidateCount > 25) {
    throw new Error('후보 번호 개수는 12~25 사이여야 합니다.');
  }
  if (request.gameCount < 1 || request.gameCount > 20) {
    throw new Error('게임 수는 1~20 사이여야 합니다.');
  }
  if (request.generationMode === 'EXHAUSTIVE' && request.candidateCount > 18) {
    throw new Error('전수 평가는 후보 18개까지만 지원합니다.');
  }
}
