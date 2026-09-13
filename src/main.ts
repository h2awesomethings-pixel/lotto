import './styles.css';
import { loadConfig } from './config';
import { downloadJson, loadDraws } from './data';
import { generatePrediction } from './prediction';
import type { AppConfig, BacktestRequest, BacktestResult, LottoDraw, PredictionResult, Strategy } from './types';
import { appTemplate, backtestTemplate, predictionTemplate } from './ui';

const app = document.querySelector<HTMLDivElement>('#app')!;
let draws: LottoDraw[] = [];
let config: AppConfig;
let latestPrediction: PredictionResult | null = null;
let latestBacktest: BacktestResult | null = null;

initialize().catch(showFatalError);

async function initialize(): Promise<void> {
  app.innerHTML = '<div class="loading-screen"><span></span><p>역대 데이터를 불러오는 중입니다.</p></div>';
  [draws, config] = await Promise.all([loadDraws(), loadConfig()]);
  app.innerHTML = appTemplate(draws.at(-1)!);
  bindNavigation();
  bindRecommendation();
  bindBacktest();
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((panel) => panel.classList.add('hidden'));
      tab.classList.add('active');
      document.querySelector(`#${tab.dataset.panel}`)?.classList.remove('hidden');
    });
  });
}

function bindRecommendation(): void {
  document.querySelector('#recommend-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = element('recommend-status');
    status.textContent = '5,005개 조합을 평가하고 있습니다.';
    window.setTimeout(() => createRecommendation(status), 20);
  });
}

function createRecommendation(status: HTMLElement): void {
  try {
    latestPrediction = generatePrediction(draws, {
      baseDrawNo: inputNumber('base-draw'),
      strategy: inputValue('strategy') as Strategy,
      candidateCount: inputNumber('candidate-count'),
      gameCount: inputNumber('game-count'),
      seed: inputNumber('seed'),
      generationMode: inputValue('generation-mode') as 'EXHAUSTIVE' | 'WEIGHTED',
    }, config);
    element('recommend-result').innerHTML = predictionTemplate(latestPrediction);
    status.textContent = '추천 계산이 완료되었습니다.';
    bindDownload('download-prediction', 'lotto-prediction.json', () => latestPrediction);
  } catch (error) {
    status.textContent = errorMessage(error);
  }
}

function bindBacktest(): void {
  document.querySelector('#backtest-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = element('backtest-status');
    status.textContent = '백테스트를 실행 중입니다. 다른 화면을 계속 사용할 수 있습니다.';
    startBacktest(status);
  });
}

function startBacktest(status: HTMLElement): void {
  const worker = new Worker(new URL('./backtest.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<{ result?: BacktestResult; error?: string }>) => {
    worker.terminate();
    if (data.error) {
      status.textContent = data.error;
      return;
    }
    showBacktest(data.result!, status);
  };
  worker.onerror = () => {
    worker.terminate();
    status.textContent = '백테스트 작업을 실행하지 못했습니다.';
  };
  worker.postMessage({ draws, request: backtestRequest(), config });
}

function backtestRequest(): BacktestRequest {
  const selected = [...document.querySelectorAll<HTMLInputElement>('input[name="strategies"]:checked')];
  return {
    startDrawNo: inputNumber('start-draw'),
    endDrawNo: inputNumber('end-draw'),
    strategies: selected.map((input) => input.value as Strategy),
    candidateCount: inputNumber('backtest-candidates'),
    gameCount: inputNumber('backtest-games'),
    seed: inputNumber('backtest-seed'),
  };
}

function showBacktest(result: BacktestResult, status: HTMLElement): void {
  latestBacktest = result;
  element('backtest-result').innerHTML = backtestTemplate(result);
  status.textContent = `${result.request.endDrawNo - result.request.startDrawNo + 1}개 회차 검증이 완료되었습니다.`;
  bindDownload('download-backtest', 'lotto-backtest.json', () => latestBacktest);
}

function bindDownload(id: string, filename: string, value: () => unknown): void {
  document.querySelector(`#${id}`)?.addEventListener('click', () => downloadJson(filename, value()));
}

function inputNumber(id: string): number {
  return Number((element(id) as HTMLInputElement).value);
}

function inputValue(id: string): string {
  return (element(id) as HTMLInputElement | HTMLSelectElement).value;
}

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`${id} 화면 요소가 없습니다.`);
  return found;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

function showFatalError(error: unknown): void {
  app.innerHTML = `<div class="fatal"><h1>데이터를 불러오지 못했습니다.</h1><p>${errorMessage(error)}</p></div>`;
}
