/// <reference lib="webworker" />

import { runBacktest } from './backtest';
import type { AppConfig, BacktestRequest, LottoDraw } from './types';

interface WorkerRequest {
  draws: LottoDraw[];
  request: BacktestRequest;
  config: AppConfig;
}

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    self.postMessage({ result: runBacktest(data.draws, data.request, data.config) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '백테스트에 실패했습니다.';
    self.postMessage({ error: message });
  }
};
