// Isolated browser fixture. Not imported by the application or included in its build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
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
members.forEach((member,index)=>Object.assign(member,{form_number:String(index+1).padStart(4,'0'),application_source:'paper',school_class:'9 A',address:'Example address, Colombo',other_skills:'',fee_amount:500,fee_paid_at:index===31?null:'2026-10-14T06:00:00Z',processed_by_name:'Sample Admin',approved_by_name:member.member_id?'Sample Admin':null}));
const response=(data,count,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...(count!==undefined?{'content-range':`0-${Math.max(0,count-1)}/${count}`}:{})}});
function analytics(){return {counts:{total:members.length,accepted:members.filter(m=>m.membership_status==='accepted').length,pending:members.filter(m=>m.membership_status==='pending').length,rejected:members.filter(m=>m.membership_status==='rejected').length,active:members.filter(m=>m.membership_status==='accepted'&&m.is_active).length,inactive:members.filter(m=>m.membership_status==='accepted'&&!m.is_active).length,teams:teams.filter(t=>t.is_active).length,skills:skills.filter(s=>s.is_active).length},monthly:['May','Jun','Jul','Aug','Sep','Oct'].map((label,i)=>({label,month:`2026-${i+5}`,applications:[1,4,2,8,19,13][i],accepted:0})),batches:[{batch_year:2012,count:30}],interests:skills.map(s=>({id:s.id,name:s.skill_name,count:members.filter(m=>m.interests.includes(s.id)).length})),teams:teams.map(t=>({id:t.id,name:t.team_name,count:members.filter(m=>m.member_team_assignment.some(a=>a.team_id===t.id)).length})),recent:members.slice(-5)}};
const originalFetch=window.fetch.bind(window);
window.fetch=async (input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.origin);
  if(url.origin===location.origin)return originalFetch(input,init);
  if(!url.pathname.startsWith('/rest/v1/'))return response({message:'External requests are disabled in this local fixture'},undefined,403);
  const path=url.pathname.split('/').at(-1);const body=init.body?JSON.parse(init.body):{};const method=init.method||'GET';
  if(path==='admin_member_analytics')return response(analytics());
  if(path==='member'){
    let rows=[...members];for(const key of ['membership_status','is_active','id']){if(url.searchParams.has(key)){const value=url.searchParams.get(key).slice(3);rows=rows.filter(m=>String(m[key])===value);}}
    if(url.searchParams.get('or')){const q=url.searchParams.get('or').match(/ilike\."%(.+?)%"/)?.[1]?.toLowerCase();if(q)rows=rows.filter(m=>[m.full_name,m.member_id,m.form_number,m.email_address,m.index_number].some(x=>x?.toLowerCase().includes(q)));}
    const count=rows.length;const from=Number(url.searchParams.get('offset')||0);const limit=Number(url.searchParams.get('limit')||20);rows=rows.slice(from,from+limit);
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
  if(['approve_member','admin_review_member','admin_set_member_active','admin_save_member'].includes(path)){
    let member=members.find(m=>m.id===body.p_id);
    if(path==='admin_save_member'){
      if(!member){member={...members[0],id:crypto.randomUUID(),member_id:null,membership_status:'pending',created_at:new Date().toISOString(),member_team_assignment:[]};members.push(member);}
      Object.assign(member,body.p_payload);if('fee_received' in body.p_payload)member.fee_paid_at=body.p_payload.fee_received?new Date().toISOString():null;return response({id:member.id});
    }
    if(path==='approve_member'){if(member.application_source==='paper'&&!member.fee_paid_at)return response({message:'Record the received fee before approval'},undefined,400);member.membership_status='accepted';member.member_id='12M048';member.approved_by_name='Sample Admin';return response(member.member_id);}
    if(path==='admin_review_member')member.membership_status=body.p_status;
    if(path==='admin_set_member_active')member.is_active=body.p_active;
    return response({id:member.id});
  }
  return response({message:'Unimplemented fixture request'},undefined,400);
};
const initial=new URLSearchParams(location.search).get('route')||'/admin';
const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><AuthContext.Provider value={{user:{id:uuid(999),app_metadata:{display_name:'Sample Admin',web_index:'TEST'}},isAdmin:true,isAuthenticated:true,logout:async()=>{}}}><ToastProvider><MemoryRouter initialEntries={[initial]}><AdminWorkspace/></MemoryRouter></ToastProvider></AuthContext.Provider><div style={{position:'fixed',bottom:0,right:0,padding:'3px 8px',fontSize:9,background:'#382e10',color:'#e9dca9',zIndex:100}}>LOCAL UI TEST · SYNTHETIC DATA</div></QueryClientProvider>);
