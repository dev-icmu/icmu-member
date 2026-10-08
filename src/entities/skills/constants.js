/**
 * Default skills that are always present in the system.
 * These are "protected" — they cannot be deleted or disabled by admins.
 * They act as constant rows in the skills table.
 */
export const DEFAULT_SKILLS = [
  {
    skill_name: 'Graphic Design',
    skill_desc: 'Visual design, illustration, and graphic arts',
    is_protected: true,
    is_active: true,
  },
  {
    skill_name: 'Video Editing',
    skill_desc: 'Video production, editing, and post-processing',
    is_protected: true,
    is_active: true,
  },
  {
    skill_name: 'Announcing',
    skill_desc: 'Public speaking, event hosting, and announcements',
    is_protected: true,
    is_active: true,
  },
];
