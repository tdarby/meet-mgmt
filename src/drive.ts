import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { startAuthServer } from './auth-server';

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/meet.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Sleep helper
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN']);

export class DriveService {
  private drive;
  // Lazily discovered Meet API client; typed as any due to discovery
  private meet: any;

  constructor(private auth: OAuth2Client) {
    this.drive = google.drive({ version: 'v3', auth });
    // Set global auth so discovered APIs also use the same OAuth client
    google.options({ auth });
  }

  static async getAuthenticatedClient(): Promise<OAuth2Client> {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH).toString());
    const { client_secret, client_id } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/oauth2callback');

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

  // Lazily obtain the Meet API client via discovery
  private async getMeetClient() {
    if (!this.meet) {
      this.meet = await google.discoverAPI('https://meet.googleapis.com/$discovery/rest?version=v2');
    }
    return this.meet;
  }

  // Generic retry with exponential backoff and jitter
  private async executeWithRetry<T>(operation: () => Promise<T>, description: string): Promise<T> {
    const maxAttempts = 5;
    let attempt = 0;
    let delayMs = 500;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      try {
        return await operation();
      } catch (err: any) {
        const status = err?.response?.status;
        const code = err?.code;
        const isRetryable = RETRYABLE_STATUS_CODES.has(status) || (code && RETRYABLE_ERROR_CODES.has(code));
        if (!isRetryable || attempt >= maxAttempts) {
          throw err;
        }
        const jitter = Math.floor(Math.random() * 100);
        await delay(delayMs + jitter);
        delayMs = Math.min(delayMs * 2, 8000);
      }
    }
  }

  async listFiles(query: string) {
    const files: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res: any = await this.executeWithRetry(
        () =>
          this.drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, name)',
            pageSize: 1000,
            pageToken,
          }),
        'drive.files.list'
      );
      if (res.data.files) files.push(...res.data.files);
      pageToken = res.data.nextPageToken as string | undefined;
    } while (pageToken);

    return files;
  }

  async moveFile(fileId: string, folderId: string) {
    const file: any = await this.executeWithRetry(
      () =>
        this.drive.files.get({
          fileId: fileId,
          fields: 'parents',
        }),
      'drive.files.get'
    );

    const previousParents = file.data.parents?.length ? file.data.parents.join(',') : undefined;

    await this.executeWithRetry(
      () =>
        this.drive.files.update({
          fileId: fileId,
          addParents: folderId,
          removeParents: previousParents,
          fields: 'id, parents',
        }),
      'drive.files.update'
    );
  }

  async listConferenceRecords(meetingId: string) {
    const meet = await this.getMeetClient();
    const all: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res: any = await this.executeWithRetry(
        () =>
          (meet as any).conferenceRecords.list({
            filter: `meeting_code='${meetingId}'`,
            pageSize: 100,
            pageToken,
          }),
        'meet.conferenceRecords.list'
      );
      if (res.data.conferenceRecords) all.push(...res.data.conferenceRecords);
      pageToken = res.data.nextPageToken as string | undefined;
    } while (pageToken);

    return all;
  }

  // Accept full resource name (e.g., "conferenceRecords/{id}") to avoid double-prefixing
  async listRecordings(conferenceRecordName: string) {
    const meet = await this.getMeetClient();
    const all: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res: any = await this.executeWithRetry(
        () =>
          (meet as any).conferenceRecords.recordings.list({
            parent: conferenceRecordName,
            pageSize: 100,
            pageToken,
          }),
        'meet.conferenceRecords.recordings.list'
      );
      if (res.data.recordings) all.push(...res.data.recordings);
      pageToken = res.data.nextPageToken as string | undefined;
    } while (pageToken);

    return all;
  }

  // Accept full resource name (e.g., "conferenceRecords/{id}") to avoid double-prefixing
  async listTranscripts(conferenceRecordName: string) {
    const meet = await this.getMeetClient();
    const all: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res: any = await this.executeWithRetry(
        () =>
          (meet as any).conferenceRecords.transcripts.list({
            parent: conferenceRecordName,
            pageSize: 100,
            pageToken,
          }),
        'meet.conferenceRecords.transcripts.list'
      );
      if (res.data.transcripts) all.push(...res.data.transcripts);
      pageToken = res.data.nextPageToken as string | undefined;
    } while (pageToken);

    return all;
  }
}