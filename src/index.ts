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
      description: 'List recordings and exit',
      type: 'boolean',
      default: false,
    })
    .option('list-transcripts', {
      alias: 'T',
      description: 'List transcripts and exit',
      type: 'boolean',
      default: false,
    })
    .option('debug', {
      description: 'Enable verbose debug logging',
      type: 'boolean',
      default: false,
    })
    .check((args) => {
      if (!args['list-recordings'] && !args['list-transcripts'] && !args.folderId) {
        throw new Error('Either provide --folderId to move files or use --list-recordings/--list-transcripts to only list.');
      }
      return true;
    })
    .help()
    .alias('help', 'h').argv;

  const auth = await DriveService.getAuthenticatedClient();
  const driveService = new DriveService(auth);

  const debug = !!argv.debug;

  if (argv['list-recordings']) {
    const recordings = await driveService.listAllRecordingsForMeeting(argv.meetingId as string);
    if (!recordings.length) {
      console.log('No recordings found.');
      return;
    }
    for (const r of recordings) {
      const id = await driveService.getRecordingDriveFileId(r);
      console.log(JSON.stringify({ name: (r as any)?.name, startTime: (r as any)?.startTime, state: (r as any)?.state, driveFileId: id || null }));
    }
    return;
  }

  if (argv['list-transcripts']) {
    const transcripts = await driveService.listAllTranscriptsForMeeting(argv.meetingId as string);
    if (!transcripts.length) {
      console.log('No transcripts found.');
      return;
    }
    for (const t of transcripts) {
      const id = await driveService.getTranscriptDocId(t);
      console.log(JSON.stringify({ name: (t as any)?.name, startTime: (t as any)?.startTime, state: (t as any)?.state, docId: id || null }));
    }
    return;
  }

  // Move flow
  const processSingleParent = async (parent: string) => {
    if (debug) console.error('[debug] processing parent:', parent);
    const recordings = await driveService.listRecordings(parent);
    if (recordings) {
      for (const recording of recordings) {
        console.log(`Moving recording: ${(recording as any)?.name}`);
        const fileId = await driveService.getRecordingDriveFileId(recording);
        if (!fileId) {
          console.error('Skipping recording; unable to resolve Drive file ID:', (recording as any)?.name);
          continue;
        }
        await driveService.moveFile(fileId, argv.folderId as string);
      }
    }

    const transcripts = await driveService.listTranscripts(parent);
    if (transcripts) {
      for (const transcript of transcripts) {
        console.log(`Moving transcript: ${(transcript as any)?.name}`);
        const docId = await driveService.getTranscriptDocId(transcript);
        if (!docId) {
          console.error('Skipping transcript; unable to resolve document ID:', (transcript as any)?.name);
          continue;
        }
        await driveService.moveFile(docId, argv.folderId as string);
      }
    }
  };

  const conferenceRecords = await driveService.listConferenceRecords(argv.meetingId as string);

  if (!conferenceRecords || conferenceRecords.length === 0) {
    console.log('No conference records found for this meeting ID.');
    return;
  }

  for (const conferenceRecord of conferenceRecords) {
    await processSingleParent(conferenceRecord.name!);
  }
}

main().catch(console.error);