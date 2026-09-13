import type { LottoDraw } from './types';

const NUMBER_MIN = 1;
const NUMBER_MAX = 45;
const DRAW_SIZE = 6;

export async function loadDraws(): Promise<LottoDraw[]> {
  const url = `${import.meta.env.BASE_URL}data/lotto-draws.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`당첨 데이터를 불러오지 못했습니다. (${response.status})`);
  const draws = (await response.json()) as LottoDraw[];
  validateDraws(draws);
  return draws.sort((left, right) => left.drawNo - right.drawNo);
}

export function validateDraws(draws: LottoDraw[]): void {
  if (draws.length === 0) throw new Error('당첨 데이터가 비어 있습니다.');
  draws.forEach(validateDraw);
  for (let index = 1; index < draws.length; index += 1) {
    if (draws[index].drawNo !== draws[index - 1].drawNo + 1) {
      throw new Error(`${draws[index - 1].drawNo}회 다음 회차가 연속적이지 않습니다.`);
    }
  }
}

export function validateDraw(draw: LottoDraw): void {
  const unique = new Set(draw.numbers);
  if (draw.numbers.length !== DRAW_SIZE || unique.size !== DRAW_SIZE) {
    throw new Error(`${draw.drawNo}회 당첨번호는 서로 다른 6개여야 합니다.`);
  }
  if (![...draw.numbers, draw.bonus].every(isLottoNumber)) {
    throw new Error(`${draw.drawNo}회 번호가 1~45 범위를 벗어났습니다.`);
  }
  if (unique.has(draw.bonus)) throw new Error(`${draw.drawNo}회 보너스 번호가 중복됩니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.drawDate)) {
    throw new Error(`${draw.drawNo}회 날짜 형식이 올바르지 않습니다.`);
  }
}

export function historyThrough(draws: LottoDraw[], baseDrawNo: number): LottoDraw[] {
  const history = draws.filter((draw) => draw.drawNo <= baseDrawNo);
  if (history.length === 0) throw new Error('기준 회차 이전 데이터가 없습니다.');
  return history;
}

function isLottoNumber(number: number): boolean {
  return Number.isInteger(number) && number >= NUMBER_MIN && number <= NUMBER_MAX;
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
