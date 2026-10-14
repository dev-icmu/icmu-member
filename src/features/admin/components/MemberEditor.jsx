import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X, ReceiptText, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/motion/button/base';
import { StatefulButton } from '@/components/motion/button/stateful';
import { Input } from '@/components/motion/input';
import { OTPInput } from '@/components/motion/otp-input';
import { Checkbox } from '@/components/motion/checkbox';
import { Combobox, ComboboxTrigger, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/motion/combobox';
import { SRI_LANKAN_CITIES } from '@/utils/sri-lankan-cities';
import { useAdminCreateMember, useMember, useUpdateMember } from '@/entities/members/hooks/useMembers';
import { useSkills } from '@/entities/skills/hooks/useSkills';
import { useAppConfig, getActiveFee, DEFAULT_ACADEMIC_YEAR, DEFAULT_FEE_LKR } from '@/entities/members/hooks/useFees';
import { MEMBERSHIP_FEE_LKR, normalizeApplicationText } from '@/entities/members/lib/memberPayload';
import { applicationSteps, stepFields, colomboToday, dateDigits, dateFromDigits, localPhone, fieldValue, applicationFieldError } from '@/entities/members/lib/applicationForm';
import { displayDate } from '@/entities/members/lib/memberDisplay';
import { useToast } from '@/context/ToastContext';
import { AdminDialog } from './AdminDialog';
import { ApplicationDialog } from './ApplicationDialog';
import '../application.css';

export function memberError(error) {
  if (error?.code === '23505') return 'This form number, admission number or email already exists. Check the member list before adding another application.';
  if (error?.code === '42501') return 'Your admin access could not be verified. Sign in again and retry.';
  return error?.message || 'The change could not be saved. Please try again.';
}

function ApplicationField({ name, label, value, onChange, onBlur, error, touched, digits, hint, wide, disabled, groups, phone, ...props }) {
  const status = error ? 'error' : touched && value ? 'success' : 'idle';
  return <div className={`application-field ${wide ? 'application-field-wide' : ''}`} data-field={name}>
    {digits ? <OTPInput name={name} label={label} length={digits} value={value} onChange={onChange} onBlur={onBlur}
      status={status} errorMessage={error} hint={hint} disabled={disabled} groups={groups}
      normalizePaste={phone ? localPhone : undefined} autoComplete={phone ? 'tel-national' : 'off'} placeholder={props.placeholder} />
      : <><Input name={name} label={label} value={value} onChange={onChange} onBlur={onBlur} error={error}
        success={status === 'success'} disabled={disabled} autoComplete="off" classNames={{ field: 'application-input-shell' }} {...props} />
      {hint && <small>{hint}</small>}</>}
  </div>;
}

function StepHeading({ step }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <div className="application-step-heading"><h3 tabIndex={-1} ref={heading}>{applicationSteps[step].title === 'Student' ? 'Personal information' : applicationSteps[step].title === 'Guardian' ? 'Guardian details' : applicationSteps[step].title === 'Skills' ? 'Relevant skills (optional)' : 'Review your application'}</h3><p>{applicationSteps[step].description}</p></div>;
}

function MemberForm({ member, onClose }) {
  const create = useAdminCreateMember();
  const update = useUpdateMember();
  const skills = useSkills();
  const { addToast } = useToast();
  const locked = useRef(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [skillDraft, setSkillDraft] = useState('');
  const [skillError, setSkillError] = useState('');
  const configQuery = useAppConfig();
  const activeYear = configQuery.data?.ACADEMIC_YEAR || DEFAULT_ACADEMIC_YEAR;
  const isPaper = !member || Boolean(member.form_number);
  const isApproved = member?.membership_status === 'accepted';
  const existingActiveFee = getActiveFee(member, activeYear);
  const isPaidAndApproved = isApproved && Boolean(existingActiveFee);
  const [form, setForm] = useState(() => ({
    full_name: member?.full_name || '',
    index_number: member?.index_number || '', date_of_birth: member?.date_of_birth || '',
    joined_date: member?.joined_date || colomboToday(), city: member?.city || '',
    whatsapp_number: localPhone(member?.whatsapp_number), email_address: member?.email_address || '',
    form_number: member?.form_number || '',
    fee_received: Boolean(existingActiveFee), interests: member?.interests || [], custom_skills: [],
    guardian: { guardian_name: member?.guardian?.guardian_name || '', contact_number: localPhone(member?.guardian?.contact_number), occupation: member?.guardian?.occupation || '' },
  }));
  const busy = create.isPending || update.isPending;
  const set = (name, value) => {
    setError('');
    setForm(old => ['guardian_name', 'contact_number', 'occupation'].includes(name)
      ? { ...old, guardian: { ...old.guardian, [name]: value } } : { ...old, [name]: value });
  };
  const getError = name => applicationFieldError(name, fieldValue(form, name), { isPaper, form });
  const field = (name, label, props = {}) => <ApplicationField key={name} name={name} label={label}
    value={fieldValue(form, name)} onChange={value => set(name, value)}
    onBlur={() => setTouched(old => ({ ...old, [name]: true }))}
    error={touched[name] ? getError(name) : ''} touched={touched[name]} {...props} />;
  const dateField = (name, label, disabled = false) => <div className="application-date" key={name}>{field(name, label, { digits: 8, groups: [4, 6], disabled,
    value: dateDigits(form[name]), onChange: value => set(name, dateFromDigits(value)), placeholder: 'YYYYMMDD',
    hint: disabled ? 'Locked after the member ID is issued.' : 'Year · month · day. Type the digits or pick a date.' })}
    {!disabled && <input type="date" aria-label={`Choose ${label.replace(' *', '').toLowerCase()}`} className="application-date-picker"
      value={/^\d{4}-\d{2}-\d{2}$/.test(form[name]) ? form[name] : ''} min={name === 'date_of_birth' ? '1940-01-01' : form.date_of_birth}
      max={colomboToday()} onChange={event => { set(name, event.target.value); setTouched(old => ({ ...old, [name]: true })); }} />}
  </div>;
  const phoneField = (name, label) => {
    const value = fieldValue(form, name);
    // Preserve previously recorded international numbers without truncating them.
    return field(name, label, value.startsWith('+') ? { type: 'tel', maxLength: 20, hint: 'Existing international number.' }
      : { digits: 10, phone: true, groups: [3, 6], placeholder: '0701234567', hint: '10 digits, starting with 0. You can paste a +94 number.' });
  };

  function goTo(next) {
    setError('');
    if (next > step) {
      const names = stepFields.slice(0, next).flat();
      setTouched(old => ({ ...old, ...Object.fromEntries(names.map(name => [name, true])) }));
      const invalid = names.find(name => getError(name));
      if (invalid) {
        const invalidStep = stepFields.findIndex(fields => fields.includes(invalid));
        setStep(invalidStep);
        requestAnimationFrame(() => document.querySelector(`.adm-application-modal [name="${invalid}"]`)?.focus());
        return;
      }
      if (next > 2 && (skills.isPending || skills.isError)) { setError('Load the skill list before continuing.'); return; }
      if (next > 2 && skillDraft.trim()) { setSkillError('Add this skill, or clear the text before continuing.'); setStep(2); return; }
    }
    setStep(next);
  }

  function addSkill() {
    const name = normalizeApplicationText(skillDraft);
    if (!name || name.length > 50) { setSkillError('Enter a skill name with 1 to 50 characters.'); return; }
    const existing = skills.data?.find(skill => normalizeApplicationText(skill.skill_name) === name);
    if (existing) {
      if (!existing.is_active && !form.interests.includes(existing.id)) { setSkillError('This skill is inactive. Restore it in Skills before selecting it.'); return; }
      set('interests', [...new Set([...form.interests, existing.id])]);
    } else if (!form.custom_skills.includes(name)) {
      if (form.custom_skills.length >= 20) { setSkillError('You can add up to 20 new skills.'); return; }
      set('custom_skills', [...form.custom_skills, name]);
    }
    setSkillDraft(''); setSkillError('');
  }

  async function save(event) {
    event.preventDefault();
    if (step < 3) { goTo(step + 1); return; }
    const invalid = stepFields.flat().find(name => getError(name));
    if (invalid) { setTouched(Object.fromEntries(stepFields.flat().map(name => [name, true]))); setStep(stepFields.findIndex(fields => fields.includes(invalid))); return; }
    if (locked.current || skills.isPending || skills.isError) return;
    locked.current = true; setError('');
    try {
      const payload = { ...form };
      payload.academic_year = activeYear;
      payload.fee_amount = fee;
      if (isPaidAndApproved) {
        delete payload.fee_received;
      } else if (member && form.fee_received === Boolean(existingActiveFee)) {
        delete payload.fee_received;
      }
      if (member) await update.mutateAsync({ id: member.id, payload }); else await create.mutateAsync(payload);
      addToast({ type: 'success', message: member ? 'Member details saved.' : 'Application submitted. Review and approve it to issue a member ID.' });
      onClose();
    } catch (err) { setError(memberError(err)); } finally { locked.current = false; }
  }

  const availableSkills = (skills.data || []).filter(skill => skill.is_active || form.interests.includes(skill.id));
  const selectedSkills = [...form.interests.map(id => skills.data?.find(skill => skill.id === id)?.skill_name || 'Saved skill'), ...form.custom_skills];
  const fee = Number(existingActiveFee?.fee_amount || configQuery.data?.MEMBERSHIP_FEE_LKR || DEFAULT_FEE_LKR);
  return <ApplicationDialog step={step} busy={busy} onClose={onClose} title={member ? 'Edit member' : 'Submit an application'}>{closeApplication => <>
    <nav aria-label="Application steps"><ol className="application-stepper">
      {applicationSteps.map((item, index) => <li key={item.title} data-current={step === index} data-complete={step > index}>
        <button type="button" disabled={busy} aria-current={step === index ? 'step' : undefined} onClick={() => goTo(index)} aria-label={`Step ${index + 1}: ${item.title}`}><span>{step > index ? <Check size={14} /> : index + 1}</span><strong>{item.title}</strong></button>
      </li>)}
    </ol></nav>
    <form noValidate onSubmit={save} className="application-form">
      <div className="application-scroll">
        <StepHeading step={step} />
        {error && <div role="alert" className="adm-error">{error}</div>}
        <fieldset disabled={busy} className="application-fields">
          <legend className="sr-only">{applicationSteps[step].title}</legend>
          {step === 0 && <div className="application-grid">
            {field('form_number', 'Form number *', { digits: 4, placeholder: '0001', disabled: Boolean(member?.member_id), hint: member?.member_id ? 'Locked after approval and ID issuance.' : 'Copy all four digits, including leading zeros.' })}
            {field('index_number', 'Admission number *', { digits: 5, placeholder: '29012', hint: 'The student’s school admission number.' })}
            {field('full_name', 'Full name *', { maxLength: 200, wide: true, placeholder: 'e.g. Rathnayaka Mudiyanselage Palle Gedara Thamindu Hasarinda.', hint: 'Write the full name or use initials, exactly as on the form. For example: Rathnayaka Mudiyanselage Palle Gedara Thamindu Hasarinda.' })}
            {dateField('date_of_birth', 'Date of birth *', Boolean(member?.member_id))}
            {phoneField('whatsapp_number', 'WhatsApp number *')}
            {field('email_address', 'Email address *', { type: 'email', maxLength: 254, placeholder: 'student@example.com' })}
            <div className="application-field application-city" data-field="city">
              <label>City / town *</label>
              <Combobox value={normalizeApplicationText(form.city)} disabled={busy} onValueChange={value => { set('city', value); setTouched(old => ({ ...old, city: true })); }}>
                <ComboboxTrigger><ComboboxInput name="city" aria-label="City / town" placeholder="Search cities, e.g. Colombo" aria-invalid={Boolean(touched.city && getError('city'))} aria-describedby={touched.city && getError('city') ? 'application-city-error' : undefined} /></ComboboxTrigger>
                <ComboboxContent className="application-city-options"><ComboboxList><ComboboxEmpty>No matching cities. Try a nearby town.</ComboboxEmpty>
                  {[...new Set([...SRI_LANKAN_CITIES.map(normalizeApplicationText), ...(form.city ? [normalizeApplicationText(form.city)] : [])])].map(city => <ComboboxItem key={city} value={city}>{city}</ComboboxItem>)}
                </ComboboxList></ComboboxContent>
              </Combobox>
              {touched.city && getError('city') && <p id="application-city-error" role="alert">{getError('city')}</p>}
            </div>
          </div>}
          {step === 1 && <div className="application-grid">
            {field('guardian_name', 'Guardian full name *', { maxLength: 150, wide: true, placeholder: 'e.g. R M P G Sunil Rathnayaka' })}
            {phoneField('contact_number', 'Guardian contact number *')}
            {field('occupation', 'Occupation (optional)', { maxLength: 100, placeholder: 'e.g. Teacher' })}
          </div>}
          {step === 2 && <div className="application-skills">
            {skills.isError ? <div className="adm-error" role="alert">Could not load skills. <button type="button" onClick={() => skills.refetch()}>Retry</button></div>
              : skills.isPending ? <p role="status">Loading skills...</p>
                : <><div className="application-skill-pills" aria-label="Available skills">{availableSkills.map(skill => <button type="button" key={skill.id} aria-pressed={form.interests.includes(skill.id)}
                  onClick={() => set('interests', form.interests.includes(skill.id) ? form.interests.filter(id => id !== skill.id) : [...form.interests, skill.id])}>
                  {form.interests.includes(skill.id) ? <Check size={15} /> : <Plus size={15} />}<span>{skill.skill_name}{!skill.is_active && ' (inactive)'}</span></button>)}</div>
                  {!availableSkills.length && <p>No skills yet. Add the first skill below.</p>}
                  <div className="application-add-skill"><Input label="Add a skill from the form (optional)" name="custom_skill" value={skillDraft} onChange={value => { setSkillDraft(value); setSkillError(''); }}
                    error={skillError} maxLength={50} placeholder="e.g. live sound engineering" classNames={{ field: 'application-input-shell' }}
                    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} />
                    <Button type="button" variant="secondary" onClick={addSkill}><Plus size={16} /> Add skill</Button></div>
                  <p className="application-note">New skills are saved to the skill list when you submit this application.</p>
                  {form.custom_skills.length > 0 && <div className="application-skill-pills application-new-skills" aria-label="New skills">{form.custom_skills.map(name => <button type="button" key={name} aria-label={`Remove ${name}`} onClick={() => set('custom_skills', form.custom_skills.filter(value => value !== name))}><span>{name}</span><small>new</small><X size={14} /></button>)}</div>}
                </>}
            {member?.other_skills && <p className="application-note">Previously recorded: {member.other_skills}. Select or add the matching skills above.</p>}
            <p className="application-selection-count" aria-live="polite">{selectedSkills.length ? `${selectedSkills.length} skill${selectedSkills.length === 1 ? '' : 's'} selected` : 'No skills selected (optional). A beginner can still apply.'}</p>
          </div>}
          {step === 3 && <div className="application-review">
            <dl>{[['Student', form.full_name], ['Form / admission', `${form.form_number || 'Not recorded'} / ${form.index_number || 'Not recorded'}`], ['Date of birth', form.date_of_birth], ['City / town', form.city], ['WhatsApp', form.whatsapp_number], ['Email', form.email_address], ['Guardian', form.guardian.guardian_name], ['Guardian contact', form.guardian.contact_number]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
            <div className="application-review-skills"><span>Skills</span><div className="application-skill-pills">{selectedSkills.length ? selectedSkills.map((name, index) => <span key={`${name}-${index}`}>{name}</span>) : <small>No skills selected</small>}</div></div>
            {dateField('joined_date', 'Date on form / joined date *')}
            <button
              type="button"
              className={`application-fee-checkout ${form.fee_received ? 'is-paid' : ''}`}
              onClick={() => {
                if (!isPaidAndApproved && !busy) {
                  set('fee_received', !form.fee_received);
                }
              }}
              disabled={busy || isPaidAndApproved}
              aria-pressed={form.fee_received}
              aria-label={`Membership fee received for academic year ${activeYear}`}
            >
              <div className="application-fee-checkout-check" aria-hidden="true">
                {form.fee_received ? (
                  <CheckCircle2 size={24} className="text-emerald-400" />
                ) : (
                  <Circle size={24} className="text-gray-500" />
                )}
              </div>
              <div className="application-fee-checkout-info">
                <div className="application-fee-checkout-title">
                  <strong>Paid for Academic Year {activeYear}</strong>
                  <span className="application-fee-checkout-amount">LKR {fee.toLocaleString('en-LK')}</span>
                </div>
                <small>
                  {isPaidAndApproved
                    ? `Payment confirmed on ${displayDate(existingActiveFee?.paid_date)}. Permanent after approval.`
                    : form.fee_received
                    ? `Fee paid for ${activeYear}. Will be recorded in the fee table upon saving.`
                    : `Unpaid · Tap to mark as paid for ${activeYear}`}
                </small>
              </div>
            </button>
            {isPaidAndApproved && <div className="adm-irreversible-banner" role="status"><Check size={16} /><span>Approved & Paid: Fee payment for {activeYear} is recorded and cannot be reversed.</span></div>}
            <p className="application-note">{member ? 'Your changes will update this member’s record.' : 'This application stays pending until an admin approves it. The member ID is created after approval.'}</p>
          </div>}
        </fieldset>
      </div>
      <footer className="application-actions"><span>Step {step + 1} of {applicationSteps.length}</span><div>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => step ? goTo(step - 1) : closeApplication()}>{step ? <><ArrowLeft size={15} /> Back</> : 'Cancel'}</Button>
        {step === 3
          ? <StatefulButton type="submit" state={busy ? 'loading' : error ? 'error' : 'idle'} loadingText="Saving..." errorText="Try again" disabled={busy || skills.isPending || skills.isError}>{member ? 'Save changes' : 'Submit application'}</StatefulButton>
          : <Button type="submit" disabled={busy || (step >= 2 && (skills.isPending || skills.isError))}>Continue <ArrowRight size={15} /></Button>}
      </div></footer>
    </form>
  </>}</ApplicationDialog>;
}

export function MemberEditor({ id, onClose }) {
  const query = useMember(id);
  if (!id) return <MemberForm onClose={onClose} />;
  if (query.isPending || (query.isError && !query.data)) return <AdminDialog open onClose={onClose} title="Edit member">
    <div className="adm-state" role={query.isError ? 'alert' : 'status'}>
      {query.isError ? <><p>{memberError(query.error)}</p><Button type="button" variant="secondary" onClick={() => query.refetch()}>Try again</Button></> : 'Loading member details...'}
    </div>
  </AdminDialog>;
  return <MemberForm member={query.data} onClose={onClose} />;
}
