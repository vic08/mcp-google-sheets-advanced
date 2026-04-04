#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { AuthService } from './services/auth.service.js';
import { SheetsService } from './services/sheets.service.js';
import { DriveService } from './services/drive.service.js';
import http from 'http';
import crypto from 'crypto';

async function main() {
  // Redirect console.log to stderr to prevent corrupting MCP JSON-RPC on stdout
  console.log = (...args: unknown[]) => console.error('[LOG]', ...args);

  const auth = new AuthService();
  const sheetsService = new SheetsService(auth);
  const driveService = new DriveService(auth);

  const mcpServer = createServer(sheetsService, driveService);

  const port = process.env['PORT'];

  if (port) {
    // HTTP mode for hosted deployment (MCPize, etc.)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    await mcpServer.connect(transport);

    const serverCard = {
      name: 'mcp-google-sheets-advanced',
      description: 'Advanced Google Sheets MCP server — charts, pivot tables, formulas, formatting, and analytics. 30 tools total.',
      version: '0.1.0',
      tools: 30,
      homepage: 'https://github.com/vic08/mcp-google-sheets-advanced',
      transport: { type: 'streamable-http', url: '/mcp' },
    };

    const httpServer = http.createServer(async (req, res) => {
      if (req.url === '/mcp' || req.url === '/') {
        try {
          await transport.handleRequest(req, res);
        } catch {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        }
      } else if (req.url === '/.well-known/mcp/server-card.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(serverCard));
      } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    httpServer.listen(parseInt(port, 10), '0.0.0.0', () => {
      console.error(`MCP server listening on port ${port} (HTTP mode)`);
    });
  } else {
    // stdio mode for local usage (Claude Desktop, Cline, etc.)
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
