# Meet Mgmt

A tool to manage Google Meet recordings and transcripts.

## Setup

1.  **Enable the Google Drive API**

    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project.
    *   Enable the Google Drive API for your project.

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
