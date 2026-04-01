import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { computeStats, linearRegression, detectColumnType } from '../utils/stats.js';

interface ColumnStats {
  header: string;
  type: string;
  stats?: ReturnType<typeof computeStats>;
  unique_values?: number;
}

interface TrendAnalysis {
  value_column: string;
  data_points: number;
  regression: {
    slope: number;
    intercept: number;
    r_squared: number;
  };
  direction: 'increasing' | 'decreasing' | 'stable';
  interpretation: string;
}

export function registerAnalyticsTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_summarize_range',
    'Computes summary statistics for columns in a range, with optional grouping',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to summarize (first row treated as headers)'),
      group_by_column: z
        .number()
        .optional()
        .describe('0-based column index to group by before computing stats'),
    },
    async ({ spreadsheet_id, range, group_by_column }) => {
      try {
        const result = await sheetsService.getValues(spreadsheet_id, range, 'UNFORMATTED_VALUE');
        const rows = result.values ?? [];

        if (rows.length < 2) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { columns: [], total_rows: 0, numeric_columns: 0, text_columns: 0 },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const headers = rows[0]!.map((h) => String(h ?? ''));
        const dataRows = rows.slice(1);

        const buildColumnStats = (rowSubset: unknown[][]): ColumnStats[] => {
          return headers.map((header, colIdx) => {
            const colValues = rowSubset.map((row) => row[colIdx]);
            const colType = detectColumnType(colValues);

            const stats: ColumnStats = { header, type: colType };

            if (colType === 'numeric') {
              stats.stats = computeStats(colValues.filter((v): v is number => typeof v === 'number'));
            } else {
              const uniqueSet = new Set(colValues.map((v) => String(v ?? '')));
              stats.unique_values = uniqueSet.size;
            }

            return stats;
          });
        };

        if (group_by_column !== undefined && group_by_column >= 0 && group_by_column < headers.length) {
          const groups: Record<string, unknown[][]> = {};
          for (const row of dataRows) {
            const key = String(row[group_by_column] ?? '');
            if (!groups[key]) groups[key] = [];
            groups[key]!.push(row);
          }

          const groupedResults: Record<string, { columns: ColumnStats[]; row_count: number }> = {};
          for (const [key, groupRows] of Object.entries(groups)) {
            groupedResults[key] = {
              columns: buildColumnStats(groupRows),
              row_count: groupRows.length,
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    grouped_by: headers[group_by_column],
                    groups: groupedResults,
                    total_rows: dataRows.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const columns = buildColumnStats(dataRows);
        const numericColumns = columns.filter((c) => c.type === 'numeric').length;
        const textColumns = columns.filter((c) => c.type === 'text').length;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  columns,
                  total_rows: dataRows.length,
                  numeric_columns: numericColumns,
                  text_columns: textColumns,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_find_duplicates',
    'Finds duplicate rows in a range based on specified columns',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to search (first row treated as headers)'),
      columns: z
        .array(z.number())
        .optional()
        .describe('0-based column indices to check for duplicates (default: all columns)'),
    },
    async ({ spreadsheet_id, range, columns }) => {
      try {
        const result = await sheetsService.getValues(spreadsheet_id, range, 'UNFORMATTED_VALUE');
        const rows = result.values ?? [];

        if (rows.length < 2) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { total_rows: 0, unique_rows: 0, duplicate_groups: [], duplicate_row_count: 0 },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const headers = rows[0]!;
        const dataRows = rows.slice(1);
        const colIndices = columns ?? headers.map((_, i) => i);

        const hashMap = new Map<string, number[]>();

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]!;
          const key = colIndices.map((ci) => JSON.stringify(row[ci] ?? '')).join('|');

          if (!hashMap.has(key)) {
            hashMap.set(key, []);
          }
          hashMap.get(key)!.push(i + 2); // +2 for 1-based row number + header row
        }

        const duplicateGroups: Array<{ value: Record<string, unknown>; row_numbers: number[]; count: number }> = [];
        let duplicateRowCount = 0;

        for (const [key, rowNumbers] of hashMap) {
          if (rowNumbers.length > 1) {
            const values = key.split('|').map((v) => JSON.parse(v));
            const valueObj: Record<string, unknown> = {};
            for (let i = 0; i < colIndices.length; i++) {
              valueObj[String(headers[colIndices[i]!] ?? `col_${colIndices[i]}`)] = values[i];
            }

            duplicateGroups.push({
              value: valueObj,
              row_numbers: rowNumbers,
              count: rowNumbers.length,
            });
            duplicateRowCount += rowNumbers.length;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total_rows: dataRows.length,
                  unique_rows: dataRows.length - duplicateRowCount + duplicateGroups.length,
                  duplicate_groups: duplicateGroups,
                  duplicate_row_count: duplicateRowCount,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_analyze_trends',
    'Performs linear regression on a column to identify trends',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to analyze (first row treated as headers)'),
      value_column: z.number().describe('0-based column index of the values to analyze'),
    },
    async ({ spreadsheet_id, range, value_column }) => {
      try {
        const result = await sheetsService.getValues(spreadsheet_id, range, 'UNFORMATTED_VALUE');
        const rows = result.values ?? [];

        if (rows.length < 3) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'Insufficient data for trend analysis. Need at least 2 data rows plus a header.',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const headers = rows[0]!;
        const dataRows = rows.slice(1);

        const x: number[] = [];
        const y: number[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const val = dataRows[i]![value_column];
          if (typeof val === 'number' && !isNaN(val)) {
            x.push(i);
            y.push(val);
          }
        }

        if (x.length < 2) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { error: 'Insufficient numeric data points for trend analysis.' },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const regression = linearRegression(x, y);

        let direction: 'increasing' | 'decreasing' | 'stable';
        if (regression.slope > 0.01) {
          direction = 'increasing';
        } else if (regression.slope < -0.01) {
          direction = 'decreasing';
        } else {
          direction = 'stable';
        }

        const columnName = String(headers[value_column] ?? `Column ${value_column}`);
        const rSquaredPct = (regression.rSquared * 100).toFixed(1);
        const slopeStr = regression.slope.toFixed(4);

        const interpretation =
          direction === 'stable'
            ? `${columnName} shows no significant trend (slope: ${slopeStr}, R²: ${rSquaredPct}%).`
            : `${columnName} is ${direction} with a slope of ${slopeStr} per row. ` +
              `The trend explains ${rSquaredPct}% of the variance (R²).`;

        const trendAnalysis: TrendAnalysis = {
          value_column: columnName,
          data_points: x.length,
          regression: {
            slope: regression.slope,
            intercept: regression.intercept,
            r_squared: regression.rSquared,
          },
          direction,
          interpretation,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(trendAnalysis, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
