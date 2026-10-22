# GS Pen

Private social-video transcription research project for GS Suite.

**Status:** Feasibility validation only. No platform has been verified, no transcription is implemented, and no website is deployed.

**Target:** Public Facebook videos and Reels, TikTok videos, Instagram Reels, YouTube videos and Shorts; Danish and English; generated speech transcript independent from platform captions; post text and metadata in separate tabs; owner-private access; a maximum of 50 saved results; exports suitable for later GS Scribe benchmarking.

A public video's visibility does not confer permission to download or process it. GS Pen must use documented, authorized retrieval paths. No credentials, cookie collection, proxy evasion, or third-party paid transcription services.

## Current milestone

Validate hosting, allowed video retrieval, local recognition performance, and owner-private storage before promising a finished tool. The prototype interface, if present, is not a functioning transcriber. The full requirements and future-feature ideas are tracked in `docs/SPEC.md`, `docs/FEASIBILITY.md`, and `BACKLOG.md`.

## Hosting

Source code is stored in this private GitHub repository. GitHub Pages is not the owner-login solution. ChatGPT Sites is the preferred prospective owner-private host, but provisioning and deployment must be performed using the Sites workflow and recorded in `docs/DEPLOYMENT.md`. A GitHub commit by itself does not publish the website.

## Security

Never commit audio, transcriptions, personal data, tokens, social account cookies, model weights, or private evaluation fixtures. Do not turn on public hosting or social-media access until security and policy gates pass.
