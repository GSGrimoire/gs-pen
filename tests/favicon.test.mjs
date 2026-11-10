import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('GS Pen favicon is a self-contained, small-viewBox pen-finishing-S icon',()=>{
  const svg=readFileSync('public/favicon.svg','utf8');
  assert.match(svg,/<svg\b[^>]*viewBox="0 0 64 64"/);
  assert.match(svg,/aria-label="GS Pen, handwritten GS finished by a fountain pen"/);
  assert.match(svg,/<rect\s[^>]*rx="14"/);
  assert.match(svg,/stroke-linecap="round"/);
  assert.match(svg,/id="ink"/);
  assert.match(svg,/<path[^>]*fill="#ffdfa0"/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b/i);
  assert.doesNotMatch(svg,/\b(?:href|xlink:href)=/i);
  assert.ok(Buffer.byteLength(svg)<4096,'favicon is lightweight for browser tabs');
});

test('production metadata and local preview use the same favicon path',()=>{
  const layout=readFileSync('app/layout.tsx','utf8');
  const html=readFileSync('web/index.html','utf8');
  const local=readFileSync('server/local-server.mjs','utf8');
  const build=readFileSync('scripts/build-site.mjs','utf8');
  assert.match(layout,/icon:\s*"\/favicon\.svg"/);
  assert.match(html,/<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg">/);
  assert.match(local,/\["\/favicon\.svg","local-dist\/favicon\.svg"\]/);
  assert.match(local,/image\/svg\+xml/);
  assert.match(build,/"public","favicon\.svg"/);
});
