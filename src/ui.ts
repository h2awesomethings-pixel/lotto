import { STRATEGIES } from './config';
import { round } from './statistics';
import type { BacktestResult, LottoDraw, PredictionResult, ScoredGame, StrategyEvaluation } from './types';

export function appTemplate(latest: LottoDraw): string {
  return `
    <header class="hero">
      <div class="hero__copy">
        <p class="eyebrow">LOTTO 6/45 · STATISTICAL LAB</p>
        <h1>운을 예언하지 않고,<br><span>데이터를 검증합니다.</span></h1>
        <p class="lead">역대 ${latest.drawNo.toLocaleString()}개 회차를 기준으로 후보를 압축하고 조합을 평가합니다.</p>
      </div>
      <div class="latest-card">
        <span>최신 데이터</span>
        <strong>${latest.drawNo}회</strong>
        <small>${latest.drawDate}</small>
        <div class="latest-balls">${ballsTemplate(latest.numbers, 'small')}</div>
      </div>
    </header>
    <main>
      ${navigationTemplate()}
      <section id="recommend-panel" class="panel">${recommendationForm(latest.drawNo)}</section>
      <section id="backtest-panel" class="panel hidden">${backtestForm(latest.drawNo)}</section>
      <section id="guide-panel" class="panel hidden">${guideTemplate()}</section>
    </main>
    <footer>
      <p>통계 기반 실험 결과이며 당첨확률 증가를 보장하지 않습니다.</p>
      <a href="https://www.dhlottery.co.kr/" target="_blank" rel="noopener">동행복권 공식 사이트</a>
    </footer>`;
}

function navigationTemplate(): string {
  return `<nav class="tabs" aria-label="기능 선택">
    <button class="tab active" data-panel="recommend-panel">번호 추천</button>
    <button class="tab" data-panel="backtest-panel">전략 백테스트</button>
    <button class="tab" data-panel="guide-panel">분석 기준</button>
  </nav>`;
}

function recommendationForm(latestDrawNo: number): string {
  return `<div class="section-heading">
      <div><p class="eyebrow">RECOMMENDATION</p><h2>통계 기반 번호 추천</h2></div>
      <p>번호 점수와 조합 점수를 따로 계산한 후 서로 겹치지 않는 5게임을 고릅니다.</p>
    </div>
    <form id="recommend-form" class="control-grid">
      ${selectField('strategy', '전략', strategyOptions('HYBRID'))}
      ${numberField('candidate-count', '후보 수', 15, 12, 18)}
      ${numberField('game-count', '게임 수', 5, 1, 10)}
      ${numberField('seed', '재현 Seed', 12345, 1, 2147483647)}
      ${selectField('generation-mode', '조합 생성', '<option value="EXHAUSTIVE">전수 평가</option><option value="WEIGHTED">가중 무작위</option>')}
      <input id="base-draw" type="hidden" value="${latestDrawNo}" />
      <button class="primary-button" type="submit">추천 번호 만들기</button>
    </form>
    <div id="recommend-status" class="status" aria-live="polite"></div>
    <div id="recommend-result"></div>`;
}

function backtestForm(latestDrawNo: number): string {
  const startDraw = Math.max(101, latestDrawNo - 99);
  return `<div class="section-heading">
      <div><p class="eyebrow">WALK-FORWARD</p><h2>전략 백테스트</h2></div>
      <p>각 회차 예측에는 바로 전 회차까지의 데이터만 사용해 미래 데이터 유입을 차단합니다.</p>
    </div>
    <form id="backtest-form">
      <div class="control-grid compact">
        ${numberField('start-draw', '시작 회차', startDraw, 101, latestDrawNo)}
        ${numberField('end-draw', '종료 회차', latestDrawNo, 101, latestDrawNo)}
        ${numberField('backtest-candidates', '후보 수', 15, 12, 18)}
        ${numberField('backtest-games', '게임 수', 5, 1, 10)}
        ${numberField('backtest-seed', '재현 Seed', 12345, 1, 2147483647)}
      </div>
      <fieldset><legend>비교 전략</legend><div class="strategy-checks">${strategyChecks()}</div></fieldset>
      <button class="primary-button" type="submit">백테스트 실행</button>
    </form>
    <div id="backtest-status" class="status" aria-live="polite"></div>
    <div id="backtest-result"></div>`;
}

function guideTemplate(): string {
  return `<div class="section-heading"><div><p class="eyebrow">METHODOLOGY</p><h2>분석 기준</h2></div></div>
    <div class="guide-grid">
      ${guideCard('01', '번호 Feature', '최근 20·50·100회 빈도, 현재 및 평균 출현 간격, 장기 편차와 pair lift를 계산합니다.')}
      ${guideCard('02', '전략 점수', 'Momentum, Cold, Neutral, Hybrid, Random을 동일한 조건에서 분리 비교합니다.')}
      ${guideCard('03', '조합 평가', '홀짝, 합계, 구간, 연속수, 이전 회차 중복, 끝수, 거리와 pair 호환성을 평가합니다.')}
      ${guideCard('04', '미래 차단', 'N회를 평가할 때 1회부터 N-1회까지만 사용하며 동일 Seed로 결과를 재현합니다.')}
    </div>`;
}

function guideCard(number: string, title: string, body: string): string {
  return `<article class="guide-card"><span>${number}</span><h3>${title}</h3><p>${body}</p></article>`;
}

function selectField(id: string, label: string, options: string): string {
  return `<label><span>${label}</span><select id="${id}">${options}</select></label>`;
}

function numberField(id: string, label: string, value: number, min: number, max: number): string {
  return `<label><span>${label}</span><input id="${id}" type="number" value="${value}" min="${min}" max="${max}" required /></label>`;
}

function strategyOptions(selected: string): string {
  const labels: Record<string, string> = {
    HYBRID: 'Hybrid · 균형', MOMENTUM: 'Momentum · 최근 강세', COLD: 'Cold · 출현 간격',
    NEUTRAL: 'Neutral · 기준선', RANDOM: 'Random · 무작위',
  };
  return STRATEGIES.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${labels[value]}</option>`).join('');
}

function strategyChecks(): string {
  return STRATEGIES.map((strategy) => `<label class="check"><input type="checkbox" name="strategies" value="${strategy}" checked /><span>${strategy}</span></label>`).join('');
}

export function predictionTemplate(result: PredictionResult): string {
  const candidates = result.candidates.map((candidate, index) => `
    <div class="candidate"><b>${String(index + 1).padStart(2, '0')}</b>${ballTemplate(candidate.number, 'tiny')}<span>${round(candidate.score, 1)}점</span></div>`).join('');
  return `<div class="result-header"><div><span>${result.strategy}</span><h3>${result.baseDrawNo + 1}회 추천 조합</h3></div>
      <button id="download-prediction" class="secondary-button">JSON 저장</button></div>
    <div class="games">${result.games.map(gameTemplate).join('')}</div>
    <details><summary>후보 ${result.candidates.length}개와 점수 보기</summary><div class="candidates">${candidates}</div></details>`;
}

function gameTemplate(game: ScoredGame, index: number): string {
  return `<article class="game-card"><div class="game-meta"><span>GAME ${String.fromCharCode(65 + index)}</span><strong>${round(game.score, 1)}<small>점</small></strong></div>
    <div class="balls">${ballsTemplate(game.numbers)}</div></article>`;
}

export function backtestTemplate(result: BacktestResult): string {
  const baseline = result.randomBaseline;
  return `<div class="result-header"><div><span>${result.request.startDrawNo}~${result.request.endDrawNo}회</span><h3>전략 비교 결과</h3></div>
      <button id="download-backtest" class="secondary-button">JSON 저장</button></div>
    <div class="baseline-card"><span>RANDOM SIMULATION × ${baseline.simulations.toLocaleString()}</span>
      <strong>${baseline.simulatedMean}<small>개</small></strong>
      <p>무작위 후보 평균 · 95% 범위 ${baseline.lower95}~${baseline.upper95}개 · 이론값 ${baseline.theoreticalMean}개</p></div>
    <div class="table-wrap"><table><thead><tr><th>전략</th><th>후보 평균 적중</th><th>Random 대비</th><th>p-value</th><th>최고 게임 평균</th><th>3+ 비율</th><th>4+ 비율</th></tr></thead>
    <tbody>${result.strategies.map((strategy) => strategyRow(strategy, result)).join('')}</tbody></table></div>
    <p class="elapsed">브라우저 계산 시간 ${(result.elapsedMs / 1000).toFixed(1)}초 · p-value는 무작위가 해당 전략 이상일 확률의 시뮬레이션 추정치입니다.</p>`;
}

function strategyRow(result: StrategyEvaluation, backtest: BacktestResult): string {
  const comparison = backtest.randomBaseline.comparisons.find((item) => item.strategy === result.strategy)!;
  return `<tr><th>${result.strategy}</th><td>${result.averageCandidateHits}</td><td>${comparison.uplift >= 0 ? '+' : ''}${comparison.uplift}</td><td>${comparison.pValue}</td><td>${result.averageBestMatch}</td><td>${result.gameHitRates[3]}%</td><td>${result.gameHitRates[4]}%</td></tr>`;
}

export function ballsTemplate(numbers: number[], size = ''): string {
  return numbers.map((number) => ballTemplate(number, size)).join('');
}

function ballTemplate(number: number, size = ''): string {
  return `<span class="ball color-${Math.ceil(number / 10)} ${size}">${number}</span>`;
}
