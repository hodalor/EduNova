const crypto = require('crypto');

const { models, sequelize } = require('../../config/database');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const databaseReady = () => Boolean(models.Institution && sequelize?.transaction);

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const ensureTertiarySettings = (settings) => {
  const next = cloneSettings(settings);
  next.academics = next.academics || { groups: [], periods: [], offerings: [], progression_rules: [] };
  next.tertiary = next.tertiary || {};
  next.tertiary.faculties = next.tertiary.faculties || [];
  next.tertiary.departments = next.tertiary.departments || [];
  next.tertiary.programs = next.tertiary.programs || [];
  next.tertiary.student_progress = next.tertiary.student_progress || [];
  next.tertiary.registrations = next.tertiary.registrations || [];
  next.tertiary.transcripts = next.tertiary.transcripts || [];
  next.tertiary.progression = next.tertiary.progression || [
    'Students register only for their current semester roadmap.',
    'Outstanding resits block forward registration until cleared.',
  ];
  next.tertiary.credentials = next.tertiary.credentials || ['Certificate', 'Diploma', 'Degree'];
  next.tertiary.id_format = next.tertiary.id_format || 'FAC/DEPT/YEAR/SEQ';
  return next;
};

const getAcademicStructureFromSettings = (settings) => {
  const groups = (settings.academics?.groups || []).filter((item) => item.level_code === 'TR');
  const groupIds = new Set(groups.map((item) => item.id));
  const periods = (settings.academics?.periods || []).filter((item) => groupIds.has(item.group_id));
  const periodIds = new Set(periods.map((item) => item.id));
  const offerings = (settings.academics?.offerings || []).filter(
    (item) => groupIds.has(item.group_id) && periodIds.has(item.period_id)
  );
  return { groups, periods, offerings };
};

const getOverviewFromDatabase = async ({ institutionId }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  return {
    faculties: settings.tertiary.faculties,
    departments: settings.tertiary.departments,
    programs: settings.tertiary.programs,
    progression: settings.tertiary.progression,
    credentials: settings.tertiary.credentials,
    id_format: settings.tertiary.id_format,
  };
};

const getOverviewFromRuntime = async ({ institutionId }) => ({
  faculties: [],
  departments: store.tertiary.departments.filter((item) => item.institution_id === institutionId),
  programs: store.tertiary.programs.filter((item) => item.institution_id === institutionId),
  progression: [
    'Students register only for their current semester roadmap.',
    'Outstanding resits block forward registration until cleared.',
  ],
  credentials: ['Certificate', 'Diploma', 'Degree'],
  id_format: 'FAC/DEPT/YEAR/SEQ',
});

const getOverview = async (context) => {
  if (databaseReady()) {
    return getOverviewFromDatabase(context);
  }
  return getOverviewFromRuntime(context);
};

const listFaculties = async ({ institutionId }) => (await getOverview({ institutionId })).faculties;
const listDepartments = async ({ institutionId }) => (await getOverview({ institutionId })).departments;
const listPrograms = async ({ institutionId }) => (await getOverview({ institutionId })).programs;

const updateTertiaryCollection = async ({
  institutionId,
  collection,
  buildEntry,
  resourceType,
  userId,
  ip,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureTertiarySettings(institution.settings);
    const entry = buildEntry(settings);
    settings.tertiary[collection].push(entry);
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType,
      resourceId: entry.id,
      newValues: entry,
      ip,
    });

    return entry;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createFaculty = async ({ institutionId, payload, userId, ip }) => {
  if (!databaseReady()) {
    const faculty = {
      id: `fac-${store.tertiary.departments.length + 1}`,
      institution_id: institutionId,
      name: payload.name,
      dean: payload.dean || null,
    };
    return faculty;
  }

  return updateTertiaryCollection({
    institutionId,
    collection: 'faculties',
    resourceType: 'tertiary_faculty',
    userId,
    ip,
    buildEntry: (settings) => {
      const code = String(payload.code || payload.name || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-');
      const duplicate = settings.tertiary.faculties.find((item) => item.code === code);
      if (duplicate) {
        throw Object.assign(new Error('A faculty with this code already exists.'), {
          statusCode: 409,
        });
      }

      return {
        id: payload.id || crypto.randomUUID(),
        institution_id: institutionId,
        name: payload.name,
        code,
        dean: payload.dean || null,
      };
    },
  });
};

const createDepartment = async ({ institutionId, payload, userId, ip }) => {
  if (!databaseReady()) {
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
  }

  return updateTertiaryCollection({
    institutionId,
    collection: 'departments',
    resourceType: 'tertiary_department',
    userId,
    ip,
    buildEntry: (settings) => {
      const faculty = settings.tertiary.faculties.find((item) => item.id === payload.faculty_id);
      if (!faculty) {
        throw Object.assign(new Error('Faculty not found for this department.'), { statusCode: 404 });
      }

      const code = String(payload.code || payload.name || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-');

      return {
        id: payload.id || crypto.randomUUID(),
        institution_id: institutionId,
        faculty_id: faculty.id,
        faculty: faculty.name,
        name: payload.name,
        code,
      };
    },
  });
};

const createProgram = async ({ institutionId, payload, userId, ip }) => {
  if (!databaseReady()) {
    const program = {
      id: `prog-${store.tertiary.programs.length + 1}`,
      institution_id: institutionId,
      name: payload.name,
      type: payload.type || 'degree',
    };
    store.tertiary.programs.push(program);
    return program;
  }

  return updateTertiaryCollection({
    institutionId,
    collection: 'programs',
    resourceType: 'tertiary_program',
    userId,
    ip,
    buildEntry: (settings) => {
      const department = settings.tertiary.departments.find(
        (item) => item.id === payload.department_id
      );
      if (!department) {
        throw Object.assign(new Error('Department not found for this program.'), { statusCode: 404 });
      }

      return {
        id: payload.id || crypto.randomUUID(),
        institution_id: institutionId,
        faculty_id: department.faculty_id,
        department_id: department.id,
        faculty: department.faculty,
        department: department.name,
        name: payload.name,
        code: String(payload.code || payload.name || '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '-'),
        credential: payload.credential || payload.type || 'Degree',
        duration: payload.duration || '4 years',
        calendar: payload.calendar || 'semester',
        type: payload.type || 'degree',
      };
    },
  });
};

const getRegistrationStateFromSettings = async ({ institutionId, studentId }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  const progress = settings.tertiary.student_progress.find(
    (item) => item.student_id === studentId && item.institution_id === institutionId
  );
  if (!progress) {
    throw Object.assign(new Error('Student registration profile not found.'), { statusCode: 404 });
  }

  const { groups, periods, offerings } = getAcademicStructureFromSettings(settings);
  const currentGroup = groups.find((item) => item.id === progress.current_group_id);
  const currentPeriod = periods.find((item) => item.id === progress.current_period_id);
  if (!currentGroup || !currentPeriod) {
    throw Object.assign(new Error('Current academic structure is incomplete.'), { statusCode: 400 });
  }

  const currentOfferings = offerings.filter(
    (item) => item.group_id === currentGroup.id && item.period_id === currentPeriod.id
  );
  const outstandingResits = currentOfferings.filter((item) =>
    (progress.outstanding_resit_codes || []).includes(item.code)
  );

  const eligibleCourses =
    (progress.outstanding_resit_codes || []).length > 0
      ? outstandingResits
      : currentOfferings.filter((item) =>
          (item.prerequisite_codes || []).every((code) =>
            (progress.passed_offering_codes || []).includes(code)
          )
        );

  const blockedCourses = currentOfferings
    .filter((item) => !eligibleCourses.some((eligible) => eligible.id === item.id))
    .map((item) => ({
      ...item,
      reason:
        (progress.outstanding_resit_codes || []).length > 0
          ? 'Outstanding resit exists. Clear carry-over courses before adding progression courses.'
          : 'Missing prerequisite completion for this course.',
    }));

  const nextPeriod = periods.find(
    (item) =>
      item.group_id === currentGroup.id &&
      Number(item.sequence || 0) === Number(currentPeriod.sequence || 0) + 1
  );
  const nextTermPreview = nextPeriod
    ? offerings.filter((item) => item.group_id === currentGroup.id && item.period_id === nextPeriod.id)
    : [];

  const alreadyRegistered = settings.tertiary.registrations.filter(
    (item) =>
      item.institution_id === institutionId &&
      item.student_id === studentId &&
      item.period_id === currentPeriod.id
  );

  return {
    settings,
    student_id: studentId,
    current_group: currentGroup,
    current_period: currentPeriod,
    fee_clearance: progress.fee_clearance,
    can_progress: progress.can_progress && (progress.outstanding_resit_codes || []).length === 0,
    outstanding_resit_codes: progress.outstanding_resit_codes || [],
    eligible_courses: eligibleCourses,
    blocked_courses: blockedCourses,
    next_period_preview: nextTermPreview,
    already_registered: alreadyRegistered,
  };
};

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
  if (databaseReady()) {
    const { settings, ...state } = await getRegistrationStateFromSettings({ institutionId, studentId });
    return state;
  }

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
  if (databaseReady()) {
    const state = await getRegistrationStateFromSettings({
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

    const selectedCourses = state.eligible_courses.filter((item) => requestedCourseIds.includes(item.id));
    const registration = {
      id: crypto.randomUUID(),
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

    const transaction = await sequelize.transaction();
    try {
      const institution = await models.Institution.findByPk(institutionId, { transaction });
      const nextSettings = ensureTertiarySettings(institution.settings);
      nextSettings.tertiary.registrations.push(registration);
      await institution.update({ settings: nextSettings }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'course_registration',
      resourceId: registration.id,
      newValues: registration,
      ip,
    });

    return registration;
  }

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
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureTertiarySettings(institution.settings);
    const rows = settings.tertiary.transcripts.filter(
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
  }

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
  getOverview,
  listFaculties,
  createFaculty,
  listDepartments,
  createDepartment,
  listPrograms,
  createProgram,
  getStudentRegistrationState,
  registerCourses,
  getTranscript,
};
