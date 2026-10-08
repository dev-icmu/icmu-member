import React, { useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { MembersTable } from './MembersTable';
import { useMembers, useApproveMember, useRejectMember } from '../../../entities/members/hooks/useMembers';

export function ApplicationsTab() {
  const [filter, setFilter] = useState('pending');
  const { data: memberData, isLoading: membersLoading } = useMembers({ page: 1, limit: 100 });
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();

  const actualMembersList = memberData?.data || [];
  const filteredMembers = actualMembersList.filter(m => filter === 'all' || m.membership_status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Member Applications</h2>
          <p className="text-xs text-gray-400 mt-1">Review and manage student registrations.</p>
        </div>
        <div className="flex gap-2 bg-background p-1 rounded-md border border-border">
          {['pending', 'accepted', 'rejected', 'all'].map(f => (
            <Button
              key={f}
              size="sm"
              type="button"
              variant={filter === f ? 'primary' : 'ghost'}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-[10px] font-medium uppercase"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      
      <MembersTable 
        memberData={filteredMembers} 
        membersLoading={membersLoading} 
        approveMutation={approveMutation} 
        rejectMutation={rejectMutation} 
      />
    </div>
  );
}
