const { models, sequelize } = require('../../config/database');
const { Op } = require('sequelize');
const { createSequence } = require('../../shared/helpers/common');
const { hashPassword } = require('../../shared/helpers/auth');
const { logAudit } = require('../../shared/services/audit-log.service');
const { getLevelConfig, requireLevelConfig } = require('../../shared/services/level-config.service');
const { store } = require('../../shared/store/runtime-store');

const databaseReady = () =>
  Boolean(
    models.Institution &&
      models.User &&
      models.Student &&
      models.EducationLevel &&
      models.Class &&
      models.Guardian &&
      models.StudentGuardian &&
      models.StudentMedical &&
      sequelize?.transaction
  );

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const ensureAdmissionsSettings = (settings) => {
  const next = cloneSettings(settings);
  next.academics = next.academics || { groups: [], periods: [], offerings: [], progression_rules: [] };
  next.admissions = next.admissions || {};
  next.admissions.student_profiles = next.admissions.student_profiles || [];
  next.tertiary = next.tertiary || {};
  next.tertiary.student_progress = next.tertiary.student_progress || [];
  next.tertiary.registrations = next.tertiary.registrations || [];
  next.tertiary.transcripts = next.tertiary.transcripts || [];
  next.tertiary.faculties = next.tertiary.faculties || [];
  next.tertiary.departments = next.tertiary.departments || [];
  next.tertiary.programs = next.tertiary.programs || [];
  next.finance = next.finance || {};
  next.finance.student_credits = next.finance.student_credits || [];
  return next;
};

const getFinanceDefaults = (settings) => {
  const currencies =
    Array.isArray(settings?.finance?.currencies) && settings.finance.currencies.length
      ? settings.finance.currencies
      : ['GHS', 'ZMW', 'USD'];
  const defaultLocal = settings?.finance?.default_local_currency || currencies[0] || 'GHS';
  const defaultInternational =
    settings?.finance?.default_international_currency ||
    currencies.find((item) => item !== defaultLocal) ||
    'USD';

  return {
    currencies,
    default_local_currency: defaultLocal,
    default_international_currency: defaultInternational,
  };
};

const resolveStudentCategory = (profile = {}) =>
  String(profile.student_category || profile.studentCategory || 'local').trim().toLowerCase() ===
  'international'
    ? 'international'
    : 'local';

const resolveOfferingFee = ({ offering, profile, settings }) => {
  const financeDefaults = getFinanceDefaults(settings);
  const studentCategory = resolveStudentCategory(profile);
  const isInternational = studentCategory === 'international';
  const resolvedAmount = isInternational
    ? Number(
        offering?.fee_amount_international ??
          offering?.international_fee_amount ??
          offering?.fee_amount ??
          0
      )
    : Number(offering?.fee_amount_local ?? offering?.local_fee_amount ?? offering?.fee_amount ?? 0);

  return {
    amount: Number.isFinite(resolvedAmount) ? resolvedAmount : 0,
    currency_code: isInternational
      ? financeDefaults.default_international_currency
      : financeDefaults.default_local_currency,
    student_category: studentCategory,
  };
};

const normalizeProgramId = (value) => String(value || '').trim();

const offeringMatchesProgram = ({ offering, programId, group }) => {
  const normalizedProgramId = normalizeProgramId(programId);
  if (!normalizedProgramId) {
    return true;
  }

  const directProgramId = normalizeProgramId(offering?.program_id);
  if (directProgramId) {
    return directProgramId === normalizedProgramId;
  }

  const legacyGroupPrograms = Array.isArray(group?.program_ids)
    ? group.program_ids.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (legacyGroupPrograms.length) {
    return legacyGroupPrograms.includes(normalizedProgramId);
  }

  return true;
};

const buildAutoInvoicePayload = ({ institutionId, student, profile, progress, settings }) => {
  if (!progress?.current_group_id || !progress?.current_period_id) {
    return null;
  }

  const currentGroup = (settings.academics?.groups || []).find(
    (item) => item.id === progress.current_group_id
  );
  const currentPeriod = (settings.academics?.periods || []).find(
    (item) => item.id === progress.current_period_id
  );
  if (!currentGroup || !currentPeriod) {
    return null;
  }

  const studentProgramId =
    progress?.program_id || profile?.tertiary?.program_id || profile?.program_id || null;

  const currentCourses = (settings.academics?.offerings || []).filter(
    (item) =>
      item.group_id === currentGroup.id &&
      item.period_id === currentPeriod.id &&
      offeringMatchesProgram({
        offering: item,
        programId: studentProgramId,
        group: currentGroup,
      })
  );
  const pricedCourses = currentCourses.map((course) => {
    const fee = resolveOfferingFee({ offering: course, profile, settings });
    return {
      ...course,
      fee_amount: fee.amount,
      currency_code: fee.currency_code,
    };
  });
  const courseTotal = pricedCourses.reduce((sum, item) => sum + Number(item.fee_amount || 0), 0);
  const baseFeeAmount = Number(currentPeriod.base_fee_amount || 0);
  const totalAmount = baseFeeAmount + courseTotal;
  if (totalAmount <= 0) {
    return null;
  }

  return {
    institution_id: institutionId,
    student_id: student.id,
    student_name: profile.full_name,
    class_name: profile.group_name || currentGroup.name,
    invoice_number: createSequence('INV', new Date(), Number(student.id || 1), 3),
    total_amount: totalAmount,
    paid_amount: 0,
    balance: totalAmount,
    status: 'pending',
    due_date: currentPeriod.start_date || student.enrollment_date || new Date().toISOString().slice(0, 10),
    items: [
      ...(baseFeeAmount > 0
        ? [{ name: `${currentPeriod.name} base fee`, amount: baseFeeAmount }]
        : []),
      ...pricedCourses.map((course) => ({
        name: `${course.code} ${course.name}`.trim(),
        amount: Number(course.fee_amount || 0),
      })),
    ],
    term_id: currentPeriod.term_semester_id || null,
    period_id: currentPeriod.id,
  };
};

const createAutoSemesterInvoiceIfNeeded = async ({
  institutionId,
  transaction,
  student,
  profile,
  progress,
  settings,
}) => {
  const invoicePayload = buildAutoInvoicePayload({
    institutionId,
    student,
    profile,
    progress,
    settings,
  });
  if (!invoicePayload) {
    return null;
  }

  if (models.StudentInvoice) {
    const existing = await models.StudentInvoice.findOne({
      where: {
        institution_id: institutionId,
        student_id: student.id,
        term_id: invoicePayload.term_id,
      },
      transaction,
    });
    if (existing) {
      return existing;
    }

    let academicYearId = null;
    if (models.AcademicYear) {
      const currentYear = await models.AcademicYear.findOne({
        where: { institution_id: institutionId, is_current: true },
        transaction,
      });
      academicYearId = currentYear?.id || null;
    }

    return models.StudentInvoice.create(
      {
        institution_id: institutionId,
        student_id: student.id,
        academic_year_id: academicYearId,
        term_id: invoicePayload.term_id,
        invoice_number: invoicePayload.invoice_number,
        total_amount: invoicePayload.total_amount,
        paid_amount: 0,
        balance: invoicePayload.balance,
        status: 'pending',
        due_date: invoicePayload.due_date,
        items: invoicePayload.items,
      },
      { transaction }
    );
  }

  const existsInRuntime = store.finance.invoices.some(
    (item) =>
      item.institution_id === institutionId &&
      String(item.student_id) === String(student.id) &&
      String(item.period_id || '') === String(invoicePayload.period_id || '')
  );
  if (!existsInRuntime) {
    store.finance.invoices.push({
      id: `inv-${(store.finance.invoices.length || 0) + 1}`,
      ...invoicePayload,
    });
  }

  return invoicePayload;
};

const getStudentCreditBalance = ({ settings, studentId }) => {
  const item = (settings?.finance?.student_credits || []).find(
    (entry) => String(entry.student_id) === String(studentId)
  );
  return Number(item?.amount || 0);
};

const sortBySequence = (items = []) =>
  items.slice().sort((a, b) => {
    const sequenceDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
    if (sequenceDiff !== 0) {
      return sequenceDiff;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

const buildRoadmapFromGroupIds = ({ settings, groupIds = [], progress = null }) => {
  const groups = (settings.academics?.groups || []).filter((item) => item.level_code === 'TR');
  const periods = settings.academics?.periods || [];
  const offerings = settings.academics?.offerings || [];
  const scopedGroupIds = groupIds.filter(Boolean);
  const scopedGroups = sortBySequence(groups.filter((item) => scopedGroupIds.includes(item.id)));
  const passedCodes = new Set(progress?.passed_offering_codes || []);
  const outstandingCodes = new Set(progress?.outstanding_resit_codes || []);

  return {
    level_count: scopedGroups.length,
    total_courses: offerings.filter((item) => scopedGroupIds.includes(item.group_id)).length,
    levels: scopedGroups.map((group) => ({
      id: group.id,
      name: group.name,
      code: group.code,
      periods: sortBySequence(periods.filter((item) => item.group_id === group.id)).map((period) => {
        const periodCourses = offerings
          .filter((item) => item.group_id === group.id && item.period_id === period.id)
          .map((offering) => ({
            id: offering.id,
            code: offering.code,
            name: offering.name,
            credit_hours: offering.credit_hours ?? null,
            is_core: offering.is_core !== false,
            prerequisite_codes: offering.prerequisite_codes || [],
            completed: passedCodes.has(offering.code),
            outstanding: outstandingCodes.has(offering.code),
          }));
        const completedCourses = periodCourses.filter((course) => course.completed).length;
        const totalCourses = periodCourses.length;
        const completionPercent =
          totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

        return {
          id: period.id,
          name: period.name,
          sequence: Number(period.sequence || 0),
          status: period.status || 'planned',
          total_courses: totalCourses,
          completed_courses: completedCourses,
          completion_percent: completionPercent,
          is_completed: totalCourses > 0 && completedCourses === totalCourses,
          courses: periodCourses,
        };
      }),
    })),
  };
};

const buildStudentTertiaryProfile = ({ settings, profile, studentId }) => {
  const tertiaryProfile = profile?.tertiary || {};
  const progress = (settings.tertiary?.student_progress || []).find((item) => item.student_id === studentId);
  const facultyId = progress?.faculty_id || tertiaryProfile.faculty_id || null;
  const departmentId = progress?.department_id || tertiaryProfile.department_id || null;
  const programId = progress?.program_id || tertiaryProfile.program_id || null;
  const faculty = (settings.tertiary?.faculties || []).find((item) => item.id === facultyId) || null;
  const department = (settings.tertiary?.departments || []).find((item) => item.id === departmentId) || null;
  const program = (settings.tertiary?.programs || []).find((item) => item.id === programId) || null;
  const currentGroupId = progress?.current_group_id || profile?.group_id || null;
  const currentPeriodId = progress?.current_period_id || null;
  const currentGroup =
    (settings.academics?.groups || []).find((item) => item.id === currentGroupId) || null;
  const currentPeriod =
    (settings.academics?.periods || []).find((item) => item.id === currentPeriodId) || null;
  const roadmapGroupIds = Array.from(
    new Set([...(program?.roadmap_group_ids || []), ...(currentGroupId ? [currentGroupId] : [])])
  );
  const roadmap = buildRoadmapFromGroupIds({ settings, groupIds: roadmapGroupIds, progress });
  const currentLevel =
    roadmap?.levels?.find((item) => item.id === currentGroupId) ||
    (currentGroup
      ? {
          id: currentGroup.id,
          name: currentGroup.name,
          code: currentGroup.code,
        }
      : null);

  if (!faculty && !department && !program && !roadmap && !progress) {
    return null;
  }

  return {
    faculty_id: facultyId,
    faculty_name: faculty?.name || null,
    department_id: departmentId,
    department_name: department?.name || null,
    program_id: programId,
    program_name: program?.name || null,
    credential: program?.credential || tertiaryProfile.qualification || null,
    duration: program?.duration || null,
    can_progress: progress?.can_progress ?? null,
    fee_clearance: progress?.fee_clearance ?? null,
    outstanding_resit_codes: progress?.outstanding_resit_codes || [],
    current_level: currentLevel
      ? {
          id: currentLevel.id,
          name: currentLevel.name,
          code: currentLevel.code,
        }
      : null,
    current_period: currentPeriod
      ? {
          id: currentPeriod.id,
          name: currentPeriod.name,
          status: currentPeriod.status || 'planned',
        }
      : null,
    roadmap,
  };
};

const splitFullName = (payload) => {
  if (payload.first_name || payload.last_name) {
    return {
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
    };
  }

  const parts = String(payload.fullName || payload.full_name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || 'Student',
  };
};

const parseCsvList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const formatSequelizeCreateError = (error) => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const fields = Array.isArray(error.errors)
      ? error.errors
          .map((item) => String(item.path || item.message || '').trim())
          .filter(Boolean)
      : [];
    const labels = Array.from(new Set(fields));

    if (labels.length) {
      return Object.assign(
        new Error(`A record with the same ${labels.join(', ')} already exists. Review the student number, admission number, email, or parent account details and try again.`),
        { statusCode: 409 }
      );
    }

    return Object.assign(
      new Error('A matching student or user record already exists. Review the enrollment details and try again.'),
      { statusCode: 409 }
    );
  }

  if (error.name === 'SequelizeValidationError') {
    const messages = Array.isArray(error.errors)
      ? error.errors
          .map((item) => String(item.message || item.path || '').trim())
          .filter(Boolean)
      : [];

    if (messages.length) {
      return Object.assign(new Error(messages.join(' | ')), { statusCode: 400 });
    }

    return Object.assign(
      new Error('The student record could not be created because one or more required fields are invalid.'),
      { statusCode: 400 }
    );
  }

  return null;
};

const ensureLevelRecord = async ({ institutionId, levelCode, transaction }) => {
  let level = await models.EducationLevel.findOne({
    where: { institution_id: institutionId, level_code: levelCode },
    transaction,
  });
  if (!level) {
    const config = getLevelConfig(levelCode) || {};
    level = await models.EducationLevel.create(
      {
        institution_id: institutionId,
        level_code: levelCode,
        level_name:
          {
            DC: 'Daycare',
            PR: 'Primary',
            JH: 'Junior High',
            SH: 'Senior High',
            TR: 'Tertiary',
          }[levelCode] || levelCode,
        age_min: config.ageMin || null,
        age_max: config.ageMax || null,
      },
      { transaction }
    );
  }
  return level;
};

const serializeStudentListItem = ({ student, profile }) => {
  const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim();
  const guardianName =
    `${student.guardian?.user?.first_name || ''} ${student.guardian?.user?.last_name || ''}`.trim() ||
    profile?.guardian_name ||
    'No guardian linked';

  return {
    id: student.id,
    name: fullName || profile?.full_name || 'Student',
    student_number: student.student_number,
    className:
      student.class?.name || profile?.group_name || profile?.class_name || profile?.assigned_class || 'Unassigned',
    levelName:
      student.class?.name || profile?.group_name || profile?.class_name || profile?.assigned_class || 'Unassigned',
    level: student.level?.level_code || profile?.level_code || '',
    status: student.status,
    photo: student.user?.profile_photo || student.photo_url || null,
    guardian: guardianName,
  };
};

const serializeDeletedStudentListItem = ({ student, profile }) => {
  const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim();
  return {
    id: student.id,
    name: fullName || profile?.full_name || 'Student',
    student_number: student.student_number,
    className:
      student.class?.name || profile?.group_name || profile?.class_name || profile?.assigned_class || 'Unassigned',
    levelName:
      student.class?.name || profile?.group_name || profile?.class_name || profile?.assigned_class || 'Unassigned',
    level: student.level?.level_code || profile?.level_code || '',
    status: student.status,
    deleted_at:
      student.deletedAt ||
      student.deleted_at ||
      student.user?.deletedAt ||
      student.user?.deleted_at ||
      profile?.deleted_at ||
      null,
    photo: student.user?.profile_photo || student.photo_url || null,
    guardian: profile?.guardian_name || 'No guardian linked',
  };
};

const assertStudentAdmin = (actor) => {
  const role = String(actor?.role || '');
  if (role !== 'institution_admin') {
    throw Object.assign(new Error('Only institution admins can manage student deletion.'), {
      statusCode: 403,
    });
  }
};

const listStudentsFromDatabase = async ({ institutionId, parentId }) => {
  const where = { institution_id: institutionId };

  if (parentId) {
    const guardian = await models.Guardian.findOne({
      where: { user_id: parentId },
    });
    if (!guardian) {
      return [];
    }
    where.guardian_id = guardian.id;
  }

  const students = await models.Student.findAll({
    where,
    include: [
      { model: models.User, as: 'user' },
      { model: models.Class, as: 'class', required: false },
      { model: models.EducationLevel, as: 'level', required: false },
      {
        model: models.Guardian,
        as: 'guardian',
        required: false,
        include: [{ model: models.User, as: 'user', required: false }],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  const institution = await models.Institution.findByPk(institutionId);
  const settings = ensureAdmissionsSettings(institution?.settings);
  const profileMap = new Map(
    settings.admissions.student_profiles.map((item) => [item.student_id, item])
  );

  return students.map((student) =>
    serializeStudentListItem({ student, profile: profileMap.get(student.id) })
  );
};

const listStudentsFromRuntime = async ({ institutionId, parentId }) =>
  store.students.profiles.filter(
    (student) =>
      student.institution_id === institutionId && (!parentId || student.parent_id === parentId)
  );

const listStudents = async (context) => {
  if (databaseReady()) {
    return listStudentsFromDatabase(context);
  }
  return listStudentsFromRuntime(context);
};

const listDeletedStudentsFromDatabase = async ({ institutionId }) => {
  const students = await models.Student.findAll({
    where: {
      institution_id: institutionId,
      deletedAt: { [Op.ne]: null },
    },
    paranoid: false,
    include: [
      { model: models.User, as: 'user', paranoid: false, required: false },
      { model: models.Class, as: 'class', required: false },
      { model: models.EducationLevel, as: 'level', required: false },
    ],
    order: [['deleted_at', 'DESC']],
  });

  const institution = await models.Institution.findByPk(institutionId);
  const settings = ensureAdmissionsSettings(institution?.settings);
  const profileMap = new Map(
    settings.admissions.student_profiles.map((item) => [item.student_id, item])
  );

  return students.map((student) =>
    serializeDeletedStudentListItem({ student, profile: profileMap.get(student.id) })
  );
};

const listDeletedStudentsFromRuntime = async ({ institutionId }) =>
  (store.students.profiles || []).filter(
    (student) => student.institution_id === institutionId && student.deleted_at
  );

const listDeletedStudents = async (context) => {
  if (databaseReady()) {
    return listDeletedStudentsFromDatabase(context);
  }
  return listDeletedStudentsFromRuntime(context);
};

const getStudentFromDatabase = async ({ institutionId, studentId }) => {
  const student = await models.Student.findOne({
    where: { id: studentId, institution_id: institutionId },
    include: [
      { model: models.User, as: 'user' },
      { model: models.Class, as: 'class', required: false },
      { model: models.EducationLevel, as: 'level', required: false },
      { model: models.StudentMedical, as: 'medicalProfile', required: false },
      {
        model: models.Guardian,
        as: 'guardian',
        required: false,
        include: [{ model: models.User, as: 'user', required: false }],
      },
    ],
  });

  if (!student) {
    throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
  }

  const institution = await models.Institution.findByPk(institutionId);
  const settings = ensureAdmissionsSettings(institution?.settings);
  const profile =
    settings.admissions.student_profiles.find((item) => item.student_id === student.id) || {};
  const guardianName =
    `${student.guardian?.user?.first_name || ''} ${student.guardian?.user?.last_name || ''}`.trim() ||
    profile.guardian_name ||
    'No guardian linked';
  const [reportCards, attendanceRows, invoiceRows, disciplineRows] = await Promise.all([
    models.ReportCard
      ? models.ReportCard.findAll({
          where: { student_id: student.id },
          include: [{ model: models.TermSemester, as: 'term', required: false }],
          order: [['published_at', 'ASC'], ['created_at', 'ASC']],
        }).catch(() => [])
      : Promise.resolve([]),
    models.AttendanceRecord
      ? models.AttendanceRecord.findAll({
          where: { student_id: student.id },
          include: [{ model: models.AttendanceSession, as: 'session', required: false }],
          order: [['created_at', 'DESC']],
          limit: 24,
        }).catch(() => [])
      : Promise.resolve([]),
    models.StudentInvoice
      ? models.StudentInvoice.findAll({
          where: { student_id: student.id, institution_id: institutionId },
          order: [['created_at', 'DESC']],
        }).catch(() => [])
      : Promise.resolve([]),
    models.DisciplineIncident
      ? models.DisciplineIncident.findAll({
          where: { student_id: student.id, institution_id: institutionId },
          order: [['incident_date', 'DESC']],
        }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const creditBalance = getStudentCreditBalance({ settings, studentId: student.id });

  return {
    id: student.id,
    name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
    student_number: student.student_number,
    className:
      student.class?.name || profile.group_name || profile.class_name || profile.assigned_class || 'Unassigned',
    levelName:
      student.class?.name || profile.group_name || profile.class_name || profile.assigned_class || 'Unassigned',
    level: student.level?.level_code || profile.level_code || '',
    status: student.status,
    guardian: {
      name: guardianName,
      phone: student.guardian?.user?.phone || profile.guardian_phone || '',
      relation: student.guardian?.relation_to_student || 'Guardian',
    },
    medical: {
      allergies: (student.medicalProfile?.allergies || []).join(', '),
      bloodGroup: student.medicalProfile?.blood_group || student.blood_group || '',
      notes:
        student.medicalProfile?.special_needs ||
        profile.medical_notes ||
        student.medicalProfile?.dietary_restrictions ||
        '',
    },
    academicTrend: reportCards.map((item, index) => ({
      term: item.term?.name || `Record ${index + 1}`,
      gpa: Math.min(Number(item.overall_average || 0) > 4 ? Number(item.overall_average || 0) / 25 : Number(item.overall_average || 0), 4),
    })),
    attendanceCalendar: attendanceRows
      .map((item) => ({
        date: item.session?.date || String(item.created_at || item.createdAt || '').slice(0, 10),
        value: item.status === 'present' || item.status === 'late' ? 1 : 0,
      }))
      .filter((item) => item.date),
    invoices: invoiceRows.map((item) => ({
      invoice_number: item.invoice_number,
      total: Number(item.total_amount || 0),
      paid: Number(item.paid_amount || 0),
      balance: Number(item.balance || 0),
      net_balance: Math.max(Number(item.balance || 0) - creditBalance, 0),
      credit_balance: creditBalance,
      status: item.status,
    })),
    discipline: disciplineRows.map((item) => ({
      id: item.id,
      category: item.category,
      points: item.severity === 'major' ? 3 : item.severity === 'moderate' ? 2 : 1,
      date: item.incident_date,
      status: item.status,
    })),
    documents: [],
    tertiary: buildStudentTertiaryProfile({
      settings,
      profile,
      studentId: student.id,
    }),
  };
};

const getStudentFromRuntime = async ({ institutionId, studentId }) => {
  const student = store.students.profiles.find(
    (item) => item.id === studentId && item.institution_id === institutionId
  );
  if (!student) {
    throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
  }
  return student;
};

const getStudent = async (context) => {
  if (databaseReady()) {
    return getStudentFromDatabase(context);
  }
  return getStudentFromRuntime(context);
};

const updateStudentInDatabase = async ({ institutionId, studentId, payload, actorId, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const student = await models.Student.findOne({
      where: { id: studentId, institution_id: institutionId },
      include: [
        { model: models.User, as: 'user' },
        {
          model: models.Guardian,
          as: 'guardian',
          required: false,
          include: [{ model: models.User, as: 'user', required: false }],
        },
        { model: models.StudentMedical, as: 'medicalProfile', required: false },
      ],
      transaction,
    });

    if (!student) {
      throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
    }

    const institution = await models.Institution.findByPk(institutionId, { transaction });
    const settings = ensureAdmissionsSettings(institution?.settings);
    const profileIndex = settings.admissions.student_profiles.findIndex((item) => item.student_id === student.id);
    const currentProfile = profileIndex >= 0 ? settings.admissions.student_profiles[profileIndex] : { student_id: student.id };

    if (payload.full_name) {
      const names = splitFullName({ full_name: payload.full_name });
      await student.user?.update(
        {
          first_name: names.first_name || student.user.first_name,
          last_name: names.last_name || student.user.last_name,
        },
        { transaction }
      );
      currentProfile.full_name = payload.full_name;
    }

    if (payload.guardian_name && student.guardian?.user) {
      const names = splitFullName({ full_name: payload.guardian_name });
      await student.guardian.user.update(
        {
          first_name: names.first_name || student.guardian.user.first_name,
          last_name: names.last_name || student.guardian.user.last_name,
        },
        { transaction }
      );
    }

    if (payload.guardian_phone && student.guardian?.user) {
      await student.guardian.user.update({ phone: payload.guardian_phone }, { transaction });
    }

    if (payload.guardian_relation && student.guardian) {
      await student.guardian.update({ relation_to_student: payload.guardian_relation }, { transaction });
    }

    if (payload.blood_group) {
      await student.update({ blood_group: payload.blood_group }, { transaction });
    }

    if (models.StudentMedical) {
      const medicalPayload = {
        blood_group: payload.blood_group || student.medicalProfile?.blood_group || student.blood_group || null,
        allergies: payload.allergies !== undefined ? parseCsvList(payload.allergies) : student.medicalProfile?.allergies || [],
        special_needs:
          payload.medical_notes !== undefined
            ? payload.medical_notes
            : student.medicalProfile?.special_needs || null,
      };

      if (student.medicalProfile) {
        await student.medicalProfile.update(medicalPayload, { transaction });
      } else {
        await models.StudentMedical.create(
          {
            student_id: student.id,
            chronic_conditions: [],
            medications: [],
            dietary_restrictions: null,
            ...medicalPayload,
          },
          { transaction }
        );
      }
    }

    currentProfile.guardian_name = payload.guardian_name ?? currentProfile.guardian_name ?? null;
    currentProfile.guardian_phone = payload.guardian_phone ?? currentProfile.guardian_phone ?? null;
    currentProfile.medical_notes = payload.medical_notes ?? currentProfile.medical_notes ?? null;
    if (payload.student_category !== undefined) {
      currentProfile.student_category =
        String(payload.student_category || 'local').trim().toLowerCase() === 'international'
          ? 'international'
          : 'local';
      currentProfile.tertiary = currentProfile.tertiary || {};
      currentProfile.tertiary.student_category = currentProfile.student_category;
    }

    if (profileIndex >= 0) settings.admissions.student_profiles[profileIndex] = currentProfile;
    else settings.admissions.student_profiles.push(currentProfile);

    await institution?.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId: actorId,
      action: 'UPDATE',
      resourceType: 'student_profile',
      resourceId: student.id,
      newValues: payload,
      ip,
    });

    return getStudentFromDatabase({ institutionId, studentId });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateStudentInRuntime = async ({ institutionId, studentId, payload }) => {
  const student = store.students.profiles.find(
    (item) => item.id === studentId && item.institution_id === institutionId
  );
  if (!student) {
    throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
  }
  if (payload.full_name) {
    student.full_name = payload.full_name;
  }
  if (payload.guardian_name) {
    student.guardian_name = payload.guardian_name;
  }
  if (payload.guardian_phone) {
    student.guardian_phone = payload.guardian_phone;
  }
  return {
    id: student.id,
    name: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
    student_number: student.student_number,
    className: student.class_name || 'Unassigned',
    level: student.level_code || '',
    status: student.status || 'active',
    guardian: {
      name: student.guardian_name || 'No guardian linked',
      phone: student.guardian_phone || '',
      relation: student.guardian_relation || 'Guardian',
    },
    medical: {
      allergies: payload.allergies || '',
      bloodGroup: payload.blood_group || student.blood_group || '',
      notes: payload.medical_notes || student.medical_notes || '',
    },
    academicTrend: [],
    attendanceCalendar: [],
    invoices: [],
    discipline: [],
    documents: [],
  };
};

const getRosterFromDatabase = async ({ classId }) => {
  if (!classId) {
    return [];
  }
  const students = await models.Student.findAll({
    where: { class_id: classId },
    include: [{ model: models.User, as: 'user' }],
    order: [['created_at', 'ASC']],
  });

  return students.map((item) => ({
    id: item.id,
    student_number: item.student_number,
    full_name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim(),
    status: item.status,
  }));
};

const getRoster = async ({ classId }) => {
  if (databaseReady()) {
    return getRosterFromDatabase({ classId });
  }
  return store.students.teacherRoster[classId] || [];
};

const createStudentInDatabase = async ({ institutionId, payload, actorId, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAdmissionsSettings(institution.settings);
    const { first_name, last_name } = splitFullName(payload);
    const levelCode = String(payload.level_code || payload.level || '').toUpperCase();
    requireLevelConfig(levelCode);

    const selectedGroup =
      settings.academics.groups.find((item) => item.id === payload.group_id) ||
      settings.academics.groups.find((item) => item.name === payload.assignedClass);

    const levelRecord = await ensureLevelRecord({ institutionId, levelCode, transaction });
    const nextSequence = await models.Student.count({
      where: { institution_id: institutionId },
      transaction,
      paranoid: false,
    });
    const year = new Date().getFullYear();
    const studentNumber =
      payload.student_number ||
      createSequence('EDU', new Date(year, 0, 1), nextSequence + 1, 4);
    const admissionNumber =
      payload.admission_number ||
      `${String(institution.code || 'EDU').toUpperCase()}-${String(nextSequence + 1).padStart(4, '0')}`;
    const studentEmail =
      String(payload.email || '').trim().toLowerCase() ||
      `student.${studentNumber.toLowerCase()}@${String(institution.code || 'edu').toLowerCase()}.local`;

    const studentUser = await models.User.create(
      {
        institution_id: institutionId,
        email: studentEmail,
        phone: payload.phone || null,
        password_hash: await hashPassword(payload.temporary_password || studentNumber),
        role: 'student',
        first_name,
        last_name,
        is_active: true,
      },
      { transaction }
    );

    let guardian = null;
    if (payload.guardian_name || payload.guardianName || payload.guardian_phone || payload.guardianPhone) {
      const guardianName = String(payload.guardian_name || payload.guardianName || 'Guardian').trim();
      const guardianParts = guardianName.split(/\s+/).filter(Boolean);
      const guardianPhone = payload.guardian_phone || payload.guardianPhone || null;
      const guardianUser = await models.User.create(
        {
          institution_id: institutionId,
          email:
            payload.guardian_email ||
            `parent.${studentNumber.toLowerCase()}@${String(institution.code || 'edu').toLowerCase()}.local`,
          phone: guardianPhone,
          password_hash: await hashPassword(payload.guardian_temporary_password || studentNumber),
          role: 'parent',
          first_name: guardianParts[0] || 'Guardian',
          last_name: guardianParts.slice(1).join(' ') || 'Account',
          is_active: true,
        },
        { transaction }
      );

      guardian = await models.Guardian.create(
        {
          user_id: guardianUser.id,
          relation_to_student: payload.guardian_relation || 'Guardian',
          emergency_contact: guardianPhone,
          address: payload.guardian_address || null,
        },
        { transaction }
      );
    }

    const student = await models.Student.create(
      {
        user_id: studentUser.id,
        institution_id: institutionId,
        student_number: studentNumber,
        admission_number: admissionNumber,
        class_id: selectedGroup?.class_record_id || null,
        level_id: levelRecord.id,
        date_of_birth: payload.date_of_birth || payload.dateOfBirth || null,
        gender: payload.gender || null,
        blood_group: payload.blood_group || null,
        nationality: payload.nationality || null,
        religion: payload.religion || null,
        photo_url: payload.photo_url || null,
        enrollment_date: payload.enrollment_date || new Date().toISOString().slice(0, 10),
        status: 'active',
        guardian_id: guardian?.id || null,
      },
      { transaction }
    );

    if (guardian) {
      await models.StudentGuardian.create(
        {
          student_id: student.id,
          guardian_id: guardian.id,
          is_primary_guardian: true,
        },
        { transaction }
      );
    }

    await models.StudentMedical.create(
      {
        student_id: student.id,
        allergies: [],
        chronic_conditions: [],
        medications: [],
        blood_group: payload.blood_group || null,
        dietary_restrictions: payload.dietary_restrictions || payload.dietaryRestrictions || null,
        special_needs: payload.medical_notes || payload.medicalNotes || null,
      },
      { transaction }
    );

    const profile = {
      student_id: student.id,
      full_name: `${first_name} ${last_name}`.trim(),
      level_code: levelCode,
      group_id: selectedGroup?.id || null,
      group_name: selectedGroup?.name || payload.assignedClass || null,
      fee_plan: payload.fee_plan || payload.feePlan || null,
      parent_link: payload.parent_link || payload.parentLink || null,
      guardian_name: payload.guardian_name || payload.guardianName || null,
      guardian_phone: payload.guardian_phone || payload.guardianPhone || null,
      previous_school: payload.previous_school || payload.previousSchool || null,
      previous_results: payload.previous_results || payload.previousResults || null,
      medical_notes: payload.medical_notes || payload.medicalNotes || null,
      dietary_restrictions: payload.dietary_restrictions || payload.dietaryRestrictions || null,
      pickup_persons: payload.pickup_persons || payload.pickupPersons || null,
      tertiary:
        levelCode === 'TR'
          ? {
              faculty_id: payload.faculty_id || null,
              department_id: payload.department_id || null,
              program_id: payload.program_id || null,
              qualification: payload.qualification || null,
              student_category:
                String(payload.student_category || payload.studentCategory || 'local')
                  .trim()
                  .toLowerCase() === 'international'
                  ? 'international'
                  : 'local',
            }
          : null,
      student_category:
        String(payload.student_category || payload.studentCategory || 'local')
          .trim()
          .toLowerCase() === 'international'
          ? 'international'
          : 'local',
    };

    settings.admissions.student_profiles.push(profile);

    let tertiaryProgress = null;
    if (levelCode === 'TR' && selectedGroup) {
      const groupPeriods = settings.academics.periods
        .filter((item) => item.group_id === selectedGroup.id)
        .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
      const activePeriod =
        groupPeriods.find((item) => item.status === 'active') ||
        groupPeriods.find((item) => item.registration_open) ||
        groupPeriods[0] ||
        null;

      tertiaryProgress = {
        student_id: student.id,
        institution_id: institutionId,
        current_group_id: selectedGroup.id,
        current_period_id: activePeriod?.id || null,
        passed_offering_codes: [],
        outstanding_resit_codes: [],
        can_progress: true,
        fee_clearance: true,
        faculty_id: payload.faculty_id || null,
        department_id: payload.department_id || null,
        program_id: payload.program_id || null,
      };
      settings.tertiary.student_progress.push(tertiaryProgress);
    }

    await createAutoSemesterInvoiceIfNeeded({
      institutionId,
      transaction,
      student,
      profile,
      progress: tertiaryProgress,
      settings,
    });

    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId: actorId,
      action: 'CREATE',
      resourceType: 'student_enrollment',
      resourceId: student.id,
      newValues: {
        student_id: student.id,
        student_number: student.student_number,
        level_code: levelCode,
        group_id: profile.group_id,
      },
      ip,
    });

    return {
      id: student.id,
      student_number: student.student_number,
      admission_number: student.admission_number,
      name: `${first_name} ${last_name}`.trim(),
      level: levelCode,
      className: profile.group_name,
      status: student.status,
    };
  } catch (error) {
    await transaction.rollback();
    const normalizedError = formatSequelizeCreateError(error);
    if (normalizedError) {
      throw normalizedError;
    }
    throw error;
  }
};

const createStudentInRuntime = async ({ institutionId, payload }) => {
  const nextId = `stu-${String(store.students.profiles.length + 1).padStart(3, '0')}`;
  const fullName = `${payload.first_name || payload.firstName || ''} ${payload.last_name || payload.lastName || ''}`.trim();
  const student = {
    id: nextId,
    institution_id: institutionId,
    parent_id: payload.parent_id || null,
    student_number:
      payload.student_number || `EDU-${new Date().getFullYear()}-${String(store.students.profiles.length + 1).padStart(4, '0')}`,
    first_name: payload.first_name || payload.firstName,
    last_name: payload.last_name || payload.lastName,
    full_name: fullName,
    class_id: payload.class_id,
    class_name: payload.class_name || payload.assignedClass || null,
    level_code: payload.level_code || payload.level,
    photo_url: payload.photo_url || null,
    attendance_percent: 0,
    balance_due: 0,
    next_exam: null,
  };
  store.students.profiles.push(student);
  if (String(payload.level_code || payload.level || '').toUpperCase() === 'TR') {
    const selectedGroup =
      store.academics.structure.groups.find((item) => item.id === payload.group_id) || null;
    const groupPeriods = store.academics.structure.periods
      .filter((item) => item.group_id === selectedGroup?.id)
      .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    const activePeriod =
      groupPeriods.find((item) => item.status === 'active') ||
      groupPeriods.find((item) => item.registration_open) ||
      groupPeriods[0] ||
      null;
    const profile = {
      student_id: student.id,
      full_name: fullName,
      group_name: selectedGroup?.name || student.class_name || null,
    };
    const progress =
      selectedGroup && activePeriod
        ? {
            student_id: student.id,
            current_group_id: selectedGroup.id,
            current_period_id: activePeriod.id,
          }
        : null;
    await createAutoSemesterInvoiceIfNeeded({
      institutionId,
      transaction: null,
      student,
      profile,
      progress,
      settings: {
        academics: store.academics.structure,
      },
    });
  }
  return student;
};

const createStudent = async ({ institutionId, payload, actorId, ip }) => {
  if (databaseReady()) {
    return createStudentInDatabase({ institutionId, payload, actorId, ip });
  }
  return createStudentInRuntime({ institutionId, payload });
};

const updateStudent = async (context) => {
  if (databaseReady()) {
    return updateStudentInDatabase(context);
  }
  return updateStudentInRuntime(context);
};

const markStudentDeletedInSettings = ({ settings, studentId, deletedAt, actorId }) => {
  const profile = settings.admissions.student_profiles.find((item) => item.student_id === studentId);
  if (profile) {
    profile.deleted_at = deletedAt;
    profile.deleted_by = actorId;
  }
};

const clearStudentDeletedInSettings = ({ settings, studentId }) => {
  const profile = settings.admissions.student_profiles.find((item) => item.student_id === studentId);
  if (profile) {
    delete profile.deleted_at;
    delete profile.deleted_by;
  }
};

const purgeStudentFromSettings = ({ settings, studentId }) => {
  settings.admissions.student_profiles = (settings.admissions.student_profiles || []).filter(
    (item) => item.student_id !== studentId
  );
  settings.tertiary.student_progress = (settings.tertiary.student_progress || []).filter(
    (item) => item.student_id !== studentId
  );
  settings.tertiary.registrations = (settings.tertiary.registrations || []).filter(
    (item) => item.student_id !== studentId
  );
  settings.tertiary.transcripts = (settings.tertiary.transcripts || []).filter(
    (item) => item.student_id !== studentId
  );
  settings.finance.student_credits = (settings.finance.student_credits || []).filter(
    (item) => item.student_id !== studentId
  );
};

const deleteStudentInDatabase = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const transaction = await sequelize.transaction();

  try {
    const student = await models.Student.findOne({
      where: { id: studentId, institution_id: institutionId },
      include: [{ model: models.User, as: 'user' }],
      transaction,
    });
    if (!student) {
      throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
    }

    const institution = await models.Institution.findByPk(institutionId, { transaction });
    const settings = ensureAdmissionsSettings(institution?.settings);
    const deletedAt = new Date().toISOString();

    await student.destroy({ transaction });
    if (student.user) {
      await student.user.update({ is_active: false }, { transaction });
      await student.user.destroy({ transaction });
    }

    markStudentDeletedInSettings({
      settings,
      studentId,
      deletedAt,
      actorId: actor.id,
    });
    await institution?.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId: actor.id,
      action: 'DELETE',
      resourceType: 'student_profile',
      resourceId: studentId,
      previousValues: { deleted_at: deletedAt },
      ip,
    });

    return { id: studentId, deleted: true, deleted_at: deletedAt };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteStudentInRuntime = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const student = (store.students.profiles || []).find(
    (item) => item.id === studentId && item.institution_id === institutionId && !item.deleted_at
  );
  if (!student) {
    throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
  }
  student.deleted_at = new Date().toISOString();
  student.deleted_by = actor.id;

  await logAudit({
    userId: actor.id,
    action: 'DELETE',
    resourceType: 'student_profile',
    resourceId: studentId,
    previousValues: { deleted_at: student.deleted_at },
    ip,
  });

  return { id: studentId, deleted: true, deleted_at: student.deleted_at };
};

const deleteStudent = async (context) => {
  if (databaseReady()) {
    return deleteStudentInDatabase(context);
  }
  return deleteStudentInRuntime(context);
};

const restoreStudentInDatabase = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const transaction = await sequelize.transaction();

  try {
    const student = await models.Student.findOne({
      where: { id: studentId, institution_id: institutionId },
      paranoid: false,
      include: [{ model: models.User, as: 'user', paranoid: false, required: false }],
      transaction,
    });
    if (!student || !student.deletedAt) {
      throw Object.assign(new Error('Deleted student not found.'), { statusCode: 404 });
    }

    const institution = await models.Institution.findByPk(institutionId, { transaction });
    const settings = ensureAdmissionsSettings(institution?.settings);

    if (student.user?.deletedAt) {
      await student.user.restore({ transaction });
    }
    if (student.user) {
      await student.user.update({ is_active: true }, { transaction });
    }
    await student.restore({ transaction });
    clearStudentDeletedInSettings({ settings, studentId });
    await institution?.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId: actor.id,
      action: 'RESTORE',
      resourceType: 'student_profile',
      resourceId: studentId,
      newValues: { restored: true },
      ip,
    });

    return getStudentFromDatabase({ institutionId, studentId });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const restoreStudentInRuntime = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const student = (store.students.profiles || []).find(
    (item) => item.id === studentId && item.institution_id === institutionId && item.deleted_at
  );
  if (!student) {
    throw Object.assign(new Error('Deleted student not found.'), { statusCode: 404 });
  }
  delete student.deleted_at;
  delete student.deleted_by;

  await logAudit({
    userId: actor.id,
    action: 'RESTORE',
    resourceType: 'student_profile',
    resourceId: studentId,
    newValues: { restored: true },
    ip,
  });

  return student;
};

const restoreStudent = async (context) => {
  if (databaseReady()) {
    return restoreStudentInDatabase(context);
  }
  return restoreStudentInRuntime(context);
};

const permanentlyDeleteStudentInDatabase = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const transaction = await sequelize.transaction();

  try {
    const student = await models.Student.findOne({
      where: { id: studentId, institution_id: institutionId },
      paranoid: false,
      include: [{ model: models.User, as: 'user', paranoid: false, required: false }],
      transaction,
    });
    if (!student || !student.deletedAt) {
      throw Object.assign(new Error('Deleted student not found.'), { statusCode: 404 });
    }

    const blockingChecks = await Promise.all([
      models.StudentInvoice ? models.StudentInvoice.count({ where: { student_id: studentId }, transaction }) : 0,
      models.Payment ? models.Payment.count({ where: { student_id: studentId }, transaction }) : 0,
      models.AttendanceRecord ? models.AttendanceRecord.count({ where: { student_id: studentId }, transaction }) : 0,
      models.AssessmentScore ? models.AssessmentScore.count({ where: { student_id: studentId }, transaction }) : 0,
      models.ReportCard ? models.ReportCard.count({ where: { student_id: studentId }, transaction }) : 0,
      models.DisciplineIncident ? models.DisciplineIncident.count({ where: { student_id: studentId }, transaction }) : 0,
    ]);

    if (blockingChecks.some((count) => Number(count) > 0)) {
      throw Object.assign(
        new Error('This student still has linked finance or academic records and cannot be permanently deleted.'),
        { statusCode: 400 }
      );
    }

    const institution = await models.Institution.findByPk(institutionId, { transaction });
    const settings = ensureAdmissionsSettings(institution?.settings);

    if (models.StudentMedical) {
      await models.StudentMedical.destroy({ where: { student_id: studentId }, force: true, transaction });
    }
    if (models.StudentGuardian) {
      await models.StudentGuardian.destroy({ where: { student_id: studentId }, force: true, transaction });
    }

    await student.destroy({ force: true, transaction });
    if (student.user) {
      await student.user.destroy({ force: true, transaction });
    }

    purgeStudentFromSettings({ settings, studentId });
    await institution?.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId: actor.id,
      action: 'PURGE',
      resourceType: 'student_profile',
      resourceId: studentId,
      newValues: { purged: true },
      ip,
    });

    return { id: studentId, purged: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const permanentlyDeleteStudentInRuntime = async ({ institutionId, studentId, actor, ip }) => {
  assertStudentAdmin(actor);
  const index = (store.students.profiles || []).findIndex(
    (item) => item.id === studentId && item.institution_id === institutionId && item.deleted_at
  );
  if (index < 0) {
    throw Object.assign(new Error('Deleted student not found.'), { statusCode: 404 });
  }
  store.students.profiles.splice(index, 1);

  await logAudit({
    userId: actor.id,
    action: 'PURGE',
    resourceType: 'student_profile',
    resourceId: studentId,
    newValues: { purged: true },
    ip,
  });

  return { id: studentId, purged: true };
};

const permanentlyDeleteStudent = async (context) => {
  if (databaseReady()) {
    return permanentlyDeleteStudentInDatabase(context);
  }
  return permanentlyDeleteStudentInRuntime(context);
};

module.exports = {
  listStudents,
  listDeletedStudents,
  getStudent,
  getRoster,
  createStudent,
  updateStudent,
  deleteStudent,
  restoreStudent,
  permanentlyDeleteStudent,
};
