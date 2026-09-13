import { describe, expect, it } from 'vitest';
import { runBacktest } from '../src/backtest';
import { createDraws } from './fixtures';

describe('Walk-forward 백테스트', () => {
  it('Random 후보 1,000회 분포와 전략별 비교를 계산한다', () => {
    const result = runBacktest(createDraws(105), {
      startDrawNo: 101,
      endDrawNo: 105,
      strategies: ['NEUTRAL', 'RANDOM'],
      candidateCount: 15,
      gameCount: 5,
      seed: 12345,
    });
    expect(result.randomBaseline.simulations).toBe(1000);
    expect(result.randomBaseline.simulatedMean).toBeCloseTo(2, 1);
    expect(result.randomBaseline.comparisons).toHaveLength(2);
    expect(result.randomBaseline.comparisons[0].pValue).toBeGreaterThan(0);
  });
});
