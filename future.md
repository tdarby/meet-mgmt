# Future improvements and new features

## Core functionality and UX
- Dry run: `--dry-run` to print intended actions (IDs, names, parents) without mutating Drive
- Concurrency control: `--concurrency <n>` and process items in parallel with p-limit while honoring backoff
- Output formats: `--output json|ndjson|table`, plus `--quiet` and `--log-level`
- Idempotency and safety:
  - Skip copy if a file with same ID already exists in target (or support `--overwrite`)
  - For move, also support `--preserve-parents` to avoid removing existing non-target parents
- Better filters:
  - Convenience `--since N[dmw]` and `--last N`
  - `--type recordings|transcripts` to limit operations
- Organization options:
  - Optional renaming on copy (e.g., `<meetingCode>_<yyyy-mm-dd>_<HHMM>.<ext>`)
  - Optional `--subfolder` by date or by meeting code (auto-create subfolders under target)

## Meet/Drive correctness and scope
- Prefer least-privilege scopes where possible (e.g., Drive meet-only scopes) instead of full Drive
- Retry refinements: honor `Retry-After`; include rate limit errors (409/412) in retry policy

## Artifact coverage and integrations
- Transcript entries: add `--list-transcript-entries` and export entries as CSV/NDJSON with participant mapping
- Download/export options:
  - `--download` to local disk (recordings via `exportUri`, transcripts as Docs exported to text)
  - `--shortcut` to create Drive shortcuts in target instead of moving/copying
- Automation: “watch” mode via Workspace Events API to auto-move/copy artifacts when generated

## CLI ergonomics
- Interactive fallback: if `--folderId` missing, list recent folders and prompt selection (skippable with `--yes`)
- Multiple meetings: accept multiple `--meetingId` values or read from a file; process with optional concurrency

## Resilience and reporting
- Per-item isolation: wrap each move/copy in try/catch, continue on errors, and print a final summary (moved/copied/skipped/errors)
- Streaming: iterate pages (async iterators) instead of aggregating arrays to reduce memory usage

## Code quality
- Structure: split responsibilities into `MeetService` (conference records, recordings, transcripts) and `DriveService`
- Testing: add unit tests (vitest + nock) for ID resolvers, filter parsing, move/copy, skip-if-already-in-target
- Tooling: add ESLint + Prettier; CI workflow (lint/build/test) on PRs
- Deps: update TypeScript to ^5, yargs to latest, add Node engines field; consider ESM

## Documentation
- Expand README with:
  - Task-based examples (last week only, copy vs move, rename patterns)
  - Permissions and minimal scopes; app verification implications
  - Limits (API quotas, large meetings, domain restrictions)

## Notes / constraints
- Meet chat: not exposed via Meet REST API. Only accessible if the meeting is tied to a Google Chat space (use the Chat API)
