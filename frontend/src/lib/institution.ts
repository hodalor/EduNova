import type { InstitutionSummary, UserRole } from '../types/auth';

export const DEFAULT_LEVELS = ['PR', 'JH', 'SH'] as const;
export const PLATFORM_LEVELS = ['DC', 'PR', 'JH', 'SH', 'TR'] as const;

export const getInstitutionLevels = (institution?: InstitutionSummary | null) => {
  if (institution?.education_levels?.length) {
    return institution.education_levels;
  }
  if (institution?.code === 'MASTER') {
    return [...PLATFORM_LEVELS];
  }
  return [];
};

export const hasLevel = (institution: InstitutionSummary | null | undefined, level: string) =>
  getInstitutionLevels(institution).includes(level as never);

export const isTertiaryInstitution = (institution?: InstitutionSummary | null) =>
  hasLevel(institution, 'TR');

export const isDaycareInstitution = (institution?: InstitutionSummary | null) =>
  hasLevel(institution, 'DC');

export const getAcademicStructureLabel = (institution?: InstitutionSummary | null) => {
  const tertiaryCalendar = institution?.settings?.tertiary?.calendar_model;
  if (tertiaryCalendar) {
    return tertiaryCalendar;
  }

  if (isTertiaryInstitution(institution)) {
    return 'semester';
  }

  if (hasLevel(institution, 'SH') || hasLevel(institution, 'JH') || hasLevel(institution, 'PR')) {
    return 'term';
  }

  return 'session';
};

export const getWorkspaceLabel = (institution?: InstitutionSummary | null) => {
  const levels = getInstitutionLevels(institution);
  if (levels.length === 1 && levels[0] === 'TR') {
    return 'Tertiary';
  }
  if (levels.length === 1 && levels[0] === 'DC') {
    return 'Daycare';
  }
  if (levels.includes('TR') && levels.length > 1) {
    return 'Mixed K-12 and Tertiary';
  }
  if (levels.includes('DC') && levels.length > 1) {
    return 'Daycare and School';
  }
  if (levels.includes('SH')) {
    return 'Basic and Secondary';
  }
  if (levels.includes('PR')) {
    return 'Basic Education';
  }
  return 'Institution';
};

export const getRoleHomeTitle = (role: UserRole | null, institution?: InstitutionSummary | null) => {
  switch (role) {
    case 'teacher':
      return 'Teacher Workspace';
    case 'student':
      return 'Student Workspace';
    case 'parent':
      return 'Parent Workspace';
    case 'super_admin':
      return 'Platform Workspace';
    default:
      return `${getWorkspaceLabel(institution)} Operations Portal`;
  }
};
