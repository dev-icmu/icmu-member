import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSession, deliver, messageBody, readConfig } from '../supabase/functions/whatsapp-approval/delivery.mjs';

// All recipients, credentials and responses are synthetic. Every transport is mocked.
const settings = {
  WHATSAPP_DELIVERY_MODE:'waha', WHATSAPP_ENABLED:'true', WAHA_BASE_URL:'https://waha.example.invalid/',
  WAHA_API_KEY:'synthetic-test-key-never-use-live-1234567890',
  WAHA_SENDER_PHONE:'+94700000001',
};
const configured = overrides => readConfig(name => ({...settings,...overrides})[name]);
const config = configured();
const job = {phone:'+94700000000',full_name:'Test Student',member_id:'09M001',joined_date:'14 Oct 2026'};
const workingSession = {name:'default',status:'WORKING',me:{id:'94700000001@c.us'}};

test('default, manual and invalid delivery modes never inspect enabled provider settings', () => {
  for (const mode of [undefined,'','manual','wa.me','WAHA','invalid']) {
    assert.equal(configured({WHATSAPP_DELIVERY_MODE:mode}), null);
    assert.equal(readConfig(name => {
      assert.equal(name,'WHATSAPP_DELIVERY_MODE');
      return mode;
    }), null);
  }
});

test('disabled sending does not inspect provider credentials', () => {
  for (const enabled of [undefined,'false','TRUE','1']) {
    assert.equal(readConfig(name => {
      if (name === 'WHATSAPP_DELIVERY_MODE') return 'waha';
      assert.equal(name,'WHATSAPP_ENABLED');
      return enabled;
    }), null);
  }
});

test('configuration requires a secure origin and defaults to the default session', () => {
  assert.deepEqual(config, {
    baseUrl:'https://waha.example.invalid', apiKey:settings.WAHA_API_KEY,
    session:'default', senderPhone:settings.WAHA_SENDER_PHONE,
  });
  assert.equal(configured({WAHA_SESSION:'icmu-test_1'}).session,'icmu-test_1');
  assert.equal(configured({WAHA_BASE_URL:'https://WAHA.example.invalid:443/'}).baseUrl,'https://waha.example.invalid');
  for (const baseUrl of [undefined,'not-a-url','http://waha.example.invalid','https://user:pass@waha.example.invalid',
    'https://waha.example.invalid/api','https://waha.example.invalid/?token=secret','https://waha.example.invalid/#token']) {
    assert.throws(() => configured({WAHA_BASE_URL:baseUrl}), /WAHA/);
  }
});

test('configuration rejects missing or hashed API keys and invalid sender/session values', () => {
  for (const apiKey of [undefined,'','too-short','x'.repeat(31),'sha512:'+'a'.repeat(128),'x'.repeat(32)+'\n','x'.repeat(32)+' key']) {
    assert.throws(() => configured({WAHA_API_KEY:apiKey}), /configuration/);
  }
  for (const senderPhone of [undefined,'','0700000001','+0700000001','+94700000001@c.us','+1234567890123456']) {
    assert.throws(() => configured({WAHA_SENDER_PHONE:senderPhone}), /configuration/);
  }
  for (const session of ['../other','has space','name?token=secret','x'.repeat(65)]) {
    assert.throws(() => configured({WAHA_SESSION:session}), /configuration/);
  }
});

test('readiness authenticates to the configured session and verifies the linked sender', async () => {
  let calls = 0;
  const result = await checkSession(config, async (url, options) => {
    calls++;
    assert.equal(url,'https://waha.example.invalid/api/sessions/default');
    assert.equal(options.method,'GET');
    assert.equal(options.headers['X-Api-Key'],settings.WAHA_API_KEY);
    assert.equal(options.headers.Accept,'application/json');
    assert.equal(options.redirect,'error');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(workingSession);
  });
  assert.equal(calls,1);
  assert.deepEqual(result,{ready:true});
});

test('unpaired, stopped, wrong-session and wrong-sender instances are not ready', async () => {
  for (const status of ['SCAN_QR_CODE','STARTING','STOPPED','FAILED',undefined]) {
    assert.deepEqual(await checkSession(config,async () => Response.json({...workingSession,status})),
      {ready:false,error:'waha_session_not_working'});
  }
  assert.deepEqual(await checkSession(config,async () => Response.json({...workingSession,name:'other'})),
    {ready:false,error:'waha_session_not_working'});
  for (const me of [undefined,{}, {id:'94700000002@c.us'},{id:'94700000001@g.us'}]) {
    assert.deepEqual(await checkSession(config,async () => Response.json({...workingSession,me})),
      {ready:false,error:'waha_sender_mismatch'});
  }
});

test('offline, unauthorized and malformed readiness responses fail closed', async () => {
  for (const status of [401,404,503]) {
    assert.deepEqual(await checkSession(config,async () => new Response('Unavailable',{status})),
      {ready:false,error:`waha_session_http_${status}`});
  }
  for (const send of [async () => { throw new Error('offline'); },async () => new Response('not JSON')]) {
    assert.deepEqual(await checkSession(config,send),{ready:false,error:'waha_session_unavailable'});
  }
  assert.equal((await checkSession(config,async () => Response.json(null))).ready,false);
});

test('approval text targets the saved individual chat and includes the receipt details', () => {
  assert.deepEqual(messageBody(job,config), {
    session:'default',chatId:'94700000000@c.us',linkPreview:false,
    text:'Hello Test Student, your Isipathana College Media Unit membership has been approved. Member ID: 09M001. Joined date: 14 Oct 2026. Please collect your membership receipt from the ICMU team.',
  });
  assert.equal(messageBody(job,{...config,session:'icmu-test_1'}).session,'icmu-test_1');
});

test('invalid recipient or incomplete approval data never reaches the provider', async () => {
  let calls = 0;
  const neverSend = async () => { calls++; throw new Error('Invalid recipients must not reach transport'); };
  for (const invalid of [
    {phone:'0700000000'},{phone:'+0700000000'},{phone:'+94700000000@c.us'},{phone:undefined},
    {member_id:'09M0001'},{member_id:undefined},{full_name:''},{full_name:'  '},{full_name:null},
    {joined_date:''},{joined_date:'  '},{joined_date:undefined},
  ]) {
    assert.throws(() => messageBody({...job,...invalid},config), /Invalid approval recipient/);
    assert.deepEqual(await deliver({...job,...invalid},config,neverSend),{status:'failed',error:'invalid_recipient'});
  }
  assert.equal(calls,0);
});

test('a bounded top-level provider ID records submission, never delivery', async () => {
  const messageId = 'true_94700000000@c.us_synthetic';
  let calls = 0;
  const result = await deliver(job,config,async (url, options) => {
    calls++;
    assert.equal(url,'https://waha.example.invalid/api/sendText');
    assert.equal(options.method,'POST');
    assert.equal(options.headers['X-Api-Key'],settings.WAHA_API_KEY);
    assert.equal(options.headers['Content-Type'],'application/json');
    assert.equal(options.redirect,'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body),messageBody(job,config));
    return Response.json({id:messageId},{status:201});
  });
  assert.equal(calls,1);
  assert.deepEqual(result,{status:'submitted',messageId});
  assert.deepEqual(await deliver(job,config,async () => Response.json({id:'x'.repeat(256)})),
    {status:'submitted',messageId:'x'.repeat(256)});
});

test('missing, nested, malformed or oversized success IDs are uncertain', async () => {
  for (const response of [{},{id:''},{id:'  '},{id:123},{id:'x'.repeat(257)},{messages:[{id:'old-provider-id'}]},null]) {
    assert.deepEqual(await deliver(job,config,async () => Response.json(response)),
      {status:'uncertain',error:'waha_http_200'});
  }
  assert.deepEqual(await deliver(job,config,async () => new Response('not JSON')),
    {status:'uncertain',error:'waha_http_200'});
  assert.deepEqual(await deliver(job,config,async () => new Response(null,{status:204})),
    {status:'uncertain',error:'waha_http_204'});
});

test('only a structured explicit rate-limit rejection is queued for retry', async () => {
  assert.deepEqual(await deliver(job,config,async () => Response.json({statusCode:429},{status:429})),
    {status:'queued',error:'waha_http_429'});
  for (const response of [{},{statusCode:'429'},{statusCode:500},null]) {
    assert.deepEqual(await deliver(job,config,async () => Response.json(response,{status:429})),
      {status:'uncertain',error:'waha_http_429'});
  }
  assert.deepEqual(await deliver(job,config,async () => new Response('Rate limited by proxy',{status:429})),
    {status:'uncertain',error:'waha_http_429'});
});

test('network, timeout and server ambiguity never trigger automatic resends', async () => {
  for (const error of [new Error('offline'),new DOMException('Timed out','TimeoutError')]) {
    assert.deepEqual(await deliver(job,config,async () => { throw error; }),
      {status:'uncertain',error:'response_unknown'});
  }
  for (const status of [408,500,502,503]) {
    assert.deepEqual(await deliver(job,config,async () => Response.json({statusCode:status},{status})),
      {status:'uncertain',error:`waha_http_${status}`});
  }
});

test('explicit non-transient client rejections fail without recording provider text', async () => {
  for (const status of [400,401,403,404,422]) {
    assert.deepEqual(await deliver(job,config,async () => Response.json({statusCode:status,message:'synthetic private detail'},{status})),
      {status:'failed',error:`waha_http_${status}`});
  }
});
