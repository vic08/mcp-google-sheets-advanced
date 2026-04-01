import type { sheets_v4 } from '@googleapis/sheets';

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export type UserTier = 'free' | 'pro';

export interface SheetInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
  frozenRowCount: number;
  frozenColumnCount: number;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  locale: string;
  sheets: SheetInfo[];
  namedRanges: Array<{ name: string; range: string; namedRangeId: string }>;
}

export interface RangeData {
  range: string;
  values: unknown[][];
  rowCount: number;
  columnCount: number;
  warning?: string;
}

export interface FormulaInfo {
  cell: string;
  formula: string;
}

export interface ChartInfo {
  chartId: number;
  title: string;
  chartType: string;
  sheetName: string;
  dataRange?: string;
}

export interface ColumnStats {
  header: string;
  columnIndex: number;
  type: string;
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p25: number;
  p75: number;
  nullCount: number;
}

export interface DuplicateGroup {
  value: string;
  rowNumbers: number[];
  count: number;
}

export interface TrendAnalysis {
  column: string;
  dataPoints: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  rSquared: number;
  firstValue: number;
  lastValue: number;
  totalChangePercent: number;
  averagePeriodChange: number;
  interpretation: string;
}

export interface McpError {
  error: string;
  message: string;
  retryAfter?: number;
}

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'column'
  | 'scatter'
  | 'combo'
  | 'stepped_area'
  | 'pie'
  | 'donut'
  | 'histogram'
  | 'bubble'
  | 'candlestick'
  | 'waterfall'
  | 'treemap'
  | 'scorecard';

export type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max' | 'median';

export type GridRange = sheets_v4.Schema$GridRange;
