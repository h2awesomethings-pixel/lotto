export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

export function zScores(values: number[]): number[] {
  const average = mean(values);
  const deviation = standardDeviation(values);
  if (deviation === 0) return values.map(() => 0);
  return values.map((value) => (value - average) / deviation);
}

export function minMax(values: number[], minimum = 0, maximum = 100): number[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (low === high) return values.map(() => (minimum + maximum) / 2);
  return values.map((value) => minimum + ((value - low) / (high - low)) * (maximum - minimum));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
