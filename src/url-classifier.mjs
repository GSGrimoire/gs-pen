// GS Pen URL recognition v2. Recognizing a URL does not grant media access.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const TOKEN = /^[A-Za-z0-9_-]+$/;
const NUMERIC_ID = /^\d{8,30}$/;
const allowedHosts = Object.freeze({
  "youtube.com": "youtube", "www.youtube.com": "youtube", "m.youtube.com": "youtube", "youtu.be": "youtube",
  "tiktok.com": "tiktok", "www.tiktok.com": "tiktok", "m.tiktok.com": "tiktok", "vm.tiktok.com": "tiktok", "vt.tiktok.com": "tiktok",
  "instagram.com": "instagram", "www.instagram.com": "instagram",
  "facebook.com": "facebook", "www.facebook.com": "facebook", "m.facebook.com": "facebook", "fb.watch": "facebook"
});

export function classifyPublicVideoUrl(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 2048) return { ok: false, error: "Invalid URL" };
  let url;
  try { url = new URL(input.trim()); } catch { return { ok: false, error: "Invalid URL" }; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return { ok: false, error: "Only HTTPS URLs without credentials or custom ports are supported" };
  }
  const host = url.hostname.toLowerCase();
  const platform = Object.hasOwn(allowedHosts, host) ? allowedHosts[host] : null;
  if (!platform) return { ok: false, error: "Unsupported video website" };

  const path = url.pathname;
  const parts = path.split("/").filter(Boolean);
  let valid = false;
  let requiresRedirectResolution = false;
  if (platform === "youtube") {
    if (host === "youtu.be") {
      valid = parts.length === 1 && VIDEO_ID.test(parts[0]);
      requiresRedirectResolution = valid;
    } else if (path === "/watch") {
      const ids = url.searchParams.getAll("v");
      valid = ids.length === 1 && VIDEO_ID.test(ids[0]);
    } else {
      valid = parts.length === 2 && parts[0] === "shorts" && VIDEO_ID.test(parts[1]);
    }
  } else if (platform === "tiktok") {
    if (["vm.tiktok.com", "vt.tiktok.com"].includes(host)) {
      valid = parts.length === 1 && TOKEN.test(parts[0]);
      requiresRedirectResolution = valid;
    } else if (parts.length === 3 && parts[0].startsWith("@") && parts[0].length > 1 && parts[1] === "video") {
      valid = NUMERIC_ID.test(parts[2]);
    } else if (parts.length === 2 && parts[0] === "t") {
      valid = TOKEN.test(parts[1]);
      requiresRedirectResolution = valid;
    }
  } else if (platform === "instagram") {
    valid = parts.length === 2 && parts[0] === "reel" && TOKEN.test(parts[1]);
  } else if (platform === "facebook") {
    if (host === "fb.watch") {
      valid = parts.length === 1 && TOKEN.test(parts[0]);
      requiresRedirectResolution = valid;
    } else if (parts.length === 2 && parts[0] === "reel") {
      valid = NUMERIC_ID.test(parts[1]);
    } else if (path === "/watch" || path === "/watch/") {
      const ids = url.searchParams.getAll("v");
      valid = ids.length === 1 && NUMERIC_ID.test(ids[0]);
    } else if (parts.length >= 3 && parts.length <= 4 && parts[1] === "videos") {
      valid = NUMERIC_ID.test(parts.at(-1));
    } else if (parts.length === 3 && parts[0] === "share" && ["v", "r"].includes(parts[1])) {
      valid = TOKEN.test(parts[2]);
      requiresRedirectResolution = valid;
    }
  }
  if (!valid) return { ok: false, error: "URL is not a supported public video format" };
  return { ok: true, platform, url: url.href, requiresRedirectResolution, mediaAccessVerified: false };
}
