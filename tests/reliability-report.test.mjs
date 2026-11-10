import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseObservation, summarizeReliability, validateObservation } from '../src/reliability-report.mjs';

const example=(overrides={})=>({
  platform:'tiktok',linkType:'canonical_video',
  outcome:'native_caption_success',latencyMs:1000,captionCueCount:3,
  runDate:'2026-11-10',build:'workspace_v04_sites_1',...overrides
});

test('validates only fixed sanitized fields and rejects raw URLs, content or notes',()=>{
  assert.equal(parseObservation(JSON.stringify(example())).outcome,'native_caption_success');
  for(const field of ['url','creator','caption','transcript','notes','sampleId','source']) {
    assert.throws(()=>validateObservation({...example(),[field]:'private marker'}),
      e=>e.code==='UNEXPECTED_FIELD' && !e.message.includes('private marker'));
  }
  assert.throws(()=>parseObservation('private clip words'),e=>e.code==='INVALID_JSON');
  assert.throws(()=>validateObservation({}),e=>e.code==='INVALID_PLATFORM');
});

test('rejects invalid dates, unapproved categories, bad builds and contradictory evidence',()=>{
  const examples=[
    [example({runDate:'2026-02-30'}),'INVALID_DATE'],
    [example({runDate:'2026-11-10T12:00:00Z'}),'INVALID_DATE'],
    [example({platform:'youtube'}),'INVALID_PLATFORM'],
    [example({linkType:'untrusted_link'}),'INVALID_LINK_TYPE'],
    [example({outcome:'invented_transcript'}),'INVALID_OUTCOME'],
    [example({latencyMs:-1}),'INVALID_LATENCY'],
    [example({latencyMs:1.5}),'INVALID_LATENCY'],
    [example({captionCueCount:0}),'INCONSISTENT_CAPTIONS'],
    [example({captionCueCount:2001}),'INVALID_CAPTION_COUNT'],
    [example({outcome:'post_only_partial',captionCueCount:1}),'INCONSISTENT_CAPTIONS'],
    [example({build:'private.video/identifier'}),'INVALID_BUILD'],
  ];
  for(const [item,expected] of examples)
    assert.throws(()=>validateObservation(item),e=>e.code===expected,expected);
});

test('counts native captions separately from partial post data with correct denominator',()=>{
  const rows=[
    ...Array.from({length:3},(_,i)=>example({latencyMs:1000+i*100})),
    example({outcome:'post_only_partial',captionCueCount:0,latencyMs:1600}),
    example({outcome:'metadata_only_partial',captionCueCount:0,latencyMs:3000}),
    example({outcome:'invalid_unsupported',captionCueCount:0,latencyMs:4000}),
    ...Array.from({length:4},(_,i)=>example({
      platform:'facebook',linkType:'post_share',outcome:'provider_blocked',
      captionCueCount:0,latencyMs:2000+i*200
    }))
  ];
  const result=summarizeReliability(rows);
  assert.equal(result.overall.attempts,10);
  assert.equal(result.overall.eligibleAttempts,9);
  assert.equal(result.overall.counts.native_caption_success,3);
  assert.equal(result.overall.counts.post_only_partial,1);
  assert.equal(result.overall.counts.metadata_only_partial,1);
  assert.equal(result.overall.nativeCaptionCoverage,3/9);
  assert.equal(result.overall.contentRichUtility,4/10);
  assert.equal(result.overall.metadataOnlyUtility,1/10);
  assert.equal(result.overall.medianLatencyMs,2000);
  assert.equal(result.overall.p95LatencyMs,4000);
  assert.equal(result.byPlatform.values.tiktok.attempts,6);
  assert.equal(result.byPlatform.values.facebook,undefined);
  assert.equal(result.byPlatform.suppressedGroups,1);
  assert.equal(result.byLinkType.suppressedGroups,1);
  assert.ok(!JSON.stringify(result).includes('https://'));
});

test('suppresses small cohorts and handles zero eligible attempts without dividing by zero',()=>{
  const two=[example({outcome:'invalid_unsupported',captionCueCount:0}),
    example({outcome:'invalid_unsupported',captionCueCount:0})];
  const suppressed=summarizeReliability(two);
  assert.equal(suppressed.overall,null);
  assert.deepEqual(suppressed.byPlatform.values,{});
  const five=summarizeReliability([...two,...two,two[0]]);
  assert.equal(five.overall.nativeCaptionCoverage,null);
  assert.equal(five.overall.contentRichUtility,0);
});

test('CLI produces aggregate-only JSON and refuses raw fields without echoing their values',()=>{
  const line=JSON.stringify(example());
  const passed=spawnSync(process.execPath,['scripts/reliability-report.mjs'],{
    input:Array.from({length:5},()=>line).join('\n')+'\n',encoding:'utf8'
  });
  assert.equal(passed.status,0,passed.stderr);
  const report=JSON.parse(passed.stdout);
  assert.equal(report.overall.attempts,5);
  assert.equal(report.overall.counts.native_caption_success,5);
  assert.ok(!passed.stdout.includes('workspace_v04_sites_1'));

  const rejected=spawnSync(process.execPath,['scripts/reliability-report.mjs'],{
    input:JSON.stringify({...example(),url:'https://private.example/secret'})+'\n',encoding:'utf8'
  });
  assert.equal(rejected.status,1);
  assert.match(rejected.stderr,/UNEXPECTED_FIELD at observation 1/);
  assert.equal(rejected.stdout,'');
  assert.ok(!rejected.stderr.includes('private.example'));
});
