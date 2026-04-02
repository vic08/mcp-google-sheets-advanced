import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', resolve('scripts/test-server.ts')],
    env: { ...process.env },
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data);
  });

  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);

  console.log('Connected. Calling test_read...');
  try {
    const result = await client.callTool({
      name: 'test_read',
      arguments: { spreadsheet_id: '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk' },
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }

  await client.close();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
