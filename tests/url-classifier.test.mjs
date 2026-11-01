import test from "node:test";
import assert from "node:assert/strict";
import { classifyPublicVideoUrl } from "../src/url-classifier.mjs";

const accepted = [
  ["https://www.youtube.com/watch?v=J---aiyznGQ", "youtube"],
  ["https://youtu.be/J---aiyznGQ", "youtube"],
  ["https://m.youtube.com/shorts/J---aiyznGQ", "youtube"],
  ["https://www.tiktok.com/@creator/video/6718335390845095173", "tiktok"],
  ["https://vm.tiktok.com/ZXY12abC/", "tiktok"],
  ["https://www.instagram.com/reel/C9abcdEFG12/", "instagram"],
  ["https://www.facebook.com/reel/123456789012345", "facebook"],
  ["https://www.facebook.com/watch/?v=123456789012345", "facebook"],
  ["https://fb.watch/xyz_123/", "facebook"],
  ["https://www.facebook.com/share/r/AbC123xy/", "facebook"],
  ["https://www.facebook.com/share/p/AbC123xy/", "facebook"],
  ["https://www.facebook.com/share/Post123xy/", "facebook"],
  ["https://www.facebook.com/Fixture.Page/posts/pfbid123456789", "facebook"],
  ["https://www.facebook.com/story.php?story_fbid=1234567890&id=9876543210", "facebook"],
  ["https://www.facebook.com/photo.php?fbid=123456789012", "facebook"]
];
for (const [url, expected] of accepted) test("recognizes format " + url, () => {
  const result = classifyPublicVideoUrl(url);
  assert.equal(result.ok, true);
  assert.equal(result.platform, expected);
  assert.equal(result.mediaAccessVerified, false);
});
for (const url of [
  "http://youtube.com/watch?v=J---aiyznGQ", "https://youtube.com.evil.test/watch?v=J---aiyznGQ",
  "https://evil.test/?next=youtube.com", "https://user:pass@youtube.com/watch?v=J---aiyznGQ",
  "https://youtube.com:444/watch?v=J---aiyznGQ", "https://127.0.0.1/video", "not a url",
  "https://youtube.com/", "https://www.youtube.com/channel/UCXXX",
  "https://www.youtube.com/watch?v=short", "https://www.youtube.com/watch?v=J---aiyznGQ&v=J---aiyznGQ",
  "https://www.instagram.com/p/C9abcdEFG12/", "https://www.instagram.com/reel/",
  "https://www.tiktok.com/@creator", "https://www.facebook.com/profile.php?id=1",
  "https://www.facebook.com/watch/?v=abc", "https://www.facebook.com/reel/123456789012345/another",
  "https://www.facebook.com/share/p/", "https://www.facebook.com/share/unsupported/Token/",
  "https://www.facebook.com/story.php?story_fbid=1234567890",
  "https://www.facebook.com/story.php?story_fbid=1234567890&id=9876543210&id=9876543211",
  "https://www.facebook.com/photo.php?fbid=abc",
  "https://facebook.com.evil.test/share/p/token",
  "https://www.youtube.com@evil.test/watch?v=J---aiyznGQ"
]) test("rejects " + url, () => assert.equal(classifyPublicVideoUrl(url).ok, false));
test("redirect short links are flagged but not fetched", () => {
  assert.equal(classifyPublicVideoUrl("https://fb.watch/abc123/").requiresRedirectResolution, true);
  assert.equal(classifyPublicVideoUrl("https://www.youtube.com/watch?v=J---aiyznGQ").requiresRedirectResolution, false);
});
