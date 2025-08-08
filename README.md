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

To run the application, you need to provide the meeting ID and the destination folder ID as command-line arguments:

```bash
npm start -- --meetingId <your-meeting-id> --folderId <your-folder-id>
```

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
- Moves, not copies: matching recordings and transcripts are moved into the destination folder.

## Authentication artifacts

- `credentials.json`: your OAuth client credentials, placed in the project root (see Setup step 2).
- `token.json`: created on first successful authentication and reused on subsequent runs. Keep it safe; do not commit it to version control.
- OAuth callback: the local auth flow listens on `http://localhost:3000/oauth2callback`. Ensure this redirect URI is configured in your OAuth client.

## Troubleshooting

- If the browser opens for authentication but the app does not proceed, verify that the redirect URI `http://localhost:3000/oauth2callback` is added to your OAuth client and that port 3000 is available locally.
- If files are not moved, confirm the meeting ID and folder ID are correct and that your account has access to both the recordings/transcripts and the target folder.
