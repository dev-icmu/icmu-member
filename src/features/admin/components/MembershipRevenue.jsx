import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Eye, EyeOff, Wallet, Receipt, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import '../revenue.css';
import { AdminLoading } from './AdminMotion';
import { useAdminAnalytics } from '@/entities/members/hooks/useMembers';
import { MEMBERSHIP_FEE_LKR } from '@/entities/members/lib/memberPayload';
import { PaidMembersSheet } from './PaidMembersSheet';

const ranges = [['all','All time'],['7d','7 days'],['30d','30 days'],['6m','6 months'],['1y','1 year']];
const money = value => Number(value).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const privacyKey = 'icmu:hide-fee-amounts';

export function MembershipRevenue() {
  const [period,setPeriod] = useState('30d');
  const [hidden,setHidden] = useState(()=>{try{const stored=localStorage.getItem(privacyKey);return stored===null?true:stored==='true';}catch{return true;}});
  const [showPaidSheet, setShowPaidSheet] = useState(false);
  const analyticsQuery = useAdminAnalytics();
  const query = useQuery({
    queryKey:['membership-revenue',period], staleTime:30_000,
    queryFn:async({signal})=>{
      const {data,error} = await supabase.rpc('admin_membership_revenue',{p_period:period}).abortSignal(signal);
      if(error)throw error;
      return data;
    },
  });
  function toggle() {
    const value=!hidden;setHidden(value);
    try { localStorage.setItem(privacyKey,String(value)); } catch { /* The toggle still works without storage. */ }
  }
  const amount = value => hidden ? <span className="adm-money-mask" aria-label="Amount hidden"><span aria-hidden="true">••••••</span></span> : money(value);

  const pendingCount = Number(analyticsQuery.data?.counts?.pending || 0);
  const approvedIncome = Number(query.data?.approved || 0);
  const estPendingIncome = pendingCount * MEMBERSHIP_FEE_LKR;
  const totalEstIncome = approvedIncome + estPendingIncome;

  return <>
    <section className="adm-panel adm-revenue" aria-label="Membership revenue">
      <div className="adm-revenue-heading"><span><Wallet size={17}/> Estimated total</span><div>
        <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="adm-range-trigger" aria-label={`Revenue range: ${ranges.find(([id])=>id===period)[1]}`}><span>{ranges.find(([id])=>id===period)[1]}<ChevronDown size={13}/></span></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="adm-range-menu"><DropdownMenuRadioGroup value={period} onValueChange={setPeriod}>{ranges.map(([id,label])=><DropdownMenuRadioItem key={id} value={id}>{label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
        </DropdownMenu>
        <button type="button" className="adm-revenue-eye" aria-label={hidden?'Show fee amounts':'Hide fee amounts'} aria-pressed={hidden} onClick={toggle}>{hidden?<EyeOff size={19}/>:<Eye size={19}/>}</button>
      </div></div>
      {query.isPending ? <div className="adm-revenue-state"><AdminLoading>Loading payments...</AdminLoading></div> : query.isError ? <div className="adm-revenue-state" role="alert"><p>Could not load payments.</p><button type="button" onClick={()=>query.refetch()}>Try again</button></div> : <>
        <div className="adm-revenue-total"><span>LKR</span><strong>{amount(totalEstIncome)}</strong></div>
        <p className="adm-revenue-caption">{hidden?'Amounts hidden on this device.':`Includes approved member payments and estimated dues from ${pendingCount} pending applications.`}</p>
        <dl className="adm-revenue-breakdown">
          <div
            className="adm-revenue-clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowPaidSheet(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowPaidSheet(true); } }}
            aria-label="View approved members who paid"
          >
            <dt>Approved members (Received) <ArrowRight size={12} className="inline ml-1 opacity-60" /></dt>
            <dd>{amount(approvedIncome)}</dd>
          </div>
          <div>
            <dt>Est. pending ({pendingCount} applications)</dt>
            <dd>{amount(estPendingIncome)}</dd>
          </div>
          <div>
            <dt>Total est. income</dt>
            <dd className="adm-revenue-highlight">{amount(totalEstIncome)}</dd>
          </div>
          <div
            className="adm-revenue-clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowPaidSheet(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowPaidSheet(true); } }}
            aria-label="View recorded payments"
          >
            <dt>Recorded payments <ArrowRight size={12} className="inline ml-1 opacity-60" /></dt>
            <dd>{hidden ? '•••' : `${query.data.payments || 0} received`}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="adm-revenue-view-paid"
          onClick={() => setShowPaidSheet(true)}
          aria-label="View who paid"
        >
          <span className="adm-revenue-view-paid-left">
            <Receipt size={16} />
            <span>Paid Records</span>
          </span>
          <span className="adm-revenue-view-paid-right">
            <span>{query.data?.payments || 0} recorded</span>
            <ArrowRight size={14} />
          </span>
        </button>
        <p className="adm-revenue-note pt-4">Est. pending income calculates expected fees (LKR 500 each) from all pending applications even before payment is recorded.</p>
      </>}
    </section>

    {showPaidSheet && (
      <PaidMembersSheet
        open={showPaidSheet}
        onClose={() => setShowPaidSheet(false)}
      />
    )}
  </>;
}
