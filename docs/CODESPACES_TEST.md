# Run GS Pen Test Lab in a private GitHub Codespace

Date: 24 October 2026. A **temporary development preview**, not a permanent website or a ChatGPT Site.

## Prerequisites

Access to private `GSGrimoire/gs-pen` repository, permission to create GitHub Codespaces, and available Codespaces usage. GitHub personal accounts have limited monthly included compute and storage; confirm current budget before creating.

## Steps

1. Open [GS Pen pull request #7](https://github.com/GSGrimoire/gs-pen/pull/7) and check out the `chatgpt/pen-007-diagnostics-plan` branch in a Codespace. In GitHub: **Code > Codespaces > Create codespace** on the selected branch.
2. `.devcontainer/devcontainer.json` chooses Node.js 22, runs `npm run check` and requests forwarding of port 4173 with **private** visibility.
3. In Codespaces terminal run `npm start`.
4. The terminal prints a randomly generated, temporary **development access key**. Do not paste it in GitHub issues or public chats. The key is reset whenever the server starts.
5. Open the forwarded 4173 port in the **PORTS** tab (Private visibility). Authenticate to GitHub when prompted.
6. Paste the development access key into the Test Lab's private backend unlock field. Then try a rights-cleared public TikTok URL.
7. Inspect stage trace and diagnostic table. Events are stored locally inside that Codespace in `.local/diagnostics.json`. You can export sanitized JSON from the dashboard. This storage is not automatically synchronized to ChatGPT Sites or the GS Pen repository.

## Safety

**Keep port 4173 Private. Do not change port visibility to Public.** GitHub Codespaces private port forwarding requires GitHub sign-in; the extra development key protects the API even if port visibility is accidentally widened. The backend is additionally bound to the loopback interface and validates the exact Codespaces forwarding domain, but this combination has not been validated in a real Codespace yet.

Do not use personal, sensitive or unlicensed media in research tests. The page only exposes actual caption text while it is displayed. The automatic diagnostics store only sanitized platform, link-format and request-stage metadata. The access key is in browser session storage only (never sent to logs), and the GitHub credential is handled by Codespaces, not GS Pen.

Close the Codespace when finished. It is a temporary machine that can incur usage charges after included quotas. Stopping or deleting it can erase its local diagnostic file if not exported. For a persistent owner-private service, complete the authenticated ChatGPT Sites backend and database work.

## References

- GitHub port visibility: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- Codespaces security and authentication: https://docs.github.com/en/codespaces/reference/security-in-github-codespaces
- GitHub included usage: https://docs.github.com/en/billing/reference/product-usage-included

## Verification status

The Codespaces configuration and development-key checks are automated, but the end-to-end forwarded port, GitHub authentication interaction, and GUI in an actual Codespace are **not yet verified**. Do not label this a deployed private Site.

