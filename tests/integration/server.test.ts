import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import {
  createMockSheetsService,
  createMockDriveService,
  MOCK_VALUES_SIMPLE,
} from '../fixtures/spreadsheet-data.js';
import type { SheetsService } from '../../src/services/sheets.service.js';
import type { DriveService } from '../../src/services/drive.service.js';

describe('MCP Server Integration', () => {
  let client: Client;
  let mockSheets: ReturnType<typeof createMockSheetsService>;
  let mockDrive: ReturnType<typeof createMockDriveService>;

  beforeEach(async () => {
    mockSheets = createMockSheetsService();
    mockDrive = createMockDriveService();

    const server = createServer(
      mockSheets as unknown as SheetsService,
      mockDrive as unknown as DriveService,
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([client.connect(clientTransport), server.server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
  });

  it('should list all 30 tools', async () => {
    const result = await client.listTools();

    expect(result.tools).toHaveLength(30);
  });

  it('should have tools with sheets_ prefix, description, and inputSchema', async () => {
    const result = await client.listTools();

    for (const tool of result.tools) {
      expect(tool.name).toMatch(/^sheets_/);
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('should call sheets_read_range and return mocked data', async () => {
    mockSheets.getValues.mockResolvedValue(MOCK_VALUES_SIMPLE);

    const result = await client.callTool({
      name: 'sheets_read_range',
      arguments: {
        spreadsheet_id: 'test-spreadsheet-123',
        range: 'Sheet1!A1:C4',
      },
    });

    expect(result.content).toHaveLength(1);

    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0]!.text);

    expect(parsed.range).toBe('Sheet1!A1:C4');
    expect(parsed.values).toEqual(MOCK_VALUES_SIMPLE.values);
    expect(parsed.row_count).toBe(4);
    expect(parsed.column_count).toBe(3);

    expect(mockSheets.getValues).toHaveBeenCalledWith(
      'test-spreadsheet-123',
      'Sheet1!A1:C4',
      'FORMATTED_VALUE',
    );
  });

  it('should return unique tool names', async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name);
    const unique = new Set(names);

    expect(unique.size).toBe(names.length);
  });
});
