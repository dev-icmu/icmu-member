import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Layers3, Sparkles, ChartNoAxesCombined, LogOut, ArrowUpRight, RefreshCw, ChevronRight, ShieldCheck, PanelLeft, Receipt, BanknoteArrowUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/motion/button/base';
import { AnimatedSidebarProvider, AnimatedSidebar, AnimatedSidebarTrigger, AnimatedSidebarHeader, AnimatedSidebarContent, AnimatedSidebarFooter, AnimatedSidebarMenu, AnimatedSidebarMenuItem, AnimatedSidebarMenuButton, AnimatedSidebarGroupLabel, AnimatedSidebarInset } from '@/components/motion/animated-sidebar';
import { AdminSearch } from '@/features/admin/components/AdminSearch';
import { AdminAccountMenu } from '@/features/admin/components/AdminAccountMenu';
import IcmuLogo from '@/components/portfolio/IcmuLogo';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { MemberDirectory } from '@/features/admin/components/MemberDirectory';
import { SkillsTab } from '@/features/admin/components/SkillsTab';
import { TeamsTab } from '@/features/admin/components/TeamsTab';
import { FeesTab } from '@/features/admin/components/FeesTab';
import { WithdrawalsTab } from '@/features/admin/components/WithdrawalsTab';
import { useAdminAnalytics } from '@/entities/members/hooks/useMembers';
import GradualBlur from '@/components/reactbits/GradualBlur';
import { EASE_OUT } from '@/lib/ease';
import '@/features/admin/admin.css';
import '../features/admin/mobile.css';
import '../features/admin/theme.css';
import '../features/admin/mobile-header.css';
import '../features/admin/motion.css';

gsap.registerPlugin(useGSAP, CustomEase);
const headerEase = CustomEase.create('admin-header', EASE_OUT.join(','));
const items=[['dashboard','Dashboard',LayoutDashboard],['members','Members',Users],['applications','Applications',ClipboardList],['fees','Fees',Receipt],['withdrawals','Withdrawals',BanknoteArrowUp],['teams','Production teams',Layers3],['skills','Skills',Sparkles],['analytics','Analytics',ChartNoAxesCombined]];
function AdminBrand() {
  return <Link className="adm-brand" to="/admin" aria-label="ICMU Member dashboard"><span><IcmuLogo/></span><div><strong>MEMBER<span> /</span></strong><small>ISIPATHANA COLLEGE MEDIA UNIT</small></div></Link>;
}
export function AdminWorkspace() {
  const reduce = useReducedMotion();
  const topbarRef = useRef(null);
  const location=useLocation();const navigate=useNavigate();const qc=useQueryClient();const {user,logout}=useAuth();const summary=useAdminAnalytics();
  const [signingOut,setSigningOut]=useState(false);const [error,setError]=useState('');const [refreshing,setRefreshing]=useState(false);
  const section=location.pathname.split('/')[2]||'dashboard';const active=items.find(i=>i[0]===section);
  const name=user?.app_metadata?.display_name || 'ICMU admin';
  const role=user?.app_metadata?.role || user?.user_metadata?.role || user?.app_metadata?.web_role || (user?.role !== 'authenticated' ? user?.role : null);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('admin-route');
    const existingThemeTags = [...document.querySelectorAll('meta[name="theme-color"]')];
    const themeTags = existingThemeTags.length ? existingThemeTags : [document.createElement('meta')];
    const previousColors = themeTags.map(tag => tag.getAttribute('content'));
    const canvas = getComputedStyle(root).getPropertyValue('--admin-canvas').trim();
    if (!existingThemeTags.length) {
      themeTags[0].setAttribute('name', 'theme-color');
      document.head.append(themeTags[0]);
    }
    themeTags.forEach(tag => tag.setAttribute('content', canvas));
    return () => {
      root.classList.remove('admin-route');
      if (!existingThemeTags.length) themeTags[0].remove();
      else themeTags.forEach((tag, index) => previousColors[index] === null ? tag.removeAttribute('content') : tag.setAttribute('content', previousColors[index]));
    };
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useGSAP(() => {
    const header = topbarRef.current;
    if (!header) return;
    const media = gsap.matchMedia();
    media.add({ mobile: '(max-width:767px)', motion: '(prefers-reduced-motion:no-preference)' }, context => {
      if (!context.conditions.mobile) return;
      const refreshButton = header.querySelector('.adm-header-refresh');
      const capsules = [...header.querySelectorAll('.adm-mobile-brand .adm-brand, .adm-topbar-actions')];
      const moves = context.conditions.motion ? capsules.map(capsule => gsap.quickTo(capsule, 'y', { duration:0.22, ease:headerEase })) : [];
      let compact = false;
      const sync = () => {
        // Separate thresholds prevent flickering when scrolling near the boundary.
        const next = window.scrollY > (compact ? 48 : 112);
        if (compact === next && header.dataset.compact !== undefined) return;
        compact = next;
        header.dataset.compact = String(compact);
        if (refreshButton) refreshButton.inert = compact;
        moves.forEach(move => move(compact ? -4 : 0));
      };
      sync();
      window.addEventListener('scroll', sync, {passive:true});
      return () => {
        window.removeEventListener('scroll', sync);
        moves.forEach(move => move.tween.kill());
        delete header.dataset.compact;
        if (refreshButton) refreshButton.inert = false;
      };
    });
    return () => media.revert();
  }, { scope:topbarRef });
  async function signOut(){setSigningOut(true);try{await logout();navigate('/login',{replace:true});}catch(err){setError(err.message);setSigningOut(false);}}
  async function refresh(){setRefreshing(true);try{await Promise.all(['members','member-batches','membership-revenue','application-activity','admin-analytics','teams','team-members','skills','fees','member-fee-history','app-config','admin-withdrawal-passbook'].map(key=>qc.invalidateQueries({queryKey:[key]})));}finally{setRefreshing(false);}}
  if(!active)return <Navigate to="/admin" replace/>;
  return <AnimatedSidebarProvider className="admin-workspace" style={{'--sidebar-width':'244px','--sidebar-width-icon':'72px'}}>
    <AnimatedSidebar variant="inset" ariaLabel="Admin navigation" panelClassName="adm-sidebar-panel" className="adm-sidebar">
      <AnimatedSidebarHeader className="adm-sidebar-brand"><AdminBrand/></AnimatedSidebarHeader>
      <AnimatedSidebarContent className="adm-sidebar-content"><AnimatedSidebarGroupLabel>WORKSPACE</AnimatedSidebarGroupLabel><AnimatedSidebarMenu>{items.map(([id,label,Icon])=><AnimatedSidebarMenuItem key={id}><AnimatedSidebarMenuButton icon={<Icon size={18}/>} isActive={section===id} onSelect={()=>navigate(id==='dashboard'?'/admin':`/admin/${id}`)} badge={id==='applications'&&summary.data?.counts.pending?String(summary.data.counts.pending):undefined} badgeClassName={id==='applications'?'adm-sidebar-indicator':undefined}>{label}</AnimatedSidebarMenuButton></AnimatedSidebarMenuItem>)}</AnimatedSidebarMenu></AnimatedSidebarContent>
      <AnimatedSidebarFooter className="adm-sidebar-footer"><AdminAccountMenu user={user} name={name} role={role} signingOut={signingOut} onSignOut={signOut} onRefresh={refresh} sidebar/><div className="adm-account-links"><Link to="/" className="adm-visit-button">Visit website <ArrowUpRight size={13}/></Link><Button type="button" variant="ghost" size="icon" className="adm-account-signout" aria-label="Sign out" disabled={signingOut} onClick={signOut}><LogOut size={15}/></Button></div></AnimatedSidebarFooter>
    </AnimatedSidebar>
    <AnimatedSidebarInset className="adm-main">
      <GradualBlur
        target="page"
        position="top"
        height="calc(5rem + env(safe-area-inset-top, 0px))"
        strength={2}
        divCount={5}
        curve="bezier"
        exponential={true}
        opacity={1}
        zIndex={39}
        className="adm-gradual-blur-mobile"
      />
      <header ref={topbarRef} className="adm-topbar"><nav className="adm-breadcrumb" aria-label="Breadcrumb"><AnimatedSidebarTrigger className="adm-desktop-navigation-toggle"><PanelLeft size={18}/></AnimatedSidebarTrigger><span>Workspace</span><ChevronRight size={13} aria-hidden="true"/><strong aria-current="page">{active[1]}</strong></nav><div className="adm-header-island"><div className="adm-mobile-brand"><AdminBrand/></div><div className="adm-topbar-actions"><AdminSearch className="adm-topbar-search"/><Button type="button" variant="ghost" size="icon" className="adm-header-refresh" disabled={refreshing} aria-label="Refresh workspace data" onClick={refresh}><RefreshCw size={17} className={refreshing?'adm-spin':''}/></Button><AdminAccountMenu user={user} name={name} role={role} signingOut={signingOut} onSignOut={signOut} onRefresh={refresh}/></div></div></header>
      <div className="adm-page" id="admin-main"><nav className="adm-mobile-breadcrumb" aria-label="Breadcrumb"><Link to="/admin">Workspace</Link><ChevronRight size={12} aria-hidden="true"/><span aria-current="page">{active[1]}</span></nav>{error&&<div role="alert" className="adm-error">{error}</div>}{section==='dashboard'||section==='analytics'?<AdminDashboard analytics={section==='analytics'}/>:section==='members'||section==='applications'?<MemberDirectory key={section} applications={section==='applications'}/>:section==='fees'?<FeesTab/>:section==='withdrawals'?<WithdrawalsTab/>:section==='teams'?<TeamsTab/>:section==='skills'?<SkillsTab/>:<Navigate to="/admin" replace/>}</div>
      <footer className="adm-workspace-footer"><span>ICMU MEMBER</span><span><span className="adm-dot"/> {summary.isError?'Connection needs attention':summary.isFetching?'Updating workspace':'Connected to the unit'}</span></footer>
    </AnimatedSidebarInset>
    <GradualBlur
      target="page"
      position="bottom"
      height="calc(6rem + env(safe-area-inset-bottom, 0px))"
      strength={2.5}
      divCount={5}
      curve="bezier"
      exponential={true}
      opacity={1}
      zIndex={43}
      className="adm-gradual-blur-mobile"
    />
    <LayoutGroup id="admin-island"><nav className="adm-mobile-nav" aria-label="Quick navigation">
      {items.slice(0,3).map(([id,label,Icon]) => <Link key={id} to={id==='dashboard'?'/admin':`/admin/${id}`} aria-current={section===id?'page':undefined}>
        {section===id && <motion.span className="adm-island-active" layoutId="active" transition={reduce?{duration:0}:{type:'spring',stiffness:420,damping:34}}/>}<Icon size={20}/><span>{id==='applications'?'Applications':label}</span>
      </Link>)}
      <AnimatedSidebarTrigger aria-label="More admin sections">{!['dashboard','members','applications'].includes(section) && <motion.span className="adm-island-active" layoutId="active" transition={reduce?{duration:0}:{type:'spring',stiffness:420,damping:34}}/>}<Layers3 size={20}/><span>More</span></AnimatedSidebarTrigger>
    </nav></LayoutGroup>
  </AnimatedSidebarProvider>;
}
export default function AdminPage(){
  const {isAdmin,loading,accessLoading,authError,refreshAccess,logout}=useAuth();
  const [error,setError]=useState('');
  if(loading||accessLoading)return <div className="adm-auth-state" role="status"><IcmuLogo/></div>;
  if(!isAdmin&&authError)return <div className="adm-auth-state"><ShieldCheck size={32}/><h1>Admin access needs attention</h1><p role="alert">{error||authError}</p><Button type="button" onClick={()=>refreshAccess()}>Try again</Button><Button type="button" variant="secondary" onClick={()=>logout().catch(err=>setError(err.message))}>Sign out</Button><Link to="/login">Go to sign in</Link></div>;
  if(!isAdmin)return <Navigate to="/login" replace/>;
  return <AdminWorkspace/>;
}
