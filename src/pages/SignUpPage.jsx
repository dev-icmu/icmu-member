import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { useCreateMember } from '../entities/members/hooks/useMembers';
import { useSkills } from '../entities/skills/hooks/useSkills';
import { useToast } from '../context/ToastContext';
import { IcmuEmblem, IcmuSmallLogo } from '../components/common/IcmuEmblem';
import { useRegistrationForm } from '../features/auth/hooks/useRegistrationForm';
import { PersonalInfoStep } from '../features/auth/components/PersonalInfoStep';
import { GuardianStep } from '../features/auth/components/GuardianStep';
import { SkillsStep } from '../features/auth/components/SkillsStep';
import { getBatchYear } from '../utils/batch-year';

export default function SignUpPage() {
  const { addToast } = useToast();
  const createMemberMutation = useCreateMember();
  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedRecord, setCompletedRecord] = useState(null);

  const {
    activeStep,
    formData,
    errors,
    handleChange,
    toggleSkill,
    handleBlur,
    handleNextStep,
    handlePrevStep,
    validateStep,
    resetForm,
    getSanitizedPayload
  } = useRegistrationForm();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;

    try {
      const sanitizedPayload = getSanitizedPayload();
      const batchYear = getBatchYear(formData.date_of_birth);

      await createMemberMutation.mutateAsync({
        ...sanitizedPayload,
        batch_year: batchYear,
        skills: formData.skills,
        guardian: sanitizedPayload.guardian,
      });

      const generatedMemberRecord = {
        index_number: formData.index_number,
        full_name: sanitizedPayload.full_name,
        name_with_initials: sanitizedPayload.name_with_initials,
        batch_year: batchYear,
        skills: formData.skills.map(id => skillsData?.find(s => s.id === id)?.skill_name || id),
        whatsapp_number: sanitizedPayload.whatsapp_number,
        guardian_name: formData.guardian_name,
        joined_date: sanitizedPayload.joined_date,
      };

      setCompletedRecord(generatedMemberRecord);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      addToast({
        message: err.message || 'Failed to submit registration',
        type: 'error',
      });
    }
  };

  const steps = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'Guardian' },
    { num: 3, title: 'Skills' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IcmuSmallLogo className="w-8 h-8" />
            <span className="font-semibold text-sm tracking-wide text-gray-200">ICMU Portal</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <IcmuEmblem className="w-16 h-16 opacity-90" />
          </div>
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Member Registration
          </h1>
          <p className="text-xs text-gray-400">Join the Isipathana College Media Unit.</p>
        </div>

        <div className={cn("bg-card text-card-foreground p-6 md:p-8 relative overflow-hidden", "rounded-2xl md:rounded-3xl border border-border/50", "shadow-xl shadow-muted/10 backdrop-blur-md", "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20")}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-900" />
          
          <div className="p-6">
            {!isSuccess && (
              <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-800 -z-10" />
                {steps.map((s) => (
                  <div key={s.num} className="flex flex-col items-center gap-2 bg-card px-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${activeStep >= s.num ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                      {s.num}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider ${activeStep >= s.num ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}

            {isSuccess && completedRecord ? (
              <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Registration Submitted!</h2>
                <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
                  Your application has been received. Please wait for an Admin to review and approve your membership.
                </p>

                <div className="bg-background border border-border/80 rounded-lg p-4 text-left max-w-sm mx-auto mb-8">
                  <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3 border-b border-border pb-2">Application Summary</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Applicant</span>
                      <span className="font-medium text-gray-200">{completedRecord.full_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Index Number</span>
                      <span className="font-mono text-emerald-400 text-sm">{completedRecord.index_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">School Batch</span>
                      <span className="font-medium text-gray-300">{completedRecord.batch_year || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Skills Declared</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {completedRecord.skills.map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px]">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsSuccess(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-md border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Submit Another Registration
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {activeStep === 1 && (
                  <PersonalInfoStep 
                    formData={formData} 
                    handleChange={handleChange} 
                    handleBlur={handleBlur} 
                    errors={errors} 
                    handleNextStep={handleNextStep} 
                  />
                )}
                
                {activeStep === 2 && (
                  <GuardianStep 
                    formData={formData} 
                    handleChange={handleChange} 
                    handleBlur={handleBlur} 
                    errors={errors} 
                    handleNextStep={handleNextStep} 
                    handlePrevStep={handlePrevStep} 
                  />
                )}

                {activeStep === 3 && (
                  <SkillsStep 
                    formData={formData} 
                    toggleSkill={toggleSkill} 
                    errors={errors} 
                    handlePrevStep={handlePrevStep} 
                    skillsData={skillsData} 
                    skillsLoading={skillsLoading} 
                    isPending={createMemberMutation.isPending} 
                  />
                )}
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-500 border-t border-border/60">
        &copy; {new Date().getFullYear()} Isipathana College Media Unit | Database Specification & Batch Year Protocol Active
      </footer>
    </div>
  );
}




