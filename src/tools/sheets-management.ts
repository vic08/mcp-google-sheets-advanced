import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { a1ToGridRange, parseA1Notation } from '../utils/a1-notation.js';

export function registerSheetsManagementTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_create_sheet',
    'Creates a new sheet (tab) in an existing spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      title: z.string().describe('The name for the new sheet'),
      row_count: z.number().default(1000).describe('Number of rows in the new sheet'),
      column_count: z.number().default(26).describe('Number of columns in the new sheet'),
    },
    async ({ spreadsheet_id, title, row_count, column_count }) => {
      try {
        const result = await sheetsService.batchUpdate(spreadsheet_id, [
          {
            addSheet: {
              properties: {
                title,
                gridProperties: {
                  rowCount: row_count,
                  columnCount: column_count,
                },
              },
            },
          },
        ]);

        const addedSheet = result.replies?.[0]?.addSheet;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  sheet_id: addedSheet?.properties?.sheetId,
                  title: addedSheet?.properties?.title,
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
    'sheets_delete_sheet',
    'Deletes a sheet (tab) from a spreadsheet by name',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      sheet_name: z.string().describe('The name of the sheet to delete'),
    },
    async ({ spreadsheet_id, sheet_name }) => {
      try {
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheet_name);

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            deleteSheet: {
              sheetId,
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ deleted_sheet: sheet_name }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_create_named_range',
    'Creates a named range in a spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      name: z.string().describe('The name for the named range'),
      range: z.string().describe('The A1 notation range (e.g. Sheet1!A1:C10)'),
    },
    async ({ spreadsheet_id, name, range }) => {
      try {
        const parsed = parseA1Notation(range);

        if (!parsed.sheetName) {
          throw new Error('Range must include a sheet name (e.g. Sheet1!A1:C10)');
        }

        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, parsed.sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        const result = await sheetsService.batchUpdate(spreadsheet_id, [
          {
            addNamedRange: {
              namedRange: {
                name,
                range: gridRange,
              },
            },
          },
        ]);

        const addedRange = result.replies?.[0]?.addNamedRange?.namedRange;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  name: addedRange?.name,
                  range,
                  named_range_id: addedRange?.namedRangeId,
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
