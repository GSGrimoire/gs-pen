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
  await expect(page.getByRole('heading', { name: /Good ideas/ })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await page.getByRole('tab', {name: 'Whisper transcript'}).click();
  await expect(page.locator('#tab-panel')).toContainText('Whisper is not active');
  await page.getByRole('tab', {name: 'Post text'}).click();
  await expect(page.locator('#tab-panel')).toContainText('No post request yet');
  await page.getByRole('tab', {name: 'Metadata'}).click();
  await expect(page.locator('#tab-panel')).toContainText('No metadata request yet');
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
  await page.getByRole('link',{name:'Diagnostics',exact:true}).click();
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

test('Site database health and synchronization failures are visible without blocking captions',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({backend:'sites_private',centralSiteStorage:true})}));
 await page.route('**/api/diagnostics',route=>route.fulfill({status:route.request().method()==='POST'?503:200,contentType:'application/json',body:JSON.stringify(route.request().method()==='POST'?{code:'STORAGE_FAILED'}:{events:[]})}));
 await stubCaptionResult(page,traceId=>({ok:true,code:'OK',cues:[{start:'00:00:01.000',end:'00:00:02.000',text:'Synthetic caption during logging outage'}],events:mockEvents(traceId,'succeeded','OK'),diagnosticsStored:false}));
 await page.goto('/');await expect(page.locator('#backend-badge')).toHaveText('Owner-private Site backend');
 await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();
 await expect(page.locator('#tab-panel')).toContainText('Synthetic caption during logging outage');
 await expect(page.locator('#storage-indicator')).toContainText(/failed/);
});

test('Search and error filters inspect backend diagnostics and select processing timelines',async({page})=>{
 const trace='00000000-0000-4000-8000-000000000001';
 await page.route('**/api/health',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({backend:'sites_private',centralSiteStorage:true})}));
 await page.route('**/api/diagnostics',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({events:mockEvents(trace,'failed','TIMEOUT')})}));
 await page.goto('/');await expect(page.locator('#server-event-count')).toHaveText('1');
 await page.getByRole('link',{name:'Diagnostics',exact:true}).click();
 await page.locator('#filter-search').fill('TIMEOUT');await expect(page.locator('#diagnostic-rows tr')).toHaveCount(1);
 await page.locator('#filter-status').selectOption('succeeded');await expect(page.locator('#diagnostic-rows')).toContainText('No diagnostic records');
 await page.locator('#filter-status').selectOption('failed');await page.locator('#diagnostic-rows tr').click();
 await expect(page.locator('#trace-id')).toHaveText(trace);await expect(page.locator('#timeline')).toContainText('TIMEOUT');
});


test('TikTok post and metadata tabs show independent results and safely render provider text',async({page})=>{
 const attack='<img src=x onerror="window.__injected=true">';
 await stubCaptionResult(page,traceId=>({ok:true,code:'OK',cues:[{start:'00:00:01.000',text:'Synthetic caption'}],captionTrackCount:1,post:{status:'succeeded',code:'OK',text:'Synthetic post '+attack+' #test',hashtags:['#test'],provenance:'Synthetic fixture'},metadata:{status:'succeeded',code:'OK',fields:{platform:'TikTok',creator:attack,likes:0},provenance:'Synthetic fixture'},events:mockEvents(traceId,'succeeded','OK'),diagnosticsStored:true}));
 await openConnected(page);await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();
 await expect(page.locator('#result-summary')).toContainText('Post text: Available');
 await page.getByRole('tab',{name:'Post text',exact:true}).click();await expect(page.locator('#tab-panel')).toContainText('Synthetic post '+attack);
 await expect(page.locator('#tab-panel img')).toHaveCount(0);
 await page.getByRole('tab',{name:'Metadata',exact:true}).click();await expect(page.locator('#tab-panel')).toContainText(attack);await expect(page.locator('#tab-panel')).toContainText('Likes');
 await page.getByRole('tab',{name:'Whisper transcript',exact:true}).click();await expect(page.locator('#tab-panel')).toContainText('Whisper is not active');
 const stored=await page.evaluate(()=>JSON.stringify(localStorage));expect(stored).not.toContain('Synthetic post');expect(stored).not.toContain(attack);
});

test('Facebook reaches the backend and displays partial post information without claiming captions',async({page})=>{
 await stubCaptionResult(page,traceId=>({ok:false,code:'NOT_IMPLEMENTED',cues:[],post:{status:'succeeded',code:'OK',text:'Synthetic Facebook story #magic',hashtags:['#magic'],provenance:'Facebook public share title',completeness:'page_preview_may_be_truncated'},metadata:{status:'succeeded',code:'OK',fields:{platform:'Facebook',creator:'Synthetic Studio'},provenance:'Synthetic fixture'},events:mockEvents(traceId,'unavailable','NOT_IMPLEMENTED'),diagnosticsStored:true}));
 await openConnected(page);await page.locator('#video-url').fill('https://www.facebook.com/reel/123456789012345');await page.locator('#probe-button').click();
 await expect(page.locator('#trace-status')).toHaveText('Post information retrieved; captions unavailable');await expect(page.locator('#tab-panel')).toContainText('Synthetic Facebook story');await expect(page.locator('#tab-panel')).toContainText('may be shortened');
 await page.getByRole('tab',{name:'Original captions',exact:true}).click();await expect(page.locator('#tab-panel')).toContainText('Native captions unavailable');
 await page.getByRole('tab',{name:'Metadata',exact:true}).click();await expect(page.locator('#tab-panel')).toContainText('Synthetic Studio');
});

async function stubHistory(page,{failedSave=false}={}){
 let items=[{id:'00000000-0000-4000-8000-000000000010',sourceUrl:example,platform:'tiktok',createdAt:Date.now(),expiresAt:Date.now()+30*86400000,title:'Fixture saved video',creator:'Fixture creator',captionCueCount:1,postAvailable:true,metadataAvailable:true}];
 const savedResult={ok:true,code:'OK',cues:[{start:'00:00:01.000',text:'Saved fixture caption'}],post:{status:'succeeded',text:'Saved fixture post',hashtags:[],provenance:'Synthetic fixture'},metadata:{status:'succeeded',fields:{creator:'Fixture creator'},provenance:'Synthetic fixture'}};
 await page.route('**/api/health',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({backend:'sites_private',centralSiteStorage:true,historyAvailable:true})}));
 await page.route('**/api/history',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({items})}));
 await page.route('**/api/history/*',r=>{const id=r.request().url().split('/').at(-1);if(r.request().method()==='DELETE'){items=items.filter(x=>x.id!==id);return r.fulfill({contentType:'application/json',body:'{"deleted":true}'});}const item=items.find(x=>x.id===id);return r.fulfill({status:item?200:404,contentType:'application/json',body:JSON.stringify(item?{item:{...item,result:savedResult}}:{code:'NOT_FOUND'})});});
 await stubCaptionResult(page,traceId=>({...savedResult,events:mockEvents(traceId,'succeeded','OK'),diagnosticsStored:true,historyStatus:failedSave?'failed':'saved'}));
}
test('Workspace separates Extract, Recent and Diagnostics with working history search, reopen and delete',async({page})=>{
 await stubHistory(page);await page.goto('/');await expect(page.locator('#backend-badge')).toHaveText('Owner-private Site backend');
 await expect(page.locator('#diagnostics-view')).toBeHidden();await expect(page.locator('#recent-view')).toBeHidden();
 await page.getByRole('link',{name:/^Recent/}).click();await expect(page.locator('#history-items')).toContainText('Fixture saved video');
 await page.locator('#history-search').fill('no such creator');await expect(page.locator('#history-items')).toContainText('No matching');await page.locator('#history-search').fill('Fixture creator');
 await page.getByRole('button',{name:'Open extraction: Fixture saved video',exact:true}).click();await expect(page.locator('#extract-view')).toBeVisible();await expect(page.locator('#tab-panel')).toContainText('Saved fixture caption');
 await page.reload();await page.getByRole('link',{name:/^Recent/}).click();await expect(page.locator('#history-items')).toContainText('Fixture saved video');
 await page.getByRole('button',{name:'Delete extraction: Fixture saved video',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Keep extraction',exact:true}).click();await expect(page.locator('#history-items')).toContainText('Fixture saved video');
 await page.getByRole('button',{name:'Delete extraction: Fixture saved video',exact:true}).click();await page.getByRole('button',{name:'Delete extraction',exact:true}).click();await expect(page.locator('#history-items')).not.toContainText('Fixture saved video');await expect(page.locator('#history-status')).toHaveText('Extraction deleted.');
});
test('Output exports contain content and provenance while failed history saves remain visible',async({page})=>{
 await stubHistory(page,{failedSave:true});await page.goto('/');await expect(page.locator('#backend-badge')).toHaveText('Owner-private Site backend');await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();
 await expect(page.locator('#history-save-status')).toContainText('Could not save to Recent');await expect(page.locator('#tab-panel')).toContainText('Saved fixture caption');
 const dlPromise=page.waitForEvent('download');await page.locator('#export-json').click();const dl=await dlPromise;const content=JSON.parse(await(await import('node:fs/promises')).readFile(await dl.path(),'utf8'));expect(content.result.cues[0].text).toBe('Saved fixture caption');expect(content.independentTranscript.status).toBe('not_implemented');expect(content.result.events).toBeUndefined();
 await page.getByRole('tab',{name:'Whisper transcript',exact:true}).click();await expect(page.locator('#copy-output')).toBeDisabled();await expect(page.locator('#tab-panel')).not.toContainText('Saved fixture caption');
 const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,page:document.documentElement.scrollWidth}));expect(dims.page).toBeLessThanOrEqual(dims.width+2);
});

async function mockAssistantLaunch(page,{clipboardFails=false,popupBlocked=false}={}){
 await page.addInitScript(({clipboardFails,popupBlocked})=>{
  window.assistantTest={copies:[],launches:[],closed:false};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(clipboardFails)throw Error('denied');window.assistantTest.copies.push(text);}}});
  window.open=()=>{if(popupBlocked)return null;const win={opener:window,closed:false,location:{replace:url=>window.assistantTest.launches.push(url)},close:()=>{window.assistantTest.closed=true;}};window.assistantTest.win=win;return win;};
 },{clipboardFails,popupBlocked});
}
test('Assistant handoffs copy all saved outputs even from Whisper tab and expose safe destinations',async({page,isMobile})=>{
 await mockAssistantLaunch(page);await stubHistory(page);await page.goto('/');
 await expect(page.locator('#open-chatgpt')).toBeDisabled();
 await page.getByRole('link',{name:/^Recent/}).click();await page.getByRole('button',{name:'Open extraction: Fixture saved video',exact:true}).click();
 await page.getByRole('tab',{name:'Whisper transcript',exact:true}).click();await page.locator('#open-claude').click();
 await expect(page.locator('#assistant-action-status')).toContainText('All extracted content copied');
 expect(await page.evaluate(()=>window.assistantTest.win.opener)).toBeNull();
 const data=await page.evaluate(()=>window.assistantTest);expect(data.launches).toEqual(['https://claude.ai/new']);
 for(const text of ['Saved fixture caption','Saved fixture post','Fixture creator','not_implemented'])expect(data.copies[0]).toContain(text);
 expect(data.copies[0]).not.toContain('diagnosticsStored');
 if(isMobile)await expect(page.locator('#claude-desktop-link')).toBeHidden();else{await expect(page.locator('#claude-desktop-link')).toBeVisible();expect(new URL(await page.locator('#claude-desktop-link').getAttribute('href')).searchParams.get('q')).toBe(data.copies[0]);}
 await page.locator('#open-chatgpt').click();await expect(page.locator('#assistant-action-status')).toContainText('ChatGPT');await expect(page.locator('#claude-desktop-link')).toBeHidden();
 expect((await page.evaluate(()=>window.assistantTest)).launches.at(-1)).toBe('https://chatgpt.com/');expect(await page.evaluate(()=>window.assistantTest.win.opener)).toBeNull();
 const size=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);expect(size[0]).toBeLessThanOrEqual(size[1]+2);
});
test('Clipboard rejection closes unused tab without sending content or claiming success',async({page})=>{
 await mockAssistantLaunch(page,{clipboardFails:true});await stubHistory(page);await page.goto('/');await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();await expect(page.locator('#open-claude')).toBeEnabled();await page.locator('#open-claude').click();
 await expect(page.locator('#assistant-action-status')).toContainText('Could not copy');await expect(page.locator('#assistant-fallbacks')).toBeHidden();const data=await page.evaluate(()=>window.assistantTest);expect(data.launches).toEqual([]);expect(data.closed).toBe(true);
});
test('Blocked assistant popup preserves complete clipboard and manual website link',async({page})=>{
 await mockAssistantLaunch(page,{popupBlocked:true});await stubHistory(page);await page.goto('/');await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();await expect(page.locator('#open-chatgpt')).toBeEnabled();await page.locator('#open-chatgpt').click();
 await expect(page.locator('#assistant-action-status')).toContainText('Opening was blocked');await expect(page.locator('#assistant-web-link')).toHaveAttribute('href','https://chatgpt.com/');expect((await page.evaluate(()=>window.assistantTest)).copies[0]).toContain('Saved fixture caption');
});
test('Long partial extraction handoff stays complete and offers no truncating app link',async({page})=>{
 await mockAssistantLaunch(page);const text='Long fixture '.repeat(1600);
 await stubCaptionResult(page,traceId=>({ok:false,code:'NOT_IMPLEMENTED',cues:[],post:{status:'succeeded',text,hashtags:['#fixture'],provenance:'Synthetic fixture',completeness:'page_preview_may_be_truncated'},events:mockEvents(traceId,'unavailable','NOT_IMPLEMENTED'),diagnosticsStored:true}));
 await openConnected(page);await page.locator('#video-url').fill(example);await page.locator('#probe-button').click();await expect(page.locator('#open-claude')).toBeEnabled();await page.locator('#open-claude').click();
 await expect(page.locator('#assistant-action-status')).toContainText('All extracted content copied');await expect(page.locator('#claude-desktop-link')).toBeHidden();expect((await page.evaluate(()=>window.assistantTest)).copies[0]).toContain(text);
});

test('A delayed saved result cannot change a new extraction or its exported source',async({page})=>{
 await stubHistory(page);
 let releaseHistory,releaseCaptions;
 const historyGate=new Promise(r=>releaseHistory=r),captionGate=new Promise(r=>releaseCaptions=r);
 const savedId='00000000-0000-4000-8000-000000000010';
 await page.route('**/api/history/'+savedId,async route=>{await historyGate;await route.fallback();});
 await page.route('**/api/captions',async route=>{
  const {traceId}=route.request().postDataJSON();await captionGate;
  await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,code:'OK',cues:[{start:'00:00:05.000',end:'00:00:06.000',text:'New extraction caption'}],post:{status:'unavailable'},metadata:{status:'unavailable'},events:mockEvents(traceId,'succeeded','OK'),diagnosticsStored:true,historyStatus:'saved'})});
 });
 await page.goto('/');await page.getByRole('link',{name:/^Recent/}).click();
 await page.getByRole('button',{name:'Open extraction: Fixture saved video',exact:true}).click();
 await page.getByRole('link',{name:'Extract',exact:true}).click();
 const other='https://www.tiktok.com/@hankgreen1/video/7047596209028074758';
 await page.locator('#video-url').fill(other);await page.locator('#probe-button').click();
 const savedResponse=page.waitForResponse(r=>r.url().endsWith(savedId));releaseHistory();await (await savedResponse).finished();
 await expect(page.locator('#video-url')).toHaveValue(other);await expect(page.locator('#tab-panel')).not.toContainText('Saved fixture caption');
 releaseCaptions();await expect(page.locator('#tab-panel')).toContainText('New extraction caption');
 const download=page.waitForEvent('download');await page.locator('#export-json').click();
 const record=JSON.parse(await(await import('node:fs/promises')).readFile(await(await download).path(),'utf8'));
 expect(record.sourceUrl).toBe(other);expect(record.result.cues[0].text).toBe('New extraction caption');
});

test('The latest saved-result selection wins when responses arrive in reverse order',async({page})=>{
 await stubHistory(page);const first='00000000-0000-4000-8000-000000000011',second='00000000-0000-4000-8000-000000000012';
 const items=[first,second].map((id,i)=>({id,sourceUrl:example,platform:'tiktok',createdAt:Date.now(),expiresAt:Date.now()+86400000,title:'Selection '+i,creator:'Fixture'}));
 await page.route('**/api/history',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({items})}));
 let releaseFirst;const firstGate=new Promise(r=>releaseFirst=r);
 await page.route('**/api/history/*',async r=>{const id=r.request().url().split('/').at(-1);if(id===first)await firstGate;await r.fulfill({contentType:'application/json',body:JSON.stringify({item:{...items.find(x=>x.id===id),result:{ok:true,code:'OK',cues:[{start:'00:00:01.000',text:id===first?'Old saved selection':'Latest saved selection'}]}}})});});
 await page.goto('/');await page.getByRole('link',{name:/^Recent/}).click();
 await page.getByRole('button',{name:'Open extraction: Selection 0',exact:true}).click();await page.getByRole('button',{name:'Open extraction: Selection 1',exact:true}).click();
 await expect(page.locator('#tab-panel')).toContainText('Latest saved selection');
 const response=page.waitForResponse(r=>r.url().endsWith(first));releaseFirst();await(await response).finished();
 await expect(page.locator('#tab-panel')).toContainText('Latest saved selection');await expect(page.locator('#tab-panel')).not.toContainText('Old saved selection');
});

test('Unbroken provider creator text does not overflow Recent or its preview',async({page})=>{
 await stubHistory(page);const creator='x'.repeat(200);
 await page.route('**/api/history',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({items:[{id:'00000000-0000-4000-8000-000000000010',sourceUrl:example,platform:'tiktok',createdAt:Date.now(),expiresAt:Date.now()+86400000,title:'Long creator fixture',creator}]})}));
 await page.goto('/');await expect(page.locator('#recent-preview')).toContainText(creator);
 for(const view of ['Extract','Recent']){
  await page.getByRole('link',{name:view==='Recent'?/^Recent/:view,exact:view!=='Recent'}).click();
  const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(size.scroll).toBeLessThanOrEqual(size.width+2);
 }
});
