import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import type { DriveService } from '../services/drive.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { gridRangeToA1 } from '../utils/a1-notation.js';

export function registerMetadataTools(
  server: McpServer,
  sheetsService: SheetsService,
  driveService: DriveService,
): void {
  server.tool(
    'sheets_list_spreadsheets',
    'Lists spreadsheets accessible to the authenticated user via Google Drive',
    {
      query: z.string().optional().describe('Search query to filter spreadsheets by name'),
      max_results: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .optional()
        .describe('Maximum number of results to return (default 20, max 100)'),
    },
    async ({ query, max_results }) => {
      try {
        const spreadsheets = await driveService.listSpreadsheets(query, max_results ?? 20);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ spreadsheets, total: spreadsheets.length }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_get_spreadsheet_info',
    'Gets metadata about a spreadsheet including its sheets, properties, and named ranges',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
    },
    async ({ spreadsheet_id }) => {
      try {
        const spreadsheet = await sheetsService.getSpreadsheet(
          spreadsheet_id,
          'spreadsheetId,properties,sheets.properties,namedRanges',
        );

        const sheets =
          spreadsheet.sheets?.map((s) => ({
            sheetId: s.properties?.sheetId,
            title: s.properties?.title,
            index: s.properties?.index,
            sheetType: s.properties?.sheetType,
            rowCount: s.properties?.gridProperties?.rowCount,
            columnCount: s.properties?.gridProperties?.columnCount,
            hidden: s.properties?.hidden ?? false,
          })) ?? [];

        // Build a sheetId -> title lookup for named range conversion
        const sheetIdToTitle = new Map<number, string>();
        for (const s of spreadsheet.sheets ?? []) {
          if (s.properties?.sheetId != null && s.properties.title) {
            sheetIdToTitle.set(s.properties.sheetId, s.properties.title);
          }
        }

        const namedRanges =
          spreadsheet.namedRanges?.map((nr) => {
            const sheetTitle =
              nr.range?.sheetId != null
                ? (sheetIdToTitle.get(nr.range.sheetId) ?? 'Unknown')
                : 'Unknown';
            return {
              name: nr.name,
              namedRangeId: nr.namedRangeId,
              range: nr.range ? gridRangeToA1(nr.range, sheetTitle) : null,
            };
          }) ?? [];

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  spreadsheetId: spreadsheet.spreadsheetId,
                  title: spreadsheet.properties?.title,
                  locale: spreadsheet.properties?.locale,
                  sheets,
                  namedRanges,
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
    'sheets_get_sheet_metadata',
    'Gets metadata for a specific sheet within a spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      sheet_name: z.string().describe('The name of the sheet'),
    },
    async ({ spreadsheet_id, sheet_name }) => {
      try {
        const spreadsheet = await sheetsService.getSpreadsheet(spreadsheet_id, 'sheets.properties');

        const sheet = spreadsheet.sheets?.find((s) => s.properties?.title === sheet_name);

        if (!sheet) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'NOT_FOUND',
                  message: `Sheet "${sheet_name}" not found in spreadsheet`,
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  sheetId: sheet.properties?.sheetId,
                  title: sheet.properties?.title,
                  index: sheet.properties?.index,
                  sheetType: sheet.properties?.sheetType,
                  rowCount: sheet.properties?.gridProperties?.rowCount,
                  columnCount: sheet.properties?.gridProperties?.columnCount,
                  frozenRowCount: sheet.properties?.gridProperties?.frozenRowCount ?? 0,
                  frozenColumnCount: sheet.properties?.gridProperties?.frozenColumnCount ?? 0,
                  hidden: sheet.properties?.hidden ?? false,
                  rightToLeft: sheet.properties?.rightToLeft ?? false,
                  tabColor: sheet.properties?.tabColorStyle ?? null,
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
    'sheets_list_named_ranges',
    'Lists all named ranges in a spreadsheet with their A1 notation references',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
    },
    async ({ spreadsheet_id }) => {
      try {
        const spreadsheet = await sheetsService.getSpreadsheet(
          spreadsheet_id,
          'sheets.properties,namedRanges',
        );

        const sheetIdToTitle = new Map<number, string>();
        for (const s of spreadsheet.sheets ?? []) {
          if (s.properties?.sheetId != null && s.properties.title) {
            sheetIdToTitle.set(s.properties.sheetId, s.properties.title);
          }
        }

        const namedRanges =
          spreadsheet.namedRanges?.map((nr) => {
            const sheetTitle =
              nr.range?.sheetId != null
                ? (sheetIdToTitle.get(nr.range.sheetId) ?? 'Unknown')
                : 'Unknown';
            return {
              name: nr.name,
              namedRangeId: nr.namedRangeId,
              range: nr.range ? gridRangeToA1(nr.range, sheetTitle) : null,
            };
          }) ?? [];

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ namedRanges, total: namedRanges.length }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_list_charts',
    'Lists all charts in a spreadsheet, optionally filtered by sheet name',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      sheet_name: z.string().optional().describe('Filter charts to a specific sheet'),
    },
    async ({ spreadsheet_id, sheet_name }) => {
      try {
        const spreadsheet = await sheetsService.getSpreadsheet(
          spreadsheet_id,
          'sheets(properties.sheetId,properties.title,charts)',
        );

        const charts: Array<{
          sheetName: string;
          chartId: number | null | undefined;
          title: string;
          chartType: string;
          position: unknown;
        }> = [];

        for (const sheet of spreadsheet.sheets ?? []) {
          const title = sheet.properties?.title ?? 'Unknown';
          if (sheet_name && title !== sheet_name) continue;

          for (const chart of sheet.charts ?? []) {
            charts.push({
              sheetName: title,
              chartId: chart.chartId,
              title:
                chart.spec?.title ??
                ((chart.spec?.basicChart as Record<string, unknown>)?.title as string) ??
                'Untitled',
              chartType:
                chart.spec?.basicChart?.chartType ??
                ((chart.spec as Record<string, unknown>)?.chartType as string) ??
                'UNKNOWN',
              position: chart.position,
            });
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ charts, total: charts.length }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_list_filter_views',
    'Lists all filter views in a spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
    },
    async ({ spreadsheet_id }) => {
      try {
        const spreadsheet = await sheetsService.getSpreadsheet(
          spreadsheet_id,
          'sheets(properties.title,filterViews)',
        );

        const filterViews: Array<{
          sheetName: string;
          filterViewId: number | null | undefined;
          title: string | null | undefined;
          range: unknown;
        }> = [];

        for (const sheet of spreadsheet.sheets ?? []) {
          const sheetName = sheet.properties?.title ?? 'Unknown';
          for (const fv of (sheet as Record<string, unknown[]>).filterViews ?? []) {
            const view = fv as Record<string, unknown>;
            filterViews.push({
              sheetName,
              filterViewId: view.filterViewId as number | null | undefined,
              title: view.title as string | null | undefined,
              range: view.range,
            });
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ filterViews, total: filterViews.length }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
