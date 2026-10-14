import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Layers3, Sparkles, ChartNoAxesCombined, LogOut, ArrowUpRight, Search, RefreshCw, ChevronRight, ShieldCheck, PanelLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/motion/button/base';
import { AnimatedSidebarProvider, AnimatedSidebar, AnimatedSidebarTrigger, AnimatedSidebarHeader, AnimatedSidebarContent, AnimatedSidebarFooter, AnimatedSidebarMenu, AnimatedSidebarMenuItem, AnimatedSidebarMenuButton, AnimatedSidebarGroupLabel, AnimatedSidebarInset } from '@/components/motion/animated-sidebar';
import IcmuLogo from '@/components/portfolio/IcmuLogo';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { MemberDirectory } from '@/features/admin/components/MemberDirectory';
import { SkillsTab } from '@/features/admin/components/SkillsTab';
import { TeamsTab } from '@/features/admin/components/TeamsTab';
import { useAdminAnalytics } from '@/entities/members/hooks/useMembers';
import '@/features/admin/admin.css';

const items=[['dashboard','Dashboard',LayoutDashboard],['members','Members',Users],['applications','Member applications',ClipboardList],['teams','Production teams',Layers3],['skills','Skills',Sparkles],['analytics','Analytics',ChartNoAxesCombined]];
export function AdminWorkspace() {
  const location=useLocation();const navigate=useNavigate();const qc=useQueryClient();const {user,logout}=useAuth();const summary=useAdminAnalytics();
  const [search,setSearch]=useState('');const [signingOut,setSigningOut]=useState(false);const [error,setError]=useState('');const [refreshing,setRefreshing]=useState(false);
  const section=location.pathname.split('/')[2]||'dashboard';const active=items.find(i=>i[0]===section);
  const name=user?.app_metadata?.display_name || 'ICMU admin';
  async function signOut(){setSigningOut(true);try{await logout();navigate('/login',{replace:true});}catch(err){setError(err.message);setSigningOut(false);}}
  async function refresh(){setRefreshing(true);try{await Promise.all(['members','admin-analytics','teams','team-members','skills'].map(key=>qc.invalidateQueries({queryKey:[key]})));}finally{setRefreshing(false);}}
  if(!active)return <Navigate to="/admin" replace/>;
  return <AnimatedSidebarProvider className="admin-workspace" style={{'--sidebar-width':'244px','--sidebar-width-icon':'72px'}}>
    <AnimatedSidebar variant="inset" ariaLabel="Admin navigation" panelClassName="adm-sidebar-panel" className="adm-sidebar">
      <AnimatedSidebarHeader className="adm-sidebar-brand"><Link to="/admin" aria-label="ICMU Member dashboard"><span><IcmuLogo/></span><div><strong>MEMBER<span> /</span></strong><small>ISIPATHANA COLLEGE MEDIA UNIT</small></div></Link></AnimatedSidebarHeader>
      <AnimatedSidebarContent className="adm-sidebar-content"><AnimatedSidebarGroupLabel>WORKSPACE</AnimatedSidebarGroupLabel><AnimatedSidebarMenu>{items.map(([id,label,Icon])=><AnimatedSidebarMenuItem key={id}><AnimatedSidebarMenuButton icon={<Icon size={18}/>} isActive={section===id} onSelect={()=>navigate(id==='dashboard'?'/admin':`/admin/${id}`)} badge={id==='applications'&&summary.data?.counts.pending?String(summary.data.counts.pending):undefined}>{label}</AnimatedSidebarMenuButton></AnimatedSidebarMenuItem>)}</AnimatedSidebarMenu><div className="adm-sidebar-note"><span className="adm-dot"/> One unit. Every member counts.</div></AnimatedSidebarContent>
      <AnimatedSidebarFooter className="adm-sidebar-footer"><div className="adm-account"><span className="adm-avatar">{name.charAt(0)}</span><div><strong>{name}</strong><small>Administrator</small></div><ShieldCheck size={16}/></div><div className="adm-account-links"><Link to="/">Visit website <ArrowUpRight size={14}/></Link><Button type="button" variant="ghost" size="icon" aria-label="Sign out" disabled={signingOut} onClick={signOut}><LogOut size={17}/></Button></div></AnimatedSidebarFooter>
    </AnimatedSidebar>
    <AnimatedSidebarInset className="adm-main"><header className="adm-topbar"><div className="adm-breadcrumb"><AnimatedSidebarTrigger><PanelLeft size={18}/></AnimatedSidebarTrigger><span>Workspace</span><ChevronRight size={13}/><strong>{active[1]}</strong></div><div className="adm-topbar-actions"><form className="adm-topbar-search" onSubmit={e=>{e.preventDefault();navigate(`/admin/members?q=${encodeURIComponent(search.trim())}`);setSearch('');}}><Search size={16}/><input aria-label="Find a member" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a member..."/><button type="submit" aria-label="Search"><ChevronRight size={15}/></button></form><Button type="button" variant="ghost" size="icon" disabled={refreshing} aria-label="Refresh workspace data" onClick={refresh}><RefreshCw size={17} className={refreshing?'adm-spin':''}/></Button><span className="adm-user-dot" title={name}>{name.charAt(0)}</span></div></header>
      <div className="adm-page" id="admin-main">{error&&<div role="alert" className="adm-error">{error}</div>}{section==='dashboard'||section==='analytics'?<AdminDashboard analytics={section==='analytics'}/>:section==='members'||section==='applications'?<MemberDirectory key={section} applications={section==='applications'}/>:section==='teams'?<TeamsTab/>:<SkillsTab/>}</div>
      <footer className="adm-workspace-footer"><span>ICMU MEMBER</span><span><span className="adm-dot"/> {summary.isError?'Connection needs attention':summary.isFetching?'Updating workspace':'Connected to the unit'}</span></footer>
    </AnimatedSidebarInset>
  </AnimatedSidebarProvider>;
}
export default function AdminPage(){
  const {isAdmin,loading,accessLoading,authError,refreshAccess,logout}=useAuth();
  const [error,setError]=useState('');
  if(loading||accessLoading)return <div className="adm-auth-state" role="status"><IcmuLogo/><p>Checking admin access...</p></div>;
  if(!isAdmin&&authError)return <div className="adm-auth-state"><ShieldCheck size={32}/><h1>Admin access needs attention</h1><p role="alert">{error||authError}</p><Button type="button" onClick={()=>refreshAccess()}>Try again</Button><Button type="button" variant="secondary" onClick={()=>logout().catch(err=>setError(err.message))}>Sign out</Button><Link to="/login">Go to sign in</Link></div>;
  if(!isAdmin)return <Navigate to="/login" replace/>;
  return <AdminWorkspace/>;
}
