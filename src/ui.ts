import { STRATEGIES } from './config';
import { round } from './statistics';
import type { BacktestResult, LottoDraw, PredictionResult, ScoredGame, StrategyEvaluation } from './types';

export function appTemplate(latest: LottoDraw): string {
  return `
    <header class="site-header">
      <button class="brand view-link" data-panel="recommend-panel">로또 번호 추천</button>
      <span>6/45</span>
    </header>
    <main>
      <section id="recommend-panel" class="panel">${recommendationForm(latest)}</section>
      <section id="backtest-panel" class="panel hidden">${backtestForm(latest.drawNo)}</section>
      <section id="guide-panel" class="panel hidden">${guideTemplate()}</section>
    </main>
    <footer>
      <p>통계 기반 추천이며 당첨을 보장하지 않습니다.</p>
      <nav class="footer-nav" aria-label="보조 기능">
        <button class="view-link" data-panel="backtest-panel">통계 검증</button>
        <button class="view-link" data-panel="guide-panel">분석 기준</button>
        <a href="https://www.dhlottery.co.kr/" target="_blank" rel="noopener">동행복권</a>
      </nav>
    </footer>`;
}

function recommendationForm(latest: LottoDraw): string {
  return `<div class="main-heading">
      <h1>로또 번호 추천</h1>
      <p>역대 ${latest.drawNo.toLocaleString()}회 당첨 데이터를 분석해 번호 조합을 추천합니다.</p>
    </div>
    <div class="latest-strip">
      <div class="latest-copy"><span>최신 당첨번호</span><strong>${latest.drawNo}회 · ${latest.drawDate}</strong></div>
      <div class="latest-balls">${ballsTemplate(latest.numbers, 'small')}</div>
    </div>
    <form id="recommend-form">
      <div class="basic-controls">
        ${selectField('strategy', '추천 방식', strategyOptions('HYBRID'))}
        ${numberField('game-count', '게임 수', 5, 1, 10)}
        <button class="primary-button" type="submit">추천 번호 만들기</button>
      </div>
      <details class="advanced-settings">
        <summary>상세 설정</summary>
        <div class="advanced-grid">
          ${numberField('candidate-count', '후보 수', 15, 12, 18)}
          ${numberField('seed', '재현 Seed', 12345, 1, 2147483647)}
          ${selectField('generation-mode', '조합 생성 방식', '<option value="EXHAUSTIVE">전체 조합 평가</option><option value="WEIGHTED">가중 무작위</option>')}
        </div>
      </details>
      <input id="base-draw" type="hidden" value="${latest.drawNo}" />
    </form>
    <div id="recommend-status" class="status" aria-live="polite"></div>
    <div id="recommend-result"></div>`;
}

function backtestForm(latestDrawNo: number): string {
  const startDraw = Math.max(101, latestDrawNo - 99);
  return `<button class="back-link view-link" data-panel="recommend-panel">← 번호 추천으로 돌아가기</button>
    <div class="section-heading">
      <div><h2>통계 검증</h2></div>
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
  return `<button class="back-link view-link" data-panel="recommend-panel">← 번호 추천으로 돌아가기</button>
    <div class="section-heading"><div><h2>분석 기준</h2></div></div>
    <div class="guide-grid">
      ${guideCard('01', '번호 분석', '최근 출현 빈도, 현재 및 평균 출현 간격, 장기 편차와 번호 간 동시 출현을 계산합니다.')}
      ${guideCard('02', '추천 방식', '서로 다른 기준의 추천 방식을 같은 조건에서 비교합니다.')}
      ${guideCard('03', '조합 평가', '홀짝, 합계, 구간, 연속수, 이전 회차 중복과 번호 분산을 평가합니다.')}
      ${guideCard('04', '미래 데이터 차단', '과거 회차를 검증할 때는 해당 회차 이전 데이터만 사용합니다.')}
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
    HYBRID: '균형 추천', MOMENTUM: '최근 빈도 중심', COLD: '미출현 기간 중심',
    NEUTRAL: '평균 분포 중심', RANDOM: '완전 무작위',
  };
  return STRATEGIES.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${labels[value]}</option>`).join('');
}

function strategyChecks(): string {
  return STRATEGIES.map((strategy) => `<label class="check"><input type="checkbox" name="strategies" value="${strategy}" checked /><span>${strategy}</span></label>`).join('');
}

export function predictionTemplate(result: PredictionResult): string {
  const candidates = result.candidates.map((candidate, index) => `
    <div class="candidate"><b>${String(index + 1).padStart(2, '0')}</b>${ballTemplate(candidate.number, 'tiny')}<span>${round(candidate.score, 1)}점</span></div>`).join('');
  return `<div class="result-header"><div><span>${strategyLabel(result.strategy)}</span><h3>${result.baseDrawNo + 1}회 추천 번호</h3></div>
      <button id="download-prediction" class="secondary-button">JSON 저장</button></div>
    <div class="games">${result.games.map(gameTemplate).join('')}</div>
    <details><summary>후보 ${result.candidates.length}개와 점수 보기</summary><div class="candidates">${candidates}</div></details>`;
}

function gameTemplate(game: ScoredGame, index: number): string {
  return `<article class="game-card"><div class="game-meta"><span>${String.fromCharCode(65 + index)}</span><strong>${round(game.score, 1)}<small>점</small></strong></div>
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

function strategyLabel(strategy: string): string {
  const labels: Record<string, string> = {
    HYBRID: '균형 추천', MOMENTUM: '최근 빈도 중심', COLD: '미출현 기간 중심',
    NEUTRAL: '평균 분포 중심', RANDOM: '완전 무작위',
  };
  return labels[strategy] ?? strategy;
}
