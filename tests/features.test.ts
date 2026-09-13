import { describe, expect, it } from 'vitest';
import { calculateNumberFeatures, pairLift } from '../src/features';
import type { LottoDraw } from '../src/types';

const draws: LottoDraw[] = [
  { drawNo: 1, drawDate: '2002-12-07', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { drawNo: 2, drawDate: '2002-12-14', numbers: [1, 7, 8, 9, 10, 11], bonus: 12 },
  { drawNo: 3, drawDate: '2002-12-21', numbers: [2, 12, 13, 14, 15, 16], bonus: 17 },
  { drawNo: 4, drawDate: '2002-12-28', numbers: [1, 2, 18, 19, 20, 21], bonus: 22 },
];

describe('번호 Feature', () => {
  it('전체·최근 빈도와 출현 간격을 계산한다', () => {
    const feature = calculateNumberFeatures(draws).find((item) => item.number === 1)!;
    expect(feature.totalFreq).toBe(3);
    expect(feature.freq20).toBe(3);
    expect(feature.currentGap).toBe(0);
    expect(feature.avgGap).toBe(1.5);
    expect(feature.repeatFromPreviousDraw).toBe(1);
  });

  it('동시 출현을 기대값과 비교하고 smoothing을 적용한다', () => {
    expect(pairLift(1, 7, draws)).toBeGreaterThan(1);
    expect(Number.isFinite(pairLift(44, 45, draws))).toBe(true);
  });
});
