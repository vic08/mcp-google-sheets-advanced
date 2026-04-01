const FREE_TOOLS = new Set([
  'sheets_list_spreadsheets',
  'sheets_get_spreadsheet_info',
  'sheets_read_range',
  'sheets_read_multiple_ranges',
  'sheets_get_formulas',
  'sheets_get_sheet_metadata',
  'sheets_list_named_ranges',
  'sheets_list_charts',
  'sheets_list_filter_views',
]);

export function isFreeTool(toolName: string): boolean {
  return FREE_TOOLS.has(toolName);
}

export function getToolTier(toolName: string): 'free' | 'pro' {
  return FREE_TOOLS.has(toolName) ? 'free' : 'pro';
}
