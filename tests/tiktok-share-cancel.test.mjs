import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTikTokShareUrl } from '../server/tiktok-share.mjs';

const share='https://vm.tiktok.com/Fixture123/';
const canonical='https://www.tiktok.com/@fixture/video/1234567890123456789';

test('TikTok redirect and blocked responses do not wait for stalled body cancellation', {timeout:2000}, async()=>{
  for(const cancel of [()=>new Promise(()=>{}),()=>Promise.reject(new Error('private stream error'))]){
    for(const status of [302,403]){
      let requests=0,cancellations=0;
      const stream=new ReadableStream({
        cancel(){cancellations++;return cancel();}
      });
      const response=new Response(stream,{status,headers:status===302?{location:canonical}:{}});
      const result=await resolveTikTokShareUrl(share,async(url,options)=>{
        requests++;
        assert.equal(url,share);
        assert.equal(options.redirect,'manual');
        return response;
      });
      assert.equal(requests,1,'never follow a rejected response body');
      assert.equal(cancellations,1,'attempt cleanup exactly once');
      if(status===302)assert.deepEqual(result,{ok:true,url:canonical,redirectCount:1});
      else assert.equal(result.code,'PROVIDER_BLOCKED');
      assert.ok(!JSON.stringify(result).includes('private stream error'));
    }
  }
});

test('Oversized public TikTok share hints return promptly even if cancellation never resolves', {timeout:2000}, async()=>{
  for(const cancel of [()=>new Promise(()=>{}),()=>Promise.reject(new Error('private cancellation detail'))]){
    let requests=0,cancellations=0;
    const stream=new ReadableStream({
      start(controller){controller.enqueue(new Uint8Array(131073).fill(65));},
      cancel(){cancellations++;return cancel();}
    });
    const result=await resolveTikTokShareUrl(share,async(url,options)=>{
      requests++;
      assert.equal(options.redirect,'manual');
      return new Response(stream,{status:200});
    });
    assert.equal(result.code,'SHORT_LINK_UNRESOLVED');
    assert.equal(result.httpStatus,200);
    assert.equal(requests,1);
    assert.equal(cancellations,1);
    assert.ok(!JSON.stringify(result).includes('private cancellation detail'));
  }
});
