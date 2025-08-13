import { DriveService, DateRange } from './drive';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function parseYyyymmdd(dateStr: string): Date | undefined {
  if (!/^\d{8}$/.test(dateStr)) return undefined;
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  const d = new Date(Date.UTC(year, month - 1, day));
  return isNaN(d.getTime()) ? undefined : d;
}

function makeDateRange(from?: string, to?: string): DateRange {
  if (!from && !to) return undefined;
  let startIso: string | undefined;
  let endIso: string | undefined;
  if (from) {
    const d = parseYyyymmdd(from);
    if (!d) throw new Error('Invalid --from date. Expected yyyymmdd.');
    startIso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)).toISOString();
  }
  if (to) {
    const d = parseYyyymmdd(to);
    if (!d) throw new Error('Invalid --to date. Expected yyyymmdd.');
    // Set to end of day 23:59:59
    endIso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59)).toISOString();
  }
  return { startIso: startIso || '', endIso: endIso || '' } as DateRange;
}

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
    .option('copy', {
      alias: 'C',
      description: 'Copy files to the destination folder instead of moving',
      type: 'boolean',
      default: false,
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
    .option('from', {
      description: 'Filter by start date (UTC), format yyyymmdd',
      type: 'string',
      demandOption: false,
    })
    .option('to', {
      description: 'Filter by end date (UTC), format yyyymmdd',
      type: 'string',
      demandOption: false,
    })
    .option('debug', {
      description: 'Enable verbose debug logging',
      type: 'boolean',
      default: false,
    })
    .check((args) => {
      if (!args['list-recordings'] && !args['list-transcripts'] && !args.folderId) {
        throw new Error('Either provide --folderId to move/copy files or use --list-recordings/--list-transcripts to only list.');
      }
      if (args.from && !/^\d{8}$/.test(args.from)) {
        throw new Error('Invalid --from date. Expected yyyymmdd.');
      }
      if (args.to && !/^\d{8}$/.test(args.to)) {
        throw new Error('Invalid --to date. Expected yyyymmdd.');
      }
      return true;
    })
    .help()
    .alias('help', 'h').argv;

  const auth = await DriveService.getAuthenticatedClient();
  const driveService = new DriveService(auth);

  const debug = !!argv.debug;
  const dateRange = makeDateRange(argv.from as string | undefined, argv.to as string | undefined);

  if (argv['list-recordings']) {
    const recordings = await driveService.listAllRecordingsForMeeting(argv.meetingId as string, dateRange);
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
    const transcripts = await driveService.listAllTranscriptsForMeeting(argv.meetingId as string, dateRange);
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

  // Move/Copy flow
  const processSingleParent = async (parent: string) => {
    if (debug) console.error('[debug] processing parent:', parent);
    const recordings = await driveService.listRecordings(parent);
    if (recordings) {
      for (const recording of recordings) {
        console.log(`${argv.copy ? 'Copying' : 'Moving'} recording: ${(recording as any)?.name}`);
        const fileId = await driveService.getRecordingDriveFileId(recording);
        if (!fileId) {
          console.error('Skipping recording; unable to resolve Drive file ID:', (recording as any)?.name);
          continue;
        }
        if (argv.copy) {
          await driveService.copyFile(fileId, argv.folderId as string);
        } else {
          await driveService.moveFile(fileId, argv.folderId as string);
        }
      }
    }

    const transcripts = await driveService.listTranscripts(parent);
    if (transcripts) {
      for (const transcript of transcripts) {
        console.log(`${argv.copy ? 'Copying' : 'Moving'} transcript: ${(transcript as any)?.name}`);
        const docId = await driveService.getTranscriptDocId(transcript);
        if (!docId) {
          console.error('Skipping transcript; unable to resolve document ID:', (transcript as any)?.name);
          continue;
        }
        if (argv.copy) {
          await driveService.copyFile(docId, argv.folderId as string);
        } else {
          await driveService.moveFile(docId, argv.folderId as string);
        }
      }
    }
  };

  const conferenceRecords = await driveService.listConferenceRecords(argv.meetingId as string, dateRange);

  if (!conferenceRecords || conferenceRecords.length === 0) {
    console.log('No conference records found for this meeting ID.');
    return;
  }

  for (const conferenceRecord of conferenceRecords) {
    await processSingleParent(conferenceRecord.name!);
  }
}

main().catch(console.error);