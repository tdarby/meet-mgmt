import * as express from 'express';
import { OAuth2Client } from 'google-auth-library';

export function startAuthServer(oAuth2Client: OAuth2Client, onCodeReceived: (code: string) => void, port = 3000) {
  const app = express();

  app.get('/oauth2callback', (req, res) => {
    const code = req.query.code as string;
    res.send('Authentication successful! You can close this window.');
    app.listen().close();
    onCodeReceived(code);
  });

  app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
  });
}
