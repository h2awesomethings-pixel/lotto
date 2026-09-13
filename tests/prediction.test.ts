import { describe, expect, it } from 'vitest';
import { generatePrediction } from '../src/prediction';
import { createDraws } from './fixtures';

const draws = createDraws(130);
const request = {
  baseDrawNo: 120,
  strategy: 'HYBRID' as const,
  candidateCount: 15,
  gameCount: 5,
  seed: 12345,
  generationMode: 'EXHAUSTIVE' as const,
};

describe('추천 생성', () => {
  it('동일 Seed에서 같은 후보와 게임을 생성한다', () => {
    const first = generatePrediction(draws, request);
    const second = generatePrediction(draws, request);
    expect(second).toEqual(first);
    expect(first.candidates).toHaveLength(15);
    expect(first.games).toHaveLength(5);
  });

  it('기준 회차 이후의 미래 데이터를 사용하지 않는다', () => {
    const withoutFuture = generatePrediction(draws.slice(0, 120), request);
    const withFuture = generatePrediction(draws, request);
    expect(withFuture).toEqual(withoutFuture);
  });

  it('최종 게임의 중복 번호 수가 제한 이내다', () => {
    const result = generatePrediction(draws, request);
    result.games.forEach((game, index) => result.games.slice(index + 1).forEach((other) => {
      expect(game.numbers.filter((number) => other.numbers.includes(number)).length).toBeLessThanOrEqual(3);
    }));
  });
});
