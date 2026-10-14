import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { readConfig, checkSession, deliver } from './delivery.mjs';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
});

async function authorized(request: Request) {
  const key = Deno.env.get('WHATSAPP_WORKER_SECRET');
  const supplied = request.headers.get('x-worker-secret') || '';
  if (!key || key.length < 32 || supplied.length > 256) return false;
  const hash = (value: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a,b] = await Promise.all([hash(key),hash(supplied)]);
  const aa = new Uint8Array(a); const bb = new Uint8Array(b);
  return aa.reduce((diff,value,index)=>diff | (value ^ bb[index]),0) === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return reply(405,{error:'Method not allowed'});
  if (!await authorized(request)) return reply(401,{error:'Unauthorized'});
  try {
    const config = readConfig((name: string)=>Deno.env.get(name));
    if (!config) return reply(200,{enabled:false,processed:0});
    // An offline PC, unpaired session or wrong sender must not consume jobs.
    const session = await checkSession(config);
    if (!session.ready) return reply(503,{error:session.error,processed:0});
    const service = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth:{persistSession:false,autoRefreshToken:false},
    });
    let processed = 0;
    // One 8-second readiness check, then at most three 15-second sends.
    for (let n=0;n<3;n++) {
      const {data:job,error} = await service.rpc('claim_approval_whatsapp');
      if (error) return reply(503,{error:'Queue unavailable',processed});
      if (!job) break;
      const result = await deliver(job,config);
      const {data:saved,error:saveError} = await service.rpc('finish_approval_whatsapp', {
        p_id:job.id,p_claim_id:job.claim_id,p_status:result.status,
        p_message_id:result.messageId || null,p_error_code:result.error || null,
      });
      if (saveError || saved !== true) return reply(503,{error:'Delivery result needs review',processed});
      processed++;
      if (result.status !== 'submitted') break;
    }
    return reply(200,{enabled:true,processed});
  } catch { return reply(503,{error:'WhatsApp is not ready. Check the sender settings.'}); }
});
