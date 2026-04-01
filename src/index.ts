#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { AuthService } from './services/auth.service.js';
import { SheetsService } from './services/sheets.service.js';
import { DriveService } from './services/drive.service.js';

async function main() {
  const auth = new AuthService();
  const sheetsService = new SheetsService(auth);
  const driveService = new DriveService(auth);

  const server = createServer(sheetsService, driveService);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
