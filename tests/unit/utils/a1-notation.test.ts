import { describe, it, expect } from 'vitest';
import {
  parseA1Notation,
  columnLetterToIndex,
  indexToColumnLetter,
  parseCellRef,
  buildCellRef,
  a1ToGridRange,
} from '../../../src/utils/a1-notation';

describe('parseA1Notation', () => {
  it('parses Sheet1!A1:D10', () => {
    expect(parseA1Notation('Sheet1!A1:D10')).toEqual({
      sheetName: 'Sheet1',
      startCell: 'A1',
      endCell: 'D10',
    });
  });

  it("parses quoted sheet name 'My Sheet'!A1:B5", () => {
    expect(parseA1Notation("'My Sheet'!A1:B5")).toEqual({
      sheetName: 'My Sheet',
      startCell: 'A1',
      endCell: 'B5',
    });
  });

  it('parses A1:D10 without sheet name', () => {
    expect(parseA1Notation('A1:D10')).toEqual({
      sheetName: undefined,
      startCell: 'A1',
      endCell: 'D10',
    });
  });

  it('parses Sheet1 (sheet name only)', () => {
    expect(parseA1Notation('Sheet1')).toEqual({
      sheetName: 'Sheet1',
    });
  });

  it('parses Sheet1!A:D (column-only range)', () => {
    expect(parseA1Notation('Sheet1!A:D')).toEqual({
      sheetName: 'Sheet1',
      startCell: 'A',
      endCell: 'D',
    });
  });

  it('parses Sheet1!1:10 (row-only range)', () => {
    expect(parseA1Notation('Sheet1!1:10')).toEqual({
      sheetName: 'Sheet1',
      startCell: '1',
      endCell: '10',
    });
  });
});

describe('columnLetterToIndex', () => {
  it('converts A to 0', () => {
    expect(columnLetterToIndex('A')).toBe(0);
  });

  it('converts B to 1', () => {
    expect(columnLetterToIndex('B')).toBe(1);
  });

  it('converts Z to 25', () => {
    expect(columnLetterToIndex('Z')).toBe(25);
  });

  it('converts AA to 26', () => {
    expect(columnLetterToIndex('AA')).toBe(26);
  });

  it('converts AZ to 51', () => {
    expect(columnLetterToIndex('AZ')).toBe(51);
  });

  it('is case-insensitive', () => {
    expect(columnLetterToIndex('aa')).toBe(26);
    expect(columnLetterToIndex('Az')).toBe(51);
  });
});

describe('indexToColumnLetter', () => {
  it('converts 0 to A', () => {
    expect(indexToColumnLetter(0)).toBe('A');
  });

  it('converts 25 to Z', () => {
    expect(indexToColumnLetter(25)).toBe('Z');
  });

  it('converts 26 to AA', () => {
    expect(indexToColumnLetter(26)).toBe('AA');
  });

  it('converts 51 to AZ', () => {
    expect(indexToColumnLetter(51)).toBe('AZ');
  });

  it('converts 52 to BA', () => {
    expect(indexToColumnLetter(52)).toBe('BA');
  });

  it('roundtrips indices 0-99', () => {
    for (let i = 0; i < 100; i++) {
      expect(columnLetterToIndex(indexToColumnLetter(i))).toBe(i);
    }
  });
});

describe('parseCellRef', () => {
  it('parses A1', () => {
    expect(parseCellRef('A1')).toEqual({ row: 0, col: 0 });
  });

  it('parses D10', () => {
    expect(parseCellRef('D10')).toEqual({ row: 9, col: 3 });
  });

  it('parses AA100', () => {
    expect(parseCellRef('AA100')).toEqual({ row: 99, col: 26 });
  });
});

describe('buildCellRef', () => {
  it('builds A1 from row=0, col=0', () => {
    expect(buildCellRef(0, 0)).toBe('A1');
  });

  it('builds D10 from row=9, col=3', () => {
    expect(buildCellRef(9, 3)).toBe('D10');
  });

  it('builds AA100 from row=99, col=26', () => {
    expect(buildCellRef(99, 26)).toBe('AA100');
  });

  it('is the reverse of parseCellRef', () => {
    const ref = parseCellRef('Z50');
    expect(buildCellRef(ref.row, ref.col)).toBe('Z50');
  });
});

describe('a1ToGridRange', () => {
  it('converts A1:D10 with sheetId 0', () => {
    expect(a1ToGridRange('A1:D10', 0)).toEqual({
      sheetId: 0,
      startRowIndex: 0,
      endRowIndex: 10,
      startColumnIndex: 0,
      endColumnIndex: 4,
    });
  });

  it('handles column-only range A:D', () => {
    expect(a1ToGridRange('A:D', 1)).toEqual({
      sheetId: 1,
      startRowIndex: 0,
      endRowIndex: 1000,
      startColumnIndex: 0,
      endColumnIndex: 4,
    });
  });

  it('handles row-only range 1:10', () => {
    expect(a1ToGridRange('1:10', 2)).toEqual({
      sheetId: 2,
      startRowIndex: 0,
      endRowIndex: 10,
      startColumnIndex: 0,
      endColumnIndex: 26,
    });
  });

  it('handles sheet name only (whole sheet)', () => {
    expect(a1ToGridRange('Sheet1', 0)).toEqual({
      sheetId: 0,
      startRowIndex: 0,
      endRowIndex: 1000,
      startColumnIndex: 0,
      endColumnIndex: 26,
    });
  });
});
