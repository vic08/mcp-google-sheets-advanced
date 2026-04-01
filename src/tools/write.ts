import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';

const INPUT_MODE_MAP: Record<string, string> = {
  user_entered: 'USER_ENTERED',
  raw: 'RAW',
};

export function registerWriteTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_write_range',
    'Writes values to a specified range in a Google Sheets spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to write to (e.g. Sheet1!A1:C3)'),
      values: z.array(z.array(z.any())).describe('2D array of values to write'),
      input_mode: z
        .enum(['user_entered', 'raw'])
        .default('user_entered')
        .describe('How input data should be interpreted. user_entered parses as if typed into the UI; raw stores as-is'),
    },
    async ({ spreadsheet_id, range, values, input_mode }) => {
      try {
        const valueInputOption = INPUT_MODE_MAP[input_mode] ?? 'USER_ENTERED';
        const result = await sheetsService.updateValues(spreadsheet_id, range, values, valueInputOption);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  updated_range: result.updatedRange,
                  updated_rows: result.updatedRows,
                  updated_columns: result.updatedColumns,
                  updated_cells: result.updatedCells,
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
    'sheets_write_multiple_ranges',
    'Writes values to multiple ranges in a single batch operation',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      data: z
        .array(
          z.object({
            range: z.string().describe('The A1 notation range'),
            values: z.array(z.array(z.any())).describe('2D array of values'),
          }),
        )
        .describe('Array of range-value pairs to write'),
    },
    async ({ spreadsheet_id, data }) => {
      try {
        const result = await sheetsService.batchUpdateValues(spreadsheet_id, data);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total_updated_cells: result.totalUpdatedCells,
                  ranges_updated: result.totalUpdatedSheets,
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
    'sheets_append_rows',
    'Appends rows of data after the last row with content in a range',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to search for a table to append to (e.g. Sheet1!A:E)'),
      values: z.array(z.array(z.any())).describe('2D array of row values to append'),
    },
    async ({ spreadsheet_id, range, values }) => {
      try {
        const result = await sheetsService.appendValues(spreadsheet_id, range, values);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  appended_range: result.updates?.updatedRange,
                  appended_rows: result.updates?.updatedRows,
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
    'sheets_clear_range',
    'Clears all values from a specified range while preserving formatting',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to clear (e.g. Sheet1!A1:C10)'),
    },
    async ({ spreadsheet_id, range }) => {
      try {
        await sheetsService.clearValues(spreadsheet_id, range);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ cleared_range: range }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
