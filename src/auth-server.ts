import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

export function startAuthServer(oAuth2Client: OAuth2Client, onCodeReceived: (code: string) => void, port = 3000) {
  const app = express();
  let server: any;

  app.get('/oauth2callback', (req: Request, res: Response) => {
    const code = req.query.code as string;
    res.send('Authentication successful! You can close this window.');
    if (server) {
      server.close();
    }
    onCodeReceived(code);
  });

  server = app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
  });
}
