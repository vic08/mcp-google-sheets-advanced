import { describe, it, expect } from 'vitest';
import { computeStats, linearRegression, detectColumnType } from '../../../src/utils/stats';

describe('computeStats', () => {
  it('computes basic stats for [1,2,3,4,5]', () => {
    const result = computeStats([1, 2, 3, 4, 5]);
    expect(result.count).toBe(5);
    expect(result.sum).toBe(15);
    expect(result.mean).toBe(3);
    expect(result.median).toBe(3);
    expect(result.min).toBe(1);
    expect(result.max).toBe(5);
  });

  it('computes even-length median for [1,2,3,4]', () => {
    const result = computeStats([1, 2, 3, 4]);
    expect(result.median).toBeCloseTo(2.5);
  });

  it('handles single value [42]', () => {
    const result = computeStats([42]);
    expect(result.count).toBe(1);
    expect(result.sum).toBe(42);
    expect(result.mean).toBe(42);
    expect(result.median).toBe(42);
    expect(result.min).toBe(42);
    expect(result.max).toBe(42);
    expect(result.stdDev).toBe(0);
  });

  it('returns all zeros for empty array', () => {
    const result = computeStats([]);
    expect(result.count).toBe(0);
    expect(result.sum).toBe(0);
    expect(result.mean).toBe(0);
    expect(result.median).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.stdDev).toBe(0);
  });

  it('filters out NaN values', () => {
    const result = computeStats([1, NaN, 2, NaN, 3]);
    expect(result.count).toBe(3);
    expect(result.sum).toBe(6);
    expect(result.mean).toBe(2);
  });

  it('computes percentiles on 1-100 array', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = computeStats(values);
    expect(result.p25).toBeCloseTo(25.75, 1);
    expect(result.p75).toBeCloseTo(75.25, 1);
    expect(result.median).toBeCloseTo(50.5, 1);
  });
});

describe('linearRegression', () => {
  it('fits a perfect line y = 2x', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const result = linearRegression(x, y);
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(0);
    expect(result.rSquared).toBeCloseTo(1);
  });

  it('handles noisy data with R² > 0.95', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.0, 13.9, 16.1, 17.9, 20.2];
    const result = linearRegression(x, y);
    expect(result.rSquared).toBeGreaterThan(0.95);
  });

  it('returns slope near 0 for flat data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 5, 5, 5, 5];
    const result = linearRegression(x, y);
    expect(result.slope).toBeCloseTo(0);
    expect(result.intercept).toBeCloseTo(5);
  });
});

describe('detectColumnType', () => {
  it('returns numeric for all numbers', () => {
    expect(detectColumnType([1, 2, 3, 4.5])).toBe('numeric');
  });

  it('returns text for all strings', () => {
    expect(detectColumnType(['a', 'b', 'c'])).toBe('text');
  });

  it('returns mixed for numbers and strings', () => {
    expect(detectColumnType([1, 'a', 2, 'b'])).toBe('mixed');
  });

  it('returns empty for empty array', () => {
    expect(detectColumnType([])).toBe('empty');
  });

  it('returns empty for array of nulls and empty strings', () => {
    expect(detectColumnType([null, undefined, ''])).toBe('empty');
  });
});
