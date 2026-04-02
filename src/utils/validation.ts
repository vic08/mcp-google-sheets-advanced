export function isValidSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(id);
}

export function isValidA1Notation(a1: string): boolean {
  // Basic validation for A1 notation patterns
  const patterns = [
    /^'[^']*'![A-Za-z]+\d+:[A-Za-z]+\d+$/, // 'Sheet'!A1:B2
    /^'[^']*'![A-Za-z]+:[A-Za-z]+$/, // 'Sheet'!A:B
    /^'[^']*'!\d+:\d+$/, // 'Sheet'!1:10
    /^[A-Za-z0-9_]+![A-Za-z]+\d+:[A-Za-z]+\d+$/, // Sheet1!A1:B2
    /^[A-Za-z0-9_]+![A-Za-z]+:[A-Za-z]+$/, // Sheet1!A:B
    /^[A-Za-z0-9_]+!\d+:\d+$/, // Sheet1!1:10
    /^[A-Za-z]+\d+:[A-Za-z]+\d+$/, // A1:B2
    /^[A-Za-z]+\d+$/, // A1
    /^[A-Za-z0-9_]+$/, // Sheet1 or named range
    /^'[^']*'$/, // 'Sheet Name'
    /^[A-Za-z0-9_]+![A-Za-z]+\d+$/, // Sheet1!A1
  ];
  return patterns.some((p) => p.test(a1));
}

export function isValidHexColor(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}
