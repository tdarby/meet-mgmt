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
      demandOption: false,
    })
    .option('list-recordings', {
      alias: 'L',
      description: 'List recordings for the given meeting and exit',
      type: 'boolean',
      default: false,
    })
    .check((args) => {
      if (!args['list-recordings'] && !args.folderId) {
        throw new Error('Either provide --folderId to move files or use --list-recordings to only list.');
      }
      return true;
    })
    .help()
    .alias('help', 'h').argv;

  const auth = await DriveService.getAuthenticatedClient();
  const driveService = new DriveService(auth);

  if (argv['list-recordings']) {
    const recordings = await driveService.listAllRecordingsForMeeting(argv.meetingId);
    if (!recordings.length) {
      console.log('No recordings found.');
      return;
    }
    for (const r of recordings) {
      const id = r?.driveDestination?.file?.driveFileId || r?.drive_destination?.file?.driveFileId || r?.id || r?.name;
      console.log(JSON.stringify({ name: r?.name, startTime: r?.startTime, state: r?.state, driveFileId: id }));
    }
    return;
  }

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
        await driveService.moveFile(
          (recording as any)?.driveDestination?.file?.driveFileId || (recording as any)?.drive_destination?.file?.driveFileId || (recording as any)?.docId!,
          argv.folderId as string
        );
      }
    }

    const transcripts = await driveService.listTranscripts(conferenceRecord.name!);
    if (transcripts) {
      for (const transcript of transcripts) {
        console.log(`Moving transcript: ${transcript.name}`);
        await driveService.moveFile((transcript as any)?.docsDestination?.document?.documentId || (transcript as any)?.docId!, argv.folderId as string);
      }
    }
  }
}

main().catch(console.error);