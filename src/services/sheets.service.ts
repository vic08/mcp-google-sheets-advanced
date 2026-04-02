import { sheets as sheetsApi, type sheets_v4 } from '@googleapis/sheets';
import type { AuthService } from './auth.service.js';

export class SheetsService {
  private sheets: sheets_v4.Sheets | null = null;

  constructor(private auth: AuthService) {}

  private async getClient(): Promise<sheets_v4.Sheets> {
    if (this.sheets) return this.sheets;
    const authClient = await this.auth.getAuthenticatedClient();
    this.sheets = sheetsApi({ version: 'v4', auth: authClient });
    return this.sheets;
  }

  async getValues(
    spreadsheetId: string,
    range: string,
    valueRenderOption: string = 'FORMATTED_VALUE',
  ): Promise<sheets_v4.Schema$ValueRange> {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption:
        valueRenderOption as sheets_v4.Params$Resource$Spreadsheets$Values$Get['valueRenderOption'],
    });
    return res.data;
  }

  async batchGetValues(
    spreadsheetId: string,
    ranges: string[],
    valueRenderOption: string = 'FORMATTED_VALUE',
  ): Promise<sheets_v4.Schema$BatchGetValuesResponse> {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
      valueRenderOption:
        valueRenderOption as sheets_v4.Params$Resource$Spreadsheets$Values$Batchget['valueRenderOption'],
    });
    return res.data;
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: unknown[][],
    valueInputOption: string = 'USER_ENTERED',
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: { values },
    });
    return res.data;
  }

  async batchUpdateValues(
    spreadsheetId: string,
    data: Array<{ range: string; values: unknown[][] }>,
    valueInputOption: string = 'USER_ENTERED',
  ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption,
        data: data.map((d) => ({ range: d.range, values: d.values })),
      },
    });
    return res.data;
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: unknown[][],
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const client = await this.getClient();
    const res = await client.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    return res.data;
  }

  async clearValues(spreadsheetId: string, range: string): Promise<void> {
    const client = await this.getClient();
    await client.spreadsheets.values.clear({
      spreadsheetId,
      range,
      requestBody: {},
    });
  }

  async getSpreadsheet(
    spreadsheetId: string,
    fields?: string,
  ): Promise<sheets_v4.Schema$Spreadsheet> {
    const client = await this.getClient();
    const res = await client.spreadsheets.get({
      spreadsheetId,
      fields,
    });
    return res.data;
  }

  async batchUpdate(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[],
  ): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
    const client = await this.getClient();
    const res = await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    return res.data;
  }

  async resolveSheetId(spreadsheetId: string, sheetName: string): Promise<number> {
    const spreadsheet = await this.getSpreadsheet(
      spreadsheetId,
      'sheets.properties.sheetId,sheets.properties.title',
    );

    const sheet = spreadsheet.sheets?.find((s) => s.properties?.title === sheetName);

    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }

    return sheet.properties.sheetId;
  }
}
