export function computeStats(values: number[]): {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p25: number;
  p75: number;
} {
  const clean = values.filter((v) => typeof v === 'number' && !isNaN(v));

  if (clean.length === 0) {
    return { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, p25: 0, p75: 0 };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / clean.length;

  const median = getPercentile(sorted, 50);
  const p25 = getPercentile(sorted, 25);
  const p75 = getPercentile(sorted, 75);

  const variance = clean.reduce((acc, v) => acc + (v - mean) ** 2, 0) / clean.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: clean.length,
    sum,
    mean,
    median,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    stdDev,
    p25,
    p75,
  };
}

function getPercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower]!;

  const weight = index - lower;
  return sorted[lower]! + weight * (sorted[upper]! - sorted[lower]!);
}

export function linearRegression(
  x: number[],
  y: number[],
): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return { slope: 0, intercept: y[0] ?? 0, rSquared: 0 };
  }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i]!;
    sumY += y[i]!;
    sumXY += x[i]! * y[i]!;
    sumX2 += x[i]! * x[i]!;
    sumY2 += y[i]! * y[i]!;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0,
    ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i]! + intercept;
    ssRes += (y[i]! - predicted) ** 2;
    ssTot += (y[i]! - meanY) ** 2;
  }

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

export function detectColumnType(
  values: unknown[],
): 'numeric' | 'date' | 'text' | 'mixed' | 'empty' {
  const nonEmpty = values.filter(
    (v) => v !== null && v !== undefined && v !== '',
  );

  if (nonEmpty.length === 0) return 'empty';

  let numericCount = 0;
  let textCount = 0;

  for (const v of nonEmpty) {
    if (typeof v === 'number') {
      numericCount++;
    } else {
      textCount++;
    }
  }

  if (numericCount === nonEmpty.length) return 'numeric';
  if (textCount === nonEmpty.length) return 'text';
  return 'mixed';
}
