import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { buildCellRef, parseA1Notation } from '../utils/a1-notation.js';

const MAX_CELLS = 10_000;

const VALUE_RENDER_MAP: Record<string, string> = {
  formatted: 'FORMATTED_VALUE',
  unformatted: 'UNFORMATTED_VALUE',
  formula: 'FORMULA',
};

function mapValueRender(render?: string): string {
  if (!render) return 'FORMATTED_VALUE';
  return VALUE_RENDER_MAP[render] ?? 'FORMATTED_VALUE';
}

function processRangeResult(
  range: string | undefined | null,
  values: unknown[][] | undefined | null,
): { range: string; values: unknown[][]; row_count: number; column_count: number; warning?: string } {
  const rows = values ?? [];
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const totalCells = rows.reduce((sum, row) => sum + row.length, 0);

  let warning: string | undefined;
  let truncatedRows = rows;

  if (totalCells > MAX_CELLS) {
    let cellCount = 0;
    let cutoffRow = 0;
    for (let i = 0; i < rows.length; i++) {
      cellCount += rows[i]!.length;
      if (cellCount >= MAX_CELLS) {
        cutoffRow = i + 1;
        break;
      }
    }
    truncatedRows = rows.slice(0, cutoffRow);
    warning = `Result truncated: ${totalCells} cells exceeded the ${MAX_CELLS} cell limit. Showing first ${cutoffRow} of ${rows.length} rows. Use a smaller range to get all data.`;
  }

  return {
    range: range ?? '',
    values: truncatedRows,
    row_count: truncatedRows.length,
    column_count: columnCount,
    ...(warning ? { warning } : {}),
  };
}

export function registerReadTools(
  server: McpServer,
  sheetsService: SheetsService,
): void {
  server.tool(
    'sheets_read_range',
    'Reads cell values from a specified range in a spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to read (e.g. Sheet1!A1:D10)'),
      value_render: z
        .enum(['formatted', 'unformatted', 'formula'])
        .optional()
        .describe(
          'How values should be rendered: formatted (default), unformatted (raw numbers), or formula',
        ),
    },
    async ({ spreadsheet_id, range, value_render }) => {
      try {
        const renderOption = mapValueRender(value_render);
        const result = await sheetsService.getValues(spreadsheet_id, range, renderOption);
        const processed = processRangeResult(result.range, result.values);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(processed, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_read_multiple_ranges',
    'Reads cell values from multiple ranges in a single batch request',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      ranges: z
        .array(z.string())
        .min(1)
        .describe('Array of A1 notation ranges to read'),
      value_render: z
        .enum(['formatted', 'unformatted', 'formula'])
        .optional()
        .describe(
          'How values should be rendered: formatted (default), unformatted (raw numbers), or formula',
        ),
    },
    async ({ spreadsheet_id, ranges, value_render }) => {
      try {
        const renderOption = mapValueRender(value_render);
        const result = await sheetsService.batchGetValues(
          spreadsheet_id,
          ranges,
          renderOption,
        );

        const rangeResults = (result.valueRanges ?? []).map((vr) =>
          processRangeResult(vr.range, vr.values),
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { ranges: rangeResults, total_ranges: rangeResults.length },
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
    'sheets_get_formulas',
    'Gets all formulas from a specified range, returning cell references and formula text',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to inspect for formulas'),
    },
    async ({ spreadsheet_id, range }) => {
      try {
        const result = await sheetsService.getValues(
          spreadsheet_id,
          range,
          'FORMULA',
        );

        const values = result.values ?? [];
        const parsed = parseA1Notation(result.range ?? range);

        // Determine the starting row/col from the range
        let startRow = 0;
        let startCol = 0;
        if (parsed.startCell) {
          const rowMatch = parsed.startCell.match(/(\d+)/);
          const colMatch = parsed.startCell.match(/^([A-Za-z]+)/);
          if (rowMatch) startRow = parseInt(rowMatch[1]!, 10) - 1;
          if (colMatch) {
            const letters = colMatch[1]!.toUpperCase();
            let col = 0;
            for (let i = 0; i < letters.length; i++) {
              col = col * 26 + (letters.charCodeAt(i) - 64);
            }
            startCol = col - 1;
          }
        }

        const formulas: Array<{ cell: string; formula: string }> = [];
        let totalCells = 0;

        for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
          const row = values[rowIdx]!;
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            totalCells++;
            const cellValue = row[colIdx];
            if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
              formulas.push({
                cell: buildCellRef(startRow + rowIdx, startCol + colIdx),
                formula: cellValue,
              });
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  range: result.range ?? range,
                  formulas,
                  total_cells: totalCells,
                  formula_cells: formulas.length,
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
