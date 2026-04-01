import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { a1ToGridRange, parseA1Notation } from '../utils/a1-notation.js';

export function registerManagementTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_sort_range',
    'Sorts a range of data by one or more columns',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to sort'),
      sort_specs: z
        .array(
          z.object({
            column_index: z.number().describe('0-based column index to sort by'),
            order: z.enum(['ascending', 'descending']).describe('Sort order'),
          }),
        )
        .describe('Array of sort specifications applied in order'),
    },
    async ({ spreadsheet_id, range, sort_specs }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        const sortSpecs = sort_specs.map((spec) => ({
          dimensionIndex: spec.column_index,
          sortOrder: spec.order === 'ascending' ? 'ASCENDING' : 'DESCENDING',
        }));

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            sortRange: {
              range: gridRange,
              sortSpecs,
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ sorted_range: range }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_set_basic_filter',
    'Sets or clears a basic filter on a range',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range for the filter'),
      criteria: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria object keyed by 0-based column index'),
      clear: z
        .boolean()
        .optional()
        .describe('If true, clears the existing basic filter instead of setting one'),
    },
    async ({ spreadsheet_id, range, criteria, clear }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);

        if (clear) {
          await sheetsService.batchUpdate(spreadsheet_id, [
            {
              clearBasicFilter: {
                sheetId,
              },
            },
          ]);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ filter_cleared: true }, null, 2),
              },
            ],
          };
        }

        const gridRange = a1ToGridRange(range, sheetId);

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            setBasicFilter: {
              filter: {
                range: gridRange,
                criteria: (criteria ?? undefined) as Record<string, { condition?: { type?: string; values?: Array<{ userEnteredValue?: string }> }; hiddenValues?: string[] }> | undefined,
              },
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ filter_set: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_protect_range',
    'Protects a range from editing, optionally as a warning only',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to protect'),
      description: z.string().optional().describe('Description of why the range is protected'),
      warning_only: z
        .boolean()
        .default(false)
        .describe('If true, shows a warning but still allows editing'),
    },
    async ({ spreadsheet_id, range, description, warning_only }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        const result = await sheetsService.batchUpdate(spreadsheet_id, [
          {
            addProtectedRange: {
              protectedRange: {
                range: gridRange,
                description: description ?? '',
                warningOnly: warning_only,
              },
            },
          },
        ]);

        const protectedRange = result.replies?.[0]?.addProtectedRange?.protectedRange;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { protected_range_id: protectedRange?.protectedRangeId },
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
    'sheets_find_replace',
    'Finds and replaces text across a spreadsheet or within a specific range',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      find: z.string().describe('The text to find'),
      replacement: z.string().describe('The text to replace with'),
      range: z.string().optional().describe('Optional A1 notation range to limit the search'),
      match_case: z.boolean().optional().describe('Whether the search is case-sensitive'),
      match_entire_cell: z.boolean().optional().describe('Whether to match the entire cell content'),
      search_formulas: z.boolean().optional().describe('Whether to search within formulas'),
      use_regex: z.boolean().optional().describe('Whether to treat the find string as a regex'),
    },
    async ({ spreadsheet_id, find, replacement, range, match_case, match_entire_cell, search_formulas, use_regex }) => {
      try {
        let sheetId: number | undefined;

        if (range) {
          const parsed = parseA1Notation(range);
          if (parsed.sheetName) {
            sheetId = await sheetsService.resolveSheetId(spreadsheet_id, parsed.sheetName);
          }
        }

        const findReplaceRequest: {
          find: string;
          replacement: string;
          matchCase: boolean;
          matchEntireCell: boolean;
          searchByRegex: boolean;
          includeFormulas: boolean;
          allSheets: boolean;
          sheetId?: number;
          range?: ReturnType<typeof a1ToGridRange>;
        } = {
          find,
          replacement,
          matchCase: match_case ?? false,
          matchEntireCell: match_entire_cell ?? false,
          searchByRegex: use_regex ?? false,
          includeFormulas: search_formulas ?? false,
          allSheets: sheetId === undefined,
        };

        if (sheetId !== undefined) {
          findReplaceRequest.sheetId = sheetId;

          if (range) {
            const gridRange = a1ToGridRange(range, sheetId);
            findReplaceRequest.range = gridRange;
            findReplaceRequest.allSheets = false;
          }
        }

        const result = await sheetsService.batchUpdate(spreadsheet_id, [
          {
            findReplace: findReplaceRequest,
          },
        ]);

        const reply = result.replies?.[0]?.findReplace;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  occurrences_found: reply?.occurrencesChanged ?? 0,
                  rows_changed: reply?.rowsChanged ?? 0,
                  cells_changed: reply?.valuesChanged ?? 0,
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
