# Meet Mgmt

A tool to manage Google Meet recordings and transcripts.

## Setup

1.  **Enable the Google Drive API**

    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project.
    *   Enable the Google Drive API and the Google Meet API for your project.

2.  **Create OAuth 2.0 Credentials**

    *   In the Google Cloud Console, go to "APIs & Services" > "Credentials".
    *   Click "Create Credentials" and choose "OAuth client ID".
    *   Select "Desktop app" as the application type.
    *   Add `http://localhost:3000/oauth2callback` as an authorized redirect URI.
    *   Download the JSON file and save it as `credentials.json` in the root of this project.

3.  **Install Dependencies**

    ```bash
    npm install
    ```

## Usage

- Move recordings and transcripts for a meeting into a Drive folder:

```bash
npm start -- --meetingId <your-meeting-id> --folderId <your-folder-id>
```

- List recordings for a meeting (no changes to Drive):

```bash
npm start -- --meetingId <your-meeting-id> --list-recordings
```

- List transcripts for a meeting (no changes to Drive):

```bash
npm start -- --meetingId <your-meeting-id> --list-transcripts
```

- Filter by date (UTC), format yyyymmdd (applies to list and move flows):

```bash
# List recordings on a single day
npm start -- --meetingId <id> --list-recordings --from 20250115 --to 20250115

# Move items for a date range (inclusive)
npm start -- --meetingId <id> --folderId <folder> --from 20250101 --to 20250131
```

- Optional verbose logging:

```bash
npm start -- --meetingId <your-meeting-id> --list-recordings --debug
```

### Flags

- `--meetingId, -m` (required): The Google Meet code (for example, `abc-def-ghi`). The app looks up conference records using this meeting code.
- `--folderId, -f` (required only when moving): Destination Google Drive folder ID.
- `--list-recordings, -L` (optional): Lists recordings for the meeting and exits (does not move files).
- `--list-transcripts, -T` (optional): Lists transcripts for the meeting and exits (does not move files).
- `--from` (optional): Filter start date in UTC, format `yyyymmdd` (e.g., `20250101`).
- `--to` (optional): Filter end date in UTC, format `yyyymmdd` (e.g., `20250131`).
- `--debug` (optional): Prints additional diagnostic output.

### Finding the Meeting ID

The meeting ID is the last part of the Google Meet link. For example, if your meeting link is `https://meet.google.com/abc-def-ghi`, then your meeting ID is `abc-def-ghi`.

### Finding the Folder ID

The folder ID is the last part of the URL when you have the folder open in Google Drive. For example, if the URL is `https://drive.google.com/drive/folders/1234567890abcdefg`, then your folder ID is `1234567890abcdefg`.

## Development

Run directly with TypeScript without building:

```bash
npm run dev -- --meetingId <your-meeting-id> --folderId <your-folder-id>
```

## Behavior

- Pagination: the tool paginates through all conference records, recordings, and transcripts for the given meeting ID, ensuring large meetings are fully processed.
- Retries: Google API calls automatically retry with exponential backoff on transient failures (429/5xx, common network errors).
- Conference record lookup: conference records are discovered automatically via the Meet REST API using `meeting_code:<meetingId>`.
- Date filters: when `--from/--to` are provided (UTC `yyyymmdd`), conference records are filtered by `start_time >= from` and `start_time <= to` before listing/moving artifacts.
- Moves, not copies: when `--folderId` is provided, both recordings (Drive files) and transcripts (Docs files) are moved into the destination folder.
- Safe move: if a file is already in the target folder, the app skips moving it. Otherwise, it adds the target as a parent and removes other parents.
- Recording file ID resolution: recording Drive file IDs are resolved from the Meet API (`driveDestination.file.driveFileId`) or derived from the export URL; if the ID can’t be resolved, the item is skipped with a warning.
- Transcript document ID resolution: transcript Docs IDs are resolved from the Meet API (`docsDestination.document.documentId`) or derived from the export URL; if the ID can’t be resolved, the item is skipped with a warning.

## Authentication artifacts

- `credentials.json`: your OAuth client credentials, placed in the project root (see Setup step 2).
- `token.json`: created on first successful authentication and reused on subsequent runs. Keep it safe; do not commit it to version control.
- OAuth callback: the local auth flow listens on `http://localhost:3000/oauth2callback`. Ensure this redirect URI is configured in your OAuth client.

Scopes used:
- `https://www.googleapis.com/auth/meetings.readonly`
- `https://www.googleapis.com/auth/drive`

If you change scopes, delete `token.json` to force re-consent.

## Troubleshooting

- If the browser opens for authentication but the app does not proceed, verify that the redirect URI `http://localhost:3000/oauth2callback` is added to your OAuth client and that port 3000 is available locally.
- If files are not moved, confirm the meeting ID and folder ID are correct and that your account has access to both the recordings/transcripts and the target folder.
- Use `--list-recordings --debug` or `--list-transcripts --debug` to verify that items are discovered and to inspect resolved Drive/Docs IDs before moving.
