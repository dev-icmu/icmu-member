import { cn } from '@/lib/utils';
import { PlusCircle, Lock, Power, PowerOff } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/motion/button/base';
import { Input } from '@/components/motion/input';

export const SkillsTable = ({ skillsData, skillsLoading, updateSkillMutation, createSkillMutation, newSkillName, setNewSkillName, newSkillDesc, setNewSkillDesc, handleCreateSkill }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#050a07] p-4 rounded-xl border border-border/80 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Add New Skill</h3>
        <form onSubmit={handleCreateSkill} className="flex flex-col sm:flex-row gap-3 items-end">
          <Input
            type="text"
            placeholder="Skill Name"
            required
            value={newSkillName}
            onChange={(val) => setNewSkillName(val)}
            className="flex-1 w-full"
          />
          <Input
            type="text"
            placeholder="Description (Optional)"
            value={newSkillDesc}
            onChange={(val) => setNewSkillDesc(val)}
            className="flex-1 w-full"
          />
          <Button
            type="submit"
            disabled={createSkillMutation.isPending}
            variant="primary"
            size="md"
            className="gap-2 shrink-0 h-11"
          >
            <PlusCircle className="w-4 h-4" /> Add Skill
          </Button>
        </form>
      </div>

      <div className={cn("bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden", "rounded-2xl md:rounded-3xl border border-border/50", "shadow-xl shadow-muted/10 backdrop-blur-md", "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20")}>
        {skillsLoading ? (
          <div className="p-4 text-sm text-gray-500 animate-pulse">Loading skills...</div>
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="bg-background border-b border-border text-[10px] uppercase tracking-wider text-gray-500 font-semibold hover:bg-background">
                <TableHead className="px-4 py-3 text-gray-500 font-semibold">Skill Name</TableHead>
                <TableHead className="px-4 py-3 text-gray-500 font-semibold">Description</TableHead>
                <TableHead className="px-4 py-3 text-right text-gray-500 font-semibold">Status / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-800/50">
              {skillsData?.map(s => (
                <TableRow key={s.id} className="hover:bg-gray-900/30 transition-colors border-b border-border/50">
                  <TableCell className="px-4 py-3 font-medium text-emerald-400">
                    <span className={s.is_active === false ? 'opacity-50 line-through' : ''}>{s.skill_name}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-gray-500">{s.skill_desc || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 items-center">
                      {s.is_protected && <span className="flex items-center text-[10px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3 mr-1"/> Protected</span>}
                      {!s.is_protected && (
                        <Button type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateSkillMutation.mutateAsync({ id: s.id, is_active: s.is_active === false ? true : false })}
                          className={`gap-1.5 ${s.is_active === false ? 'text-gray-400 hover:text-white' : 'text-rose-400 hover:text-rose-300'}`}
                        >
                          {s.is_active === false ? <><Power className="w-3 h-3" /> Activate</> : <><PowerOff className="w-3 h-3" /> Disable</>}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};


