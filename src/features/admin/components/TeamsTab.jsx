import { useTeams, useCreateTeam, useUpdateTeam } from '@/entities/teams/hooks/useTeams';
import { useSkills } from '@/entities/skills/hooks/useSkills';
import { CatalogPanel } from './CatalogPanel';

export function TeamsTab() {
  const query = useTeams();
  const skillsQuery = useSkills();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  return <CatalogPanel kind="team" query={query} skillsQuery={skillsQuery} createMutation={createMutation} updateMutation={updateMutation} />;
}
