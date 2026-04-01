import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../../src/server.js';
import {
  createMockSheetsService,
  createMockDriveService,
  MOCK_VALUES_SIMPLE,
  MOCK_VALUES_WITH_FORMULAS,
} from '../../fixtures/spreadsheet-data.js';
import type { SheetsService } from '../../../src/services/sheets.service.js';
import type { DriveService } from '../../../src/services/drive.service.js';

function parseToolResult(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0]!.text);
}

describe('Read Tools', () => {
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

    await Promise.all([
      client.connect(clientTransport),
      server.server.connect(serverTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  describe('sheets_read_range', () => {
    it('should return correct format with mocked getValues', async () => {
      mockSheets.getValues.mockResolvedValue(MOCK_VALUES_SIMPLE);

      const result = await client.callTool({
        name: 'sheets_read_range',
        arguments: {
          spreadsheet_id: 'test-spreadsheet-123',
          range: 'Sheet1!A1:C4',
        },
      });

      const parsed = parseToolResult(result) as {
        range: string;
        values: unknown[][];
        row_count: number;
        column_count: number;
      };

      expect(parsed.range).toBe('Sheet1!A1:C4');
      expect(parsed.values).toEqual(MOCK_VALUES_SIMPLE.values);
      expect(parsed.row_count).toBe(4);
      expect(parsed.column_count).toBe(3);
    });

    it('should map value_render=formula to FORMULA render option', async () => {
      mockSheets.getValues.mockResolvedValue(MOCK_VALUES_WITH_FORMULAS);

      await client.callTool({
        name: 'sheets_read_range',
        arguments: {
          spreadsheet_id: 'test-spreadsheet-123',
          range: 'Sheet1!A1:D4',
          value_render: 'formula',
        },
      });

      expect(mockSheets.getValues).toHaveBeenCalledWith(
        'test-spreadsheet-123',
        'Sheet1!A1:D4',
        'FORMULA',
      );
    });

    it('should add warning when result exceeds 10,000 cells', async () => {
      // Create a dataset with more than 10,000 cells
      // 101 rows x 100 columns = 10,100 cells
      const largeValues: unknown[][] = [];
      for (let i = 0; i < 101; i++) {
        const row: unknown[] = [];
        for (let j = 0; j < 100; j++) {
          row.push(`cell-${i}-${j}`);
        }
        largeValues.push(row);
      }

      mockSheets.getValues.mockResolvedValue({
        range: 'Sheet1!A1:CV101',
        values: largeValues,
      });

      const result = await client.callTool({
        name: 'sheets_read_range',
        arguments: {
          spreadsheet_id: 'test-spreadsheet-123',
          range: 'Sheet1!A1:CV101',
        },
      });

      const parsed = parseToolResult(result) as {
        range: string;
        values: unknown[][];
        row_count: number;
        column_count: number;
        warning?: string;
      };

      expect(parsed.warning).toBeDefined();
      expect(parsed.warning).toContain('truncated');
      expect(parsed.warning).toContain('10000');
      expect(parsed.row_count).toBeLessThan(101);
    });
  });

  describe('sheets_get_formulas', () => {
    it('should extract only formula cells', async () => {
      mockSheets.getValues.mockResolvedValue(MOCK_VALUES_WITH_FORMULAS);

      const result = await client.callTool({
        name: 'sheets_get_formulas',
        arguments: {
          spreadsheet_id: 'test-spreadsheet-123',
          range: 'Sheet1!A1:D4',
        },
      });

      const parsed = parseToolResult(result) as {
        range: string;
        formulas: Array<{ cell: string; formula: string }>;
        total_cells: number;
        formula_cells: number;
      };

      expect(parsed.range).toBe('Sheet1!A1:D4');
      expect(parsed.formula_cells).toBe(4);
      expect(parsed.total_cells).toBe(16);

      // All formulas should start with '='
      for (const f of parsed.formulas) {
        expect(f.formula).toMatch(/^=/);
        expect(f.cell).toBeTruthy();
      }

      // Check specific formulas
      const formulaTexts = parsed.formulas.map((f) => f.formula);
      expect(formulaTexts).toContain('=B1-C1');
      expect(formulaTexts).toContain('=B2-C2');
      expect(formulaTexts).toContain('=B3-C3');
      expect(formulaTexts).toContain('=B4-C4');
    });
  });

  describe('sheets_read_multiple_ranges', () => {
    it('should call batchGetValues with correct parameters', async () => {
      mockSheets.batchGetValues.mockResolvedValue({
        spreadsheetId: 'test-spreadsheet-123',
        valueRanges: [
          { range: 'Sheet1!A1:C4', values: MOCK_VALUES_SIMPLE.values },
          {
            range: 'Sheet1!E1:E3',
            values: [['Total'], [5500], [3500]],
          },
        ],
      });

      const result = await client.callTool({
        name: 'sheets_read_multiple_ranges',
        arguments: {
          spreadsheet_id: 'test-spreadsheet-123',
          ranges: ['Sheet1!A1:C4', 'Sheet1!E1:E3'],
        },
      });

      const parsed = parseToolResult(result) as {
        ranges: Array<{ range: string; values: unknown[][]; row_count: number; column_count: number }>;
        total_ranges: number;
      };

      expect(parsed.total_ranges).toBe(2);
      expect(parsed.ranges).toHaveLength(2);
      expect(parsed.ranges[0]!.range).toBe('Sheet1!A1:C4');
      expect(parsed.ranges[0]!.row_count).toBe(4);
      expect(parsed.ranges[1]!.range).toBe('Sheet1!E1:E3');
      expect(parsed.ranges[1]!.row_count).toBe(3);

      expect(mockSheets.batchGetValues).toHaveBeenCalledWith(
        'test-spreadsheet-123',
        ['Sheet1!A1:C4', 'Sheet1!E1:E3'],
        'FORMATTED_VALUE',
      );
    });
  });
});
