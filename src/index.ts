import { DriveService } from './drive';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

async function main() {
  const argv = await yargs(hideBin(process.argv))
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

  const conferenceRecords = await driveService.listConferenceRecords(argv.meetingId);

  if (!conferenceRecords || conferenceRecords.length === 0) {
    console.log('No conference records found for this meeting ID.');
    return;
  }

  for (const conferenceRecord of conferenceRecords) {
    const recordings = await driveService.listRecordings(conferenceRecord.name!);
    if (recordings) {
      for (const recording of recordings) {
        console.log(`Moving recording: ${recording.name}`);
        await driveService.moveFile(recording.docId!, argv.folderId as string);
      }
    }

    const transcripts = await driveService.listTranscripts(conferenceRecord.name!);
    if (transcripts) {
      for (const transcript of transcripts) {
        console.log(`Moving transcript: ${transcript.name}`);
        await driveService.moveFile(transcript.docId!, argv.folderId as string);
      }
    }
  }
}

main().catch(console.error);