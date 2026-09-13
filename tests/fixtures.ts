import type { LottoDraw } from '../src/types';

export function createDraws(count: number): LottoDraw[] {
  return Array.from({ length: count }, (_, index) => createDraw(index + 1));
}

function createDraw(drawNo: number): LottoDraw {
  const start = (drawNo * 7) % 45;
  const numbers = [0, 7, 14, 21, 28, 35]
    .map((offset) => ((start + offset) % 45) + 1)
    .sort((left, right) => left - right);
  let bonus = ((start + 1) % 45) + 1;
  while (numbers.includes(bonus)) bonus = (bonus % 45) + 1;
  return {
    drawNo,
    drawDate: new Date(Date.UTC(2002, 11, 7 + (drawNo - 1) * 7)).toISOString().slice(0, 10),
    numbers,
    bonus,
  };
}
