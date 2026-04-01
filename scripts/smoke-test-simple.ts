/**
 * Minimal smoke test to debug the timeout issue.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

const SPREADSHEET_ID = '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', resolve('src/index.ts')],
    env: { ...process.env },
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (data: Buffer) => {
    process.stderr.write('[SERVER] ' + data.toString());
  });

  const client = new Client({ name: 'test', version: '1.0.0' });

  console.log('Connecting...');
  await client.connect(transport);
  console.log('Connected!');

  const tools = await client.listTools();
  console.log(`Tools: ${tools.tools.length}`);

  // Try calling a tool with explicit high timeout
  console.log('\nCalling sheets_get_spreadsheet_info...');
  const start = Date.now();
  try {
    const result = await client.callTool(
      'sheets_get_spreadsheet_info',
      { spreadsheet_id: SPREADSHEET_ID },
      undefined,
      { timeout: 120_000 },
    );
    const elapsed = Date.now() - start;
    console.log(`Completed in ${elapsed}ms`);
    const text = (result.content as Array<{type: string; text: string}>)[0]?.text ?? '';
    console.log('Result:', text.slice(0, 300));
  } catch (e: any) {
    const elapsed = Date.now() - start;
    console.error(`Failed after ${elapsed}ms:`, e.message);
  }

  await client.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
