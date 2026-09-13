import { describe, expect, it } from 'vitest';
import { combinationFeatures, generateAllCombinations, selectDiverseGames } from '../src/combinations';
import { DEFAULT_CONFIG } from '../src/config';
import type { LottoDraw, ScoredGame, ScoredNumber } from '../src/types';

const candidates: ScoredNumber[] = Array.from({ length: 15 }, (_, index) => ({
  number: index + 1,
  score: 100 - index,
  feature: {} as ScoredNumber['feature'],
}));
const previous: LottoDraw = { drawNo: 1, drawDate: '2002-12-07', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 };

describe('조합 Feature와 다양성', () => {
  it('후보 15개에서 5,005개 조합을 생성한다', () => {
    expect(generateAllCombinations(candidates)).toHaveLength(5005);
  });

  it('홀짝·합계·연속번호·이전 회차 중복을 계산한다', () => {
    const feature = combinationFeatures([1, 2, 12, 23, 34, 45], previous, () => 1, DEFAULT_CONFIG);
    expect(feature.oddEvenScore).toBe(1);
    expect(feature.sumScore).toBeGreaterThan(0);
    expect(feature.consecutiveScore).toBe(1);
    expect(feature.previousDrawOverlapScore).toBe(0.8);
  });

  it('최종 게임끼리 동일 번호를 최대 3개만 허용한다', () => {
    const games = [game([1, 2, 3, 4, 5, 6], 100), game([1, 2, 3, 4, 7, 8], 99), game([1, 2, 3, 9, 10, 11], 98)];
    const selected = selectDiverseGames(games, 2, 3);
    expect(selected.map((item) => item.score)).toEqual([100, 98]);
  });
});

function game(numbers: number[], score: number): ScoredGame {
  return { numbers, score, features: {} as ScoredGame['features'] };
}
