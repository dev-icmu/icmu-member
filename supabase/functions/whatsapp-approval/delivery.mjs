const E164 = /^\+[1-9]\d{1,14}$/;

export function readConfig(env) {
  // Manual wa.me links are the default; automatic sending needs both explicit gates.
  if (env('WHATSAPP_DELIVERY_MODE') !== 'waha' || env('WHATSAPP_ENABLED') !== 'true') return null;
  const config = {
    baseUrl:env('WAHA_BASE_URL'), apiKey:env('WAHA_API_KEY'),
    session:env('WAHA_SESSION') || 'default', senderPhone:env('WAHA_SENDER_PHONE'),
  };
  let url;
  try { url = new URL(config.baseUrl); } catch { throw new Error('WAHA URL is missing or invalid'); }
  // The hosted worker reaches Windows through HTTPS, never its own localhost.
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    !config.apiKey || config.apiKey.length < 32 || /\s/.test(config.apiKey) || config.apiKey.startsWith('sha512:') ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(config.session) || !E164.test(config.senderPhone || '')) {
    throw new Error('WAHA sender configuration is incomplete');
  }
  config.baseUrl = url.origin;
  return config;
}

const headers = config => ({'X-Api-Key':config.apiKey,Accept:'application/json','Content-Type':'application/json'});

export async function checkSession(config, send = fetch) {
  try {
    const response = await send(`${config.baseUrl}/api/sessions/${encodeURIComponent(config.session)}`, {
      method:'GET', headers:headers(config), redirect:'error', signal:AbortSignal.timeout(8000),
    });
    if (!response.ok) return {ready:false,error:`waha_session_http_${response.status}`};
    const session = await response.json();
    if (session?.name !== config.session || session.status !== 'WORKING') return {ready:false,error:'waha_session_not_working'};
    if (session.me?.id !== `${config.senderPhone.slice(1)}@c.us`) return {ready:false,error:'waha_sender_mismatch'};
    return {ready:true};
  } catch { return {ready:false,error:'waha_session_unavailable'}; }
}

export function messageBody(job, config) {
  if (!E164.test(job.phone || '') || !/^\d{2}M\d{3}$/.test(job.member_id || '') ||
    typeof job.full_name !== 'string' || !job.full_name.trim() || typeof job.joined_date !== 'string' || !job.joined_date.trim()) {
    throw new Error('Invalid approval recipient');
  }
  return {
    session:config.session, chatId:`${job.phone.slice(1)}@c.us`, linkPreview:false,
    text:`Hello ${job.full_name}, your Isipathana College Media Unit membership has been approved. Member ID: ${job.member_id}. Joined date: ${job.joined_date}. Please collect your membership receipt from the ICMU team.`,
  };
}

export async function deliver(job, config, send = fetch) {
  let body;
  try { body = messageBody(job, config); } catch { return {status:'failed',error:'invalid_recipient'}; }
  try {
    const response = await send(`${config.baseUrl}/api/sendText`, {
      method:'POST', headers:headers(config), redirect:'error',
      body:JSON.stringify(body), signal:AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    const messageId = result?.id;
    if (response.ok && typeof messageId === 'string' && messageId.trim() && messageId.length <= 256) {
      return {status:'submitted',messageId};
    }
    // Only a structured WAHA rate-limit rejection is safe to retry. A timeout,
    // proxy error or malformed success may already have sent the message.
    const error = `waha_http_${response.status}`;
    if (response.status === 429 && result?.statusCode === 429) return {status:'queued',error};
    if (response.ok || response.status >= 500 || [408,429].includes(response.status)) return {status:'uncertain',error};
    return {status:'failed',error};
  } catch { return {status:'uncertain',error:'response_unknown'}; }
}
