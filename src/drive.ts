import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { startAuthServer } from './auth-server';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

export class DriveService {
  private drive;

  constructor(private auth: OAuth2Client) {
    this.drive = google.drive({ version: 'v3', auth });
  }

  static async getAuthenticatedClient(): Promise<OAuth2Client> {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH).toString());
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH).toString());
      oAuth2Client.setCredentials(token);
    } else {
      await this.getAccessToken(oAuth2Client);
    }

    return oAuth2Client;
  }

  private static async getAccessToken(oAuth2Client: OAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    return new Promise<void>((resolve, reject) => {
      startAuthServer(oAuth2Client, async (code) => {
        try {
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log('Token stored to', TOKEN_PATH);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      console.log('Authorize this app by visiting this url:', authUrl);
    });
  }

  async listFiles(query: string) {
    const res = await this.drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name)',
    });
    return res.data.files;
  }

  async moveFile(fileId: string, folderId: string) {
    const file = await this.drive.files.get({
      fileId: fileId,
      fields: 'parents',
    });

    const previousParents = file.data.parents?.join(',');

    await this.drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
  }
}
