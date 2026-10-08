import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/motion/button/base';
import { AnimatedBadge } from '@/components/motion/animated-badge';
import { cn } from '@/lib/utils';

export const MembersTable = ({ memberData, membersLoading, approveMutation, rejectMutation }) => {
  if (membersLoading) return <div className="text-sm text-gray-500 animate-pulse">Loading applications...</div>;
  if (!memberData || memberData.length === 0) return <div className="text-sm text-gray-500">No pending applications found.</div>;

  return (
    <div className={cn("bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden", "rounded-2xl md:rounded-3xl border border-border/50", "shadow-xl shadow-muted/10 backdrop-blur-md", "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20")}>
      <Table className="w-full text-left border-collapse">
        <TableHeader>
          <TableRow className="bg-background border-b border-border text-[10px] uppercase tracking-wider text-gray-500 font-semibold hover:bg-background">
            <TableHead className="px-4 py-3 text-gray-500 font-semibold">Applicant Name</TableHead>
            <TableHead className="px-4 py-3 text-gray-500 font-semibold">Member ID</TableHead>
            <TableHead className="px-4 py-3 text-gray-500 font-semibold">Index No.</TableHead>
            <TableHead className="px-4 py-3 text-gray-500 font-semibold">Batch</TableHead>
            <TableHead className="px-4 py-3 text-gray-500 font-semibold">Status</TableHead>
            <TableHead className="px-4 py-3 text-right text-gray-500 font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-800/50">
          {memberData.map(m => (
            <TableRow key={m.id} className="hover:bg-gray-900/30 transition-colors border-b border-border/50">
              <TableCell className="px-4 py-3">
                <div className="font-medium text-gray-200 text-sm">{m.full_name}</div>
                <div className="text-xs text-gray-500">{m.email_address}</div>
              </TableCell>
              <TableCell className="px-4 py-3 font-mono font-bold text-emerald-400 text-xs">{m.member_id || "-"}</TableCell>
              <TableCell className="px-4 py-3 font-mono text-xs">{m.index_number}</TableCell>
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
                              const text = encodeURIComponent(`Hello ${m.full_name}, your membership application for the Isipathana College Media Unit has been approved! Welcome to the team.`);
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



