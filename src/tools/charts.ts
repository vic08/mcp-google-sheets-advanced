import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { a1ToGridRange, parseCellRef, parseA1Notation } from '../utils/a1-notation.js';

const CHART_TYPE_MAP: Record<string, string> = {
  bar: 'BAR',
  line: 'LINE',
  area: 'AREA',
  column: 'COLUMN',
  scatter: 'SCATTER',
  combo: 'COMBO',
  stepped_area: 'STEPPED_AREA',
};

const LEGEND_POSITION_MAP: Record<string, string> = {
  top: 'TOP_LEGEND',
  bottom: 'BOTTOM_LEGEND',
  left: 'LEFT_LEGEND',
  right: 'RIGHT_LEGEND',
  none: 'NO_LEGEND',
};

export function registerChartTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_create_chart',
    'Creates a chart in a Google Sheets spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      sheet_name: z.string().describe('The name of the sheet containing the data'),
      data_range: z.string().describe('The data range in A1 notation (e.g. A1:C20)'),
      chart_type: z
        .enum([
          'bar',
          'line',
          'area',
          'column',
          'scatter',
          'combo',
          'stepped_area',
          'pie',
          'donut',
          'histogram',
        ])
        .describe('The type of chart to create'),
      title: z.string().optional().describe('The title of the chart'),
      position: z
        .object({
          new_sheet: z.boolean().optional().describe('Place the chart on a new sheet'),
          anchor_cell: z.string().optional().describe('Anchor cell for the chart (e.g. F1)'),
        })
        .optional()
        .describe('Where to place the chart'),
      options: z
        .object({
          stacked: z.boolean().optional().describe('Whether to stack series'),
          smooth_line: z.boolean().optional().describe('Whether to smooth lines (line charts)'),
          legend_position: z
            .enum(['top', 'bottom', 'left', 'right', 'none'])
            .optional()
            .describe('Position of the chart legend'),
        })
        .optional()
        .describe('Additional chart options'),
    },
    async ({ spreadsheet_id, sheet_name, data_range, chart_type, title, position, options }) => {
      try {
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheet_name);
        const gridRange = a1ToGridRange(data_range, sheetId);

        let chartSpec: Record<string, unknown> = {};

        if (title) {
          chartSpec.title = title;
        }

        const basicChartTypes = [
          'bar',
          'line',
          'area',
          'column',
          'scatter',
          'combo',
          'stepped_area',
        ];

        if (basicChartTypes.includes(chart_type)) {
          const domainRange = {
            sheetId: gridRange.sheetId,
            startRowIndex: gridRange.startRowIndex,
            endRowIndex: gridRange.endRowIndex,
            startColumnIndex: gridRange.startColumnIndex,
            endColumnIndex: gridRange.startColumnIndex + 1,
          };

          const series = [];
          for (let col = gridRange.startColumnIndex + 1; col < gridRange.endColumnIndex; col++) {
            series.push({
              series: {
                sourceRange: {
                  sources: [
                    {
                      sheetId: gridRange.sheetId,
                      startRowIndex: gridRange.startRowIndex,
                      endRowIndex: gridRange.endRowIndex,
                      startColumnIndex: col,
                      endColumnIndex: col + 1,
                    },
                  ],
                },
              },
              targetAxis: 'LEFT_AXIS',
            });
          }

          const basicChart: Record<string, unknown> = {
            chartType: CHART_TYPE_MAP[chart_type],
            domains: [
              {
                domain: {
                  sourceRange: {
                    sources: [domainRange],
                  },
                },
              },
            ],
            series,
            headerCount: 1,
          };

          if (options?.stacked) {
            basicChart.stackedType = 'STACKED';
          }

          if (options?.smooth_line) {
            basicChart.interpolateNulls = true;
            basicChart.lineSmoothing = true;
          }

          if (options?.legend_position) {
            basicChart.legendPosition = LEGEND_POSITION_MAP[options.legend_position];
          }

          chartSpec.basicChart = basicChart;
        } else if (chart_type === 'pie' || chart_type === 'donut') {
          const pieChart: Record<string, unknown> = {
            domain: {
              sourceRange: {
                sources: [
                  {
                    sheetId: gridRange.sheetId,
                    startRowIndex: gridRange.startRowIndex,
                    endRowIndex: gridRange.endRowIndex,
                    startColumnIndex: gridRange.startColumnIndex,
                    endColumnIndex: gridRange.startColumnIndex + 1,
                  },
                ],
              },
            },
            series: {
              sourceRange: {
                sources: [
                  {
                    sheetId: gridRange.sheetId,
                    startRowIndex: gridRange.startRowIndex,
                    endRowIndex: gridRange.endRowIndex,
                    startColumnIndex: gridRange.startColumnIndex + 1,
                    endColumnIndex: gridRange.startColumnIndex + 2,
                  },
                ],
              },
            },
          };

          if (chart_type === 'donut') {
            pieChart.pieHole = 0.5;
          }

          if (options?.legend_position) {
            pieChart.legendPosition = LEGEND_POSITION_MAP[options.legend_position];
          }

          chartSpec.pieChart = pieChart;
        } else if (chart_type === 'histogram') {
          const histogramChart: Record<string, unknown> = {
            series: [
              {
                barColorStyle: { themeColor: 'ACCENT1' },
                data: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId: gridRange.sheetId,
                        startRowIndex: gridRange.startRowIndex,
                        endRowIndex: gridRange.endRowIndex,
                        startColumnIndex: gridRange.startColumnIndex,
                        endColumnIndex: gridRange.startColumnIndex + 1,
                      },
                    ],
                  },
                },
              },
            ],
          };

          if (options?.legend_position) {
            histogramChart.legendPosition = LEGEND_POSITION_MAP[options.legend_position];
          }

          chartSpec.histogramChart = histogramChart;
        }

        let chartPosition: Record<string, unknown>;

        if (position?.new_sheet) {
          chartPosition = { newSheet: true };
        } else if (position?.anchor_cell) {
          const anchor = parseCellRef(position.anchor_cell);
          chartPosition = {
            overlayPosition: {
              anchorCell: {
                sheetId,
                rowIndex: anchor.row,
                columnIndex: anchor.col,
              },
            },
          };
        } else {
          chartPosition = {
            overlayPosition: {
              anchorCell: {
                sheetId,
                rowIndex: 0,
                columnIndex: 6,
              },
            },
          };
        }

        const response = await sheetsService.batchUpdate(spreadsheet_id, [
          {
            addChart: {
              chart: {
                spec: chartSpec,
                position: chartPosition,
              },
            },
          },
        ]);

        const addedChart = response.replies?.[0]?.addChart?.chart;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  chart_id: addedChart?.chartId,
                  chart_type,
                  title: title ?? null,
                  position: chartPosition,
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
    'sheets_update_chart',
    'Updates an existing chart in a Google Sheets spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      chart_id: z.number().describe('The ID of the chart to update'),
      title: z.string().optional().describe('New title for the chart'),
      chart_type: z
        .enum(['bar', 'line', 'area', 'column', 'scatter', 'combo', 'stepped_area'])
        .optional()
        .describe('New chart type (basic chart types only)'),
      data_range: z
        .string()
        .optional()
        .describe('New data range in A1 notation (e.g. Sheet1!A1:C20)'),
    },
    async ({ spreadsheet_id, chart_id, title, chart_type, data_range }) => {
      try {
        // Fetch the current chart spec
        const spreadsheet = await sheetsService.getSpreadsheet(
          spreadsheet_id,
          'sheets(properties.sheetId,properties.title,charts)',
        );

        let currentChart: Record<string, unknown> | undefined;
        let sourceSheetId: number | undefined;

        for (const sheet of spreadsheet.sheets ?? []) {
          for (const chart of sheet.charts ?? []) {
            if (chart.chartId === chart_id) {
              currentChart = chart as Record<string, unknown>;
              sourceSheetId = sheet.properties?.sheetId ?? undefined;
              break;
            }
          }
          if (currentChart) break;
        }

        if (!currentChart) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'NOT_FOUND',
                  message: `Chart with ID ${chart_id} not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        const currentSpec = (currentChart.spec ?? {}) as Record<string, unknown>;
        const updatedSpec = { ...currentSpec };

        if (title !== undefined) {
          updatedSpec.title = title;
        }

        if (chart_type && CHART_TYPE_MAP[chart_type]) {
          const basicChart = (updatedSpec.basicChart ?? {}) as Record<string, unknown>;
          basicChart.chartType = CHART_TYPE_MAP[chart_type];
          updatedSpec.basicChart = basicChart;
        }

        if (data_range) {
          const parsed = parseA1Notation(data_range);
          let rangeSheetId = sourceSheetId ?? 0;
          if (parsed.sheetName) {
            rangeSheetId = await sheetsService.resolveSheetId(spreadsheet_id, parsed.sheetName);
          }
          const gridRange = a1ToGridRange(data_range, rangeSheetId);

          const basicChart = (updatedSpec.basicChart ?? {}) as Record<string, unknown>;

          // Update domain
          const domainRange = {
            sheetId: gridRange.sheetId,
            startRowIndex: gridRange.startRowIndex,
            endRowIndex: gridRange.endRowIndex,
            startColumnIndex: gridRange.startColumnIndex,
            endColumnIndex: gridRange.startColumnIndex + 1,
          };

          basicChart.domains = [
            {
              domain: {
                sourceRange: {
                  sources: [domainRange],
                },
              },
            },
          ];

          // Update series
          const series = [];
          for (let col = gridRange.startColumnIndex + 1; col < gridRange.endColumnIndex; col++) {
            series.push({
              series: {
                sourceRange: {
                  sources: [
                    {
                      sheetId: gridRange.sheetId,
                      startRowIndex: gridRange.startRowIndex,
                      endRowIndex: gridRange.endRowIndex,
                      startColumnIndex: col,
                      endColumnIndex: col + 1,
                    },
                  ],
                },
              },
              targetAxis: 'LEFT_AXIS',
            });
          }

          basicChart.series = series;
          updatedSpec.basicChart = basicChart;
        }

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            updateChartSpec: {
              chartId: chart_id,
              spec: updatedSpec,
            },
          },
        ]);

        const updated: string[] = [];
        if (title !== undefined) updated.push('title');
        if (chart_type) updated.push('chart_type');
        if (data_range) updated.push('data_range');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  chart_id,
                  updated,
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
    'sheets_delete_chart',
    'Deletes an embedded chart from a Google Sheets spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      chart_id: z.number().describe('The ID of the chart to delete'),
    },
    async ({ spreadsheet_id, chart_id }) => {
      try {
        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            deleteEmbeddedObject: {
              objectId: chart_id,
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  deleted_chart_id: chart_id,
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
