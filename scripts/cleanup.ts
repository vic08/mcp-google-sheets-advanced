import { AuthService } from '../src/services/auth.service.js';
import { SheetsService } from '../src/services/sheets.service.js';

async function main() {
  const auth = new AuthService();
  const sheets = new SheetsService(auth);
  const ID = '12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk';

  // Get all charts
  const sp = await sheets.getSpreadsheet(ID, 'sheets(properties,charts,conditionalFormats)');
  const allCharts: number[] = [];
  for (const s of sp.sheets || []) {
    for (const c of s.charts || []) {
      if (c.chartId !== undefined) allCharts.push(c.chartId);
    }
  }
  console.log(`Found ${allCharts.length} charts to delete`);

  // Delete all charts
  if (allCharts.length > 0) {
    await sheets.batchUpdate(
      ID,
      allCharts.map((id) => ({ deleteEmbeddedObject: { objectId: id } })),
    );
    console.log('Deleted all charts');
  }

  // Clear columns H onwards
  await sheets.clearValues(ID, 'Sheet1!H:Z');
  console.log('Cleared columns H-Z');

  console.log('Cleanup done! Spreadsheet is back to original state.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
