const { models, sequelize } = require('../../config/database');
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
  return next;
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
    level: student.level?.level_code || profile?.level_code || '',
    status: student.status,
    photo: student.user?.profile_photo || student.photo_url || null,
    guardian: guardianName,
  };
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

  return {
    id: student.id,
    name: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim(),
    student_number: student.student_number,
    className:
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
    tertiary: profile.tertiary || null,
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
    const nextSequence = await models.Student.count({ where: { institution_id: institutionId }, transaction });
    const year = new Date().getFullYear();
    const studentNumber =
      payload.student_number ||
      `EDU-${year}-${String(nextSequence + 1).padStart(4, '0')}`;
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
            }
          : null,
    };

    settings.admissions.student_profiles.push(profile);

    if (levelCode === 'TR' && selectedGroup) {
      const groupPeriods = settings.academics.periods
        .filter((item) => item.group_id === selectedGroup.id)
        .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
      const activePeriod =
        groupPeriods.find((item) => item.status === 'active') ||
        groupPeriods.find((item) => item.registration_open) ||
        groupPeriods[0] ||
        null;

      settings.tertiary.student_progress.push({
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
      });
    }

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
    throw error;
  }
};

const createStudentInRuntime = async ({ institutionId, payload }) => {
  const nextId = `stu-${String(store.students.profiles.length + 1).padStart(3, '0')}`;
  const student = {
    id: nextId,
    institution_id: institutionId,
    parent_id: payload.parent_id || null,
    student_number:
      payload.student_number || `EDU-${new Date().getFullYear()}-${String(store.students.profiles.length + 1).padStart(4, '0')}`,
    first_name: payload.first_name,
    last_name: payload.last_name,
    full_name: `${payload.first_name} ${payload.last_name}`.trim(),
    class_id: payload.class_id,
    class_name: payload.class_name,
    level_code: payload.level_code,
    photo_url: payload.photo_url || null,
    attendance_percent: 0,
    balance_due: 0,
    next_exam: null,
  };
  store.students.profiles.push(student);
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

module.exports = {
  listStudents,
  getStudent,
  getRoster,
  createStudent,
  updateStudent,
};
