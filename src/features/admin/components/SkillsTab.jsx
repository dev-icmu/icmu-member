import { useSkills, useCreateSkill, useUpdateSkill } from '@/entities/skills/hooks/useSkills';
import { CatalogPanel } from './CatalogPanel';

export function SkillsTab() {
  const query = useSkills();
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();
  return <CatalogPanel kind="skill" query={query} createMutation={createMutation} updateMutation={updateMutation} />;
}
