// GS Pen URL recognition v1. This does not retrieve or authorize audiovisual material.
export function classifyPublicVideoUrl(input) {
  if (typeof input !== "string" || input.length > 2048) return { ok: false, error: "Invalid URL" };
  let url;
  try { url = new URL(input); } catch { return { ok: false, error: "Invalid URL" }; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return { ok: false, error: "Only HTTPS URLs without credentials or ports are supported" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  let platform = null;
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) platform = "youtube";
  if (["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) platform = "tiktok";
  if (["instagram.com", "www.instagram.com"].includes(host)) platform = "instagram";
  if (["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"].includes(host)) platform = "facebook";
  if (!platform) return { ok: false, error: "Unsupported video website" };
  return { ok: true, platform, url: url.href, mediaAccessVerified: false };
}
