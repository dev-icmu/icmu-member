import { Shield } from 'lucide-react';
import { Input } from '@/components/motion/input';
import { Button } from '@/components/motion/button/base';
import { formatSLPhone } from '@/utils/sanitize';

export const GuardianStep = ({ formData, handleChange, handleBlur, errors, handleNextStep, handlePrevStep }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span>Guardian details establish the Many-to-One relationship for parent approval and emergency communications.</span>
      </div>

      <Input
        label={<>Guardian Full Name <span className="text-destructive">*</span></>}
        type="text"
        value={formData.guardian_name}
        onChange={(val) => handleChange('guardian_name', val)}
        onBlur={() => handleBlur('guardian_name')}
        placeholder="e.g. Sunil Perera"
        error={errors.guardian_name}
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Guardian Contact Number <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-xl px-3 py-2.5 font-mono">
            🇱🇰 +94
          </span>
          <Input
            type="tel"
            inputMode="numeric"
            value={formData.guardian_contact}
            onChange={(val) => handleChange('guardian_contact', formatSLPhone(val))}
            onBlur={() => handleBlur('guardian_contact')}
            placeholder="7X XXX XXXX"
            error={errors.guardian_contact}
          />
        </div>
        {errors.guardian_contact && (
          <p className="text-xs text-destructive mt-1">{errors.guardian_contact}</p>
        )}
      </div>

      <Input
        label={<>Guardian Occupation <span className="text-muted-foreground font-normal">(Optional)</span></>}
        type="text"
        value={formData.guardian_occupation}
        onChange={(val) => handleChange('guardian_occupation', val)}
        onBlur={() => handleBlur('guardian_occupation')}
        placeholder="e.g. Engineer"
        error={errors.guardian_occupation}
      />

      <div className="flex justify-between pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrevStep}
          className="border-gray-700 hover:border-gray-500 text-gray-300 font-medium px-4"
        >
          &larr; Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleNextStep}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5"
        >
          Continue to Skills &rarr;
        </Button>
      </div>
    </div>
  );
};
