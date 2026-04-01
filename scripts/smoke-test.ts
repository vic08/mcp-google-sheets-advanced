/**
 * Smoke test script — connects to the MCP server via stdio and runs
 * real API calls against the test spreadsheet.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

const SPREADSHEET_ID = '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk';
const results: Array<{ test: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];

function log(test: string, status: 'PASS' | 'FAIL', detail?: string) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  results.push({ test, status, detail });
}

async function main() {
  console.log('🚀 Starting MCP Google Sheets Advanced smoke test\n');
  console.log(`📋 Test spreadsheet: ${SPREADSHEET_ID}\n`);

  // Start the server as a child process using tsx (avoids shebang issue with built file)
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', resolve('src/index.ts')],
    env: {
      ...process.env,
    },
  });

  const client = new Client({
    name: 'smoke-test',
    version: '1.0.0',
  });

  console.log('Connecting to server...');
  await client.connect(transport);
  console.log('Connected!\n');

  // --- Test 1: List Tools ---
  try {
    const tools = await client.listTools();
    const count = tools.tools.length;
    if (count === 30) {
      log('List Tools', 'PASS', `${count} tools found`);
    } else {
      log('List Tools', 'FAIL', `Expected 30 tools, got ${count}`);
    }
  } catch (e: any) {
    log('List Tools', 'FAIL', e.message);
  }

  // --- Test 2: List Spreadsheets ---
  try {
    const result = await client.callTool({ name: 'sheets_list_spreadsheets', arguments: { max_results: 5 } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    const spreadsheets = data.spreadsheets ?? data;
    if (Array.isArray(spreadsheets) && spreadsheets.length > 0) {
      log('List Spreadsheets', 'PASS', `Found ${spreadsheets.length} spreadsheets`);
    } else {
      log('List Spreadsheets', 'FAIL', 'No spreadsheets returned');
    }
  } catch (e: any) {
    log('List Spreadsheets', 'FAIL', e.message);
  }

  // --- Test 3: Get Spreadsheet Info ---
  try {
    const result = await client.callTool({ name: 'sheets_get_spreadsheet_info', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.title === 'MCP Server Test Data') {
      log('Get Spreadsheet Info', 'PASS', `Title: "${data.title}"`);
    } else {
      log('Get Spreadsheet Info', 'FAIL', `Unexpected title: "${data.title}"`);
    }
  } catch (e: any) {
    log('Get Spreadsheet Info', 'FAIL', e.message);
  }

  // --- Test 4: Read Range ---
  try {
    const result = await client.callTool({ name: 'sheets_read_range', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!A1:G5',
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.row_count === 5 && data.column_count === 7) {
      log('Read Range', 'PASS', `${data.row_count} rows × ${data.column_count} cols`);
    } else {
      log('Read Range', 'FAIL', `Got ${data.row_count}×${data.column_count}`);
    }
  } catch (e: any) {
    log('Read Range', 'FAIL', e.message);
  }

  // --- Test 5: Get Formulas ---
  try {
    const result = await client.callTool({ name: 'sheets_get_formulas', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!G1:G15',
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.formula_cells > 0) {
      log('Get Formulas', 'PASS', `Found ${data.formula_cells} formulas`);
    } else {
      log('Get Formulas', 'FAIL', 'No formulas found');
    }
  } catch (e: any) {
    log('Get Formulas', 'FAIL', e.message);
  }

  // --- Test 6: Summarize Range ---
  try {
    const result = await client.callTool({ name: 'sheets_summarize_range', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!A1:G15',
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.numeric_columns > 0 && data.columns?.length > 0) {
      const revCol = data.columns.find((c: any) => c.header === 'Revenue');
      log('Summarize Range', 'PASS', `${data.numeric_columns} numeric cols, Revenue mean=${revCol?.mean}`);
    } else {
      log('Summarize Range', 'FAIL', 'No numeric columns found');
    }
  } catch (e: any) {
    log('Summarize Range', 'FAIL', e.message);
  }

  // --- Test 7: Find Duplicates ---
  try {
    const result = await client.callTool({ name: 'sheets_find_duplicates', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!B1:B15',
      columns: [0],
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.duplicate_groups?.length > 0) {
      log('Find Duplicates', 'PASS', `${data.duplicate_groups.length} duplicate groups`);
    } else {
      log('Find Duplicates', 'FAIL', 'No duplicates found');
    }
  } catch (e: any) {
    log('Find Duplicates', 'FAIL', e.message);
  }

  // --- Test 8: Analyze Trends ---
  try {
    const result = await client.callTool({ name: 'sheets_analyze_trends', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!A1:D15',
      value_column: 3,
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.error) {
      log('Analyze Trends', 'FAIL', data.error);
    } else if (data.trend_direction || data.trendDirection || data.direction) {
      const dir = data.trend_direction || data.trendDirection || data.direction;
      const r2 = data.r_squared ?? data.rSquared ?? data.regression?.r_squared ?? 0;
      log('Analyze Trends', 'PASS', `Direction: ${dir}, R²=${Number(r2).toFixed(3)}`);
    } else {
      log('Analyze Trends', 'FAIL', `Missing trend data: ${JSON.stringify(data).slice(0, 200)}`);
    }
  } catch (e: any) {
    log('Analyze Trends', 'FAIL', e.message);
  }

  // --- Test 9: Write Range ---
  try {
    const result = await client.callTool({ name: 'sheets_write_range', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!H1:H2',
      values: [['Smoke Test'], ['PASS']],
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.updated_cells === 2) {
      log('Write Range', 'PASS', `${data.updated_cells} cells updated`);
    } else {
      log('Write Range', 'FAIL', `Updated ${data.updated_cells} cells`);
    }
  } catch (e: any) {
    log('Write Range', 'FAIL', e.message);
  }

  // --- Test 10: Create Chart ---
  try {
    const result = await client.callTool({ name: 'sheets_create_chart', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: 'Sheet1',
      data_range: 'B1:D15',
      chart_type: 'bar',
      title: 'Revenue by Product (Smoke Test)',
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (data.chart_id) {
      log('Create Chart', 'PASS', `Chart ID: ${data.chart_id}`);
    } else {
      log('Create Chart', 'FAIL', 'No chart_id returned');
    }
  } catch (e: any) {
    log('Create Chart', 'FAIL', e.message);
  }

  // --- Test 11: Conditional Formatting ---
  try {
    const result = await client.callTool({ name: 'sheets_add_conditional_formatting', arguments: {
      spreadsheet_id: SPREADSHEET_ID,
      range: 'Sheet1!G2:G15',
      rule_type: 'greater_than',
      values: ['1000'],
      format: { background_color: '#00FF00', bold: true },
    } });
    const text = (result.content as any)[0]?.text;
    const data = JSON.parse(text);
    if (!result.isError) {
      log('Conditional Formatting', 'PASS', 'Rule added');
    } else {
      log('Conditional Formatting', 'FAIL', data.message || 'Error');
    }
  } catch (e: any) {
    log('Conditional Formatting', 'FAIL', e.message);
  }

  // --- Summary ---
  console.log('\n' + '='.repeat(50));
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n🏁 Results: ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  ❌ ${r.test}: ${r.detail}`));
  }

  await client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
