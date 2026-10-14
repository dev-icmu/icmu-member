import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationActivity } from './ApplicationActivity';
import { ApplicationOutcomes } from './ApplicationOutcomes';
import { MembershipRevenue } from './MembershipRevenue';
import { AdminNumber } from './AdminMotion';
import { titleCase, nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { Users, UserCheck, Clock3, Layers3, ArrowUpRight, Plus, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { useAdminAnalytics } from '@/entities/members/hooks/useMembers';
import { MemberEditor, memberError } from './MemberEditor';
import { MemberDetails, MemberStatus, displayDate } from './MemberDirectory';

function Metric({ icon:Icon, label, value, note, href }) { return <Link to={href} className="adm-metric"><div><span className="adm-metric-icon"><Icon size={18}/></span><ArrowUpRight size={16}/></div><span>{label}</span><strong><AdminNumber value={value}/></strong><small>{note}</small></Link>; }
function Bars({ data, empty }) { const max=Math.max(1,...data.map(x=>Number(x.count))); return <div className="adm-bars">{!data.length?<p className="adm-hint">{empty}</p>:data.map((item,i)=><div key={item.id||item.name||i}><div><span>{item.name}</span><strong>{Number(item.count).toLocaleString()}</strong></div><span className="adm-bar-track"><span style={{width:`${Number(item.count)/max*100}%`}}/></span></div>)}</div>; }
export function AdminDashboard({ analytics=false }) {
  const query=useAdminAnalytics();const [modal,setModal]=useState(null);
  if(query.isPending)return <div className="adm-dashboard-skeleton" role="status" aria-label="Loading dashboard">{[1,2,3,4,5,6].map(n=><div key={n}/>)}</div>;
  if(query.isError&&!query.data)return <div className="adm-state" role="alert"><h1>Could not load the dashboard</h1><p>{memberError(query.error)}</p><Button type="button" onClick={()=>query.refetch()}>Try again</Button></div>;
  const data=query.data;const c=data.counts;
  return <>
    <div className="adm-section-heading"><div><div className="adm-eyebrow"><span/> MEMBER WORKSPACE</div><h1>{analytics?'Membership analytics':'Dashboard'}</h1><p>{analytics?'Applications, membership and skills across the unit.':'Manage members, review applications and organise your teams.'}</p></div><Button type="button" onClick={()=>setModal({type:'edit'})}><Plus size={17}/> Submit an application</Button></div>
    {analytics&&<MembershipRevenue/>}
    <div className="adm-overview-grid"><div className="adm-metrics">
      <Metric icon={Users} label="Active members" value={Number(c.active)} note={`${c.inactive} inactive · ${c.accepted} accepted overall`} href="/admin/members"/>
      <Metric icon={Clock3} label="Pending applications" value={Number(c.pending)} note="Ready for your review" href="/admin/applications"/>
      <Metric icon={UserCheck} label="Total applications" value={Number(c.total)} note={`${c.rejected} rejected applications`} href="/admin/applications?status=all"/>
      <Metric icon={Layers3} label="Production teams" value={Number(c.teams)} note={`${c.skills} active skills to explore`} href="/admin/teams"/>
    </div><ApplicationActivity/></div>
    <div className="adm-lower-grid"><section className="adm-panel"><div className="adm-panel-heading"><div><span className="adm-eyebrow">THE LATEST</span><h2>Recent applications</h2></div><Link to="/admin/applications?status=all" className="adm-link">View all <ArrowUpRight size={16}/></Link></div><div className="adm-recent-list">{data.recent?.length?data.recent.map(m=><button type="button" key={m.id} onClick={()=>setModal({type:'detail',id:m.id})}><span className="adm-avatar">{m.full_name?.charAt(0).toUpperCase()}</span><span className="adm-recent-name"><strong title={titleCase(m.full_name)}>{m.name_with_initials || nameWithInitials(m.full_name)}</strong><small>{displayDate(m.created_at)} · {m.member_id||'Awaiting member ID'}</small></span><MemberStatus member={m}/><ArrowUpRight size={15}/></button>):<div className="adm-state"><p>No applications yet.</p></div>}</div><div className="adm-panel-foot"><span><Clock3 size={15}/>{c.pending} waiting for review</span><Link to="/admin/applications" className="adm-link">Open applications <ArrowRight size={15}/></Link></div></section>
      <section className="adm-panel"><div className="adm-panel-heading"><div><span className="adm-eyebrow">WHAT THEY WANT TO LEARN</span><h2>Member interests</h2></div><Activity size={18}/></div><Bars data={data.interests||[]} empty="Interests will appear as members select skills."/></section></div>
    {analytics&&<div className="adm-analytics-grid"><section className="adm-panel"><div className="adm-panel-heading"><h2>Accepted members by batch</h2></div><Bars data={(data.batches||[]).map(b=>({name:String(b.batch_year??'Not recorded'),count:b.count}))} empty="No accepted members yet."/></section><section className="adm-panel"><div className="adm-panel-heading"><h2>Active team membership</h2></div><Bars data={data.teams||[]} empty="Create a production team to get started."/><p className="adm-hint adm-chart-note">A member can belong to more than one team.</p></section><ApplicationOutcomes counts={c}/></div>}
    {!analytics&&<Link to="/admin/analytics" className="adm-analytics-link">Explore membership analytics <ArrowUpRight size={17}/></Link>}
    {modal?.type==='edit'&&<MemberEditor id={modal.id} onClose={()=>setModal(null)}/>}{modal?.type==='detail'&&<MemberDetails id={modal.id} onClose={()=>setModal(null)} onEdit={id=>setModal({type:'edit',id})}/>}
  </>;
}
