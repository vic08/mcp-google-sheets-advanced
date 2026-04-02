import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

const SPREADSHEET_ID = '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', resolve('src/index.ts')],
    env: { ...process.env },
  });
  const client = new Client({ name: 'debug', version: '1.0.0' });
  await client.connect(transport);

  // Debug List Spreadsheets
  console.log('=== List Spreadsheets ===');
  const r1 = await client.callTool({ name: 'sheets_list_spreadsheets', arguments: { max_results: 5 } });
  console.log((r1.content as any)[0]?.text?.slice(0, 300));

  // Debug Analyze Trends
  console.log('\n=== Analyze Trends ===');
  const r2 = await client.callTool({ name: 'sheets_analyze_trends', arguments: { spreadsheet_id: SPREADSHEET_ID, range: 'Sheet1!A1:D15', value_column: 2 } });
  console.log((r2.content as any)[0]?.text?.slice(0, 500));

  // Debug Create Chart
  console.log('\n=== Create Chart ===');
  const r3 = await client.callTool({ name: 'sheets_create_chart', arguments: { spreadsheet_id: SPREADSHEET_ID, sheet_name: 'Sheet1', data_range: 'B1:D15', chart_type: 'bar', title: 'Debug Chart' } });
  console.log((r3.content as any)[0]?.text?.slice(0, 500));

  await client.close();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
