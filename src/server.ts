import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

export function createServer(
  sheetsService: SheetsService,
  driveService: DriveService,
): McpServer {
  const server = new McpServer({
    name: 'mcp-google-sheets-advanced',
    version: '0.1.0',
  });

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
