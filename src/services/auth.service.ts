import { google, type Auth } from 'googleapis';
type OAuth2Client = Auth.OAuth2Client;
type Credentials = Auth.Credentials;
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import http from 'http';
import open from 'open';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

export class AuthService {
  private client: OAuth2Client | null = null;
  private tokenPath: string;

  constructor() {
    this.tokenPath =
      process.env['GOOGLE_TOKEN_PATH'] ??
      path.join(os.homedir(), '.config', 'mcp-gsheets', 'tokens.json');
  }

  async getAuthenticatedClient(): Promise<OAuth2Client> {
    if (this.client) return this.client;

    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required',
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

    // Try loading stored tokens
    const tokens = await this.loadStoredTokens();
    if (tokens) {
      oauth2Client.setCredentials(tokens);

      // Check if access token is expired
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          await this.storeTokens(credentials);
          oauth2Client.setCredentials(credentials);
        } catch {
          // Refresh failed, need to re-authenticate
          return this.startOAuthFlow(oauth2Client);
        }
      }

      this.client = oauth2Client;
      return oauth2Client;
    }

    return this.startOAuthFlow(oauth2Client);
  }

  private async startOAuthFlow(oauth2Client: OAuth2Client): Promise<OAuth2Client> {
    return new Promise((resolve, reject) => {
      let redirectUri = '';

      const server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url!, `http://localhost`);
          const code = url.searchParams.get('code');

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication successful!</h1><p>You can close this tab.</p>');

            server.close();

            const { tokens } = await oauth2Client.getToken({
              code,
              redirect_uri: redirectUri,
            });
            oauth2Client.setCredentials(tokens);
            await this.storeTokens(tokens);

            this.client = oauth2Client;
            resolve(oauth2Client);
          }
        } catch (err) {
          reject(err);
        }
      });

      server.listen(0, 'localhost', () => {
        const port = (server.address() as { port: number }).port;
        redirectUri = `http://localhost:${port}`;

        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          redirect_uri: redirectUri,
          prompt: 'consent',
        });

        console.error(`Opening browser for Google authentication...`);
        console.error(`If the browser doesn't open, visit this URL:\n${authUrl}\n`);
        open(authUrl).catch(() => {
          // Browser open failed silently, URL is already printed above
        });
      });

      server.on('error', reject);

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out after 5 minutes'));
      }, 300_000);
    });
  }

  private async loadStoredTokens(): Promise<Credentials | null> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(data) as Credentials;
    } catch {
      return null;
    }
  }

  private async storeTokens(tokens: Credentials): Promise<void> {
    const dir = path.dirname(this.tokenPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }
}
