import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeDiagnostic } from "../src/diagnostics.mjs";
const when = new Date("2026-10-23T20:00:00.000Z");
const basic = {traceId:"trace_test_001", platform:"tiktok", stage:"caption_fetch", status:"failed", code:"PROVIDER_BLOCKED", source:"site", build:"v0_1"};

test("allows safe structured stage status", () => {
  const out = sanitizeDiagnostic({...basic, httpStatus:403, durationMs:192, captionCueCount:0, retryable:true}, when);
  assert.equal(out.timestamp, "2026-10-23T20:00:00.000Z");
  assert.equal(out.traceId, basic.traceId);
  assert.equal(out.httpStatus, 403);
  assert.equal(out.durationMs, 192);
  assert.equal(out.captionCueCount, 0);
  assert.equal(out.retryable, true);
  assert.equal(out.schema, "gs-pen.diagnostic.v1");
});

test("refuses untrusted detail fields and identity metadata", () => {
  const out = sanitizeDiagnostic({...basic, url:"https://tiktok.com/@private/video/secret", captionText:"secret speech", signedTrackUrl:"https://cdn.test/token=secret", token:"secret", userAgent:"browser-identification", userId:"private-user", cookie:"session=123", stack:"secret stack", message:"creator name"}, when);
  const json = JSON.stringify(out);
  for (const forbidden of ["private", "secret", "session=123", "creator name", "browser-identification"]) assert.equal(json.includes(forbidden), false);
  assert.deepEqual(Object.keys(out).sort(), ["schema","timestamp","traceId","platform","stage","status","code","source","build"].sort());
});

test("unrecognized enum values cannot be injected into logs", () => {
  const out = sanitizeDiagnostic({...basic, platform:"https://example.com", code:"Something about the private video", stage:"/private", status:"TOKEN", source:"hacker", build:"bad version + query"}, when);
  assert.equal(out.platform, "unknown");
  assert.equal(out.code, "INTERNAL_ERROR");
  assert.equal(out.stage, "finished");
  assert.equal(out.status, "failed");
  assert.equal(out.source, "browser");
  assert.equal(out.build, "unknown");
});

test("unsafe trace identifiers fail before logging", () => {
  for (const traceId of ["", "user@example.com", "https://example.com", "contains spaces", "x".repeat(65)]) {
    assert.throws(() => sanitizeDiagnostic({...basic, traceId}, when), TypeError);
  }
  assert.throws(() => sanitizeDiagnostic("raw text", when), TypeError);
});

test("invalid numeric fields are omitted rather than serialized", () => {
  const out = sanitizeDiagnostic({...basic, durationMs: -1, captionCueCount: Infinity, httpStatus: 999, retryable:"true"}, when);
  for (const key of ["durationMs","captionCueCount","httpStatus","retryable"]) assert.equal(key in out, false);
});
