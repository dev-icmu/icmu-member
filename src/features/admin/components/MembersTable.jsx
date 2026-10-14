import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/motion/button/base';
import { AnimatedBadge } from '@/components/motion/animated-badge';
import { titleCase, nameWithInitials, displayDate } from '@/entities/members/lib/memberDisplay';
import { cn } from '@/lib/utils';

export const MembersTable = ({ memberData, membersLoading, approveMutation, rejectMutation }) => {
  const [sort, setSort] = useState(null);

  const toggleSort = (key) => {
    setSort(prev => {
      if (prev?.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortedData = useMemo(() => {
    if (!sort || !memberData) return memberData || [];
    const copy = [...memberData];
    copy.sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];
      if (sort.key === 'batch_year') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = String(av || '').toLowerCase();
        bv = String(bv || '').toLowerCase();
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [memberData, sort]);

  if (membersLoading) return <div className="text-sm text-gray-500 animate-pulse">Loading applications...</div>;
  if (!memberData || memberData.length === 0) return <div className="text-sm text-gray-500">No pending applications found.</div>;

  const renderSortHeader = (key, label) => {
    const active = sort?.key === key;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px] hover:text-gray-200 transition-colors focus:outline-none",
          active ? "text-emerald-400" : "text-gray-500"
        )}
      >
        <span>{label}</span>
        {active ? (
          sort.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    );
  };

  return (
    <div className={cn("bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden", "rounded-2xl md:rounded-3xl border border-border/50", "shadow-xl shadow-muted/10 backdrop-blur-md", "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20")}>
      <Table className="w-full text-left border-collapse">
        <TableHeader>
          <TableRow className="bg-background border-b border-border text-[10px] uppercase tracking-wider text-gray-500 font-semibold hover:bg-background">
            <TableHead className="px-4 py-3">{renderSortHeader('full_name', 'Applicant Name')}</TableHead>
            <TableHead className="px-4 py-3">{renderSortHeader('member_id', 'Member ID')}</TableHead>
            <TableHead className="px-4 py-3">{renderSortHeader('index_number', 'Index No.')}</TableHead>
            <TableHead className="px-4 py-3">{renderSortHeader('batch_year', 'Batch')}</TableHead>
            <TableHead className="px-4 py-3">{renderSortHeader('membership_status', 'Status')}</TableHead>
            <TableHead className="px-4 py-3 text-right text-gray-500 font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-800/50">
          {sortedData.map(m => (
            <TableRow key={m.id} className="hover:bg-gray-900/30 transition-colors border-b border-border/50">
              <TableCell className="px-4 py-3">
                <div className="font-medium text-gray-200 text-sm" title={titleCase(m.full_name)}>{m.name_with_initials || nameWithInitials(m.full_name)}</div>
                <div className="text-xs text-gray-500">Joined {displayDate(m.joined_date || m.created_at)}</div>
              </TableCell>
              <TableCell className="px-4 py-3 font-mono font-bold text-white text-xs">{m.member_id || "-"}</TableCell>
              <TableCell className="px-4 py-3 font-mono font-bold text-white text-xs">{m.index_number || "-"}</TableCell>
              <TableCell className="px-4 py-3 text-sm">{m.batch_year}</TableCell>
              <TableCell className="px-4 py-3">
                {m.membership_status === 'pending' && <AnimatedBadge status="warning" size="sm">PENDING</AnimatedBadge>}
                {m.membership_status === 'accepted' && <AnimatedBadge status="success" size="sm">ACCEPTED</AnimatedBadge>}
                {m.membership_status === 'rejected' && <AnimatedBadge status="danger" size="sm">REJECTED</AnimatedBadge>}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                {m.membership_status === 'pending' && (
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (confirm('Approve member?')) {
                          approveMutation.mutateAsync(m.id).then(() => {
                            if (m.whatsapp_number) {
                              const phone = m.whatsapp_number.replace(/\D/g, '');
                              const shortName = (m.name_with_initials || nameWithInitials(m.full_name)).toUpperCase();
                              const text = encodeURIComponent(
                                `Hello *${shortName}*,\n\nYour *Isipathana College Media Unit* membership has been approved.\n\nPlease collect your membership receipt from the ICMU team.`
                              );
                              window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
                            }
                          });
                        }
                      }}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => confirm('Reject member?') && rejectMutation.mutateAsync(m.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};



