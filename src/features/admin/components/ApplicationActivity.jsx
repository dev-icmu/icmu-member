import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useReducedMotion } from 'motion/react';
import { ChartNoAxesCombined, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { useApplicationActivity } from '@/entities/members/hooks/useMembers';
import { AdminNumber, AdminLoading } from './AdminMotion';

const periods = [['7d','7 days'],['30d','30 days'],['6m','6 months'],['1y','1 year']];
export function ApplicationActivity() {
  const [period,setPeriod] = useState('7d');
  const query = useApplicationActivity(period);
  const reduce = useReducedMotion();
  const data = query.data;
  return <section className="adm-panel adm-chart-panel" aria-label="Application activity">
    <div className="adm-panel-heading adm-activity-heading"><div><span className="adm-eyebrow">APPLICATION ACTIVITY</span><h2>{data ? <AdminNumber value={data.total}/> : '...'}<small>applications in this range</small></h2></div>
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="adm-range-trigger" aria-label={`Application activity range: ${periods.find(([value])=>value===period)[1]}`}><span>{periods.find(([value])=>value===period)[1]}<ChevronDown size={13}/></span></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="adm-range-menu"><DropdownMenuRadioGroup value={period} onValueChange={setPeriod}>{periods.map(([value,label])=><DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
      </DropdownMenu>
    </div>
    {query.isPending ? <div className="adm-chart-empty"><AdminLoading>Loading activity...</AdminLoading></div>
      : query.isError ? <div className="adm-chart-empty" role="alert"><p>Could not load activity.</p><button type="button" onClick={()=>query.refetch()}>Try again</button></div>
        : !data?.has_enough_data ? <div className="adm-chart-empty" role="status"><ChartNoAxesCombined size={28}/><strong>Not enough data yet</strong><p>{Number(data?.total) ? `Applications were received in only one ${['7d','30d'].includes(period) ? 'day' : 'month'}. Try a different range.` : 'No applications in this range. Try a longer period.'}</p></div>
          : <div className="adm-chart" role="img" aria-label={`Applications: ${data.points.map(point=>`${point.label}: ${point.applications}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.points} margin={{top:15,right:10,left:-30,bottom:0}}>
            <CartesianGrid vertical={false} stroke="#26332c" strokeDasharray="3 5"/><XAxis dataKey="label" minTickGap={28} tick={{fill:'#9caea4',fontSize:11}} axisLine={false} tickLine={false} dy={8}/><YAxis allowDecimals={false} tick={{fill:'#82958a',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101a14',border:'1px solid #354d3e',borderRadius:12,color:'#eaf2ed',fontSize:12}}/><Area type="monotone" name="Applications" dataKey="applications" stroke="#30e875" strokeWidth={2.5} fill="#30e875" fillOpacity={.1} isAnimationActive={!reduce} animationDuration={250}/>
          </AreaChart></ResponsiveContainer></div>}
  </section>;
}
