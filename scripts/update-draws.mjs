import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DATA_URL = 'https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do';
const RESULT_URL = 'https://www.dhlottery.co.kr/lt645/result';
const dataPath = fileURLToPath(new URL('../public/data/lotto-draws.json', import.meta.url));
const requestHeaders = {
  AJAX: 'true',
  Referer: RESULT_URL,
  'User-Agent': 'lotto-stat-lab-data-updater/1.0',
  requestMenuUri: '/lt645/result',
};

async function main() {
  const existing = JSON.parse(await readFile(dataPath, 'utf8'));
  const latestDrawNo = await fetchLatestDrawNo();
  const fetched = await fetchMissingDraws(existing, latestDrawNo);
  const merged = mergeDraws(existing, fetched);
  validateDraws(merged, latestDrawNo);
  if (merged.length === existing.length) {
    console.log(`이미 최신 데이터입니다. (${latestDrawNo}회)`);
    return;
  }
  await writeFile(dataPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`${existing.length}개에서 ${merged.length}개 회차로 갱신했습니다.`);
}

async function fetchLatestDrawNo() {
  const response = await fetch(RESULT_URL, { headers: requestHeaders });
  if (!response.ok) throw new Error(`최신 회차 페이지 조회 실패: ${response.status}`);
  const html = await response.text();
  const matched = html.match(/id="opt_val"\s+value="(\d+)"/);
  if (!matched) throw new Error('공식 페이지에서 최신 회차를 찾지 못했습니다.');
  return Number(matched[1]);
}

async function fetchMissingDraws(existing, latestDrawNo) {
  const latestExisting = existing.at(-1)?.drawNo ?? 0;
  if (latestExisting >= latestDrawNo) return [];
  const firstTarget = latestExisting === 0 ? 1 : latestExisting + 1;
  const targetCount = Math.ceil((latestDrawNo - firstTarget + 1) / 10);
  const targets = Array.from({ length: targetCount }, (_, index) => firstTarget + index * 10);
  const draws = [];
  for (let index = 0; index < targets.length; index += 4) {
    const batch = await Promise.all(targets.slice(index, index + 4).map(fetchDrawWindow));
    draws.push(...batch.flat());
  }
  return draws.filter((draw) => draw.drawNo > latestExisting && draw.drawNo <= latestDrawNo);
}

async function fetchDrawWindow(drawNo) {
  const params = new URLSearchParams({ srchDir: 'center', srchLtEpsd: String(drawNo) });
  const response = await fetch(`${DATA_URL}?${params}`, { headers: requestHeaders });
  if (!response.ok) throw new Error(`${drawNo}회 주변 데이터 조회 실패: ${response.status}`);
  const payload = await response.json();
  const list = payload?.data?.list;
  if (!Array.isArray(list)) throw new Error(`${drawNo}회 주변 응답 형식이 올바르지 않습니다.`);
  return list.map(toDraw);
}

function toDraw(value) {
  const rawDate = String(value.ltRflYmd);
  return {
    drawNo: Number(value.ltEpsd),
    drawDate: `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`,
    numbers: [value.tm1WnNo, value.tm2WnNo, value.tm3WnNo, value.tm4WnNo, value.tm5WnNo, value.tm6WnNo]
      .map(Number)
      .sort((left, right) => left - right),
    bonus: Number(value.bnsWnNo),
  };
}

function mergeDraws(existing, fetched) {
  const byDrawNo = new Map([...existing, ...fetched].map((draw) => [draw.drawNo, draw]));
  return [...byDrawNo.values()].sort((left, right) => left.drawNo - right.drawNo);
}

function validateDraws(draws, latestDrawNo) {
  if (draws.length !== latestDrawNo) throw new Error(`1~${latestDrawNo}회 중 누락된 데이터가 있습니다.`);
  draws.forEach((draw, index) => validateDraw(draw, index + 1));
}

function validateDraw(draw, expectedDrawNo) {
  const allNumbers = [...draw.numbers, draw.bonus];
  if (draw.drawNo !== expectedDrawNo) throw new Error(`${expectedDrawNo}회 데이터가 누락되었습니다.`);
  if (draw.numbers.length !== 6 || new Set(draw.numbers).size !== 6) {
    throw new Error(`${draw.drawNo}회 당첨번호가 올바르지 않습니다.`);
  }
  if (!allNumbers.every((number) => Number.isInteger(number) && number >= 1 && number <= 45)) {
    throw new Error(`${draw.drawNo}회 번호 범위가 올바르지 않습니다.`);
  }
  if (draw.numbers.includes(draw.bonus)) throw new Error(`${draw.drawNo}회 보너스 번호가 중복됩니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draw.drawDate)) throw new Error(`${draw.drawNo}회 날짜가 올바르지 않습니다.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
