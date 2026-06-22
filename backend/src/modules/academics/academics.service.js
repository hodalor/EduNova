const crypto = require('crypto');

const { models, sequelize } = require('../../config/database');
const { logAudit } = require('../../shared/services/audit-log.service');
const { getLevelConfig, requireLevelConfig } = require('../../shared/services/level-config.service');
const { store } = require('../../shared/store/runtime-store');
const analyticsService = require('../analytics/analytics.service');

const databaseReady = () =>
  Boolean(
    models.Institution &&
      models.EducationLevel &&
      models.AcademicYear &&
      models.TermSemester &&
      models.Subject &&
      models.Class &&
      models.ClassSubject &&
      sequelize?.transaction
  );

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const ensureAcademicSettings = (settings) => {
  const next = cloneSettings(settings);
  next.academics = next.academics || {};
  next.academics.groups = next.academics.groups || [];
  next.academics.periods = next.academics.periods || [];
  next.academics.offerings = next.academics.offerings || [];
  next.academics.progression_rules =
    next.academics.progression_rules || [
      'Students only see courses or subjects assigned to their class or level.',
      'Registration opens only for the active academic period.',
    ];
  return next;
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

const ensureCurrentAcademicYear = async ({ institutionId, transaction }) => {
  const existing = await models.AcademicYear.findOne({
    where: { institution_id: institutionId, is_current: true },
    transaction,
  });
  if (existing) {
    return existing;
  }

  const year = new Date().getFullYear();
  return models.AcademicYear.create(
    {
      institution_id: institutionId,
      name: `${year}/${year + 1}`,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      is_current: true,
    },
    { transaction }
  );
};

const listAcademicStructureFromDatabase = async ({ institutionId, levelCode }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = ensureAcademicSettings(institution.settings);
  const groups = settings.academics.groups.filter(
    (item) => !levelCode || item.level_code === String(levelCode).toUpperCase()
  );
  const groupIds = new Set(groups.map((item) => item.id));

  return {
    groups,
    periods: settings.academics.periods.filter((item) => groupIds.has(item.group_id)),
    offerings: settings.academics.offerings.filter((item) => groupIds.has(item.group_id)),
    progression_rules: [...settings.academics.progression_rules],
  };
};

const listAcademicStructureFromRuntime = async ({ institutionId, levelCode }) => {
  const groups = store.academics.structure.groups.filter(
    (item) =>
      item.institution_id === institutionId && (!levelCode || item.level_code === levelCode)
  );
  const groupIds = new Set(groups.map((item) => item.id));

  return {
    groups,
    periods: store.academics.structure.periods.filter(
      (item) => item.institution_id === institutionId && groupIds.has(item.group_id)
    ),
    offerings: store.academics.structure.offerings.filter(
      (item) => item.institution_id === institutionId && groupIds.has(item.group_id)
    ),
    progression_rules: [...store.academics.structure.progression_rules],
  };
};

const listAcademicStructure = async (context) => {
  if (databaseReady()) {
    return listAcademicStructureFromDatabase(context);
  }
  return listAcademicStructureFromRuntime(context);
};

const createAcademicGroupFromDatabase = async ({ institutionId, userId, payload, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const levelCode = String(payload.level_code || '').toUpperCase();
    requireLevelConfig(levelCode);

    const normalizedCode = String(payload.code || '')
      .trim()
      .toUpperCase();

    const duplicate = settings.academics.groups.find((item) => item.code === normalizedCode);
    if (duplicate) {
      throw Object.assign(new Error('A class or level with this code already exists.'), {
        statusCode: 409,
      });
    }

    const levelRecord = await ensureLevelRecord({ institutionId, levelCode, transaction });
    const group = {
      id: payload.id || crypto.randomUUID(),
      institution_id: institutionId,
      name: payload.name,
      code: normalizedCode,
      group_type: payload.group_type || 'level',
      level_code: levelCode,
      calendar_type: payload.calendar_type || 'term',
      level_record_id: levelRecord.id,
    };

    if (group.group_type === 'class') {
      const academicYear = await ensureCurrentAcademicYear({ institutionId, transaction });
      const classRecord = await models.Class.create(
        {
          institution_id: institutionId,
          level_id: levelRecord.id,
          name: payload.name,
          stream: payload.stream || null,
          capacity:
            payload.capacity === '' || payload.capacity === null || payload.capacity === undefined
              ? null
              : Number(payload.capacity),
          academic_year_id: academicYear.id,
        },
        { transaction }
      );
      group.class_record_id = classRecord.id;
      group.academic_year_id = academicYear.id;
    }

    settings.academics.groups.push(group);
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'academic_group',
      resourceId: group.id,
      newValues: group,
      ip,
    });

    return group;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createAcademicGroupFromRuntime = async ({ institutionId, userId, payload, ip }) => {
  const group = {
    id: payload.id || `grp-${store.academics.structure.groups.length + 1}`,
    institution_id: institutionId,
    name: payload.name,
    code: payload.code,
    group_type: payload.group_type || 'level',
    level_code: String(payload.level_code || '').toUpperCase(),
    calendar_type: payload.calendar_type || 'term',
  };

  requireLevelConfig(group.level_code);
  store.academics.structure.groups.push(group);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_group',
    resourceId: group.id,
    newValues: group,
    ip,
  });

  return group;
};

const createAcademicGroup = async (context) => {
  if (databaseReady()) {
    return createAcademicGroupFromDatabase(context);
  }
  return createAcademicGroupFromRuntime(context);
};

const createAcademicPeriodFromDatabase = async ({ institutionId, userId, payload, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const group = settings.academics.groups.find((item) => item.id === payload.group_id);
    if (!group) {
      throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
    }

    const period = {
      id: payload.id || crypto.randomUUID(),
      institution_id: institutionId,
      group_id: payload.group_id,
      name: payload.name,
      sequence: Number(payload.sequence || 1),
      calendar_type: payload.calendar_type || group.calendar_type,
      status: payload.status || 'planned',
      registration_open: Boolean(payload.registration_open),
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
    };

    if (['term', 'semester'].includes(period.calendar_type)) {
      const academicYear = await ensureCurrentAcademicYear({ institutionId, transaction });
      const type = period.calendar_type === 'semester' ? 'semester' : 'term';

      if (period.status === 'active') {
        await models.TermSemester.update(
          { is_current: false },
          { where: { academic_year_id: academicYear.id }, transaction }
        );
      }

      const record = await models.TermSemester.create(
        {
          academic_year_id: academicYear.id,
          name: period.name,
          type,
          start_date: period.start_date || academicYear.start_date,
          end_date: period.end_date || academicYear.end_date,
          is_current: period.status === 'active',
        },
        { transaction }
      );
      period.term_semester_id = record.id;
      period.academic_year_id = academicYear.id;
    }

    settings.academics.periods.push(period);
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'academic_period',
      resourceId: period.id,
      newValues: period,
      ip,
    });

    return period;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createAcademicPeriodFromRuntime = async ({ institutionId, userId, payload, ip }) => {
  const group = store.academics.structure.groups.find(
    (item) => item.id === payload.group_id && item.institution_id === institutionId
  );
  if (!group) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const period = {
    id: payload.id || `prd-${store.academics.structure.periods.length + 1}`,
    institution_id: institutionId,
    group_id: payload.group_id,
    name: payload.name,
    sequence: Number(payload.sequence || 1),
    calendar_type: payload.calendar_type || group.calendar_type,
    status: payload.status || 'planned',
    registration_open: Boolean(payload.registration_open),
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };

  store.academics.structure.periods.push(period);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_period',
    resourceId: period.id,
    newValues: period,
    ip,
  });

  return period;
};

const createAcademicPeriod = async (context) => {
  if (databaseReady()) {
    return createAcademicPeriodFromDatabase(context);
  }
  return createAcademicPeriodFromRuntime(context);
};

const createAcademicOfferingFromDatabase = async ({ institutionId, userId, payload, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const group = settings.academics.groups.find((item) => item.id === payload.group_id);
    if (!group) {
      throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
    }

    const period = settings.academics.periods.find(
      (item) => item.id === payload.period_id && item.group_id === payload.group_id
    );
    if (!period) {
      throw Object.assign(new Error('Academic period not found for this group.'), {
        statusCode: 404,
      });
    }

    const normalizedCode = String(payload.code || '')
      .trim()
      .toUpperCase();
    const duplicate = settings.academics.offerings.find(
      (item) =>
        item.group_id === payload.group_id &&
        item.period_id === payload.period_id &&
        item.code === normalizedCode
    );
    if (duplicate) {
      throw Object.assign(
        new Error('A subject or course with this code already exists in the selected period.'),
        { statusCode: 409 }
      );
    }

    const levelRecord = await ensureLevelRecord({
      institutionId,
      levelCode: group.level_code,
      transaction,
    });
    const subject = await models.Subject.create(
      {
        institution_id: institutionId,
        level_id: levelRecord.id,
        name: payload.name,
        code: normalizedCode,
        subject_type: payload.is_core === false ? 'elective' : 'core',
        credit_hours:
          payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
            ? null
            : Number(payload.credit_hours),
        is_active: true,
      },
      { transaction }
    );

    if (group.class_record_id) {
      await models.ClassSubject.findOrCreate({
        where: {
          class_id: group.class_record_id,
          subject_id: subject.id,
          teacher_id: null,
        },
        defaults: {
          class_id: group.class_record_id,
          subject_id: subject.id,
          teacher_id: null,
          periods_per_week: Number(payload.periods_per_week || 0),
        },
        transaction,
      });
    }

    const offering = {
      id: payload.id || crypto.randomUUID(),
      institution_id: institutionId,
      group_id: payload.group_id,
      period_id: payload.period_id,
      type: payload.type || 'subject',
      code: normalizedCode,
      name: payload.name,
      credit_hours:
        payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
          ? null
          : Number(payload.credit_hours),
      is_core: payload.is_core !== false,
      prerequisite_codes: payload.prerequisite_codes || [],
      next_offering_codes: payload.next_offering_codes || [],
      subject_id: subject.id,
      level_record_id: levelRecord.id,
    };

    settings.academics.offerings.push(offering);
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'academic_offering',
      resourceId: offering.id,
      newValues: offering,
      ip,
    });

    return offering;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createAcademicOfferingFromRuntime = async ({ institutionId, userId, payload, ip }) => {
  const group = store.academics.structure.groups.find(
    (item) => item.id === payload.group_id && item.institution_id === institutionId
  );
  if (!group) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const period = store.academics.structure.periods.find(
    (item) =>
      item.id === payload.period_id &&
      item.group_id === payload.group_id &&
      item.institution_id === institutionId
  );
  if (!period) {
    throw Object.assign(new Error('Academic period not found for this group.'), {
      statusCode: 404,
    });
  }

  const offering = {
    id: payload.id || `off-${store.academics.structure.offerings.length + 1}`,
    institution_id: institutionId,
    group_id: payload.group_id,
    period_id: payload.period_id,
    type: payload.type || 'subject',
    code: payload.code,
    name: payload.name,
    credit_hours:
      payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
        ? null
        : Number(payload.credit_hours),
    is_core: payload.is_core !== false,
    prerequisite_codes: payload.prerequisite_codes || [],
    next_offering_codes: payload.next_offering_codes || [],
  };

  store.academics.structure.offerings.push(offering);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_offering',
    resourceId: offering.id,
    newValues: offering,
    ip,
  });

  return offering;
};

const createAcademicOffering = async (context) => {
  if (databaseReady()) {
    return createAcademicOfferingFromDatabase(context);
  }
  return createAcademicOfferingFromRuntime(context);
};

const calculateGrade = ({ levelCode, score }) => {
  const config = requireLevelConfig(levelCode);
  if (!config.hasGrades) {
    return 'milestone';
  }

  const numericScore = Number(score);
  if (config.gradeSystem === 'AF') {
    if (numericScore >= 80) return 'A';
    if (numericScore >= 70) return 'B';
    if (numericScore >= 60) return 'C';
    if (numericScore >= 50) return 'D';
    return 'F';
  }
  if (config.gradeSystem === 'wassce') {
    if (numericScore >= 80) return 'A1';
    if (numericScore >= 70) return 'B2';
    if (numericScore >= 60) return 'C4';
    return 'F9';
  }
  if (config.gradeSystem === 'gpa_4') {
    if (numericScore >= 80) return '4.0';
    if (numericScore >= 70) return '3.5';
    if (numericScore >= 60) return '3.0';
    return '2.0';
  }
  return `${numericScore}%`;
};

const saveScores = async ({ institutionId, userId, payload, ip }) => {
  const rows = payload.scores.map((row) => ({
    id: `score-${store.academics.scores.length + 1}-${row.student_id}`,
    institution_id: institutionId,
    class_id: payload.class_id,
    subject_id: payload.subject_id,
    assessment_name: payload.assessment_name,
    student_id: row.student_id,
    student_name: row.student_name,
    score: Number(row.score),
    grade: calculateGrade({ levelCode: payload.level_code, score: row.score }),
  }));

  store.academics.scores.push(...rows);
  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'assessment_scores',
    resourceId: payload.assessment_name,
    newValues: rows,
    ip,
  });
  return rows;
};

const publishReportCard = async ({ institutionId, reportCardId, userId, ip }) => {
  const reportCard = store.academics.reportCards.find(
    (item) => item.id === reportCardId && item.institution_id === institutionId
  );
  if (!reportCard) {
    throw Object.assign(new Error('Report card not found.'), { statusCode: 404 });
  }

  reportCard.is_published = true;
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'report_card',
    resourceId: reportCard.id,
    newValues: reportCard,
    ip,
  });
  await analyticsService.invalidateAnalyticsCache(institutionId);
  return reportCard;
};

const getReportCards = async ({ institutionId }) =>
  store.academics.reportCards.filter((item) => item.institution_id === institutionId);

const getRanking = async ({ className }) =>
  store.academics.reportCards
    .filter((item) => item.class_name === className)
    .sort((a, b) => b.overall_average - a.overall_average)
    .map((item, index) => ({ ...item, rank: index + 1 }));

module.exports = {
  listAcademicStructure,
  createAcademicGroup,
  createAcademicPeriod,
  createAcademicOffering,
  calculateGrade,
  saveScores,
  publishReportCard,
  getReportCards,
  getRanking,
};
