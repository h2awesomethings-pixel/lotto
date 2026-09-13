import { mean } from './statistics';
import type { LottoDraw, NumberFeature } from './types';

const LOTTO_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const EXPECTED_GAP = 45 / 6;

export function calculateNumberFeatures(history: LottoDraw[]): NumberFeature[] {
  if (history.length === 0) throw new Error('Feature 계산에는 과거 데이터가 필요합니다.');
  const latest = history.at(-1)!;
  const pairLookup = createPairLiftLookup(history);
  return LOTTO_NUMBERS.map((number) => calculateNumberFeature(number, history, latest, pairLookup));
}

function calculateNumberFeature(
  number: number,
  history: LottoDraw[],
  latest: LottoDraw,
  pairLookup: PairLiftLookup,
): NumberFeature {
  const appearances = history.filter((draw) => draw.numbers.includes(number)).map((draw) => draw.drawNo);
  const totalFreq = appearances.length;
  const lastDrawNo = appearances.at(-1) ?? null;
  const avgGap = averageGap(appearances);
  const currentGap = lastDrawNo === null ? history.length : latest.drawNo - lastDrawNo;
  return {
    number,
    totalFreq,
    freq20: recentFrequency(number, history, 20),
    freq50: recentFrequency(number, history, 50),
    freq100: recentFrequency(number, history, 100),
    currentGap,
    avgGap,
    gapRatio: currentGap / avgGap,
    lastDrawNo,
    repeatFromPreviousDraw: latest.numbers.includes(number) ? 1 : 0,
    recentTrend: recentTrend(number, history),
    longTermDeviation: longTermDeviation(totalFreq, history.length),
    pairScore: averagePairLift(number, pairLookup),
  };
}

function recentFrequency(number: number, history: LottoDraw[], window: number): number {
  return history.slice(-window).filter((draw) => draw.numbers.includes(number)).length;
}

function averageGap(appearances: number[]): number {
  if (appearances.length < 2) return EXPECTED_GAP;
  const gaps = appearances.slice(1).map((drawNo, index) => drawNo - appearances[index]);
  return mean(gaps);
}

function recentTrend(number: number, history: LottoDraw[]): number {
  const window20 = Math.min(20, history.length);
  const window100 = Math.min(100, history.length);
  const recentRate = recentFrequency(number, history, window20) / window20;
  const longRate = recentFrequency(number, history, window100) / window100;
  return recentRate - longRate;
}

function longTermDeviation(totalFreq: number, drawCount: number): number {
  const probability = 6 / 45;
  const expected = drawCount * probability;
  const deviation = Math.sqrt(drawCount * probability * (1 - probability));
  return deviation === 0 ? 0 : (totalFreq - expected) / deviation;
}

export function pairLift(left: number, right: number, history: LottoDraw[]): number {
  return createPairLiftLookup(history)(left, right);
}

export type PairLiftLookup = (left: number, right: number) => number;

export function createPairLiftLookup(history: LottoDraw[]): PairLiftLookup {
  const numberCounts = Array.from({ length: 46 }, () => 0);
  const pairCounts = new Map<string, number>();
  history.forEach((draw) => countDrawPairs(draw, numberCounts, pairCounts));
  return (left, right) => calculatePairLift(left, right, history.length, numberCounts, pairCounts);
}

function countDrawPairs(draw: LottoDraw, numberCounts: number[], pairCounts: Map<string, number>): void {
  draw.numbers.forEach((number) => { numberCounts[number] += 1; });
  for (let left = 0; left < draw.numbers.length; left += 1) {
    for (let right = left + 1; right < draw.numbers.length; right += 1) {
      const key = pairKey(draw.numbers[left], draw.numbers[right]);
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
  }
}

function calculatePairLift(
  left: number,
  right: number,
  drawCount: number,
  numberCounts: number[],
  pairCounts: Map<string, number>,
): number {
  const expected = (numberCounts[left] * numberCounts[right]) / drawCount;
  return ((pairCounts.get(pairKey(left, right)) ?? 0) + 1) / (expected + 1);
}

function pairKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`;
}

function averagePairLift(number: number, pairLookup: PairLiftLookup): number {
  const others = LOTTO_NUMBERS.filter((other) => other !== number);
  return mean(others.map((other) => pairLookup(number, other)));
}
