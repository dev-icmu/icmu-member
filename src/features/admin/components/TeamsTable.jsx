import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PlusCircle, Lock, ChevronDown, ChevronUp, Users, Tag, MoreVertical, X } from 'lucide-react';

import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';
import { Checkbox } from '@/components/motion/checkbox';
import { TeamDetailPanel } from './TeamDetailPanel';

export const TeamsTable = ({
  teamsData,
  teamsLoading,
  updateTeamMutation,
  createTeamMutation,
  newTeamName,
  setNewTeamName,
  handleCreateTeam,
  skillsData,
  acceptedMembers,
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [showSkillSelector, setShowSkillSelector] = useState(false);

  // Resolve skill UUID to name
  const resolveSkill = (id) => skillsData?.find(s => s.id === id);

  const toggleSkillSelection = (skillId) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const onCreateTeam = (e) => {
    e.preventDefault();
    // Call the parent handler but also pass required_skills
    if (!newTeamName.trim()) return;
    handleCreateTeam(e, selectedSkillIds);
    setSelectedSkillIds([]);
    setShowSkillSelector(false);
  };

  const activeSkills = (skillsData || []).filter(s => s.is_active !== false);

  return (
    <div className="space-y-6">
      {/* Create Team Form */}
      <div className="bg-[#050a07] p-4 rounded-xl border border-border/80 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Add Production Team</h3>
        <form onSubmit={onCreateTeam} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Input
              type="text"
              placeholder="Team Name"
              required
              value={newTeamName}
              onChange={(val) => setNewTeamName(val)}
              className="flex-1 w-full"
            />
            <Button
              type="submit"
              disabled={createTeamMutation.isPending}
              variant="primary"
              size="md"
              className="gap-2 shrink-0 h-11"
            >
              <PlusCircle className="w-4 h-4" /> Add Team
            </Button>
          </div>

          {/* Skill Selector Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowSkillSelector(!showSkillSelector)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors font-semibold"
            >
              <Tag className="w-3 h-3" />
              Required Skills ({selectedSkillIds.length} selected)
              {showSkillSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSkillSelector && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 bg-background/60 border border-border/30 rounded-lg max-h-36 overflow-y-auto">
                {activeSkills.map(skill => (
                  <Checkbox
                    key={skill.id}
                    checked={selectedSkillIds.includes(skill.id)}
                    onCheckedChange={() => toggleSkillSelection(skill.id)}
                    label={skill.skill_name}
                    className="text-xs"
                  />
                ))}
                {activeSkills.length === 0 && (
                  <span className="text-xs text-gray-600 italic col-span-full">No skills available</span>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Teams Grid */}
      <div>
        {teamsLoading ? (
          <div className="p-4 text-sm text-gray-500 animate-pulse">Loading teams...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamsData?.map((t, i) => {
              const BAR_COLORS = [
                'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
                'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500'
              ];
              const barColor = BAR_COLORS[i % BAR_COLORS.length];

              return (
                <div key={t.id} className="relative bg-card text-card-foreground p-5 rounded-[24px] border border-border/50 shadow-xl shadow-muted/10 backdrop-blur-md flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {/* Avatar Placeholder */}
                      <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[16px]">
                        {t.team_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className={cn("font-bold text-sm truncate", t.is_active === false && "opacity-50 line-through")}>
                          {t.team_name}
                        </h4>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          {t.is_protected ? <><Lock className="w-2.5 h-2.5"/> Protected Team</> : (t.is_active === false ? 'Disabled' : 'Active Team')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions Menu */}
                    <div className="shrink-0 flex items-center">
                      {!t.is_protected && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-800" onClick={() => {
                          if (confirm(t.is_active === false ? 'Activate this team?' : 'Disable this team?')) {
                            updateTeamMutation.mutateAsync({ id: t.id, is_active: !t.is_active });
                          }
                        }} title={t.is_active === false ? 'Activate' : 'Disable'}>
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Required Skills (POSITION) */}
                  <div className="mt-2 min-h-[48px]">
                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Required Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(t.required_skills || []).length === 0 ? (
                        <span className="text-[10px] text-gray-600 italic">None</span>
                      ) : (
                        (t.required_skills || []).map(skillId => {
                          const skill = resolveSkill(skillId);
                          return skill ? (
                            <span key={skillId} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary border border-primary/20">
                              {skill.skill_name}
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>

                  {/* Decorative Task Bar */}
                  <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden mt-1">
                    <div className={`h-full ${barColor} w-3/4 rounded-full`} />
                  </div>

                  {/* Bottom Row */}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    {/* Avatars */}
                    <div className="flex -space-x-2">
                      {t.member_count === 0 ? (
                        <span className="text-[10px] text-gray-500 italic ml-1">0 Members</span>
                      ) : (
                        <>
                          {Array.from({ length: Math.min(3, t.member_count || 0) }).map((_, idx) => (
                            <div key={idx} className="w-6 h-6 rounded-full bg-gray-800 border-2 border-card flex items-center justify-center shrink-0">
                              <Users className="w-3 h-3 text-gray-400" />
                            </div>
                          ))}
                          {(t.member_count || 0) > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-card flex items-center justify-center text-[8px] text-gray-300 font-bold shrink-0">
                              +{(t.member_count || 0) - 3}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Explore */}
                    <button type="button" onClick={() => setExpandedTeamId(t.id)} className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                      Explore Team
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Overlay for Team Details */}
      {expandedTeamId && teamsData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#09090b] rounded-[32px] border border-border overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 z-10 hover:bg-white/10" onClick={() => setExpandedTeamId(null)}>
              <X className="w-5 h-5 text-gray-400" />
            </Button>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <TeamDetailPanel
                team={teamsData.find(t => t.id === expandedTeamId)}
                skillsData={skillsData}
                acceptedMembers={acceptedMembers}
                onClose={() => setExpandedTeamId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
