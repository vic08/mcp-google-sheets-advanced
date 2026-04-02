/**
 * Run this script to complete the Google OAuth flow and store tokens.
 * After running this once, the MCP server will use the stored tokens.
 */
import { AuthService } from '../src/services/auth.service.js';

async function main() {
  console.log('Starting Google OAuth flow...');
  console.log('A browser window should open. If not, check the URL printed below.\n');

  const auth = new AuthService();
  const client = await auth.getAuthenticatedClient();

  console.log('\n✅ Authentication successful! Tokens stored.');
  console.log('You can now run the smoke test.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Auth failed:', err.message);
  process.exit(1);
});
