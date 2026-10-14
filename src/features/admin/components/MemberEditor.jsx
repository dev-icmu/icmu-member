import { useRef, useState } from 'react';
import { Button } from '@/components/motion/button/base';
import { useAdminCreateMember, useMember, useUpdateMember } from '@/entities/members/hooks/useMembers';
import { useSkills } from '@/entities/skills/hooks/useSkills';
import { useToast } from '@/context/ToastContext';
import { AdminDialog } from './AdminDialog';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

export function memberError(error) {
  if (error?.code === '23505') return 'A member with this form number, school index or email already exists. Check the member list before adding another record.';
  if (error?.code === '42501') return 'Your admin access could not be verified. Sign in again and retry.';
  return error?.message || 'The change could not be saved. Please try again.';
}

function MemberForm({ member, onClose }) {
  const create = useAdminCreateMember();
  const update = useUpdateMember();
  const skills = useSkills();
  const { addToast } = useToast();
  const locked = useRef(false);
  const [error, setError] = useState('');
  const isPaper = !member || member.application_source === 'paper';
  const [form, setForm] = useState(() => ({
    full_name: member?.full_name || '',
    name_with_initials: member?.name_with_initials || '',
    index_number: member?.index_number || '',
    date_of_birth: member?.date_of_birth || '',
    joined_date: member?.joined_date || today(),
    city: member?.city || '',
    whatsapp_number: member?.whatsapp_number || '',
    email_address: member?.email_address || '',
    form_number: member?.form_number || '',
    school_class: member?.school_class || '',
    address: member?.address || '',
    other_skills: member?.other_skills || '',
    fee_amount: member ? member.fee_amount ?? '' : 500,
    fee_received: Boolean(member?.fee_paid_at),
    interests: member?.interests || [],
    guardian: {
      guardian_name: member?.guardian?.guardian_name || '',
      contact_number: member?.guardian?.contact_number || '',
      occupation: member?.guardian?.occupation || '',
    },
  }));
  const busy = create.isPending || update.isPending;
  const feeAmountRequired = isPaper || form.fee_received || member?.fee_amount != null;
  const set = (name, value) => setForm(old => ({ ...old, [name]: value }));
  const guardianSet = (name, value) => setForm(old => ({ ...old, guardian: { ...old.guardian, [name]: value } }));

  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setError('');
    try {
      const payload = { ...form };
      if (form.fee_amount === '') delete payload.fee_amount;
      else payload.fee_amount = Number(form.fee_amount);
      if (member && form.fee_received === Boolean(member.fee_paid_at)) delete payload.fee_received;
      if (!member) payload.application_source = 'paper';
      if (member) await update.mutateAsync({ id: member.id, payload });
      else await create.mutateAsync(payload);
      addToast({
        type: 'success',
        message: member ? 'Member details saved.' : 'Paper form saved to pending applications. Review and approve when ready.',
      });
      onClose();
    } catch (err) {
      setError(memberError(err));
    } finally {
      locked.current = false;
    }
  }

  const studentFields = [
    { name: 'full_name', label: 'Full name', type: 'text', maxLength: 200, required: true },
    { name: 'name_with_initials', label: 'Name with initials', type: 'text', maxLength: 100, required: true, hint: 'Enter initials and surname for the member record.' },
    { name: 'index_number', label: 'School index number', type: 'text', maxLength: 20 },
    { name: 'school_class', label: 'Class', type: 'text', maxLength: 30, required: isPaper, placeholder: 'e.g. 9 A' },
    { name: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
    { name: 'whatsapp_number', label: 'WhatsApp number', type: 'tel', maxLength: 20, required: true, placeholder: '+94 77 123 4567' },
    { name: 'email_address', label: 'Email address', type: 'email', maxLength: 254 },
    { name: 'city', label: 'City', type: 'text', maxLength: 100 },
  ];
  const availableSkills = (skills.data || []).filter(skill => skill.is_active || form.interests.includes(skill.id));

  return <AdminDialog
    open onClose={onClose} busy={busy} wide
    title={member ? 'Edit member' : 'Enter paper form'}
    description={member
      ? 'Update the form details, student information and recorded payment.'
      : 'Enter the completed paper form and save it as pending. Approval creates the member ID.'}
  >
    <form onSubmit={save} className="adm-member-form">
      {error && <div className="adm-error" role="alert">{error}</div>}
      <fieldset disabled={busy}>
        <legend>Paper form</legend>
        {!isPaper && <p className="adm-paper-note">This is an existing record. Add paper form and payment details only when they are available.</p>}
        <div className="adm-form-grid">
          <label className="adm-field">
            <span>Form number{isPaper && ' *'}</span>
            <input name="form_number" type="text" value={form.form_number} onChange={event => set('form_number', event.target.value)} required={isPaper} maxLength={50} placeholder="e.g. 0001" autoComplete="off" />
            <small>Copy the number from the paper form, including any leading zeros.</small>
          </label>
          <label className="adm-field">
            <span>Date on form / joined date *</span>
            <input name="joined_date" type="date" value={form.joined_date} onChange={event => set('joined_date', event.target.value)} required max={today()} />
            <small>Use the date written on the form or receipt.</small>
          </label>
          <label className="adm-field">
            <span>Membership fee (LKR){feeAmountRequired && ' *'}</span>
            <input name="fee_amount" type="number" inputMode="decimal" min="0" max="999999.99" step="0.01" value={form.fee_amount} onChange={event => set('fee_amount', event.target.value)} required={feeAmountRequired} placeholder="Not recorded" />
            <small>New forms start at LKR 500. Change this if the fee differs.</small>
          </label>
          <label className="adm-fee-confirmation">
            <input name="fee_received" type="checkbox" checked={form.fee_received} onChange={event => set('fee_received', event.target.checked)} />
            <span><strong>Membership fee received</strong><small>Tick only after checking that the payment was received.</small></span>
          </label>
        </div>
        <p className="adm-paper-note">{isPaper
          ? 'You can save an unpaid form as pending. Confirm the fee before approving the application.'
          : 'A blank fee amount means no fee has been recorded. Existing records are not assumed to be paid.'}</p>
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Student and guardian</legend>
        <div className="adm-form-grid">
          {studentFields.map(({ name, label, type, maxLength, required, hint, placeholder }) => <label className="adm-field" key={name}>
            <span>{label}{required && ' *'}</span>
            <input name={name} value={form[name]} onChange={event => set(name, event.target.value)} type={type} maxLength={maxLength} required={required} max={type === 'date' ? today() : undefined} disabled={name === 'date_of_birth' && Boolean(member?.member_id)} autoComplete="off" placeholder={placeholder} />
            {name === 'date_of_birth' && member?.member_id ? <small>Locked because a member ID has already been issued.</small> : hint ? <small>{hint}</small> : null}
          </label>)}
          <label className="adm-field adm-field-wide">
            <span>Home address{isPaper && ' *'}</span>
            <textarea name="address" rows={3} value={form.address} onChange={event => set('address', event.target.value)} required={isPaper} maxLength={500} autoComplete="off" />
          </label>
        </div>
        <h3 className="adm-form-subheading">Parent or guardian</h3>
        <div className="adm-form-grid">
          {[
            ['guardian_name', 'Guardian name', true, 150],
            ['contact_number', 'Contact number', true, 20],
            ['occupation', 'Occupation', false, 100],
          ].map(([name, label, required, maxLength]) => <label className="adm-field" key={name}>
            <span>{label}{required && ' *'}</span>
            <input name={name} value={form.guardian[name]} type={name === 'contact_number' ? 'tel' : 'text'} required={required} maxLength={maxLength} onChange={event => guardianSet(name, event.target.value)} autoComplete="off" />
          </label>)}
        </div>
      </fieldset>

      <fieldset disabled={busy}>
        <legend>Skills</legend>
        <p className="adm-hint">Select the skills or interests marked on the form.</p>
        {skills.isError ? <div className="adm-error" role="alert">Could not load skills. <button type="button" onClick={() => skills.refetch()}>Retry</button></div>
          : skills.isPending ? <p role="status">Loading skills...</p>
            : availableSkills.length ? <div className="adm-checks">{availableSkills.map(skill => <label key={skill.id}>
              <input type="checkbox" checked={form.interests.includes(skill.id)} onChange={event => set('interests', event.target.checked ? [...form.interests, skill.id] : form.interests.filter(id => id !== skill.id))} />
              <span>{skill.skill_name}{!skill.is_active && ' (inactive)'}</span>
            </label>)}</div> : <p className="adm-paper-note">No skills are available yet. Record any other skills below.</p>}
        <label className="adm-field adm-form-subheading">
          <span>Other skills (optional)</span>
          <textarea name="other_skills" rows={3} value={form.other_skills} onChange={event => set('other_skills', event.target.value)} maxLength={500} placeholder="Copy any other skills written on the form." />
        </label>
      </fieldset>

      <div className="adm-dialog-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy || skills.isPending}>{busy ? 'Saving...' : member ? 'Save changes' : 'Save pending application'}</Button>
      </div>
    </form>
  </AdminDialog>;
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
