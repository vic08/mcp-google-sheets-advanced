import { vi } from 'vitest';

export const MOCK_SPREADSHEET_METADATA = {
  spreadsheetId: 'test-spreadsheet-123',
  properties: { title: 'Test Spreadsheet', locale: 'en_US' },
  sheets: [
    {
      properties: {
        sheetId: 0,
        title: 'Sheet1',
        gridProperties: {
          rowCount: 1000,
          columnCount: 26,
          frozenRowCount: 1,
          frozenColumnCount: 0,
        },
      },
      charts: [{ chartId: 1, spec: { title: 'Revenue Chart', basicChart: { chartType: 'LINE' } } }],
      filterViews: [],
    },
    {
      properties: {
        sheetId: 456,
        title: 'Sales Data',
        gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 0, frozenColumnCount: 0 },
      },
    },
  ],
  namedRanges: [
    {
      namedRangeId: 'nr1',
      name: 'SalesData',
      range: {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 100,
        startColumnIndex: 0,
        endColumnIndex: 4,
      },
    },
  ],
};

export const MOCK_VALUES_SIMPLE = {
  range: 'Sheet1!A1:C4',
  values: [
    ['Product', 'Revenue', 'Cost'],
    ['Widget A', 1200, 800],
    ['Widget B', 3500, 2100],
    ['Widget C', 800, 600],
  ],
};

export const MOCK_VALUES_WITH_FORMULAS = {
  range: 'Sheet1!A1:D4',
  values: [
    ['Product', 'Revenue', 'Cost', '=B1-C1'],
    ['Widget A', '1200', '800', '=B2-C2'],
    ['Widget B', '3500', '2100', '=B3-C3'],
    ['Widget C', '800', '600', '=B4-C4'],
  ],
};

export function createMockSheetsService() {
  return {
    getValues: vi.fn(),
    batchGetValues: vi.fn(),
    updateValues: vi.fn(),
    batchUpdateValues: vi.fn(),
    appendValues: vi.fn(),
    clearValues: vi.fn(),
    getSpreadsheet: vi.fn(),
    batchUpdate: vi.fn(),
    resolveSheetId: vi.fn(),
  };
}

export function createMockDriveService() {
  return {
    listSpreadsheets: vi.fn(),
  };
}
