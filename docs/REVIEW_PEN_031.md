# PEN-031: Creative generation and billing disclosure self-review

3 November 2026. Issue #40. Routine copy/visual disclosure change, not a new language-model service or paid integration.

## Source-verified behavior
GS Pen's existing `src/content-workflow.mjs` provides deterministic `createBrief`, `creativePrompt`, `draftContent` and `posterDraft` functions, with no model or provider client. The `server/content-service.mjs` owner-private `create_content_job` tool returns a prepared brief or already saved draft. `get_content_brief` returns a prompt and a declared `serverModelCalls:0`. GS Pen itself does not generate creative suggestions or text using a language model. Sending a prompt to an external assistant is a separately initiated user action and is subject to that assistant account's plan, usage limits or fees.

## UI changes
- Rename the Extract action from “Make something from this” to “Prepare creative brief” to avoid implying that it runs an automatic generator.
- Update Create title and explanation to say that it prepares/saves the brief in code and does not itself write a creative draft.
- Place a clearly visible, accessible cost/responsibility note beside the form, with no invented prices or blanket claims about hosting/subscription costs: “GS Pen makes no language-model calls and charges no model-generation fees. You choose an assistant ... That work uses your chosen assistant account and its applicable plan, limits or charges. Nothing is sent ... automatically.”
- Rename the second step to make the chosen assistant explicit.
- Retain current deterministic methods, owner-private content jobs, source provenance, saved drafts and unsent GS Poster export. No model, payment or automatic third-party data transfer is added.

## Checks and review
Synthetic browser assertions check that the Create note is visible, the idea form still prepares a brief and no provider language-model requests are generated. Required unit, hosted build/lint/types and desktop/mobile browser checks must all pass on final reviewed head before any merge. Diff is limited to `web/index.html`, `web/styles.css`, browser tests and this note.

This is documented creator self-review, not an independent security or billing-provider audit. It changes no authentication, secrets, private-data storage, provider adapters, migrations or publishing. Actual Site deployment is separately controlled under issue #27. PEN-029 (#37) still requires independent privacy/security review.
