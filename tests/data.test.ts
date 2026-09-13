import { describe, expect, it } from 'vitest';
import { validateDraws } from '../src/data';
import { createDraws } from './fixtures';

describe('당첨 데이터 검증', () => {
  it('정상적이고 연속된 회차를 허용한다', () => {
    expect(() => validateDraws(createDraws(10))).not.toThrow();
  });

  it('누락된 회차와 중복 번호를 거부한다', () => {
    const missing = createDraws(3);
    missing[2].drawNo = 4;
    expect(() => validateDraws(missing)).toThrow('연속적이지 않습니다');
    const duplicated = createDraws(1);
    duplicated[0].numbers[1] = duplicated[0].numbers[0];
    expect(() => validateDraws(duplicated)).toThrow('서로 다른 6개');
  });
});
