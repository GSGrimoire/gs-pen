import { test, expect } from '@playwright/test';

const example = 'https://www.tiktok.com/@scrubdaddy/video/7538539956029902111';
const mockEvents = (traceId, status, code) => [{
  traceId, schema: 'gs-pen.diagnostic.v2', timestamp: new Date().toISOString(),
  platform: 'tiktok', sourceDomain: 'www.tiktok.com', linkType: 'creator_video',
  stage: 'caption_parse', status, code, build: 'testlab_v1',
  source: 'local_backend', captionCueCount: status === 'succeeded' ? 2 : 0,
  durationMs: 24, cdnFamily: 'tiktokcdn_us', httpStatus: 200
}];

async function openConnected(page) {
  await page.goto('/');
  await expect(page.locator('#backend-badge')).toContainText('Local probe connected');
}

async function stubCaptionResult(page, resultFor) {
  await page.route('**/api/captions', async route => {
    const request = route.request().postDataJSON();
    const payload = resultFor(request.traceId);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

test('home page exposes private research status, actual backend and four separate tabs', async ({ page }) => {
  await openConnected(page);
  await expect(page.getByRole('heading', { name: 'Native captions laboratory' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await page.getByRole('tab', {name: 'Whisper transcript'}).click();
  await expect(page.locator('#tab-panel')).toContainText('Whisper is not active');
  await page.getByRole('tab', {name: 'Post text'}).click();
  await expect(page.locator('#tab-panel')).toContainText('not implemented');
  await page.getByRole('tab', {name: 'Metadata'}).click();
  await expect(page.locator('#tab-panel')).toContainText('not implemented');
  await page.getByRole('tab', {name: 'Original captions'}).click();
  await expect(page.locator('#tab-panel')).toContainText('No caption request yet');
});

test('known caption result shows original timed cues and sanitized stage timeline', async ({ page }) => {
  await stubCaptionResult(page, traceId => ({
    ok: true, status: 'succeeded', code: 'OK', captionTrackCount: 1,
    cues: [{start:'00:00:01.000',end:'00:00:02.000',text:'First synthetic line'},
      {start:'00:00:03.000',end:'00:00:04.000',text:'Second synthetic line'}],
    events: mockEvents(traceId, 'succeeded', 'OK'), diagnosticsStored: true, diagnosticsStorage:'local_file'
  }));
  await openConnected(page);
  await page.locator('#video-url').fill(example);
  await page.locator('#probe-button').click();
  await expect(page.locator('#trace-status')).toHaveText('Captions retrieved');
  await expect(page.locator('#tab-panel')).toContainText('First synthetic line');
  await expect(page.locator('#tab-panel')).toContainText('2 caption cues');
  await expect(page.locator('#timeline')).toContainText('caption parse');
  await expect(page.locator('#context-details')).toContainText('creator_video');
  await expect(page.locator('#storage-indicator')).not.toHaveText('Local only (server write failed)');
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('gs-pen-testlab-diag-v2') || '[]'));
  expect(events.length).toBeGreaterThan(0);
  const serialized = JSON.stringify(events);
  expect(serialized).toContain('www.tiktok.com');
  expect(serialized).toContain('creator_video');
  expect(serialized).not.toContain('scrubdaddy');
  expect(serialized).not.toContain('7538539956029902111');
  expect(serialized).not.toContain('First synthetic line');
});

test('blocked caption access has a truthful error and does not hide diagnostics', async ({ page }) => {
  await stubCaptionResult(page, traceId => ({
    ok: false, status: 'failed', code: 'PROVIDER_BLOCKED', cues: [], captionTrackCount: 0,
    events: mockEvents(traceId, 'failed', 'PROVIDER_BLOCKED'),
    diagnosticsStored: true
  }));
  await openConnected(page);
  await page.locator('#video-url').fill(example);
  await page.locator('#probe-button').click();
  await expect(page.locator('#trace-status')).toHaveText('Retrieval failed');
  await expect(page.locator('#tab-panel')).toContainText('Captions might still exist');
  await expect(page.locator('#timeline')).toContainText('PROVIDER_BLOCKED');
  await expect(page.locator('#diagnostic-rows')).toContainText('PROVIDER_BLOCKED');
});

test('recognized but unavailable video platforms never claim transcript support', async ({ page }) => {
  await openConnected(page);
  await page.locator('#video-url').fill('https://www.youtube.com/watch?v=J---aiyznGQ');
  await page.locator('#probe-button').click();
  await expect(page.locator('#tab-panel')).toContainText('NOT_IMPLEMENTED');
  await expect(page.locator('#trace-status')).toHaveText('Not supported yet');
});

test('unknown HTTPS domain fails without an outbound provider request', async ({ page }) => {
  let providerRequested = false;
  await page.route('**/api/captions', route => {
    providerRequested = true;
    return route.fulfill({status: 500, body: '{}'});
  });
  await openConnected(page);
  await page.locator('#video-url').fill('https://example.org/private/video/1234');
  await page.locator('#probe-button').click();
  await expect(page.locator('#tab-panel')).toContainText('INVALID_URL');
  expect(providerRequested).toBe(false);
});

test('inaccessible backend produces a useful offline message, never fake captions', async ({ page }) => {
  await page.route('**/api/health', route => route.fulfill({status: 503, body: '{}'}));
  await page.goto('/');
  await expect(page.locator('#backend-badge')).toContainText('Retrieval backend offline');
  await page.locator('#video-url').fill(example);
  await page.locator('#probe-button').click();
  await expect(page.locator('#tab-panel')).toContainText('BACKEND_UNAVAILABLE');
  await expect(page.locator('#trace-status')).toHaveText('Backend offline');
});

test('diagnostics JSON export includes only sanitized technical events', async ({ page }) => {
  await openConnected(page);
  await page.locator('#video-url').fill('https://example.org/private/1234');
  await page.locator('#probe-button').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export-diagnostics').click()
  ]);
  expect(download.suggestedFilename()).toBe('gs-pen-sanitized-diagnostics.json');
  const read = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8');
  expect(read).toContain('gs-pen.debug-export.v1');
  expect(read).not.toContain('example.org/private/1234');
});

test('mobile or desktop layout avoids page-level horizontal overflow', async ({ page }) => {
  await openConnected(page);
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    visibleWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.visibleWidth + 2);
});


test('Codespaces mode requires a development key before diagnostic access', async ({ page }) => {
  const secret = 'a'.repeat(48); // synthetic test credential, never a real secret
  await page.route('**/api/health', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({backend:'codespaces_private',authRequired:true,diagnosticStorage:'local_file'})
  }));
  await page.route('**/api/diagnostics', route => {
    const authorized = route.request().headers()['x-gs-pen-dev-key'] === secret;
    return route.fulfill({
      status: authorized ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(authorized ? {events:[]} : {code:'AUTH_DENIED'})
    });
  });
  await page.goto('/');
  await expect(page.locator('#dev-access')).toBeVisible();
  await expect(page.locator('#backend-badge')).toContainText('Development key required');
  await page.locator('#dev-key').fill('b'.repeat(48));
  await page.locator('#connect-backend').click();
  await expect(page.locator('#dev-key-status')).toContainText('Invalid key');
  await page.locator('#dev-key').fill(secret);
  await page.locator('#connect-backend').click();
  await expect(page.locator('#backend-badge')).toContainText('Private Codespaces probe connected');
  await expect(page.locator('#dev-access')).toBeHidden();
});

test('automatically removes locally stored diagnostic records older than 30 days', async ({ page }) => {
  await page.addInitScript(() => {
    const event = timestamp => ({
      schema:'gs-pen.diagnostic.v2',timestamp,traceId:'synthetic_123',
      platform:'tiktok',stage:'finished',status:'succeeded',
      code:'OK',source:'browser',build:'testlab_v1'
    });
    const old = new Date(Date.now() - 32*86400000).toISOString();
    localStorage.setItem('gs-pen-testlab-diag-v2',JSON.stringify([event(old),event(new Date().toISOString())]));
  });
  await openConnected(page);
  await expect(page.locator('#local-event-count')).toHaveText('1');
});

test('caption output treats HTML-like text as text and never executes it', async ({ page }) => {
  const attack = '<img src=x onerror="window.__injected=true">';
  await stubCaptionResult(page, traceId => ({
    ok:true,status:'succeeded',code:'OK',captionTrackCount:1,
    cues:[{start:'00:00:01.000',end:'00:00:02.000',text:attack}],
    events:mockEvents(traceId,'succeeded','OK'),diagnosticsStored:true
  }));
  await openConnected(page);
  await page.locator('#video-url').fill(example);
  await page.locator('#probe-button').click();
  await expect(page.locator('#tab-panel')).toContainText(attack);
  await expect(page.locator('#tab-panel img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
});
