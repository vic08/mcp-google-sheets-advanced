import { AuthService } from '../src/services/auth.service.js';
import { SheetsService } from '../src/services/sheets.service.js';

async function main() {
  console.log('Testing direct API call...');
  const auth = new AuthService();
  const sheets = new SheetsService(auth);

  try {
    const result = await sheets.getValues(
      '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk',
      'Sheet1!A1:C3',
    );
    console.log('SUCCESS:', JSON.stringify(result.values, null, 2));
  } catch (e: any) {
    console.log('ERROR:', e.message);
  }
  process.exit(0);
}

main();
