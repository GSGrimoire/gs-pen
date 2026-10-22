import test from "node:test";
import assert from "node:assert/strict";
import { classifyPublicVideoUrl } from "../src/url-classifier.mjs";

for (const [url, expected] of [
  ["https://www.youtube.com/watch?v=abc", "youtube"],
  ["https://youtu.be/abc", "youtube"],
  ["https://www.tiktok.com/@creator/video/123", "tiktok"],
  ["https://www.instagram.com/reel/abc/", "instagram"],
  ["https://www.facebook.com/reel/123", "facebook"],
  ["https://fb.watch/xyz", "facebook"]
]) test("recognizes " + expected + " URL", () => {
  assert.equal(classifyPublicVideoUrl(url).platform, expected);
  assert.equal(classifyPublicVideoUrl(url).mediaAccessVerified, false);
});
for (const url of [
  "http://youtube.com/watch?v=a",
  "https://youtube.com.evil.test/watch?v=a",
  "https://evil.test/?next=youtube.com",
  "https://user:pass@youtube.com/watch?v=a",
  "https://youtube.com:444/watch?v=a",
  "https://127.0.0.1/video",
  "not a url"
]) test("rejects unsafe or unsupported " + url, () => {
  assert.equal(classifyPublicVideoUrl(url).ok, false);
});
