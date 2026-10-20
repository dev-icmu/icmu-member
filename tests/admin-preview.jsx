// Isolated browser fixture. Not imported by the application or included in its build.
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AdminWorkspace } from '../src/pages/AdminPage';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '../src/index.css';

if (!import.meta.env.DEV || !['localhost','127.0.0.1'].includes(location.hostname)) throw new Error('Local UI fixture only');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const skills=['Photography','Announcing','Graphic Design'].map((name,i)=>({id:uuid(500+i),skill_name:name,skill_desc:'A media skill',is_active:true,is_protected:i===0}));
const teams=[{id:uuid(800),team_name:'Production crew',is_active:true,is_protected:false,required_skills:[skills[0].id]}];
const members=Array.from({length:47},(_,i)=>({id:uuid(i+1),full_name:`Sample Member ${String(i+1).padStart(2,'0')}`,name_with_initials:`S. Member ${i+1}`,member_id:i<30?`12M${String(i+1).padStart(3,'0')}`:null,index_number:`20${100+i}`,batch_year:2012,date_of_birth:'2012-04-10',joined_date:'2026-09-10',created_at:`2026-09-${String(i%28+1).padStart(2,'0')}T06:00:00Z`,updated_at:'2026-10-14T06:00:00Z',membership_status:i<30?'accepted':i<43?'pending':'rejected',is_active:i!==4,city:'Colombo',whatsapp_number:'+94770000000',email_address:`sample${i+1}@example.invalid`,interests:[skills[i%3].id],guardian:{id:uuid(100+i),guardian_name:'Sample Guardian',contact_number:'+94771111111',occupation:'Sample occupation'},member_team_assignment:[]}));
members.forEach((member,index)=>Object.assign(member,{form_number:String(index+1).padStart(4,'0'),other_skills:'',processed_by_name:'Sample Admin'}));
const response=(data,count,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...(count!==undefined?{'content-range':`0-${Math.max(0,count-1)}/${count}`}:{})}});
members.forEach((member,index)=>{
  member.batch_year=2010+index%3;
  member.date_of_birth=`${member.batch_year}-04-10`;
  if(member.member_id)member.member_id=`${String(member.batch_year).slice(-2)}M${String(index+1).padStart(3,'0')}`;
});
const configs=[
  { key: 'ACADEMIC_YEAR', value: '2026/2027', description: 'Active academic cycle for membership fee collection (March to March)' },
  { key: 'ACADEMIC_BATCH_YEAR', value: '2008', description: 'Cutoff batch year: only batches above this year count towards active fees' },
  { key: 'MEMBERSHIP_FEE_LKR', value: '500', description: 'Standard yearly membership fee in LKR' },
];
const membershipFees=members.filter((_,idx)=>idx!==31).map((m,idx)=>({
  id: uuid(9000+idx),
  member_id: m.id,
  fees: [
    {
      academic_year: '2026/2027',
      fee_amount: 500,
      paid_date: '2026-10-14T06:00:00Z',
      payment_method: 'cash',
      receipt_number: `RCP-2026-${String(idx+1).padStart(3,'0')}`,
      recorded_by_name: 'Sample Admin',
      notes: 'Fixture initial payment'
    }
  ]
}));
const previewWithdrawals=[{id:uuid(9500),method:'bank_transfer',amount:1250,transferred_to:'ICMU Media Unit',transfer_reference:'TXN-2401',cash_recipient:null,purpose:'Camera accessories',withdrawn_by_name:'Sample Admin',withdrawn_at:'2026-10-18T09:15:00Z',receipt_path:null}];
function withdrawalPassbook(limit=100) {
  const credits=membershipFees.flatMap(fee=>fee.fees.map((item,index)=>({id:`${fee.id}:${index+1}`,kind:'credit',happened_at:item.paid_date,amount:Number(item.fee_amount),person:members.find(member=>member.id===fee.member_id)?.full_name,detail:item.academic_year})));
  const debits=previewWithdrawals.map(item=>({...item,kind:'debit',happened_at:item.withdrawn_at,actor_name:item.withdrawn_by_name}));
  const all=[...credits,...debits].sort((a,b)=>a.happened_at.localeCompare(b.happened_at)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  let balance=0;all.forEach(item=>{balance+=item.kind==='credit'?item.amount:-item.amount;item.balance_after=balance;});
  return {received:credits.reduce((sum,item)=>sum+item.amount,0),withdrawn:debits.reduce((sum,item)=>sum+item.amount,0),available:balance,total_entries:all.length,entries:all.reverse().slice(0,limit)};
}
members.forEach((member)=>{
  const mf = membershipFees.find(f => f.member_id === member.id);
  member.membership_fee = mf ? [mf] : [];
});
function analytics(){return {counts:{total:members.length,accepted:members.filter(m=>m.membership_status==='accepted').length,pending:members.filter(m=>m.membership_status==='pending').length,rejected:members.filter(m=>m.membership_status==='rejected').length,active:members.filter(m=>m.membership_status==='accepted'&&m.is_active).length,inactive:members.filter(m=>m.membership_status==='accepted'&&!m.is_active).length,teams:teams.filter(t=>t.is_active).length,skills:skills.filter(s=>s.is_active).length},monthly:['May','Jun','Jul','Aug','Sep','Oct'].map((label,i)=>({label,month:`2026-${i+5}`,applications:[1,4,2,8,19,13][i],accepted:0})),batches:[{batch_year:2012,count:30}],interests:skills.map(s=>({id:s.id,name:s.skill_name,count:members.filter(m=>m.interests.includes(s.id)).length})),teams:teams.map(t=>({id:t.id,name:t.team_name,count:members.filter(m=>m.member_team_assignment.some(a=>a.team_id===t.id)).length})),recent:members.slice(-5)}};
const originalFetch=window.fetch.bind(window);
window.fetch=async (input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.origin);
  if(url.origin===location.origin)return originalFetch(input,init);
  if(!url.pathname.startsWith('/rest/v1/'))return response({message:'External requests are disabled in this local fixture'},undefined,403);
  const path=url.pathname.split('/').at(-1);const body=init.body?JSON.parse(init.body):{};const method=init.method||'GET';
  if(path==='admin_withdrawal_passbook')return response(withdrawalPassbook(body.p_limit));
  if(path==='admin_record_withdrawal'){
    const amount=Number(body.p_amount);const current=withdrawalPassbook();
    if(amount>current.available)return response({message:'Amount exceeds the available balance. Refresh and try again.'},undefined,400);
    const withdrawal={id:crypto.randomUUID(),method:body.p_method,amount,transferred_to:body.p_transferred_to,transfer_reference:body.p_transfer_reference,cash_recipient:body.p_cash_recipient,purpose:body.p_purpose,withdrawn_by_name:'Sample Admin',withdrawn_at:new Date().toISOString(),receipt_path:null};
    previewWithdrawals.push(withdrawal);return response({withdrawal,available_balance:current.available-amount});
  }
  if(path==='admin_membership_revenue'){
    const paid=members.filter(m=>((m.membership_fee || []).length > 0) && Number(m.batch_year) > 2008);
    const pendingNon2008=members.filter(m=>m.membership_status==='pending' && Number(m.batch_year) > 2008).length;
    return response({total:paid.length*500,payments:paid.length,missing_amounts:0,approved:paid.filter(m=>m.membership_status==='accepted').length*500,pending:paid.filter(m=>m.membership_status==='pending').length*500,rejected:paid.filter(m=>m.membership_status==='rejected').length*500,pending_count:pendingNon2008});
  }
  if(path==='admin_member_analytics')return response(analytics());
  if(path==='admin_application_activity'){
    const monthly=['6m','1y'].includes(body.p_period); const length={'7d':7,'30d':30,'6m':6,'1y':12}[body.p_period];
    const now=new Date();const points=Array.from({length},(_,i)=>{
      const date=monthly?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-length+1+i,1)):new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-length+1+i));
      const key=date.toISOString().slice(0,monthly?7:10);
      return {label:date.toLocaleDateString('en-GB',{timeZone:'UTC',month:'short',...(monthly?{year:'2-digit'}:{day:'numeric'})}),applications:members.filter(m=>m.created_at.startsWith(key)).length};
    });return response({points,total:points.reduce((sum,p)=>sum+p.applications,0),has_enough_data:points.filter(p=>p.applications>0).length>=2});
  }
  if(path==='admin_member_batches')return response([...new Set(members.map(m=>m.batch_year))].map(batch_year=>({batch_year,total:members.filter(m=>m.batch_year===batch_year).length})));
  if(path==='member'){
    let rows=[...members];for(const key of ['membership_status','is_active','id','batch_year']){if(url.searchParams.has(key)){const value=url.searchParams.get(key).slice(3);rows=rows.filter(m=>String(m[key])===value);}}
    if(url.searchParams.get('or')){const q=url.searchParams.get('or').match(/ilike\."%(.+?)%"/)?.[1]?.toLowerCase();if(q)rows=rows.filter(m=>[m.full_name,m.member_id,m.form_number,m.email_address,m.index_number].some(x=>x?.toLowerCase().includes(q)));}
    const count=rows.length;const from=Number(url.searchParams.get('offset')||0);const limit=url.searchParams.has('limit')?Number(url.searchParams.get('limit')):rows.length;rows=rows.slice(from,from+limit);
    const accept=new Headers(init.headers).get('accept');return response(accept?.includes('vnd.pgrst.object')?rows[0]:rows,count);
  }
  if(path==='skill'||path==='production_team'){
    const list=path==='skill'?skills:teams;const id=url.searchParams.get('id')?.slice(3);
    if(method==='POST'){list.push({...body,id:crypto.randomUUID(),is_active:true,is_protected:false});return response(list.at(-1));}
    if(method==='PATCH'){const item=list.find(x=>x.id===id);Object.assign(item,body);return response(item);}
    return response(list.map(x=>path==='production_team'?{...x,assignments:[{count:members.filter(m=>m.member_team_assignment.some(a=>a.team_id===x.id)).length}]}:x));
  }
  if(path==='member_team_assignment'){
    const teamId=body.team_id||url.searchParams.get('team_id')?.slice(3);
    const memberId=body.member_id||url.searchParams.get('member_id')?.slice(3);
    const member=members.find(m=>m.id===memberId);
    if(method==='POST'){
      if(member.member_team_assignment.some(a=>a.team_id===teamId))return response({code:'23505',message:'Already assigned'},undefined,409);
      const assignment={member_id:memberId,team_id:teamId,assigned_at:new Date().toISOString(),production_team:teams.find(t=>t.id===teamId)};
      member.member_team_assignment.push(assignment);return response(assignment);
    }
    if(method==='DELETE'){member.member_team_assignment=member.member_team_assignment.filter(a=>a.team_id!==teamId);return response({member_id:memberId});}
    const rows=members.flatMap(m=>m.member_team_assignment.filter(a=>a.team_id===teamId).map(a=>({...a,member:{id:m.id,full_name:m.full_name,member_id:m.member_id,index_number:m.index_number,membership_status:m.membership_status,is_active:m.is_active}})));
    const from=Number(url.searchParams.get('offset')||0);const limit=Number(url.searchParams.get('limit')||8);return response(rows.slice(from,from+limit),rows.length);
  }
  if(path==='admin_whatsapp_status')return response({status:'not_requested'});
  if(['approve_member','approve_member_with_notification','admin_review_member','admin_set_member_active','admin_save_member'].includes(path)){
    let member=members.find(m=>m.id===body.p_id);
    if(path==='admin_save_member'){
      if(!member){member={...members[0],id:crypto.randomUUID(),member_id:null,membership_status:'pending',created_at:new Date().toISOString(),member_team_assignment:[]};members.push(member);}
      Object.assign(member,body.p_payload);
      for(const name of body.p_payload.custom_skills || []) {
        let skill=skills.find(s=>s.skill_name.toLowerCase()===name);
        if(!skill){skill={id:crypto.randomUUID(),skill_name:name,is_active:true,is_protected:false};skills.push(skill);}
        member.interests=[...new Set([...(member.interests || []),skill.id])];
      }
      if('fee_received' in body.p_payload){
        let mf = membershipFees.find(f => f.member_id === member.id);
        if(body.p_payload.fee_received){
          const feeItem = { academic_year: '2026/2027', fee_amount: 500, paid_date: new Date().toISOString(), payment_method: 'cash' };
          if(!mf){
            mf = {
              id: crypto.randomUUID(),
              member_id: member.id,
              fees: [feeItem],
              notes: []
            };
            membershipFees.push(mf);
          } else if(!mf.fees.some(f => f.academic_year === '2026/2027')) {
            mf.fees.push(feeItem);
          }
          member.membership_fee = [mf];
        } else {
          if (mf) mf.fees = mf.fees.filter(f => f.academic_year !== '2026/2027');
          member.membership_fee = mf?.fees?.length ? [mf] : [];
        }
      }
      return response({id:member.id});
    }
    if(['approve_member','approve_member_with_notification'].includes(path)){
      const hasFee = (member.membership_fee?.[0]?.fees || []).some(f => f.academic_year === '2026/2027');
      if(member.form_number && !hasFee) return response({message:'Record the received fee before approval'},undefined,400);
      member.membership_status='accepted';
      member.member_id='12M048';
      return response(member.member_id);
    }
    if(path==='admin_review_member')member.membership_status=body.p_status;
    if(path==='admin_set_member_active')member.is_active=body.p_active;
    return response({id:member.id});
  }
  if(path==='config')return response(configs);
  if(path==='membership_fee'){
    let rows=membershipFees.map(f=>({...f,member:members.find(m=>m.id===f.member_id)}));
    if(url.searchParams.has('member_id')){const value=url.searchParams.get('member_id').slice(3);rows=rows.filter(f=>f.member_id===value);}
    return response(rows,rows.length);
  }
  if(path==='admin_get_member_fee_history'){
    const mf=membershipFees.find(f=>f.member_id===body.p_member_id);
    return response(mf ? mf.fees : []);
  }
  if(path==='admin_record_membership_fee'){
    let mf=membershipFees.find(f=>f.member_id===body.p_member_id);
    const feeItem = {
      academic_year: body.p_academic_year,
      fee_amount: body.p_fee_amount || 500,
      paid_date: body.p_paid_date || new Date().toISOString().slice(0,10),
      receipt_number: body.p_receipt_number || null,
      recorded_by_name: 'Sample Admin',
      notes: body.p_notes || null,
    };
    if(mf){
      mf.fees = [...mf.fees.filter(f => f.academic_year !== body.p_academic_year), feeItem];
      if(body.p_notes) mf.notes.push({ text: body.p_notes, date: feeItem.paid_date });
    } else {
      mf = {
        id: crypto.randomUUID(),
        member_id: body.p_member_id,
        fees: [feeItem],
        notes: body.p_notes ? [{ text: body.p_notes, date: feeItem.paid_date }] : [],
      };
      membershipFees.push(mf);
    }
    const m=members.find(x=>x.id===body.p_member_id);
    if(m) m.membership_fee = [mf];
    return response({id:mf.id});
  }
  return response({message:'Unimplemented fixture request'},undefined,400);
};
const previewOptions=new URLSearchParams(location.search);
const initial=previewOptions.get('route')||'/admin';
const logoutMode=previewOptions.get('logout')||'success';
const requestedDelay=Number(previewOptions.get('logoutDelay')??600);
const logoutDelay=Number.isFinite(requestedDelay)?Math.max(0,Math.min(requestedDelay,5000)):600;
const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});

export function PreviewSession() {
  const [signedIn,setSignedIn]=useState(initial!=='/login');
  const logoutAttempts=useRef(0);
  const navigate=useNavigate();
  async function logout() {
    logoutAttempts.current+=1;
    const attempt=logoutAttempts.current;
    await new Promise(resolve=>setTimeout(resolve,logoutDelay));
    if(logoutMode==='error'||(logoutMode==='error-once'&&attempt===1))throw new Error('Preview sign out failed. Please try again.');
    setSignedIn(false);
  }
  function returnToWorkspace() {
    setSignedIn(true);
    navigate(initial.startsWith('/admin')?initial:'/admin',{replace:true});
  }
  return <AuthContext.Provider value={{user:signedIn?{id:uuid(999),app_metadata:{display_name:'Sample Admin',web_index:'TEST',role:'super_admin'}}:null,isAdmin:signedIn,isAuthenticated:signedIn,logout}}>
    <Routes>
      <Route path="/admin/*" element={signedIn?<AdminWorkspace/>:<Navigate to="/login" replace/>}/>
      <Route path="/login" element={<main style={{minHeight:'100svh',display:'grid',placeContent:'center',gap:16,padding:32,maxWidth:580,margin:'auto'}}>
        <p style={{color:'#a7b6ad',fontSize:12}}>LOCAL SIGN-IN PREVIEW</p>
        <h1 style={{fontSize:28,fontWeight:600}}>{signedIn?'Sign-in preview':'You are signed out'}</h1>
        <p style={{color:'#a7b6ad'}}>This local test uses a synthetic account. No real sign-in or sign-out requests are sent.</p>
        <button type="button" onClick={returnToWorkspace} style={{minHeight:44,padding:'12px 20px',borderRadius:24,background:'#2da84d',color:'#061b0c',fontWeight:600,cursor:'pointer'}}>Return to workspace</button>
      </main>}/>
      <Route path="*" element={<Navigate to={signedIn?'/admin':'/login'} replace/>}/>
    </Routes>
  </AuthContext.Provider>;
}

createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><ToastProvider><MemoryRouter initialEntries={[initial]}><PreviewSession/></MemoryRouter></ToastProvider><div style={{position:'fixed',bottom:0,right:0,padding:'3px 8px',fontSize:9,background:'#382e10',color:'#e9dca9',zIndex:100}}>LOCAL UI TEST · SYNTHETIC DATA</div></QueryClientProvider>);
