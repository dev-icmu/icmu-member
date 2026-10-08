import React, { useState } from 'react';
import { TeamsTable } from './TeamsTable';
import { useTeams, useCreateTeam, useUpdateTeam } from '../../../entities/teams/hooks/useTeams';
import { useSkills } from '../../../entities/skills/hooks/useSkills';
import { useMembers } from '../../../entities/members/hooks/useMembers';
import { useToast } from '../../../context/ToastContext';

export function TeamsTab() {
  const { addToast } = useToast();
  
  const { data: teamsData, isLoading: teamsLoading } = useTeams();
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  
  const { data: skillsData } = useSkills();
  const { data: memberData } = useMembers({ page: 1, limit: 100 });
  const acceptedMembers = (memberData?.data || []).filter(m => m.membership_status === 'accepted');

  const [newTeamName, setNewTeamName] = useState('');

  const handleCreateTeam = async (e, selectedSkillIds = []) => {
    e.preventDefault();
    const trimmed = newTeamName.trim();
    if (!trimmed) {
      addToast({ message: "Team name is required.", type: 'error' });
      return;
    }
    
    try {
      await createTeamMutation.mutateAsync({ team_name: trimmed, required_skills: selectedSkillIds });
      addToast({ message: `Production Team "${trimmed}" created successfully!`, type: 'success' });
      setNewTeamName('');
    } catch (err) {
      if (err?.code === '23505') {
        addToast({ message: `A team named "${trimmed}" already exists.`, type: 'error' });
      } else {
        addToast({ message: err?.message || 'Failed to create team.', type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Production Teams</h2>
        <p className="text-xs text-gray-400 mt-1">Manage standard production teams.</p>
      </div>
      
      <TeamsTable 
        teamsData={teamsData}
        teamsLoading={teamsLoading}
        updateTeamMutation={updateTeamMutation}
        createTeamMutation={createTeamMutation}
        newTeamName={newTeamName}
        setNewTeamName={setNewTeamName}
        handleCreateTeam={handleCreateTeam}
        skillsData={skillsData}
        acceptedMembers={acceptedMembers}
      />
    </div>
  );
}
