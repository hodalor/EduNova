const crypto = require('crypto');

const { models, sequelize } = require('../../config/database');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const databaseReady = () => Boolean(models.Institution && sequelize?.transaction);

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const defaultProgressionPolicy = {
  allow_carry_over_progression: false,
  max_carry_over_courses: 0,
  max_carry_over_credits: 0,
  allow_manual_overrides: true,
};

const defaultFinancePolicy = {
  new_student_registration_percent: 50,
  returning_student_registration_percent: 50,
  midsem_exam_percent: 50,
  final_exam_percent: 100,
};

const normalizeBoolean = (value, fallback = false) =>
  value === undefined || value === null ? fallback : Boolean(value);

const normalizeNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProgressionOverride = (value) => {
  if (value === 'allow' || value === 'hold') {
    return value;
  }

  return 'default';
};

const parseCourseCodeList = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))
    );
  }

  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
};

const getProgressionPolicy = (settings) => ({
  ...defaultProgressionPolicy,
  ...(settings?.tertiary?.progression_policy || {}),
});

const getFinancePolicy = (settings) => ({
  ...defaultFinancePolicy,
  ...(settings?.tertiary?.finance_policy || {}),
});

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
  next.tertiary.progression_policy = getProgressionPolicy(next);
  next.tertiary.finance_policy = getFinancePolicy(next);
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

const sortBySequence = (items = []) =>
  items.slice().sort((a, b) => {
    const sequenceDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
    if (sequenceDiff !== 0) {
      return sequenceDiff;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

const resolveProgramGroupIds = ({ program, settings }) => {
  const directGroupIds = program.roadmap_group_ids || [];
  const linkedGroupIds = (settings.academics?.groups || [])
    .filter((item) => item.level_code === 'TR' && (item.program_ids || []).includes(program.id))
    .map((item) => item.id);

  return Array.from(new Set([...directGroupIds, ...linkedGroupIds]));
};

const buildProgramRoadmap = ({ program, settings }) => {
  const { groups, periods, offerings } = getAcademicStructureFromSettings(settings);
  const roadmapGroupIds = resolveProgramGroupIds({ program, settings });
  const scopedGroups = sortBySequence(
    groups.filter((item) => roadmapGroupIds.includes(item.id))
  );
  const scopedGroupIds = new Set(scopedGroups.map((item) => item.id));

  return {
    level_count: scopedGroups.length,
    total_courses: offerings.filter((item) => scopedGroupIds.has(item.group_id)).length,
    levels: scopedGroups.map((group) => {
      const levelPeriods = sortBySequence(periods.filter((item) => item.group_id === group.id));
      return {
        id: group.id,
        name: group.name,
        code: group.code,
        periods: levelPeriods.map((period) => ({
          id: period.id,
          name: period.name,
          sequence: Number(period.sequence || 0),
          status: period.status || 'planned',
          base_fee_amount: Number(period.base_fee_amount || 0),
          minimum_payment_percent: Number(period.minimum_payment_percent || 0),
          late_registration_penalty: Number(period.late_registration_penalty || 0),
          penalty_deadline: period.penalty_deadline || null,
          courses: offerings
            .filter((item) => item.group_id === group.id && item.period_id === period.id)
            .map((offering) => ({
              id: offering.id,
              code: offering.code,
              name: offering.name,
              credit_hours: offering.credit_hours ?? null,
              fee_amount: Number(offering.fee_amount || 0),
              is_core: offering.is_core !== false,
              prerequisite_codes: offering.prerequisite_codes || [],
            })),
        })),
      };
    }),
  };
};

const buildFeeSummary = ({
  currentPeriod,
  currentCourses,
  outstandingCourses = [],
  progress,
  financePolicy,
  paidAmount = 0,
  invoicedAmount = 0,
}) => {
  const courseTotal = currentCourses.reduce(
    (sum, item) => sum + Number(item.fee_amount || 0),
    0
  );
  const resitCourseTotal = outstandingCourses.reduce(
    (sum, item) => sum + Number(item.fee_amount || 0),
    0
  );
  const baseFeeAmount = Number(currentPeriod.base_fee_amount || 0);
  const isNewStudent =
    Number(progress?.passed_offering_codes?.length || 0) === 0 &&
    Number(progress?.completed_period_ids?.length || 0) === 0;
  const defaultRegistrationPercent = isNewStudent
    ? Number(financePolicy?.new_student_registration_percent || 0)
    : Number(financePolicy?.returning_student_registration_percent || 0);
  const minimumPaymentPercent = Number(
    Number(currentPeriod.minimum_payment_percent || 0) > 0
      ? currentPeriod.minimum_payment_percent
      : defaultRegistrationPercent
  );
  const lateRegistrationPenalty = Number(currentPeriod.late_registration_penalty || 0);
  const penaltyDeadline = currentPeriod.penalty_deadline || null;
  const today = new Date().toISOString().slice(0, 10);
  const penaltyApplied = Boolean(
    penaltyDeadline && String(today) > String(penaltyDeadline).slice(0, 10)
  );
  const totalAmount =
    baseFeeAmount +
    courseTotal +
    resitCourseTotal +
    (penaltyApplied ? lateRegistrationPenalty : 0);
  const minimumRequiredAmount =
    minimumPaymentPercent > 0 ? (totalAmount * minimumPaymentPercent) / 100 : 0;
  const manualClearance = progress.fee_clearance !== false;
  const meetsThreshold = minimumRequiredAmount <= 0 || Number(paidAmount || 0) >= minimumRequiredAmount;

  return {
    base_fee_amount: baseFeeAmount,
    course_fee_total: courseTotal,
    resit_course_total: resitCourseTotal,
    late_registration_penalty: lateRegistrationPenalty,
    penalty_deadline: penaltyDeadline,
    penalty_applied: penaltyApplied,
    total_amount: totalAmount,
    minimum_payment_percent: minimumPaymentPercent,
    minimum_required_amount: minimumRequiredAmount,
    paid_amount: Number(paidAmount || 0),
    invoiced_amount: Number(invoicedAmount || 0),
    outstanding_amount: Math.max(totalAmount - Number(paidAmount || 0), 0),
    clearance_source: meetsThreshold ? 'automatic' : 'manual_override_required',
    is_new_student: isNewStudent,
    finance_policy: financePolicy,
    fee_clearance: manualClearance && meetsThreshold,
  };
};

const getRegistrationFinanceTotals = async ({ institutionId, studentId, currentPeriod }) => {
  if (!currentPeriod?.term_semester_id || !models.StudentInvoice) {
    return { paidAmount: 0, invoicedAmount: 0 };
  }

  const rows = await models.StudentInvoice.findAll({
    where: {
      institution_id: institutionId,
      student_id: studentId,
      term_id: currentPeriod.term_semester_id,
    },
    attributes: ['total_amount', 'paid_amount'],
  }).catch(() => []);

  return rows.reduce(
    (accumulator, row) => ({
      invoicedAmount: accumulator.invoicedAmount + Number(row.total_amount || 0),
      paidAmount: accumulator.paidAmount + Number(row.paid_amount || 0),
    }),
    { paidAmount: 0, invoicedAmount: 0 }
  );
};

const buildCarryOverSummary = ({
  allOfferings = [],
  currentOfferings = [],
  outstandingCodes = [],
  policy,
  progress,
}) => {
  const outstandingCodeSet = new Set((outstandingCodes || []).filter(Boolean));
  const offeringByCode = new Map();
  allOfferings.forEach((item) => {
    if (item?.code && !offeringByCode.has(item.code)) {
      offeringByCode.set(item.code, item);
    }
  });

  const outstandingCourses = Array.from(outstandingCodeSet)
    .map((code) => offeringByCode.get(code))
    .filter(Boolean);
  const outstandingCreditHours = outstandingCourses.reduce(
    (sum, item) => sum + Number(item.credit_hours || 0),
    0
  );
  const outstandingCount = outstandingCodeSet.size;
  const policyAllowsCarryOver =
    outstandingCount === 0 ||
    (policy.allow_carry_over_progression &&
      (Number(policy.max_carry_over_courses || 0) <= 0 ||
        outstandingCount <= Number(policy.max_carry_over_courses || 0)) &&
      (Number(policy.max_carry_over_credits || 0) <= 0 ||
        outstandingCreditHours <= Number(policy.max_carry_over_credits || 0)));
  const progressionOverride = normalizeProgressionOverride(progress.progression_override);
  const baseCanProgress = Boolean(progress.can_progress);
  const manualOverrideAllowed = Boolean(policy.allow_manual_overrides);
  const manualAllow = manualOverrideAllowed && progressionOverride === 'allow';
  const manualHold = manualOverrideAllowed && progressionOverride === 'hold';
  const effectiveCanProgress = manualHold
    ? false
    : manualAllow
      ? true
      : baseCanProgress && policyAllowsCarryOver;

  const outstandingCurrentCourses = currentOfferings.filter((item) => outstandingCodeSet.has(item.code));
  const reason = manualHold
    ? 'An admin progression hold is active for this student.'
    : manualAllow && outstandingCount > 0
      ? 'An admin override allows this student to continue with carry-over courses.'
      : outstandingCount === 0
        ? 'No carry-over courses are blocking progression.'
        : policyAllowsCarryOver
          ? 'Carry-over load is within the institution progression policy.'
          : 'Carry-over load is above the institution progression policy.';

  return {
    outstanding_count: outstandingCount,
    outstanding_credit_hours: outstandingCreditHours,
    outstanding_courses: outstandingCourses.map((item) => ({
      code: item.code,
      name: item.name,
      credit_hours: item.credit_hours ?? null,
    })),
    current_period_resit_courses: outstandingCurrentCourses,
    base_can_progress: baseCanProgress,
    policy_allows_progression: policyAllowsCarryOver,
    effective_can_progress: effectiveCanProgress,
    progression_override: progressionOverride,
    reason,
  };
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
    programs: settings.tertiary.programs.map((program) => ({
      ...program,
      roadmap_group_ids: program.roadmap_group_ids || [],
      roadmap: buildProgramRoadmap({ program, settings }),
    })),
    progression: settings.tertiary.progression,
    progression_policy: getProgressionPolicy(settings),
    finance_policy: getFinancePolicy(settings),
    credentials: settings.tertiary.credentials,
    id_format: settings.tertiary.id_format,
  };
};

const getOverviewFromRuntime = async ({ institutionId }) => ({
  faculties: (store.tertiary.faculties || []).filter((item) => item.institution_id === institutionId),
  departments: store.tertiary.departments.filter((item) => item.institution_id === institutionId),
  programs: store.tertiary.programs
    .filter((item) => item.institution_id === institutionId)
    .map((program) => ({
      ...program,
      roadmap_group_ids: program.roadmap_group_ids || [],
      roadmap: {
        level_count: 0,
        total_courses: 0,
        levels: [],
      },
    })),
  progression: [
    'Students register only for their current semester roadmap.',
    'Outstanding resits block forward registration until cleared.',
  ],
  progression_policy: { ...defaultProgressionPolicy },
  finance_policy: { ...defaultFinancePolicy },
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
      id: `fac-${(store.tertiary.faculties || []).length + 1}`,
      institution_id: institutionId,
      name: payload.name,
      code: String(payload.code || payload.name || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-'),
      dean: payload.dean || null,
    };
    store.tertiary.faculties = store.tertiary.faculties || [];
    store.tertiary.faculties.push(faculty);
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
      faculty_id: payload.faculty_id || null,
      faculty:
        (store.tertiary.faculties || []).find((item) => item.id === payload.faculty_id)?.name || '',
      name: payload.name,
      code: String(payload.code || payload.name || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-'),
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
    const department = store.tertiary.departments.find((item) => item.id === payload.department_id);
    const program = {
      id: `prog-${store.tertiary.programs.length + 1}`,
      institution_id: institutionId,
      name: payload.name,
      faculty_id: department?.faculty_id || null,
      department_id: payload.department_id || null,
      faculty: department?.faculty || '',
      department: department?.name || '',
      credential: payload.credential || payload.type || 'Degree',
      duration: payload.duration || '4 years',
      calendar: payload.calendar || 'semester',
      type: payload.type || 'degree',
      roadmap_group_ids: payload.roadmap_group_ids || payload.group_ids || [],
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
      const availableGroups = (settings.academics?.groups || []).filter((item) => item.level_code === 'TR');
      const availableGroupIds = new Set(availableGroups.map((item) => item.id));
      const roadmapGroupIds = (payload.roadmap_group_ids || payload.group_ids || []).filter((item) =>
        availableGroupIds.has(item)
      );

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
        roadmap_group_ids: roadmapGroupIds,
      };
    },
  });
};

const updateProgressionPolicy = async ({ institutionId, payload, userId, ip }) => {
  if (!databaseReady()) {
    store.tertiary.progressionPolicy = {
      ...(store.tertiary.progressionPolicy || defaultProgressionPolicy),
      allow_carry_over_progression: normalizeBoolean(
        payload.allow_carry_over_progression,
        store.tertiary.progressionPolicy?.allow_carry_over_progression
      ),
      max_carry_over_courses: normalizeNumber(
        payload.max_carry_over_courses,
        store.tertiary.progressionPolicy?.max_carry_over_courses || 0
      ),
      max_carry_over_credits: normalizeNumber(
        payload.max_carry_over_credits,
        store.tertiary.progressionPolicy?.max_carry_over_credits || 0
      ),
      allow_manual_overrides: normalizeBoolean(
        payload.allow_manual_overrides,
        store.tertiary.progressionPolicy?.allow_manual_overrides ?? true
      ),
    };

    return store.tertiary.progressionPolicy;
  }

  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  const previous = getProgressionPolicy(settings);
  settings.tertiary.progression_policy = {
    ...previous,
    allow_carry_over_progression: normalizeBoolean(
      payload.allow_carry_over_progression,
      previous.allow_carry_over_progression
    ),
    max_carry_over_courses: normalizeNumber(
      payload.max_carry_over_courses,
      previous.max_carry_over_courses
    ),
    max_carry_over_credits: normalizeNumber(
      payload.max_carry_over_credits,
      previous.max_carry_over_credits
    ),
    allow_manual_overrides: normalizeBoolean(
      payload.allow_manual_overrides,
      previous.allow_manual_overrides
    ),
  };

  await institution.update({ settings });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'tertiary_progression_policy',
    resourceId: institutionId,
    previousValues: previous,
    newValues: settings.tertiary.progression_policy,
    ip,
  });

  return settings.tertiary.progression_policy;
};

const updateFinancePolicy = async ({ institutionId, payload, userId, ip }) => {
  if (!databaseReady()) {
    store.tertiary.financePolicy = {
      ...(store.tertiary.financePolicy || defaultFinancePolicy),
      new_student_registration_percent: normalizeNumber(
        payload.new_student_registration_percent,
        store.tertiary.financePolicy?.new_student_registration_percent ??
          defaultFinancePolicy.new_student_registration_percent
      ),
      returning_student_registration_percent: normalizeNumber(
        payload.returning_student_registration_percent,
        store.tertiary.financePolicy?.returning_student_registration_percent ??
          defaultFinancePolicy.returning_student_registration_percent
      ),
      midsem_exam_percent: normalizeNumber(
        payload.midsem_exam_percent,
        store.tertiary.financePolicy?.midsem_exam_percent ??
          defaultFinancePolicy.midsem_exam_percent
      ),
      final_exam_percent: normalizeNumber(
        payload.final_exam_percent,
        store.tertiary.financePolicy?.final_exam_percent ??
          defaultFinancePolicy.final_exam_percent
      ),
    };

    return store.tertiary.financePolicy;
  }

  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  const previous = getFinancePolicy(settings);
  settings.tertiary.finance_policy = {
    ...previous,
    new_student_registration_percent: normalizeNumber(
      payload.new_student_registration_percent,
      previous.new_student_registration_percent
    ),
    returning_student_registration_percent: normalizeNumber(
      payload.returning_student_registration_percent,
      previous.returning_student_registration_percent
    ),
    midsem_exam_percent: normalizeNumber(payload.midsem_exam_percent, previous.midsem_exam_percent),
    final_exam_percent: normalizeNumber(payload.final_exam_percent, previous.final_exam_percent),
  };

  await institution.update({ settings });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'tertiary_finance_policy',
    resourceId: institutionId,
    previousValues: previous,
    newValues: settings.tertiary.finance_policy,
    ip,
  });

  return settings.tertiary.finance_policy;
};

const updateStudentProgress = async ({ institutionId, studentId, payload, userId, ip }) => {
  if (!databaseReady()) {
    const progressIndex = store.tertiary.studentProgress.findIndex(
      (item) => item.student_id === studentId && item.institution_id === institutionId
    );
    if (progressIndex < 0) {
      throw Object.assign(new Error('Student registration profile not found.'), { statusCode: 404 });
    }

    const current = store.tertiary.studentProgress[progressIndex];
    const next = {
      ...current,
      can_progress:
        payload.can_progress === undefined ? current.can_progress : Boolean(payload.can_progress),
      fee_clearance:
        payload.fee_clearance === undefined ? current.fee_clearance : Boolean(payload.fee_clearance),
      progression_override:
        payload.progression_override === undefined
          ? normalizeProgressionOverride(current.progression_override)
          : normalizeProgressionOverride(payload.progression_override),
      progression_note:
        payload.progression_note === undefined
          ? current.progression_note || null
          : String(payload.progression_note || '').trim() || null,
      outstanding_resit_codes:
        payload.outstanding_resit_codes === undefined
          ? current.outstanding_resit_codes || []
          : parseCourseCodeList(payload.outstanding_resit_codes),
    };

    store.tertiary.studentProgress[progressIndex] = next;
    return next;
  }

  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  const progressIndex = settings.tertiary.student_progress.findIndex(
    (item) => item.student_id === studentId && item.institution_id === institutionId
  );
  if (progressIndex < 0) {
    throw Object.assign(new Error('Student registration profile not found.'), { statusCode: 404 });
  }

  const current = settings.tertiary.student_progress[progressIndex];
  const next = {
    ...current,
    can_progress:
      payload.can_progress === undefined ? current.can_progress : Boolean(payload.can_progress),
    fee_clearance:
      payload.fee_clearance === undefined ? current.fee_clearance : Boolean(payload.fee_clearance),
    progression_override:
      payload.progression_override === undefined
        ? normalizeProgressionOverride(current.progression_override)
        : normalizeProgressionOverride(payload.progression_override),
    progression_note:
      payload.progression_note === undefined
        ? current.progression_note || null
        : String(payload.progression_note || '').trim() || null,
    outstanding_resit_codes:
      payload.outstanding_resit_codes === undefined
        ? current.outstanding_resit_codes || []
        : parseCourseCodeList(payload.outstanding_resit_codes),
  };

  settings.tertiary.student_progress[progressIndex] = next;
  await institution.update({ settings });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'tertiary_student_progress',
    resourceId: studentId,
    previousValues: current,
    newValues: next,
    ip,
  });

  return next;
};

const getRegistrationStateFromSettings = async ({ institutionId, studentId }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureTertiarySettings(institution.settings);
  const progressionPolicy = getProgressionPolicy(settings);
  const financePolicy = getFinancePolicy(settings);
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
  const eligibleCurrentCourses = currentOfferings.filter((item) =>
    (item.prerequisite_codes || []).every((code) =>
      (progress.passed_offering_codes || []).includes(code)
    )
  );
  const carryOverSummary = buildCarryOverSummary({
    allOfferings: offerings,
    currentOfferings,
    outstandingCodes: progress.outstanding_resit_codes || [],
    policy: progressionPolicy,
    progress,
  });
  const outstandingResits = carryOverSummary.current_period_resit_courses || [];
  const eligibleCourses =
    carryOverSummary.outstanding_count > 0
      ? carryOverSummary.effective_can_progress
        ? Array.from(new Map([...outstandingResits, ...eligibleCurrentCourses].map((item) => [item.id, item])).values())
        : outstandingResits
      : eligibleCurrentCourses;

  const blockedCourses = currentOfferings
    .filter((item) => !eligibleCourses.some((eligible) => eligible.id === item.id))
    .map((item) => ({
      ...item,
      reason:
        carryOverSummary.outstanding_count > 0 && !carryOverSummary.effective_can_progress
          ? 'Carry-over load is above the allowed progression policy for this student.'
          : 'Missing prerequisite completion for this course.',
    }));

  const nextPeriod = periods.find(
    (item) =>
      item.group_id === currentGroup.id &&
      Number(item.sequence || 0) === Number(currentPeriod.sequence || 0) + 1
  );
  const nextTermPreview = nextPeriod && carryOverSummary.effective_can_progress
    ? offerings.filter((item) => item.group_id === currentGroup.id && item.period_id === nextPeriod.id)
    : [];

  const alreadyRegistered = settings.tertiary.registrations.filter(
    (item) =>
      item.institution_id === institutionId &&
      item.student_id === studentId &&
      item.period_id === currentPeriod.id
  );

  const financeTotals = await getRegistrationFinanceTotals({
    institutionId,
    studentId,
    currentPeriod,
  });
  const feeSummary = buildFeeSummary({
    currentPeriod,
    currentCourses: currentOfferings,
    outstandingCourses: carryOverSummary.outstanding_courses
      .map((item) => offerings.find((offering) => offering.code === item.code))
      .filter(Boolean),
    progress,
    financePolicy,
    paidAmount: financeTotals.paidAmount,
    invoicedAmount: financeTotals.invoicedAmount,
  });

  return {
    settings,
    student_id: studentId,
    current_group: currentGroup,
    current_period: currentPeriod,
    fee_clearance: feeSummary.fee_clearance,
    can_progress: carryOverSummary.effective_can_progress,
    base_can_progress: carryOverSummary.base_can_progress,
    progression_override: carryOverSummary.progression_override,
    progression_note: progress.progression_note || null,
    progression_policy: progressionPolicy,
    finance_policy: financePolicy,
    carry_over_summary: carryOverSummary,
    outstanding_resit_codes: progress.outstanding_resit_codes || [],
    eligible_courses: eligibleCourses,
    blocked_courses: blockedCourses,
    next_period_preview: nextTermPreview,
    already_registered: alreadyRegistered,
    fee_summary: feeSummary,
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
    const registrationState = await getRegistrationStateFromSettings({ institutionId, studentId });
    delete registrationState.settings;
    return registrationState;
  }

  const progressionPolicy = store.tertiary.progressionPolicy || { ...defaultProgressionPolicy };
  const financePolicy = store.tertiary.financePolicy || { ...defaultFinancePolicy };
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
  const eligibleCurrentCourses = currentOfferings.filter((item) =>
    item.prerequisite_codes.every((code) => progress.passed_offering_codes.includes(code))
  );
  const carryOverSummary = buildCarryOverSummary({
    allOfferings: offerings,
    currentOfferings,
    outstandingCodes: progress.outstanding_resit_codes,
    policy: progressionPolicy,
    progress,
  });
  const outstandingResits = carryOverSummary.current_period_resit_courses || [];
  const eligibleCourses =
    carryOverSummary.outstanding_count > 0
      ? carryOverSummary.effective_can_progress
        ? Array.from(new Map([...outstandingResits, ...eligibleCurrentCourses].map((item) => [item.id, item])).values())
        : outstandingResits
      : eligibleCurrentCourses;

  const blockedCourses = currentOfferings
    .filter((item) => !eligibleCourses.some((eligible) => eligible.id === item.id))
    .map((item) => ({
      ...item,
      reason:
        carryOverSummary.outstanding_count > 0 && !carryOverSummary.effective_can_progress
          ? 'Carry-over load is above the allowed progression policy for this student.'
          : 'Missing prerequisite completion for this course.',
    }));

  const nextPeriod = periods.find(
    (item) =>
      item.group_id === currentGroup.id &&
      item.sequence === Number(currentPeriod.sequence || 0) + 1
  );
  const nextTermPreview = nextPeriod && carryOverSummary.effective_can_progress
    ? offerings.filter((item) => item.group_id === currentGroup.id && item.period_id === nextPeriod.id)
    : [];

  const alreadyRegistered = store.tertiary.registrations.filter(
    (item) =>
      item.institution_id === institutionId &&
      item.student_id === studentId &&
      item.period_id === currentPeriod.id
  );

  const periodInvoices = store.finance.invoices.filter(
    (item) =>
      item.institution_id === institutionId &&
      item.student_id === studentId &&
      (item.term_id === currentPeriod.term_semester_id || item.period_id === currentPeriod.id)
  );
  const feeSummary = buildFeeSummary({
    currentPeriod,
    currentCourses: currentOfferings,
    outstandingCourses: carryOverSummary.outstanding_courses
      .map((item) => offerings.find((offering) => offering.code === item.code))
      .filter(Boolean),
    progress,
    financePolicy,
    paidAmount: periodInvoices.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0),
    invoicedAmount: periodInvoices.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
  });

  return {
    student_id: studentId,
    current_group: currentGroup,
    current_period: currentPeriod,
    fee_clearance: feeSummary.fee_clearance,
    can_progress: carryOverSummary.effective_can_progress,
    base_can_progress: carryOverSummary.base_can_progress,
    progression_override: carryOverSummary.progression_override,
    progression_note: progress.progression_note || null,
    progression_policy: progressionPolicy,
    finance_policy: financePolicy,
    carry_over_summary: carryOverSummary,
    outstanding_resit_codes: progress.outstanding_resit_codes,
    eligible_courses: eligibleCourses,
    blocked_courses: blockedCourses,
    next_period_preview: nextTermPreview,
    already_registered: alreadyRegistered,
    fee_summary: feeSummary,
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
  updateProgressionPolicy,
  updateFinancePolicy,
  updateStudentProgress,
  getStudentRegistrationState,
  registerCourses,
  getTranscript,
};
