
import { DriveService } from './drive';
import * as yargs from 'yargs';

async function main() {
  const argv = await yargs
    .option('meetingId', {
      alias: 'm',
      description: 'The ID of the recurring meeting',
      type: 'string',
      demandOption: true,
    })
    .option('folderId', {
      alias: 'f',
      description: 'The ID of the destination folder in Google Drive',
      type: 'string',
      demandOption: true,
    })
    .help()
    .alias('help', 'h').argv;

  const auth = await DriveService.getAuthenticatedClient();
  const driveService = new DriveService(auth);

  const files = await driveService.listFiles(`name contains '${argv.meetingId}'`);

  if (!files || files.length === 0) {
    console.log('No files found for this meeting ID.');
    return;
  }

  for (const file of files) {
    console.log(`Moving file: ${file.name}`);
    await driveService.moveFile(file.id!, argv.folderId);
  }
}

main().catch(console.error);

