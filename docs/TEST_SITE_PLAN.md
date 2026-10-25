# GS Pen Test Lab verification plan

The owner-private Site is deployed at https://gs-pen-test-lab.goofyspook.chatgpt.site. See `docs/DEPLOYMENT.md` for exact source/version receipts and historical evidence.

## Two runtimes

- Hosted: Sites worker, trusted owner identity and database, built by `npm run build`.
- Local research: `npm run check` then `npm run start:local`, at http://127.0.0.1:4173. This loopback server and optional Codespaces development key are not production authentication.

The frontend has distinct native-caption, independent Whisper, original post and metadata outputs. Unavailable capabilities are labeled explicitly. No platform captions may be presented as independently transcribed speech.

## Required checks

Run the locked install, unit checks, Sites production build, lint, type checking and desktop/mobile browser checks. The browser configuration starts the local research server and uses synthetic provider responses. It verifies interaction, truthful errors, data exclusion, exports and responsive layout. It does not establish hosted identity, database behavior, outbound access or native assistant-app delivery.

Separately verify the private deployment's owner audience and backend identity checks, anonymous and forged-identity rejection, owner database access, disposable-record deletion and expiry, visible nonblocking logging failures and actual permitted provider requests. Do not delete real records. If a second account is unavailable, distinguish synthetic row isolation from real cross-account testing.

Verify automatic deletion stays paused on reads, writes, and the legacy housekeeping route. Existing rows with old expiry timestamps and more than 50 saved results must survive. Keep explicit owner deletion functional. The latest-50 history and latest-10,000 diagnostic response windows are display bounds, not storage pruning. Infrastructure request logs remain under platform retention, separate from sanitized application diagnostics.

Record every release's source, version, build, checks and verification limits in `docs/DEPLOYMENT.md`. Do not claim broad provider coverage from two successful samples.
