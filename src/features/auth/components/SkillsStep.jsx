import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/motion/button/base';

export const SkillsStep = ({ formData, toggleSkill, errors, handlePrevStep, skillsData, skillsLoading, isPending }) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-300">Select Relevant Skills Possessed <span className="text-destructive">*</span></label>
          <span className="text-[10px] text-gray-500">{formData.skills.length} selected</span>
        </div>
        {skillsLoading ? (
          <div className="text-xs text-gray-500 animate-pulse">Loading skills...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(skillsData || []).filter(s => s.is_active !== false).map((skill) => {
              const selected = formData.skills.includes(skill.id);
              return (
                <Button
                  key={skill.id}
                  type="button"
                  variant={selected ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex items-center gap-1.5 rounded-full transition-colors cursor-pointer ${
                    selected
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm hover:bg-emerald-500'
                      : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {skill.skill_name}
                </Button>
              );
            })}
          </div>
        )}
        {errors.skills && <p className="mt-1 text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.skills}</p>}
      </div>

      <div className="flex justify-between pt-4 border-t border-border/50 mt-8">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrevStep}
          className="border-gray-700 hover:border-gray-500 text-gray-300 font-medium px-4 cursor-pointer"
        >
          &larr; Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="flex items-center gap-2 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
        >
          {isPending ? 'Submitting...' : 'Submit Registration'}
        </Button>
      </div>
    </div>
  );
};

