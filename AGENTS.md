# gs-pen: agent entry point

## Shared engineering policy

Read the current [GS Tools Hub AGENTS.md](https://github.com/GSGrimoire/gs-tools-hub/blob/main/AGENTS.md) before implementation, review, integration or release. Follow its linked specialist guidance and retain local technical constraints, actual required checks and stricter gates. If the private Hub is inaccessible or the new policy has not landed, retain existing local safeguards and defer actions dependent on unverified authority. Owner-approved consolidation: [Hub #4](https://github.com/GSGrimoire/gs-tools-hub/issues/4); central documentation: [Hub #69](https://github.com/GSGrimoire/gs-tools-hub/pull/69). No change to workflow triggers, protection, access or release authority.

## Local engineering rules

Read docs/HANDOFF.md, BACKLOG.md and the relevant source before making changes. Treat source and passing tests as authoritative, not prior chat claims. One issue, branch and reviewed pull request per feature. Do not merge unreviewed code or publish unverified functionality. Never commit audio, transcripts, personal data, auth tokens or external-account cookies. Preserve the GS Scribe and GS VoiceStudio projects; no cross-project changes without explicit scope. For every change, run tests and record what was not verified. Keep interface errors truthful and distinguish URL recognition from authorized content retrieval.
