# PEN-018 creator self-review

28 October 2026. Issue #18, branch chatgpt/pen-retained-pages. This is documented creator self-review under the owner's cross-project policy, not independent verification. The work resumed after a workspace reset; code was reconstructed from published version 11 and preserved in GitHub before further testing.

## Acceptance and risk review

- Every page and total query keeps the existing authenticated owner predicate. A strict, bounded cursor contains only timestamp/UUID ordering hints and grants no access. All values are bound parameters, never SQL fragments. The fixed page size is 50 plus one lookahead summary.
- Timestamp/ID ordering handles ties and deleted cursor rows. Pages are live, not a historical snapshot: edits in another session may move content jobs to the top; Refresh starts again. Appended IDs are deduplicated. Counts may change between requests.
- History list queries project bounded title/creator and count/availability fields in SQLite. Full source bodies enter the application only when reopening. There is no migration or automatic deletion change.
- Recent and Create expose Load older, loaded/stored counts, retry after failure and refresh. Recent's filters explicitly apply to loaded items; full-archive search is not claimed. Older work can be reopened and explicitly deleted using existing controls/routes.
- List sequence numbers discard stale replies after refresh/mutation. A failed page keeps loaded rows and its cursor for retry.
- The existing read-only assistant list accepts optional cursor and returns summaries/count/nextCursor. No write privilege, destructive tool, model service, paid call, external submission or Poster change is added.

## Bounded self-correction

Pre-publication diff review found that invalidating a pending content list during a failed job deletion could leave list controls visually disabled. The deletion finally block now redraws those controls. This is one bounded correction for this issue. The browser race test waits for the delayed network response and rendering before asserting that the newer list remains. Title/creator bounds are applied in the SQL projection.

## Checks and limits

The implementation passed 103 unit tests, production build, lint and types before the original pause. Those checks are rerun on the reconstructed code. Required GitHub browser checks precede merge. Fixtures seed 103 owner rows with tied timestamps and a separate owner; traverse every page, delete the cursor row, reject malformed/unsafe cursors, verify bounded responses and reopen full originals. Browser fixtures cover older-page retry, loaded-item filtering, older reopen/delete, response races and desktop/mobile overflow.

GitHub installs its pinned Chromium. No browser installation is attempted in the local container. Hosted multi-page browsing with more than 50 real records remains unverified unless separately recorded; production will not be bulk-seeded to manufacture that evidence. Actual publication and access checks belong in docs/DEPLOYMENT.md.

On 26 October the installed Pen connector completed a real signed-in list_content_jobs call, returning jobs: []. That verifies this owner read path, not another account, external Claude authentication, creative writes or Poster delivery. No real source/draft data is committed here.
