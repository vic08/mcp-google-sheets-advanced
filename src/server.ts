import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from './services/sheets.service.js';
import type { DriveService } from './services/drive.service.js';
import {
  registerMetadataTools,
  registerReadTools,
  registerWriteTools,
  registerSheetsManagementTools,
  registerChartTools,
  registerPivotTools,
  registerFormattingTools,
  registerAnalyticsTools,
  registerManagementTools,
} from './tools/index.js';

export function createServer(sheetsService: SheetsService, driveService: DriveService): McpServer {
  const server = new McpServer({
    name: 'mcp-google-sheets-advanced',
    version: '0.1.0',
  });

  // Register prompts
  server.prompt(
    'analyze_spreadsheet',
    'Analyze a Google Sheets spreadsheet — read data, compute statistics, identify trends, and create visualizations',
    { spreadsheet_id: z.string().describe('The Google Sheets spreadsheet ID') },
    ({ spreadsheet_id }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze the Google Sheets spreadsheet with ID "${spreadsheet_id}". Follow these steps:

1. First, use sheets_get_spreadsheet_info to understand the structure
2. Use sheets_read_range to read the data
3. Use sheets_summarize_range to compute statistics on numeric columns
4. Use sheets_analyze_trends to identify trends
5. Use sheets_find_duplicates to check data quality
6. Create a chart that best visualizes the key findings using sheets_create_chart
7. Add conditional formatting to highlight important values using sheets_add_conditional_formatting

Provide a summary of your findings after each step.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'create_dashboard',
    'Transform raw spreadsheet data into a formatted dashboard with charts, pivot tables, and formatting',
    { spreadsheet_id: z.string().describe('The Google Sheets spreadsheet ID') },
    ({ spreadsheet_id }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Transform the Google Sheets spreadsheet "${spreadsheet_id}" into a professional dashboard:

1. Read the data and identify key metrics
2. Create a summary table with aggregated totals
3. Add a chart visualizing the most important trends
4. Apply conditional formatting to highlight outliers
5. Bold and color the header row
6. Sort the data by the most relevant column

Do everything directly in the Google Sheet using the MCP tools.`,
          },
        },
      ],
    }),
  );

  // Free tier: read and metadata tools
  registerMetadataTools(server, sheetsService, driveService);
  registerReadTools(server, sheetsService);

  // Paid tier: write, charts, pivots, formatting, analytics, management
  registerWriteTools(server, sheetsService);
  registerSheetsManagementTools(server, sheetsService);
  registerChartTools(server, sheetsService);
  registerPivotTools(server, sheetsService);
  registerFormattingTools(server, sheetsService);
  registerAnalyticsTools(server, sheetsService);
  registerManagementTools(server, sheetsService);

  return server;
}
