#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AuthService } from '../src/services/auth.service.js';
import { SheetsService } from '../src/services/sheets.service.js';

// Redirect console.log to stderr
console.log = (...args: unknown[]) => console.error('[LOG]', ...args);

async function main() {
  console.error('[DEBUG] Starting test server...');

  const server = new McpServer({ name: 'test', version: '0.1.0' });

  const auth = new AuthService();
  const sheets = new SheetsService(auth);

  server.tool(
    'test_read',
    'Test reading from Google Sheets',
    { spreadsheet_id: z.string() },
    async ({ spreadsheet_id }) => {
      console.error('[DEBUG] test_read called with:', spreadsheet_id);
      try {
        console.error('[DEBUG] Getting authenticated client...');
        const data = await sheets.getSpreadsheet(
          spreadsheet_id,
          'spreadsheetId,properties.title',
        );
        console.error('[DEBUG] Got response:', data.properties?.title);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ title: data.properties?.title }) }],
        };
      } catch (e: any) {
        console.error('[DEBUG] Error:', e.message);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: e.message }) }],
          isError: true,
        };
      }
    },
  );

  console.error('[DEBUG] Server created, connecting transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[DEBUG] Server connected and running.');
}

main().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
