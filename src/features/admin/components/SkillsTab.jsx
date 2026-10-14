import { useSearchParams } from 'react-router-dom';
import { useSkills, useCreateSkill, useUpdateSkill } from '@/entities/skills/hooks/useSkills';
import { CatalogPanel } from './CatalogPanel';
import { SkillMembersView } from './SkillMembersView';
import { AdminLoading } from './AdminMotion';
import { Button } from '@/components/motion/button/base';
import { ArrowLeft } from 'lucide-react';

export function SkillsTab() {
  const [params, setParams] = useSearchParams();
  const skillId = params.get('skill');
  const query = useSkills();
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();

  if (skillId) {
    if (query.isPending) {
      return (
        <div className="adm-state" role="status">
          <AdminLoading>Loading skill details...</AdminLoading>
        </div>
      );
    }
    const selectedSkill = (query.data || []).find(s => s.id === skillId);
    if (selectedSkill) {
      return (
        <SkillMembersView
          skill={selectedSkill}
          onBack={() => {
            const next = new URLSearchParams(params);
            next.delete('skill');
            setParams(next);
          }}
        />
      );
    }
    return (
      <div className="adm-state" role="alert">
        <h3>Skill not found</h3>
        <p>The requested skill does not exist or has been removed.</p>
        <Button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete('skill');
            setParams(next);
          }}
        >
          <ArrowLeft size={16} /> Back to skills
        </Button>
      </div>
    );
  }

  return (
    <CatalogPanel
      kind="skill"
      query={query}
      createMutation={createMutation}
      updateMutation={updateMutation}
      onSelectSkill={skill => {
        const next = new URLSearchParams(params);
        next.set('skill', skill.id);
        setParams(next);
      }}
    />
  );
}
