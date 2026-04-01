export function parseA1Notation(a1: string): {
  sheetName?: string;
  startCell?: string;
  endCell?: string;
} {
  let sheetName: string | undefined;
  let cellRange: string | undefined;

  // Handle quoted sheet names: 'My Sheet'!A1:B2
  if (a1.startsWith("'")) {
    const endQuote = a1.indexOf("'", 1);
    if (endQuote === -1) {
      return { sheetName: a1.slice(1) };
    }
    sheetName = a1.slice(1, endQuote);
    if (a1[endQuote + 1] === '!') {
      cellRange = a1.slice(endQuote + 2);
    }
  } else if (a1.includes('!')) {
    const parts = a1.split('!');
    sheetName = parts[0];
    cellRange = parts[1];
  } else if (/^[A-Za-z]{1,3}\d*:[A-Za-z]{1,3}\d*$/.test(a1) || /^[A-Za-z]{1,3}\d+$/.test(a1)) {
    // Just a cell range without sheet name (max 3 letter columns like XFD)
    cellRange = a1;
  } else if (/^\d+:\d+$/.test(a1)) {
    cellRange = a1;
  } else {
    // Could be a sheet name only or a named range
    sheetName = a1;
  }

  if (!cellRange) {
    return { sheetName };
  }

  if (cellRange.includes(':')) {
    const [start, end] = cellRange.split(':');
    return { sheetName, startCell: start, endCell: end };
  }

  return { sheetName, startCell: cellRange, endCell: cellRange };
}

export function columnLetterToIndex(letter: string): number {
  let index = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function indexToColumnLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

export function parseCellRef(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cell}`);
  }
  return {
    col: columnLetterToIndex(match[1]!),
    row: parseInt(match[2]!, 10) - 1,
  };
}

export function buildCellRef(row: number, col: number): string {
  return `${indexToColumnLetter(col)}${row + 1}`;
}

export function a1ToGridRange(
  a1: string,
  sheetId: number,
): {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
} {
  const parsed = parseA1Notation(a1);

  if (!parsed.startCell || !parsed.endCell) {
    // Whole sheet
    return {
      sheetId,
      startRowIndex: 0,
      endRowIndex: 1000,
      startColumnIndex: 0,
      endColumnIndex: 26,
    };
  }

  // Handle column-only ranges like A:D
  const isColumnOnly = (ref: string) => /^[A-Za-z]+$/.test(ref);
  const isRowOnly = (ref: string) => /^\d+$/.test(ref);

  if (isColumnOnly(parsed.startCell) && isColumnOnly(parsed.endCell)) {
    return {
      sheetId,
      startRowIndex: 0,
      endRowIndex: 1000,
      startColumnIndex: columnLetterToIndex(parsed.startCell),
      endColumnIndex: columnLetterToIndex(parsed.endCell) + 1,
    };
  }

  if (isRowOnly(parsed.startCell) && isRowOnly(parsed.endCell)) {
    return {
      sheetId,
      startRowIndex: parseInt(parsed.startCell, 10) - 1,
      endRowIndex: parseInt(parsed.endCell, 10),
      startColumnIndex: 0,
      endColumnIndex: 26,
    };
  }

  const start = parseCellRef(parsed.startCell);
  const end = parseCellRef(parsed.endCell);

  return {
    sheetId,
    startRowIndex: start.row,
    endRowIndex: end.row + 1,
    startColumnIndex: start.col,
    endColumnIndex: end.col + 1,
  };
}

export function gridRangeToA1(
  range: { sheetId?: number | null; startRowIndex?: number | null; endRowIndex?: number | null; startColumnIndex?: number | null; endColumnIndex?: number | null },
  sheetName: string,
): string {
  const startCol = indexToColumnLetter(range.startColumnIndex ?? 0);
  const startRow = (range.startRowIndex ?? 0) + 1;
  const endCol = indexToColumnLetter((range.endColumnIndex ?? 1) - 1);
  const endRow = range.endRowIndex ?? 1;

  const needsQuotes = sheetName.includes(' ') || sheetName.includes("'");
  const quotedName = needsQuotes ? `'${sheetName}'` : sheetName;

  return `${quotedName}!${startCol}${startRow}:${endCol}${endRow}`;
}
