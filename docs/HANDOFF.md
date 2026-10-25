# GS Pen current handoff
Updated 25 October 2026 after Claude's independent review.

The existing owner-private Sites service is deployed at https://gs-pen-test-lab.goofyspook.chatgpt.site. Project identity, exact source/version receipts and verification limits are in docs/DEPLOYMENT.md. Preserve sharing and the existing repository.

Pull request #7 contains the loopback research lab plus the authenticated Sites worker, owner-restricted diagnostic database and retention endpoint. Claude reviewed the stack independently; corrective changes are being verified before the authorized sequential merges. Do not treat historical tests as verification of a changed head.

Use `npm run start:local` for the loopback research server on port 4173. `npm start` instead runs the built Sites worker locally through Wrangler. Use the frozen pnpm installer, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e`. Browser fixtures are synthetic and do not establish hosted authentication or live platform access.

Owner access requires both configured email and identifier from trusted dispatch identity. Diagnostics have no owner column and rely on exactly one allowed identity. Retention service access only deletes expired rows using server time. Do not widen access without revisiting these invariants.

Native TikTok caption retrieval uses bounded ordinary public requests without social cookies, redirects or media downloads. Other native-caption providers and independent Whisper remain unavailable at this baseline. Keep each output's provenance explicit.

Automatic diagnostic records exclude full links, video identifiers, creator details, extracted text, credentials and raw exceptions. The database cap is 10,000 rows, with 30-day logical expiry and physical cleanup on access and hourly housekeeping. Platform infrastructure logs are separate and have platform-controlled retention. Verify cleanup scheduling separately from code tests.

The Codespaces development-key flow is optional and has not been provisioned or tested as an actual forwarded Codespace. Never expose the research server publicly. Do not modify other GS projects.
