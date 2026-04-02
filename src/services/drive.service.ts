import { google } from 'googleapis';
import type { AuthService } from './auth.service.js';

export class DriveService {
  constructor(private auth: AuthService) {}

  async listSpreadsheets(
    query?: string,
    maxResults: number = 20,
  ): Promise<Array<{ spreadsheetId: string; title: string; lastModified: string }>> {
    const authClient = await this.auth.getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }

    const res = await drive.files.list({
      q,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: Math.min(maxResults, 100),
    });

    return (res.data.files ?? []).map((f) => ({
      spreadsheetId: f.id!,
      title: f.name!,
      lastModified: f.modifiedTime!,
    }));
  }
}
