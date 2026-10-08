import { useState } from 'react';
import { Users, X, Plus, UserPlus, Tag, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';
import { MorphingModal } from '@/components/motion/morphing-modal';
import { useTeamMembers, useAssignMemberToTeam, useRemoveMemberFromTeam, useUpdateTeamSkills } from '@/entities/teams/hooks/useTeams';

/**
 * Expandable panel showing team details:
 * - Required skills as tag pills (add / remove)
 * - Assigned members list (with remove)
 * - Morphing Modals for adding skills and assigning members
 */
export const TeamDetailPanel = ({ team, skillsData, acceptedMembers, onClose }) => {
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers(team.id);
  const assignMutation = useAssignMemberToTeam();
  const removeMutation = useRemoveMemberFromTeam();
  const updateSkillsMutation = useUpdateTeamSkills();

  const [activeModal, setActiveModal] = useState(null); // 'add-skill' | 'add-member' | null
  const [memberSearch, setMemberSearch] = useState('');

  // Resolve skill UUIDs to names
  const teamSkills = (team.required_skills || [])
    .map(id => skillsData?.find(s => s.id === id))
    .filter(Boolean);

  // Members already assigned — exclude from the add dropdown
  const assignedMemberIds = new Set((teamMembers || []).map(a => a.member_id));
  const availableMembers = (acceptedMembers || []).filter(
    m => !assignedMemberIds.has(m.id) &&
      (memberSearch
        ? m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.member_id?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.index_number?.toString().includes(memberSearch)
        : true)
  );

  // Skills not yet on this team
  const availableSkills = (skillsData || []).filter(
    s => s.is_active !== false && !(team.required_skills || []).includes(s.id)
  );

  const handleAddSkill = async (skillId) => {
    const newSkills = [...(team.required_skills || []), skillId];
    await updateSkillsMutation.mutateAsync({ teamId: team.id, skillIds: newSkills });
    setActiveModal(null);
  };

  const handleRemoveSkill = async (skillId) => {
    const newSkills = (team.required_skills || []).filter(id => id !== skillId);
    await updateSkillsMutation.mutateAsync({ teamId: team.id, skillIds: newSkills });
  };

  const handleAssignMember = async (memberId) => {
    await assignMutation.mutateAsync({ member_id: memberId, team_id: team.id });
    setMemberSearch('');
    setActiveModal(null);
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the team?')) return;
    await removeMutation.mutateAsync({ member_id: memberId, team_id: team.id });
  };

  return (
    <div className="bg-[#050a07] border border-border/60 rounded-xl p-5 space-y-5 animate-in slide-in-from-top-2 fade-in duration-300 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-gray-200">
            Managing: <span className="text-emerald-400">{team.team_name}</span>
          </h4>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-300 h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Required Skills Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Required Skills
          </span>
          <Button type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveModal('add-skill')}
            className="text-emerald-500 hover:text-emerald-400 h-6 text-[10px] gap-1"
          >
            <Plus className="w-3 h-3" /> Add Skill
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {teamSkills.length === 0 && (
            <span className="text-xs text-gray-600 italic">No required skills set</span>
          )}
          {teamSkills.map(skill => (
            <span
              key={skill.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            >
              {skill.skill_name}
              <button
                onClick={() => handleRemoveSkill(skill.id)}
                className="hover:text-rose-400 transition-colors ml-0.5"
                title="Remove skill"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <hr className="border-border/30" />

      {/* Assigned Members Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Assigned Members ({(teamMembers || []).length})
          </span>
          <Button type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveModal('add-member')}
            className="text-emerald-500 hover:text-emerald-400 h-6 text-[10px] gap-1"
          >
            <UserPlus className="w-3 h-3" /> Assign Member
          </Button>
        </div>

        {membersLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading members...
          </div>
        ) : (teamMembers || []).length === 0 ? (
          <p className="text-xs text-gray-600 italic">No members assigned to this team yet.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(teamMembers || []).map(assignment => {
              const m = assignment.member;
              if (!m) return null;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-background/40 border border-border/30 rounded-lg px-3 py-2 group hover:border-border/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                      {m.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-200">{m.full_name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {m.member_id || m.index_number || '—'}
                      </div>
                    </div>
                  </div>
                  <Button type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(m.id)}
                    disabled={removeMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 h-6 text-[10px] gap-1 transition-opacity"
                  >
                    <X className="w-3 h-3" /> Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Morphing Modals */}
      <MorphingModal
        viewId={activeModal}
        onClose={() => setActiveModal(null)}
        placement="center"
      >
        {activeModal === 'add-skill' && (
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h3 className="text-sm font-semibold text-gray-200">Add Skill to {team.team_name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {availableSkills.length === 0 ? (
                <div className="col-span-2 text-xs text-gray-500 italic p-2">All available skills have been added.</div>
              ) : (
                availableSkills.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => handleAddSkill(skill.id)}
                    className="text-left px-3 py-2 text-xs text-gray-300 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 rounded-lg transition-all"
                  >
                    {skill.skill_name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {activeModal === 'add-member' && (
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h3 className="text-sm font-semibold text-gray-200">Assign Member</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                autoFocus
                type="text"
                placeholder="Search name, ID, or index..."
                value={memberSearch}
                onChange={(val) => setMemberSearch(val)}
                className="pl-9 text-xs"
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {availableMembers.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600 italic">No matching members found</div>
              ) : (
                availableMembers.slice(0, 15).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleAssignMember(m.id)}
                    disabled={assignMutation.isPending}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent rounded-lg transition-all group"
                  >
                    <div>
                      <div className="text-xs font-medium text-gray-200 group-hover:text-emerald-400 transition-colors">{m.full_name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{m.member_id || `#${m.index_number}`}</div>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3 h-3" /> Assign
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </MorphingModal>
    </div>
  );
};
