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
    *   Download the JSON file and save it as `credentials.json` in the root of this project.

3.  **Install Dependencies**

    ```bash
    npm install
    ```

## Usage

```bash
npm start
```