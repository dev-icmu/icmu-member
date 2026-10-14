import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { MorphingSearch } from '@/components/motion/morphing-search';
import { useMembers } from '@/entities/members/hooks/useMembers';
import { nameWithInitials } from '@/entities/members/lib/memberDisplay';
import { AdminLoading } from './AdminMotion';

export function AdminSearch({ className = '', onView, onFilter, placeholder = 'Find a member...' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const term = draft.trim().slice(0, 150);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(term), 250);
    return () => clearTimeout(timer);
  }, [term]);
  const query = useMembers({ search, status: 'all', limit: 6, enabled: open && search.length >= 2 });
  const waiting = term !== search || query.isPending;
  const ready = term.length >= 2 && !waiting && !query.isError;
  const matches = ready ? query.data?.data || [] : [];
  const items = matches.map(member => ({
    id: member.id, title: nameWithInitials(member.full_name), icon: Users,
    description: `${member.batch_year || 'No batch'} · ${member.member_id || member.form_number || 'Pending application'}`,
    keywords: [draft],
    onSelect: () => onView ? onView(member.id) : navigate(`/admin/${member.membership_status === 'accepted' ? 'members' : 'applications'}?${new URLSearchParams({ status: 'all', q: member.index_number || member.full_name, profile: member.id })}`),
  }));
  if (term.length >= 2 && onFilter) items.unshift({ id: 'filter', title: 'Search this list', description: term, keywords: [draft], icon: Search, onSelect: () => onFilter(term) });
  let emptyMessage = 'Type at least 2 characters to find a member.';
  if (term.length >= 2) emptyMessage = waiting ? <AdminLoading>Finding members...</AdminLoading> : query.isError ? 'Search is unavailable. Close and try again.' : 'No matching members.';
  return <MorphingSearch className={`adm-morphing-search ${className}`} items={items} placeholder={placeholder} shortcut="" open={open} onOpenChange={setOpen} onQueryChange={setDraft} emptyMessage={emptyMessage}/>;
}
