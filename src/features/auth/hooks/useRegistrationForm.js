import { useState } from 'react';
import { sanitizeMemberInput, coerceE164, trimAndClean, stripHtml, toTitleCase } from '../../../utils/sanitize';

export const useRegistrationForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    index_number: '',
    full_name: '',
    name_with_initials: '',
    date_of_birth: '2008-04-15',
    joined_date: new Date().toISOString().split('T')[0],
    city: 'Colombo 05',
    whatsapp_number: '',
    email_address: '',
    guardian_name: '',
    guardian_occupation: '',
    guardian_contact: '',
    skills: [],
  });

  const handleChange = (field, value) => {
    let sanitizedVal = value;
    if (field === 'index_number') {
      sanitizedVal = value.replace(/[^0-9]/g, '');
    } else if (field === 'email_address') {
      sanitizedVal = value.toLowerCase();
    }

    setFormData((prev) => ({ ...prev, [field]: sanitizedVal }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleSkill = (skillId) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter(id => id !== skillId)
        : [...prev.skills, skillId]
    }));
    if (errors.skills) {
      setErrors(prev => ({ ...prev, skills: undefined }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    const coercedMemberPhone = coerceE164(formData.whatsapp_number);
    const coercedGuardianPhone = coerceE164(formData.guardian_contact);

    if (step === 1) {
      if (!formData.index_number.trim()) newErrors.index_number = 'Index number is required.';
      if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required.';
      if (!formData.name_with_initials.trim()) newErrors.name_with_initials = 'Name with initials is required.';
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required.';
      if (!formData.whatsapp_number.trim()) newErrors.whatsapp_number = 'WhatsApp number is required.';
      else if (!/^\+[1-9]\d{1,14}$/.test(coercedMemberPhone)) newErrors.whatsapp_number = 'Enter a valid Sri Lankan number (e.g. 077 123 4567).';
      if (!formData.email_address.trim()) newErrors.email_address = 'Email address is required.';
    } else if (step === 2) {
      if (!formData.guardian_name.trim()) newErrors.guardian_name = 'Guardian name is required.';
      if (!formData.guardian_contact.trim()) newErrors.guardian_contact = 'Guardian contact number is required.';
      else if (!/^\+[1-9]\d{1,14}$/.test(coercedGuardianPhone)) newErrors.guardian_contact = 'Enter a valid Sri Lankan number (e.g. 077 123 4567).';
    } else if (step === 3) {
      if (!formData.skills || formData.skills.length === 0) newErrors.skills = 'Please select at least one relevant skill.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBlur = (field) => {
    if (field === 'whatsapp_number' || field === 'guardian_contact') {
      const val = formData[field];
      if (val && !val.startsWith('+')) {
        let clean = val.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (clean.length > 0) {
          setFormData(prev => ({ ...prev, [field]: '+94' + clean }));
        }
      }
    } else if (['full_name', 'name_with_initials', 'guardian_name'].includes(field)) {
      setFormData(prev => ({ ...prev, [field]: toTitleCase(prev[field]) }));
    }
  };

  const resetForm = () => {
    setFormData({
      index_number: '', full_name: '', name_with_initials: '', date_of_birth: '2008-04-15',
      joined_date: new Date().toISOString().split('T')[0], city: 'Colombo 05', whatsapp_number: '', email_address: '',
      guardian_name: '', guardian_occupation: '', guardian_contact: '', skills: [],
    });
    setActiveStep(1);
    setErrors({});
  };

  const getSanitizedPayload = () => {
    const coercedMemberPhone = coerceE164(formData.whatsapp_number);
    const coercedGuardianPhone = coerceE164(formData.guardian_contact);

    const rawPayload = {
      index_number: formData.index_number,
      full_name: formData.full_name,
      name_with_initials: formData.name_with_initials,
      date_of_birth: formData.date_of_birth,
      joined_date: formData.joined_date,
      city: formData.city || 'Colombo',
      whatsapp_number: coercedMemberPhone,
      email_address: formData.email_address,
      guardian: {
        guardian_name: trimAndClean(stripHtml(formData.guardian_name)),
        occupation: trimAndClean(formData.guardian_occupation) || 'Not Specified',
        contact_number: coercedGuardianPhone,
      }
    };
    return sanitizeMemberInput(rawPayload);
  };

  return {
    activeStep,
    formData,
    errors,
    setErrors,
    handleChange,
    toggleSkill,
    handleBlur,
    handleNextStep,
    handlePrevStep,
    validateStep,
    resetForm,
    getSanitizedPayload
  };
};


