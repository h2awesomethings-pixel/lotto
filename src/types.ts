export type Strategy = 'MOMENTUM' | 'COLD' | 'NEUTRAL' | 'HYBRID' | 'RANDOM';
export type GenerationMode = 'EXHAUSTIVE' | 'WEIGHTED';

export interface LottoDraw {
  drawNo: number;
  drawDate: string;
  numbers: number[];
  bonus: number;
}

export interface NumberFeature {
  number: number;
  totalFreq: number;
  freq20: number;
  freq50: number;
  freq100: number;
  currentGap: number;
  avgGap: number;
  gapRatio: number;
  lastDrawNo: number | null;
  repeatFromPreviousDraw: number;
  recentTrend: number;
  longTermDeviation: number;
  pairScore: number;
}

export interface ScoredNumber {
  number: number;
  score: number;
  feature: NumberFeature;
}

export interface ScoredGame {
  numbers: number[];
  score: number;
  features: CombinationFeature;
}

export interface CombinationFeature {
  oddEvenScore: number;
  sumScore: number;
  rangeDistributionScore: number;
  consecutiveScore: number;
  previousDrawOverlapScore: number;
  endingDigitDiversityScore: number;
  numberDistanceScore: number;
  pairCompatibilityScore: number;
}

export interface PredictionRequest {
  baseDrawNo: number;
  strategy: Strategy;
  candidateCount: number;
  gameCount: number;
  seed: number;
  generationMode: GenerationMode;
}

export interface PredictionResult extends PredictionRequest {
  candidates: ScoredNumber[];
  games: ScoredGame[];
}

export interface BacktestRequest {
  startDrawNo: number;
  endDrawNo: number;
  strategies: Strategy[];
  candidateCount: number;
  gameCount: number;
  seed: number;
}

export interface DrawEvaluation {
  drawNo: number;
  candidateHits: number;
  bestMatchCount: number;
  averageMatchCount: number;
}

export interface StrategyEvaluation {
  strategy: Strategy;
  drawCount: number;
  averageCandidateHits: number;
  candidateHitRates: Record<number, number>;
  averageBestMatch: number;
  averageGameMatch: number;
  gameHitRates: Record<number, number>;
  draws: DrawEvaluation[];
}

export interface BacktestResult {
  request: BacktestRequest;
  strategies: StrategyEvaluation[];
  randomBaseline: RandomBaselineSummary;
  elapsedMs: number;
}

export interface RandomBaselineComparison {
  strategy: Strategy;
  observedMean: number;
  uplift: number;
  percentile: number;
  pValue: number;
}

export interface RandomBaselineSummary {
  simulations: number;
  theoreticalMean: number;
  simulatedMean: number;
  lower95: number;
  upper95: number;
  comparisons: RandomBaselineComparison[];
}

export interface AppConfig {
  candidateCount: number;
  gameCount: number;
  maxGameOverlap: number;
  weightedSampleCount: number;
  sumMean: number;
  sumSigma: number;
  randomFactorWeight: number;
  numberWeights: Record<string, number>;
  combinationWeights: Record<string, number>;
}
