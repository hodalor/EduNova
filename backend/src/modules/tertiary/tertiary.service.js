const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const listDepartments = async ({ institutionId }) =>
  store.tertiary.departments.filter((item) => item.institution_id === institutionId);

const createDepartment = async ({ institutionId, payload, userId, ip }) => {
  const department = {
    id: `dep-${store.tertiary.departments.length + 1}`,
    institution_id: institutionId,
    name: payload.name,
  };
  store.tertiary.departments.push(department);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'tertiary_department',
    resourceId: department.id,
    newValues: department,
    ip,
  });

  return department;
};

const listPrograms = async ({ institutionId }) =>
  store.tertiary.programs.filter((item) => item.institution_id === institutionId);

const getAcademicStructureForInstitution = ({ institutionId }) => {
  const groups = store.academics.structure.groups.filter(
    (item) => item.institution_id === institutionId && item.level_code === 'TR'
  );
  const groupIds = new Set(groups.map((item) => item.id));
  const periods = store.academics.structure.periods.filter(
    (item) => item.institution_id === institutionId && groupIds.has(item.group_id)
  );
  const periodIds = new Set(periods.map((item) => item.id));
  const offerings = store.academics.structure.offerings.filter(
    (item) =>
      item.institution_id === institutionId &&
      groupIds.has(item.group_id) &&
      periodIds.has(item.period_id)
  );

  return { groups, periods, offerings };
};

const getStudentRegistrationState = async ({ institutionId, studentId }) => {
  const progress = store.tertiary.studentProgress.find(
    (item) => item.student_id === studentId && item.institution_id === institutionId
  );
  if (!progress) {
    throw Object.assign(new Error('Student registration profile not found.'), { statusCode: 404 });
  }

  const { groups, periods, offerings } = getAcademicStructureForInstitution({ institutionId });
  const currentGroup = groups.find((item) => item.id === progress.current_group_id);
  const currentPeriod = periods.find((item) => item.id === progress.current_period_id);
  if (!currentGroup || !currentPeriod) {
    throw Object.assign(new Error('Current academic structure is incomplete.'), { statusCode: 400 });
  }

  const currentOfferings = offerings.filter(
    (item) => item.group_id === currentGroup.id && item.period_id === currentPeriod.id
  );
  const outstandingResits = currentOfferings.filter((item) =>
    progress.outstanding_resit_codes.includes(item.code)
  );

  const eligibleCourses =
    progress.outstanding_resit_codes.length > 0
      ? outstandingResits
      : currentOfferings.filter((item) =>
          item.prerequisite_codes.every((code) => progress.passed_offering_codes.includes(code))
        );

  const blockedCourses = currentOfferings
    .filter((item) => !eligibleCourses.some((eligible) => eligible.id === item.id))
    .map((item) => ({
      ...item,
      reason:
        progress.outstanding_resit_codes.length > 0
          ? 'Outstanding resit exists. Clear carry-over courses before adding progression courses.'
          : 'Missing prerequisite completion for this course.',
    }));

  const nextPeriod = periods.find(
    (item) =>
      item.group_id === currentGroup.id &&
      item.sequence === Number(currentPeriod.sequence || 0) + 1
  );
  const nextTermPreview = nextPeriod
    ? offerings.filter((item) => item.group_id === currentGroup.id && item.period_id === nextPeriod.id)
    : [];

  const alreadyRegistered = store.tertiary.registrations.filter(
    (item) =>
      item.institution_id === institutionId &&
      item.student_id === studentId &&
      item.period_id === currentPeriod.id
  );

  return {
    student_id: studentId,
    current_group: currentGroup,
    current_period: currentPeriod,
    fee_clearance: progress.fee_clearance,
    can_progress: progress.can_progress && progress.outstanding_resit_codes.length === 0,
    outstanding_resit_codes: progress.outstanding_resit_codes,
    eligible_courses: eligibleCourses,
    blocked_courses: blockedCourses,
    next_period_preview: nextTermPreview,
    already_registered: alreadyRegistered,
  };
};

const registerCourses = async ({ institutionId, payload, userId, ip }) => {
  const state = await getStudentRegistrationState({
    institutionId,
    studentId: payload.student_id,
  });

  if (!state.current_period.registration_open) {
    throw Object.assign(new Error('Registration is closed for the active academic period.'), {
      statusCode: 400,
    });
  }
  if (!state.fee_clearance) {
    throw Object.assign(new Error('Student is not cleared for registration.'), {
      statusCode: 400,
    });
  }

  const requestedCourseIds = payload.course_ids || payload.courses || [];
  const allowedCourseIds = new Set(state.eligible_courses.map((item) => item.id));
  const invalidCourseIds = requestedCourseIds.filter((item) => !allowedCourseIds.has(item));
  if (invalidCourseIds.length) {
    throw Object.assign(
      new Error('One or more selected courses are not allowed for this student in the current period.'),
      { statusCode: 400 }
    );
  }

  const selectedCourses = state.eligible_courses.filter((item) =>
    requestedCourseIds.includes(item.id)
  );
  const registration = {
    id: `reg-${store.tertiary.registrations.length + 1}`,
    institution_id: institutionId,
    student_id: payload.student_id,
    group_id: state.current_group.id,
    period_id: state.current_period.id,
    semester: state.current_period.name,
    courses: selectedCourses.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      credit_hours: item.credit_hours,
    })),
    total_credit_hours: selectedCourses.reduce(
      (sum, item) => sum + Number(item.credit_hours || 0),
      0
    ),
    registered_at: new Date().toISOString(),
  };
  store.tertiary.registrations.push(registration);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'course_registration',
    resourceId: registration.id,
    newValues: registration,
    ip,
  });

  return registration;
};

const getTranscript = async ({ institutionId, studentId }) => {
  const rows = store.tertiary.transcripts.filter(
    (item) => item.student_id === studentId && item.institution_id === institutionId
  );
  if (!rows.length) {
    throw Object.assign(new Error('Transcript not found.'), { statusCode: 404 });
  }

  const latest = rows[rows.length - 1];
  return {
    student_id: studentId,
    semesters: rows,
    cgpa: latest.cgpa,
    credit_hours: latest.credit_hours,
  };
};

module.exports = {
  listDepartments,
  createDepartment,
  listPrograms,
  getStudentRegistrationState,
  registerCourses,
  getTranscript,
};
