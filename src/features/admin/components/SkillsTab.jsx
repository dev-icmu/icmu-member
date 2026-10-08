import React, { useState, useEffect } from 'react';
import { SkillsTable } from './SkillsTable';
import { useSkills, useCreateSkill, useUpdateSkill, useSeedDefaultSkills } from '../../../entities/skills/hooks/useSkills';
import { DEFAULT_SKILLS } from '../../../entities/skills/constants';
import { useToast } from '../../../context/ToastContext';

export function SkillsTab() {
  const { addToast } = useToast();
  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const createSkillMutation = useCreateSkill();
  const updateSkillMutation = useUpdateSkill();
  const seedDefaultSkills = useSeedDefaultSkills();
  
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  useEffect(() => {
    seedDefaultSkills.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) {
      addToast({ message: "Skill name is required.", type: 'error' });
      return;
    }

    const isDefault = DEFAULT_SKILLS.some(
      ds => ds.skill_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDefault) {
      addToast({ message: `"${trimmed}" is a default protected skill and already exists.`, type: 'error' });
      return;
    }

    try {
      await createSkillMutation.mutateAsync({ skill_name: trimmed, skill_desc: newSkillDesc });
      addToast({ message: `Skill "${trimmed}" created successfully!`, type: 'success' });
      setNewSkillName('');
      setNewSkillDesc('');
    } catch (err) {
      if (err?.code === '23505') {
        addToast({ message: `A skill named "${trimmed}" already exists.`, type: 'error' });
      } else {
        addToast({ message: err?.message || 'Failed to create skill.', type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Skill Management</h2>
        <p className="text-xs text-gray-400 mt-1">Add or disable available skills.</p>
      </div>
      
      <SkillsTable 
        skillsData={skillsData} 
        skillsLoading={skillsLoading} 
        updateSkillMutation={updateSkillMutation} 
        createSkillMutation={createSkillMutation}
        newSkillName={newSkillName}
        setNewSkillName={setNewSkillName}
        newSkillDesc={newSkillDesc}
        setNewSkillDesc={setNewSkillDesc}
        handleCreateSkill={handleCreateSkill}
      />
    </div>
  );
}
