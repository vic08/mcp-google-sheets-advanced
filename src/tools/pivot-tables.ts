import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { a1ToGridRange, parseCellRef, parseA1Notation } from '../utils/a1-notation.js';

const AGGREGATION_MAP: Record<string, string> = {
  sum: 'SUM',
  count: 'COUNTA',
  average: 'AVERAGE',
  min: 'MIN',
  max: 'MAX',
  median: 'MEDIAN',
};

const SORT_ORDER_MAP: Record<string, string> = {
  ascending: 'ASCENDING',
  descending: 'DESCENDING',
};

export function registerPivotTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_create_pivot_table',
    'Creates a pivot table in a Google Sheets spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      source_range: z
        .string()
        .describe('The source data range in A1 notation including sheet name (e.g. Sheet1!A1:E100)'),
      destination: z
        .string()
        .describe('The destination cell in A1 notation (e.g. Sheet2!A1)'),
      rows: z
        .array(
          z.object({
            column: z.string().describe('Header name of the column to use as a row group'),
            sort_order: z
              .enum(['ascending', 'descending'])
              .optional()
              .describe('Sort order for this row group'),
          }),
        )
        .describe('Row groups for the pivot table'),
      columns: z
        .array(
          z.object({
            column: z.string().describe('Header name of the column to use as a column group'),
            sort_order: z
              .enum(['ascending', 'descending'])
              .optional()
              .describe('Sort order for this column group'),
          }),
        )
        .optional()
        .describe('Column groups for the pivot table'),
      values: z
        .array(
          z.object({
            column: z.string().describe('Header name of the column to aggregate'),
            aggregation: z
              .enum(['sum', 'count', 'average', 'min', 'max', 'median'])
              .describe('Aggregation function to apply'),
          }),
        )
        .describe('Value fields for the pivot table'),
    },
    async ({ spreadsheet_id, source_range, destination, rows, columns, values }) => {
      try {
        // Parse source range to get sheet name and range
        const sourceParsed = parseA1Notation(source_range);
        if (!sourceParsed.sheetName) {
          throw new Error('source_range must include a sheet name (e.g. Sheet1!A1:E100)');
        }

        // Build a range that only reads the first row
        const firstRowRange = (() => {
          if (sourceParsed.startCell && sourceParsed.endCell) {
            const startMatch = sourceParsed.startCell.match(/^([A-Za-z]+)/);
            const endMatch = sourceParsed.endCell.match(/^([A-Za-z]+)/);
            const startRow = sourceParsed.startCell.match(/(\d+)$/)?.[1] ?? '1';
            if (startMatch && endMatch) {
              return `${sourceParsed.sheetName}!${startMatch[1]}${startRow}:${endMatch[1]}${startRow}`;
            }
          }
          return source_range;
        })();

        const headerData = await sheetsService.getValues(spreadsheet_id, firstRowRange);
        const headers = (headerData.values?.[0] ?? []) as string[];

        if (headers.length === 0) {
          throw new Error('No headers found in the first row of the source range');
        }

        // Build a header name to 0-based column offset map
        const headerToOffset = new Map<string, number>();
        for (let i = 0; i < headers.length; i++) {
          headerToOffset.set(String(headers[i]).trim(), i);
        }

        // Resolve source sheet to sheetId and build source GridRange
        const sourceSheetId = await sheetsService.resolveSheetId(spreadsheet_id, sourceParsed.sheetName);
        const sourceGridRange = a1ToGridRange(source_range, sourceSheetId);

        // Resolve destination sheet and cell
        const destParsed = parseA1Notation(destination);
        if (!destParsed.sheetName || !destParsed.startCell) {
          throw new Error('destination must include a sheet name and cell reference (e.g. Sheet2!A1)');
        }
        const destSheetId = await sheetsService.resolveSheetId(spreadsheet_id, destParsed.sheetName);
        const destCell = parseCellRef(destParsed.startCell);

        // Helper to resolve column name to offset
        const resolveColumn = (name: string): number => {
          const offset = headerToOffset.get(name.trim());
          if (offset === undefined) {
            throw new Error(
              `Column "${name}" not found in headers. Available: ${headers.join(', ')}`,
            );
          }
          return offset;
        };

        // Build PivotGroup rows
        const pivotRows = rows.map((row) => {
          const group: Record<string, unknown> = {
            sourceColumnOffset: resolveColumn(row.column),
            showTotals: true,
            sortOrder: row.sort_order ? SORT_ORDER_MAP[row.sort_order] : 'ASCENDING',
          };
          return group;
        });

        // Build PivotGroup columns
        const pivotColumns = (columns ?? []).map((col) => {
          const group: Record<string, unknown> = {
            sourceColumnOffset: resolveColumn(col.column),
            showTotals: true,
            sortOrder: col.sort_order ? SORT_ORDER_MAP[col.sort_order] : 'ASCENDING',
          };
          return group;
        });

        // Build PivotValue fields
        const pivotValues = values.map((val) => ({
          sourceColumnOffset: resolveColumn(val.column),
          summarizeFunction: AGGREGATION_MAP[val.aggregation],
          name: `${AGGREGATION_MAP[val.aggregation]} of ${val.column}`,
        }));

        // Build the PivotTable object
        const pivotTable: Record<string, unknown> = {
          source: sourceGridRange,
          rows: pivotRows,
          values: pivotValues,
        };

        if (pivotColumns.length > 0) {
          pivotTable.columns = pivotColumns;
        }

        // Use UpdateCellsRequest to set the pivot table on the destination cell
        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            updateCells: {
              rows: [
                {
                  values: [
                    {
                      pivotTable,
                    },
                  ],
                },
              ],
              start: {
                sheetId: destSheetId,
                rowIndex: destCell.row,
                columnIndex: destCell.col,
              },
              fields: 'pivotTable',
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  pivot_table_location: destination,
                  row_groups: rows.map((r) => r.column),
                  column_groups: (columns ?? []).map((c) => c.column),
                  value_fields: values.map(
                    (v) => `${AGGREGATION_MAP[v.aggregation]} of ${v.column}`,
                  ),
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
}
