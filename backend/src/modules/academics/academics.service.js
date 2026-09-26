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
  next.academics.report_card_workflow = next.academics.report_card_workflow || {};
  next.academics.grade_scales = next.academics.grade_scales || {};
  next.academics.progression_rules =
    next.academics.progression_rules || [
      'Students only see courses or subjects assigned to their class or level.',
      'Registration opens only for the active academic period.',
    ];
  return next;
};

const defaultGradeScaleByLevel = {
  PR: {
    rules: [
      { min_score: 80, max_score: 100, grade: 'A', gp: null, remark: 'Excellent' },
      { min_score: 70, max_score: 79, grade: 'B', gp: null, remark: 'Very Good' },
      { min_score: 60, max_score: 69, grade: 'C', gp: null, remark: 'Good' },
      { min_score: 50, max_score: 59, grade: 'D', gp: null, remark: 'Pass' },
      { min_score: 0, max_score: 49, grade: 'F', gp: null, remark: 'Fail' },
    ],
    class_designations: [],
  },
  JH: {
    rules: [
      { min_score: 80, max_score: 100, grade: 'A1', gp: null, remark: 'Excellent' },
      { min_score: 70, max_score: 79, grade: 'B2', gp: null, remark: 'Very Good' },
      { min_score: 60, max_score: 69, grade: 'C4', gp: null, remark: 'Good' },
      { min_score: 50, max_score: 59, grade: 'D7', gp: null, remark: 'Credit' },
      { min_score: 0, max_score: 49, grade: 'F9', gp: null, remark: 'Fail' },
    ],
    class_designations: [],
  },
  SH: {
    rules: [
      { min_score: 80, max_score: 100, grade: 'A1', gp: null, remark: 'Excellent' },
      { min_score: 70, max_score: 79, grade: 'B2', gp: null, remark: 'Very Good' },
      { min_score: 60, max_score: 69, grade: 'C4', gp: null, remark: 'Credit' },
      { min_score: 50, max_score: 59, grade: 'D7', gp: null, remark: 'Pass' },
      { min_score: 0, max_score: 49, grade: 'F9', gp: null, remark: 'Fail' },
    ],
    class_designations: [],
  },
  TR: {
    rules: [
      { min_score: 90, max_score: 100, grade: 'A+', gp: 4.0, remark: 'Excellent' },
      { min_score: 85, max_score: 89, grade: 'A', gp: 4.0, remark: 'Excellent' },
      { min_score: 80, max_score: 84, grade: 'A-', gp: 3.7, remark: 'Excellent' },
      { min_score: 76, max_score: 79, grade: 'B+', gp: 3.3, remark: 'Very Good' },
      { min_score: 72, max_score: 75, grade: 'B', gp: 3.0, remark: 'Very Good' },
      { min_score: 68, max_score: 71, grade: 'B-', gp: 2.7, remark: 'Good' },
      { min_score: 64, max_score: 67, grade: 'C+', gp: 2.3, remark: 'Credit' },
      { min_score: 60, max_score: 63, grade: 'C', gp: 2.0, remark: 'Credit' },
      { min_score: 57, max_score: 59, grade: 'C-', gp: 1.7, remark: 'Pass' },
      { min_score: 54, max_score: 56, grade: 'D+', gp: 1.3, remark: 'Pass' },
      { min_score: 51, max_score: 53, grade: 'D', gp: 1.0, remark: 'Pass' },
      { min_score: 49, max_score: 50, grade: 'D-', gp: 0.7, remark: 'Marginal Pass' },
      { min_score: 0, max_score: 48, grade: 'F', gp: 0, remark: 'Fail' },
    ],
    class_designations: [
      { min_gpa: 3.6, max_gpa: 4, label: 'First Class' },
      { min_gpa: 3.25, max_gpa: 3.59, label: 'Second Class (Upper Division)' },
      { min_gpa: 2.5, max_gpa: 3.24, label: 'Second Class (Lower Division)' },
      { min_gpa: 2, max_gpa: 2.49, label: 'Third Class' },
      { min_gpa: 0, max_gpa: 1.99, label: 'Pass' },
    ],
  },
};

const cloneGradeScaleDefinition = (definition = { rules: [], class_designations: [] }) => ({
  rules: (definition.rules || []).map((rule) => ({ ...rule })),
  class_designations: (definition.class_designations || []).map((item) => ({ ...item })),
});

const getGradeScaleDefinition = (settings, levelCode) => {
  const normalizedLevelCode = String(levelCode || '').trim().toUpperCase();
  const configured = settings?.academics?.grade_scales?.[normalizedLevelCode];
  if (configured) {
    return cloneGradeScaleDefinition(configured);
  }
  return cloneGradeScaleDefinition(defaultGradeScaleByLevel[normalizedLevelCode] || { rules: [], class_designations: [] });
};

const normalizeGradeScaleRule = (rule = {}, index = 0) => ({
  id: String(rule.id || `rule-${index + 1}`),
  min_score: Number(rule.min_score ?? 0),
  max_score: Number(rule.max_score ?? 0),
  grade: String(rule.grade || '').trim().toUpperCase(),
  gp: rule.gp === '' || rule.gp === null || rule.gp === undefined ? null : Number(rule.gp),
  remark: String(rule.remark || '').trim() || null,
});

const normalizeClassDesignation = (item = {}, index = 0) => ({
  id: String(item.id || `designation-${index + 1}`),
  min_gpa: Number(item.min_gpa ?? 0),
  max_gpa: Number(item.max_gpa ?? 0),
  label: String(item.label || '').trim(),
});

const listGradeScales = async ({ institutionId, levelCodes = [] }) => {
  const normalizedLevels = Array.from(
    new Set((Array.isArray(levelCodes) ? levelCodes : []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))
  );

  let settings;
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId, { attributes: ['settings'] });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    settings = ensureAcademicSettings(institution.settings);
  } else {
    store.settings = ensureAcademicSettings(store.settings || {});
    settings = store.settings;
  }

  const targetLevels = normalizedLevels.length ? normalizedLevels : ['PR', 'JH', 'SH', 'TR'];
  return targetLevels.map((levelCode) => ({
    level_code: levelCode,
    ...getGradeScaleDefinition(settings, levelCode),
  }));
};

const updateGradeScale = async ({ institutionId, userId, payload, ip }) => {
  const levelCode = String(payload.level_code || '').trim().toUpperCase();
  if (!levelCode) {
    throw Object.assign(new Error('Level code is required.'), { statusCode: 400 });
  }
  requireLevelConfig(levelCode);

  const rules = (Array.isArray(payload.rules) ? payload.rules : [])
    .map((rule, index) => normalizeGradeScaleRule(rule, index))
    .filter((rule) => rule.grade && Number.isFinite(rule.min_score) && Number.isFinite(rule.max_score))
    .sort((a, b) => Number(b.max_score) - Number(a.max_score));

  if (!rules.length) {
    throw Object.assign(new Error('Add at least one grade rule.'), { statusCode: 400 });
  }

  const designations = (Array.isArray(payload.class_designations) ? payload.class_designations : [])
    .map((item, index) => normalizeClassDesignation(item, index))
    .filter((item) => item.label && Number.isFinite(item.min_gpa) && Number.isFinite(item.max_gpa))
    .sort((a, b) => Number(b.max_gpa) - Number(a.max_gpa));

  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureAcademicSettings(institution.settings);
    const oldValues = getGradeScaleDefinition(settings, levelCode);
    settings.academics.grade_scales[levelCode] = {
      rules,
      class_designations: designations,
    };
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'academic_grade_scale',
      resourceId: `${institutionId}:${levelCode}`,
      oldValues,
      newValues: settings.academics.grade_scales[levelCode],
      ip,
    });
    return {
      level_code: levelCode,
      ...settings.academics.grade_scales[levelCode],
    };
  }

  store.settings = ensureAcademicSettings(store.settings || {});
  const oldValues = getGradeScaleDefinition(store.settings, levelCode);
  store.settings.academics.grade_scales[levelCode] = {
    rules,
    class_designations: designations,
  };
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'academic_grade_scale',
    resourceId: `${institutionId}:${levelCode}`,
    oldValues,
    newValues: store.settings.academics.grade_scales[levelCode],
    ip,
  });
  return {
    level_code: levelCode,
    ...store.settings.academics.grade_scales[levelCode],
  };
};

const resolveGradeOutcome = ({ settings, levelCode, score, creditHours = 0 }) => {
  const config = requireLevelConfig(levelCode);
  if (!config.hasGrades) {
    return {
      grade: 'milestone',
      gp: null,
      tgp: null,
      remark: null,
    };
  }

  const numericScore = Number(score);
  const definition = getGradeScaleDefinition(settings, levelCode);
  const matchedRule = definition.rules.find(
    (rule) => numericScore >= Number(rule.min_score) && numericScore <= Number(rule.max_score)
  );

  if (matchedRule) {
    const gp = matchedRule.gp === null || matchedRule.gp === undefined ? null : Number(matchedRule.gp);
    return {
      grade: matchedRule.grade,
      gp,
      tgp: gp !== null && Number.isFinite(Number(creditHours || 0)) ? Number((gp * Number(creditHours || 0)).toFixed(2)) : null,
      remark: matchedRule.remark || null,
    };
  }

  return {
    grade: `${numericScore}%`,
    gp: null,
    tgp: null,
    remark: null,
  };
};

const normalizeReportCardWorkflow = (workflow = {}) => ({
  report_card_id: workflow.report_card_id || null,
  status: workflow.status || 'draft',
  reviewed_by: workflow.reviewed_by || null,
  reviewed_at: workflow.reviewed_at || null,
  review_note: workflow.review_note || null,
  approved_by: workflow.approved_by || null,
  approved_at: workflow.approved_at || null,
  approval_note: workflow.approval_note || null,
  published_by: workflow.published_by || null,
  published_at: workflow.published_at || null,
  publish_note: workflow.publish_note || null,
});

const resolveReportCardStatus = ({ reportCard, workflow }) => {
  if (Boolean(reportCard?.is_published)) {
    return 'published';
  }

  const normalized = normalizeReportCardWorkflow(workflow);
  if (normalized.approved_at) {
    return 'approved';
  }
  if (normalized.reviewed_at) {
    return 'reviewed';
  }
  return 'draft';
};

const canManageReportCardStage = ({ actor, stage }) => {
  const role = String(actor?.role || '').trim();
  if (role === 'institution_admin') {
    return true;
  }

  if (stage === 'review' && role === 'teacher') {
    return true;
  }

  return false;
};

const serializeReportCard = ({ reportCard, workflow = {} }) => {
  const normalizedWorkflow = normalizeReportCardWorkflow(workflow);
  const status = resolveReportCardStatus({ reportCard, workflow: normalizedWorkflow });
  return {
    ...reportCard,
    workflow: {
      ...normalizedWorkflow,
      status,
    },
    status,
  };
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

const ensureSharedTermSemester = async ({
  academicYearId,
  name,
  type,
  startDate,
  endDate,
  isCurrent,
  transaction,
}) => {
  const existing = await models.TermSemester.findOne({
    where: {
      academic_year_id: academicYearId,
      name,
      type,
    },
    paranoid: false,
    transaction,
  });

  if (existing) {
    if (existing.deletedAt) {
      await existing.restore({ transaction });
    }

    const nextValues = {};
    if (startDate && String(existing.start_date || '') !== String(startDate)) {
      nextValues.start_date = startDate;
    }
    if (endDate && String(existing.end_date || '') !== String(endDate)) {
      nextValues.end_date = endDate;
    }
    if (isCurrent && !existing.is_current) {
      nextValues.is_current = true;
    }

    if (Object.keys(nextValues).length) {
      await existing.update(nextValues, { transaction });
    }
    return existing;
  }

  return models.TermSemester.create(
    {
      academic_year_id: academicYearId,
      name,
      type,
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
    },
    { transaction }
  );
};

const normalizeCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const normalizeOfferingFees = (payload = {}, current = {}) => {
  const readNumber = (value, fallback = 0) => {
    if (value === '' || value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const fallbackFee = readNumber(
    payload.fee_amount,
    readNumber(current.fee_amount, 0)
  );
  const localFee = readNumber(
    payload.fee_amount_local ?? payload.local_fee_amount ?? payload.fee_amount,
    readNumber(current.fee_amount_local ?? current.local_fee_amount ?? current.fee_amount, fallbackFee)
  );
  const internationalFee = readNumber(
    payload.fee_amount_international ?? payload.international_fee_amount ?? payload.fee_amount,
    readNumber(
      current.fee_amount_international ?? current.international_fee_amount ?? current.fee_amount,
      localFee
    )
  );

  return {
    fee_amount: localFee,
    fee_amount_local: localFee,
    fee_amount_international: internationalFee,
  };
};

const normalizeProgramId = (value) => {
  const nextValue = String(value || '').trim();
  return nextValue || null;
};

const resolveOfferingProgramId = ({ payload = {}, current = {}, group = null }) => {
  if (String(group?.level_code || current?.level_code || '').toUpperCase() !== 'TR') {
    return null;
  }

  return normalizeProgramId(payload.program_id ?? current.program_id);
};

const destroyIfExists = async (model, id, options = {}) => {
  if (!model || !id) {
    return;
  }

  const record = await model.findByPk(id, options);
  if (record) {
    await record.destroy(options);
  }
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

const buildAssessmentRows = ({ groups, periods, offerings }) => {
  const groupMap = new Map(groups.map((item) => [item.id, item]));
  const periodMap = new Map(periods.map((item) => [item.id, item]));

  return offerings
    .map((offering) => {
      const group = groupMap.get(offering.group_id);
      const period = periodMap.get(offering.period_id);
      if (!group || !period) {
        return null;
      }

      return {
        id: `${offering.id}-default`,
        className: group.name,
        levelName: group.name,
        subject: offering.name,
        courseName: offering.name,
        term: period.name,
        semesterName: period.name,
        assessment: group.level_code === 'TR' ? 'Coursework' : 'Midterm',
        max_score: 100,
        class_id: group.id,
        subject_id: offering.subject_id || offering.id,
        level_code: group.level_code,
        credit_hours: offering.credit_hours ?? null,
      };
    })
    .filter(Boolean);
};

const listAssessments = async ({ institutionId }) => {
  const structure = await listAcademicStructure({ institutionId });
  const activePeriods = structure.periods.filter(
    (item) => item.status === 'active' || item.registration_open
  );
  const activePeriodIds = new Set(activePeriods.map((item) => item.id));
  const scopedOfferings = structure.offerings.filter(
    (item) => activePeriodIds.size === 0 || activePeriodIds.has(item.period_id)
  );

  return buildAssessmentRows({
    groups: structure.groups,
    periods: activePeriods.length ? activePeriods : structure.periods,
    offerings: scopedOfferings,
  });
};

const getGradebook = async ({ institutionId }) => {
  const settings = models.Institution
    ? ensureAcademicSettings((await models.Institution.findByPk(institutionId, { attributes: ['settings'] }))?.settings)
    : ensureAcademicSettings(store.settings || {});
  const students = store.students.profiles.filter((item) => item.institution_id === institutionId);
  const scoreRows = store.academics.scores.filter((item) => item.institution_id === institutionId);

  return students.map((student) => {
    const studentScores = scoreRows.filter((item) => item.student_id === student.id);
    const orderedScores = studentScores
      .slice()
      .sort((a, b) => String(a.assessment_name).localeCompare(String(b.assessment_name)));
    const quiz = Number(orderedScores[0]?.score || 0);
    const assignment = Number(orderedScores[1]?.score || 0);
    const exam = Number(orderedScores[2]?.score || 0);
    const populated = [quiz, assignment, exam].filter((item) => item > 0);
    const final = populated.length
      ? Math.round(populated.reduce((sum, item) => sum + item, 0) / populated.length)
      : 0;
    const outcome = resolveGradeOutcome({
      settings,
      levelCode: student.level_code || 'PR',
      score: final,
      creditHours: 0,
    });

    return {
      student: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      quiz,
      assignment,
      exam,
      final,
      grade: outcome.grade,
      gp: outcome.gp,
    };
  });
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

    const normalizedCode = normalizeCode(payload.code);

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
      program_ids:
        levelCode === 'TR' && Array.isArray(payload.program_ids)
          ? payload.program_ids.filter(Boolean)
          : [],
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
    program_ids:
      String(payload.level_code || '').toUpperCase() === 'TR' && Array.isArray(payload.program_ids)
        ? payload.program_ids.filter(Boolean)
        : [],
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

const updateAcademicGroupFromDatabase = async ({ institutionId, groupId, userId, payload, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const groupIndex = settings.academics.groups.findIndex((item) => item.id === groupId);
    if (groupIndex < 0) {
      throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
    }

    const current = settings.academics.groups[groupIndex];
    const nextCode = normalizeCode(payload.code ?? current.code);
    if (
      settings.academics.groups.some(
        (item, index) => index !== groupIndex && normalizeCode(item.code) === nextCode
      )
    ) {
      throw Object.assign(new Error('A class or level with this code already exists.'), {
        statusCode: 409,
      });
    }

    const nextLevelCode = String(payload.level_code || current.level_code || '').toUpperCase();
    requireLevelConfig(nextLevelCode);
    const levelRecord = await ensureLevelRecord({ institutionId, levelCode: nextLevelCode, transaction });

    const updated = {
      ...current,
      name: payload.name || current.name,
      code: nextCode,
      level_code: nextLevelCode,
      calendar_type: payload.calendar_type || current.calendar_type,
      program_ids:
        nextLevelCode === 'TR'
          ? Array.isArray(payload.program_ids)
            ? payload.program_ids.filter(Boolean)
            : current.program_ids || []
          : [],
      level_record_id: levelRecord.id,
    };

    if (current.class_record_id && models.Class) {
      const classRecord = await models.Class.findByPk(current.class_record_id, { transaction });
      if (classRecord) {
        await classRecord.update(
          {
            name: updated.name,
            level_id: levelRecord.id,
          },
          { transaction }
        );
      }
    }

    settings.academics.groups[groupIndex] = updated;
    settings.academics.periods = settings.academics.periods.map((period) =>
      period.group_id === groupId ? { ...period, calendar_type: updated.calendar_type } : period
    );

    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'academic_group',
      resourceId: groupId,
      newValues: updated,
      ip,
    });

    return updated;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateAcademicGroupFromRuntime = async ({ institutionId, groupId, userId, payload, ip }) => {
  const groupIndex = store.academics.structure.groups.findIndex(
    (item) => item.id === groupId && item.institution_id === institutionId
  );
  if (groupIndex < 0) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const current = store.academics.structure.groups[groupIndex];
  const updated = {
    ...current,
    name: payload.name || current.name,
    code: normalizeCode(payload.code ?? current.code),
    level_code: String(payload.level_code || current.level_code || '').toUpperCase(),
    calendar_type: payload.calendar_type || current.calendar_type,
    program_ids:
      String(payload.level_code || current.level_code || '').toUpperCase() === 'TR'
        ? Array.isArray(payload.program_ids)
          ? payload.program_ids.filter(Boolean)
          : current.program_ids || []
        : [],
  };
  requireLevelConfig(updated.level_code);

  store.academics.structure.groups[groupIndex] = updated;
  store.academics.structure.periods = store.academics.structure.periods.map((period) =>
    period.group_id === groupId ? { ...period, calendar_type: updated.calendar_type } : period
  );

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'academic_group',
    resourceId: groupId,
    newValues: updated,
    ip,
  });

  return updated;
};

const updateAcademicGroup = async (context) => {
  if (databaseReady()) {
    return updateAcademicGroupFromDatabase(context);
  }
  return updateAcademicGroupFromRuntime(context);
};

const deleteAcademicGroupFromDatabase = async ({ institutionId, groupId, userId, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const group = settings.academics.groups.find((item) => item.id === groupId);
    if (!group) {
      throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
    }

    const linkedPeriods = settings.academics.periods.filter((item) => item.group_id === groupId);
    const linkedOfferings = settings.academics.offerings.filter((item) => item.group_id === groupId);

    settings.academics.groups = settings.academics.groups.filter((item) => item.id !== groupId);
    settings.academics.periods = settings.academics.periods.filter((item) => item.group_id !== groupId);
    settings.academics.offerings = settings.academics.offerings.filter((item) => item.group_id !== groupId);

    for (const offering of linkedOfferings) {
      await destroyIfExists(models.Subject, offering.subject_id, { transaction });
    }
    if (group.class_record_id) {
      await destroyIfExists(models.Class, group.class_record_id, { transaction });
    }
    for (const period of linkedPeriods) {
      await destroyIfExists(models.TermSemester, period.term_semester_id, { transaction });
    }

    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'DELETE',
      resourceType: 'academic_group',
      resourceId: groupId,
      previousValues: group,
      ip,
    });

    return {
      id: groupId,
      deleted: true,
      removed_periods: linkedPeriods.length,
      removed_offerings: linkedOfferings.length,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteAcademicGroupFromRuntime = async ({ institutionId, groupId, userId, ip }) => {
  const group = store.academics.structure.groups.find(
    (item) => item.id === groupId && item.institution_id === institutionId
  );
  if (!group) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const linkedPeriods = store.academics.structure.periods.filter((item) => item.group_id === groupId);
  const linkedOfferings = store.academics.structure.offerings.filter((item) => item.group_id === groupId);

  store.academics.structure.groups = store.academics.structure.groups.filter(
    (item) => !(item.id === groupId && item.institution_id === institutionId)
  );
  store.academics.structure.periods = store.academics.structure.periods.filter(
    (item) => !(item.group_id === groupId && item.institution_id === institutionId)
  );
  store.academics.structure.offerings = store.academics.structure.offerings.filter(
    (item) => !(item.group_id === groupId && item.institution_id === institutionId)
  );

  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'academic_group',
    resourceId: groupId,
    previousValues: group,
    ip,
  });

  return {
    id: groupId,
    deleted: true,
    removed_periods: linkedPeriods.length,
    removed_offerings: linkedOfferings.length,
  };
};

const deleteAcademicGroup = async (context) => {
  if (databaseReady()) {
    return deleteAcademicGroupFromDatabase(context);
  }
  return deleteAcademicGroupFromRuntime(context);
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
      base_fee_amount:
        payload.base_fee_amount === '' || payload.base_fee_amount === null || payload.base_fee_amount === undefined
          ? 0
          : Number(payload.base_fee_amount),
      minimum_payment_percent:
        payload.minimum_payment_percent === '' ||
        payload.minimum_payment_percent === null ||
        payload.minimum_payment_percent === undefined
          ? 0
          : Number(payload.minimum_payment_percent),
      late_registration_penalty:
        payload.late_registration_penalty === '' ||
        payload.late_registration_penalty === null ||
        payload.late_registration_penalty === undefined
          ? 0
          : Number(payload.late_registration_penalty),
      penalty_deadline: payload.penalty_deadline || null,
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

      const record = await ensureSharedTermSemester({
        academicYearId: academicYear.id,
        name: period.name,
        type,
        startDate: period.start_date || academicYear.start_date,
        endDate: period.end_date || academicYear.end_date,
        isCurrent: period.status === 'active',
        transaction,
      });
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
    base_fee_amount:
      payload.base_fee_amount === '' || payload.base_fee_amount === null || payload.base_fee_amount === undefined
        ? 0
        : Number(payload.base_fee_amount),
    minimum_payment_percent:
      payload.minimum_payment_percent === '' ||
      payload.minimum_payment_percent === null ||
      payload.minimum_payment_percent === undefined
        ? 0
        : Number(payload.minimum_payment_percent),
    late_registration_penalty:
      payload.late_registration_penalty === '' ||
      payload.late_registration_penalty === null ||
      payload.late_registration_penalty === undefined
        ? 0
        : Number(payload.late_registration_penalty),
    penalty_deadline: payload.penalty_deadline || null,
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

const updateAcademicPeriodFromDatabase = async ({
  institutionId,
  periodId,
  userId,
  payload,
  ip,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const periodIndex = settings.academics.periods.findIndex((item) => item.id === periodId);
    if (periodIndex < 0) {
      throw Object.assign(new Error('Academic period not found.'), { statusCode: 404 });
    }

    const current = settings.academics.periods[periodIndex];
    const updated = {
      ...current,
      name: payload.name || current.name,
      sequence:
        payload.sequence === '' || payload.sequence === undefined
          ? current.sequence
          : Number(payload.sequence),
      status: payload.status || current.status,
      registration_open:
        payload.registration_open === undefined
          ? current.registration_open
          : Boolean(payload.registration_open),
      start_date: payload.start_date ?? current.start_date ?? null,
      end_date: payload.end_date ?? current.end_date ?? null,
      base_fee_amount:
        payload.base_fee_amount === '' || payload.base_fee_amount === undefined
          ? current.base_fee_amount || 0
          : payload.base_fee_amount === null
            ? 0
            : Number(payload.base_fee_amount),
      minimum_payment_percent:
        payload.minimum_payment_percent === '' || payload.minimum_payment_percent === undefined
          ? current.minimum_payment_percent || 0
          : payload.minimum_payment_percent === null
            ? 0
            : Number(payload.minimum_payment_percent),
      late_registration_penalty:
        payload.late_registration_penalty === '' || payload.late_registration_penalty === undefined
          ? current.late_registration_penalty || 0
          : payload.late_registration_penalty === null
            ? 0
            : Number(payload.late_registration_penalty),
      penalty_deadline: payload.penalty_deadline ?? current.penalty_deadline ?? null,
    };

    if (models.TermSemester && current.term_semester_id) {
      const record = await models.TermSemester.findByPk(current.term_semester_id, { transaction });
      if (record) {
        if (updated.status === 'active') {
          await models.TermSemester.update(
            { is_current: false },
            { where: { academic_year_id: record.academic_year_id }, transaction }
          );
        }
        await record.update(
          {
            name: updated.name,
            start_date: updated.start_date || record.start_date,
            end_date: updated.end_date || record.end_date,
            is_current: updated.status === 'active',
          },
          { transaction }
        );
      }
    }

    settings.academics.periods[periodIndex] = updated;
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'academic_period',
      resourceId: periodId,
      newValues: updated,
      ip,
    });

    return updated;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateAcademicPeriodFromRuntime = async ({ institutionId, periodId, userId, payload, ip }) => {
  const periodIndex = store.academics.structure.periods.findIndex(
    (item) => item.id === periodId && item.institution_id === institutionId
  );
  if (periodIndex < 0) {
    throw Object.assign(new Error('Academic period not found.'), { statusCode: 404 });
  }

  const current = store.academics.structure.periods[periodIndex];
  const updated = {
    ...current,
    name: payload.name || current.name,
    sequence:
      payload.sequence === '' || payload.sequence === undefined
        ? current.sequence
        : Number(payload.sequence),
    status: payload.status || current.status,
    registration_open:
      payload.registration_open === undefined
        ? current.registration_open
        : Boolean(payload.registration_open),
    start_date: payload.start_date ?? current.start_date ?? null,
    end_date: payload.end_date ?? current.end_date ?? null,
    base_fee_amount:
      payload.base_fee_amount === '' || payload.base_fee_amount === undefined
        ? current.base_fee_amount || 0
        : payload.base_fee_amount === null
          ? 0
          : Number(payload.base_fee_amount),
    minimum_payment_percent:
      payload.minimum_payment_percent === '' || payload.minimum_payment_percent === undefined
        ? current.minimum_payment_percent || 0
        : payload.minimum_payment_percent === null
          ? 0
          : Number(payload.minimum_payment_percent),
    late_registration_penalty:
      payload.late_registration_penalty === '' || payload.late_registration_penalty === undefined
        ? current.late_registration_penalty || 0
        : payload.late_registration_penalty === null
          ? 0
          : Number(payload.late_registration_penalty),
    penalty_deadline: payload.penalty_deadline ?? current.penalty_deadline ?? null,
  };

  store.academics.structure.periods[periodIndex] = updated;

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'academic_period',
    resourceId: periodId,
    newValues: updated,
    ip,
  });

  return updated;
};

const updateAcademicPeriod = async (context) => {
  if (databaseReady()) {
    return updateAcademicPeriodFromDatabase(context);
  }
  return updateAcademicPeriodFromRuntime(context);
};

const deleteAcademicPeriodFromDatabase = async ({ institutionId, periodId, userId, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const period = settings.academics.periods.find((item) => item.id === periodId);
    if (!period) {
      throw Object.assign(new Error('Academic period not found.'), { statusCode: 404 });
    }

    const removedOfferings = settings.academics.offerings.filter((item) => item.period_id === periodId);
    settings.academics.periods = settings.academics.periods.filter((item) => item.id !== periodId);
    settings.academics.offerings = settings.academics.offerings.filter((item) => item.period_id !== periodId);

    for (const offering of removedOfferings) {
      await destroyIfExists(models.Subject, offering.subject_id, { transaction });
    }
    const otherPeriodsUsingSameTerm = settings.academics.periods.some(
      (item) => item.id !== periodId && item.term_semester_id && item.term_semester_id === period.term_semester_id
    );
    if (!otherPeriodsUsingSameTerm) {
      try {
        await destroyIfExists(models.TermSemester, period.term_semester_id, { transaction });
      } catch (_error) {
        // Keep the shared term/semester record when historical finance or academic records still reference it.
      }
    }

    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'DELETE',
      resourceType: 'academic_period',
      resourceId: periodId,
      previousValues: period,
      ip,
    });

    return { id: periodId, deleted: true, removed_offerings: removedOfferings.length };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteAcademicPeriodFromRuntime = async ({ institutionId, periodId, userId, ip }) => {
  const period = store.academics.structure.periods.find(
    (item) => item.id === periodId && item.institution_id === institutionId
  );
  if (!period) {
    throw Object.assign(new Error('Academic period not found.'), { statusCode: 404 });
  }

  const removedOfferings = store.academics.structure.offerings.filter((item) => item.period_id === periodId);
  store.academics.structure.periods = store.academics.structure.periods.filter(
    (item) => !(item.id === periodId && item.institution_id === institutionId)
  );
  store.academics.structure.offerings = store.academics.structure.offerings.filter(
    (item) => !(item.period_id === periodId && item.institution_id === institutionId)
  );

  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'academic_period',
    resourceId: periodId,
    previousValues: period,
    ip,
  });

  return { id: periodId, deleted: true, removed_offerings: removedOfferings.length };
};

const deleteAcademicPeriod = async (context) => {
  if (databaseReady()) {
    return deleteAcademicPeriodFromDatabase(context);
  }
  return deleteAcademicPeriodFromRuntime(context);
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

    const normalizedCode = normalizeCode(payload.code);
    const programId = resolveOfferingProgramId({ payload, group });
    if (group.level_code === 'TR' && !programId) {
      throw Object.assign(new Error('Select the tertiary program for this course.'), {
        statusCode: 400,
      });
    }
    const duplicate = settings.academics.offerings.find(
      (item) =>
        item.group_id === payload.group_id &&
        item.period_id === payload.period_id &&
        normalizeProgramId(item.program_id) === programId &&
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

    const offeringFees = normalizeOfferingFees(payload);
    const offering = {
      id: payload.id || crypto.randomUUID(),
      institution_id: institutionId,
      group_id: payload.group_id,
      period_id: payload.period_id,
      program_id: programId,
      type: payload.type || 'subject',
      code: normalizedCode,
      name: payload.name,
      credit_hours:
        payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
          ? null
          : Number(payload.credit_hours),
      ...offeringFees,
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
  const programId = resolveOfferingProgramId({ payload, group });
  if (group.level_code === 'TR' && !programId) {
    throw Object.assign(new Error('Select the tertiary program for this course.'), {
      statusCode: 400,
    });
  }
  const normalizedCode = normalizeCode(payload.code);
  const duplicate = store.academics.structure.offerings.find(
    (item) =>
      item.institution_id === institutionId &&
      item.group_id === payload.group_id &&
      item.period_id === payload.period_id &&
      normalizeProgramId(item.program_id) === programId &&
      normalizeCode(item.code) === normalizedCode
  );
  if (duplicate) {
    throw Object.assign(
      new Error('A subject or course with this code already exists in the selected period.'),
      { statusCode: 409 }
    );
  }

  const offeringFees = normalizeOfferingFees(payload);
  const offering = {
    id: payload.id || `off-${store.academics.structure.offerings.length + 1}`,
    institution_id: institutionId,
    group_id: payload.group_id,
    period_id: payload.period_id,
    program_id: programId,
    type: payload.type || 'subject',
    code: normalizedCode,
    name: payload.name,
    credit_hours:
      payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
        ? null
        : Number(payload.credit_hours),
    ...offeringFees,
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

const updateAcademicOfferingFromDatabase = async ({
  institutionId,
  offeringId,
  userId,
  payload,
  ip,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const offeringIndex = settings.academics.offerings.findIndex((item) => item.id === offeringId);
    if (offeringIndex < 0) {
      throw Object.assign(new Error('Academic offering not found.'), { statusCode: 404 });
    }

    const current = settings.academics.offerings[offeringIndex];
    const group = settings.academics.groups.find((item) => item.id === current.group_id);
    if (!group) {
      throw Object.assign(new Error('Academic group not found for this course.'), { statusCode: 404 });
    }
    const nextCode = normalizeCode(payload.code ?? current.code);
    const nextProgramId = resolveOfferingProgramId({ payload, current, group });
    if (group.level_code === 'TR' && !nextProgramId) {
      throw Object.assign(new Error('Select the tertiary program for this course.'), {
        statusCode: 400,
      });
    }
    if (
      settings.academics.offerings.some(
        (item, index) =>
          index !== offeringIndex &&
          item.group_id === current.group_id &&
          item.period_id === current.period_id &&
          normalizeProgramId(item.program_id) === nextProgramId &&
          normalizeCode(item.code) === nextCode
      )
    ) {
      throw Object.assign(
        new Error('A subject or course with this code already exists in the selected period.'),
        { statusCode: 409 }
      );
    }

    const offeringFees = normalizeOfferingFees(payload, current);
    const updated = {
      ...current,
      program_id: nextProgramId,
      code: nextCode,
      name: payload.name || current.name,
      credit_hours:
        payload.credit_hours === '' || payload.credit_hours === undefined
          ? current.credit_hours
          : payload.credit_hours === null
            ? null
            : Number(payload.credit_hours),
      ...offeringFees,
      is_core: payload.is_core === undefined ? current.is_core : payload.is_core !== false,
      prerequisite_codes: payload.prerequisite_codes || current.prerequisite_codes || [],
      next_offering_codes: payload.next_offering_codes || current.next_offering_codes || [],
    };

    if (models.Subject && current.subject_id) {
      const subject = await models.Subject.findByPk(current.subject_id, { transaction });
      if (subject) {
        await subject.update(
          {
            code: updated.code,
            name: updated.name,
            subject_type: updated.is_core ? 'core' : 'elective',
            credit_hours: updated.credit_hours,
          },
          { transaction }
        );
      }
    }

    settings.academics.offerings[offeringIndex] = updated;
    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'academic_offering',
      resourceId: offeringId,
      newValues: updated,
      ip,
    });

    return updated;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateAcademicOfferingFromRuntime = async ({
  institutionId,
  offeringId,
  userId,
  payload,
  ip,
}) => {
  const offeringIndex = store.academics.structure.offerings.findIndex(
    (item) => item.id === offeringId && item.institution_id === institutionId
  );
  if (offeringIndex < 0) {
    throw Object.assign(new Error('Academic offering not found.'), { statusCode: 404 });
  }

  const current = store.academics.structure.offerings[offeringIndex];
  const group = store.academics.structure.groups.find(
    (item) => item.id === current.group_id && item.institution_id === institutionId
  );
  const programId = resolveOfferingProgramId({ payload, current, group });
  if (String(group?.level_code || '').toUpperCase() === 'TR' && !programId) {
    throw Object.assign(new Error('Select the tertiary program for this course.'), {
      statusCode: 400,
    });
  }
  const nextCode = normalizeCode(payload.code ?? current.code);
  const duplicate = store.academics.structure.offerings.find(
    (item, index) =>
      index !== offeringIndex &&
      item.institution_id === institutionId &&
      item.group_id === current.group_id &&
      item.period_id === current.period_id &&
      normalizeProgramId(item.program_id) === programId &&
      normalizeCode(item.code) === nextCode
  );
  if (duplicate) {
    throw Object.assign(
      new Error('A subject or course with this code already exists in the selected period.'),
      { statusCode: 409 }
    );
  }
  const offeringFees = normalizeOfferingFees(payload, current);
  const updated = {
    ...current,
    program_id: programId,
    code: nextCode,
    name: payload.name || current.name,
    credit_hours:
      payload.credit_hours === '' || payload.credit_hours === undefined
        ? current.credit_hours
        : payload.credit_hours === null
          ? null
          : Number(payload.credit_hours),
    ...offeringFees,
    is_core: payload.is_core === undefined ? current.is_core : payload.is_core !== false,
    prerequisite_codes: payload.prerequisite_codes || current.prerequisite_codes || [],
    next_offering_codes: payload.next_offering_codes || current.next_offering_codes || [],
  };

  store.academics.structure.offerings[offeringIndex] = updated;

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'academic_offering',
    resourceId: offeringId,
    newValues: updated,
    ip,
  });

  return updated;
};

const updateAcademicOffering = async (context) => {
  if (databaseReady()) {
    return updateAcademicOfferingFromDatabase(context);
  }
  return updateAcademicOfferingFromRuntime(context);
};

const deleteAcademicOfferingFromDatabase = async ({ institutionId, offeringId, userId, ip }) => {
  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const offering = settings.academics.offerings.find((item) => item.id === offeringId);
    if (!offering) {
      throw Object.assign(new Error('Academic offering not found.'), { statusCode: 404 });
    }

    settings.academics.offerings = settings.academics.offerings.filter((item) => item.id !== offeringId);
    await destroyIfExists(models.Subject, offering.subject_id, { transaction });

    await institution.update({ settings }, { transaction });
    await transaction.commit();

    await logAudit({
      userId,
      action: 'DELETE',
      resourceType: 'academic_offering',
      resourceId: offeringId,
      previousValues: offering,
      ip,
    });

    return { id: offeringId, deleted: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteAcademicOfferingFromRuntime = async ({ institutionId, offeringId, userId, ip }) => {
  const offering = store.academics.structure.offerings.find(
    (item) => item.id === offeringId && item.institution_id === institutionId
  );
  if (!offering) {
    throw Object.assign(new Error('Academic offering not found.'), { statusCode: 404 });
  }

  store.academics.structure.offerings = store.academics.structure.offerings.filter(
    (item) => !(item.id === offeringId && item.institution_id === institutionId)
  );

  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'academic_offering',
    resourceId: offeringId,
    previousValues: offering,
    ip,
  });

  return { id: offeringId, deleted: true };
};

const deleteAcademicOffering = async (context) => {
  if (databaseReady()) {
    return deleteAcademicOfferingFromDatabase(context);
  }
  return deleteAcademicOfferingFromRuntime(context);
};

const calculateGrade = ({ levelCode, score }) => {
  return resolveGradeOutcome({
    settings: ensureAcademicSettings(store.settings || {}),
    levelCode,
    score,
  }).grade;
};

const saveScores = async ({ institutionId, userId, payload, ip }) => {
  const settings = models.Institution
    ? ensureAcademicSettings((await models.Institution.findByPk(institutionId, { attributes: ['settings'] }))?.settings)
    : ensureAcademicSettings(store.settings || {});
  const structure = await listAcademicStructure({ institutionId });
  const offering = structure.offerings.find((item) => String(item.id) === String(payload.subject_id));
  const creditHours = Number(offering?.credit_hours || payload.credit_hours || 0);

  const rows = payload.scores.map((row) => {
    const outcome = resolveGradeOutcome({
      settings,
      levelCode: payload.level_code,
      score: row.score,
      creditHours,
    });

    return {
    id: `score-${store.academics.scores.length + 1}-${row.student_id}`,
    institution_id: institutionId,
    class_id: payload.class_id,
    subject_id: payload.subject_id,
    assessment_name: payload.assessment_name,
    student_id: row.student_id,
    student_name: row.student_name,
    score: Number(row.score),
      credit_hours: creditHours || null,
      grade: outcome.grade,
      gp: outcome.gp,
      tgp: outcome.tgp,
      remark: outcome.remark,
    };
  });

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

const publishReportCard = async ({ institutionId, reportCardId, userId, actor, ip }) =>
  transitionReportCardWorkflow({
    institutionId,
    reportCardId,
    action: 'publish',
    actor: actor || { id: userId, role: 'institution_admin' },
    ip,
  });

const getReportCardsFromDatabase = async ({ institutionId }) => {
  const [institution, rows] = await Promise.all([
    models.Institution.findByPk(institutionId),
    models.ReportCard.findAll({
      include: [
        {
          model: models.Student,
          as: 'student',
          required: true,
          where: { institution_id: institutionId },
          include: [{ model: models.User, as: 'user', required: false }],
        },
        { model: models.Class, as: 'class', required: false },
        { model: models.TermSemester, as: 'term', required: false },
      ],
      order: [
        ['updated_at', 'DESC'],
        ['created_at', 'DESC'],
      ],
    }).catch(() => []),
  ]);

  const settings = ensureAcademicSettings(institution?.settings);
  return rows.map((row) => {
    const reportCard = row.toJSON();
    const workflow = settings.academics.report_card_workflow?.[reportCard.id] || {};
    const studentName =
      `${reportCard.student?.user?.first_name || ''} ${reportCard.student?.user?.last_name || ''}`.trim() ||
      reportCard.student_name ||
      'Student';
    return serializeReportCard({
      reportCard: {
        ...reportCard,
        student: studentName,
        student_name: studentName,
        class_name: reportCard.class?.name || reportCard.class_name || 'Unassigned',
        term_name: reportCard.term?.name || reportCard.term_name || 'Academic Term',
      },
      workflow,
    });
  });
};

const getReportCardsFromRuntime = async ({ institutionId }) => {
  const settings = ensureAcademicSettings(store.settingsByInstitution[institutionId]);
  return store.academics.reportCards
    .filter((item) => item.institution_id === institutionId)
    .map((reportCard) =>
      serializeReportCard({
        reportCard: {
          ...reportCard,
          student: reportCard.student_name || reportCard.student || 'Student',
          term_name: reportCard.term || reportCard.term_name || 'Academic Term',
        },
        workflow: settings.academics.report_card_workflow?.[reportCard.id] || {},
      })
    );
};

const getReportCards = async ({ institutionId }) => {
  if (models.ReportCard && models.Institution) {
    return getReportCardsFromDatabase({ institutionId });
  }
  return getReportCardsFromRuntime({ institutionId });
};

const transitionReportCardWorkflowInDatabase = async ({
  institutionId,
  reportCardId,
  action,
  actor,
  ip,
  note,
}) =>
  sequelize.transaction(async (transaction) => {
    const institution = await models.Institution.findByPk(institutionId, { transaction });
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }

    const settings = ensureAcademicSettings(institution.settings);
    const reportCard = await models.ReportCard.findOne({
      where: {
        id: reportCardId,
      },
      include: [
        {
          model: models.Student,
          as: 'student',
          required: true,
          where: { institution_id: institutionId },
        },
      ],
      transaction,
    });

    if (!reportCard) {
      throw Object.assign(new Error('Report card not found.'), { statusCode: 404 });
    }

    const currentWorkflow = normalizeReportCardWorkflow(settings.academics.report_card_workflow?.[reportCardId]);
    const currentStatus = resolveReportCardStatus({ reportCard, workflow: currentWorkflow });
    const now = new Date().toISOString();

    if (action === 'review') {
      if (!canManageReportCardStage({ actor, stage: 'review' })) {
        throw Object.assign(new Error('You do not have permission to review report cards.'), {
          statusCode: 403,
        });
      }
      if (currentStatus === 'published') {
        throw Object.assign(new Error('Published report cards cannot be reviewed again.'), {
          statusCode: 400,
        });
      }
      settings.academics.report_card_workflow[reportCardId] = {
        ...currentWorkflow,
        report_card_id: reportCardId,
        status: 'reviewed',
        reviewed_by: actor.id,
        reviewed_at: now,
        review_note: note || null,
      };
    } else if (action === 'approve') {
      if (!canManageReportCardStage({ actor, stage: 'approve' })) {
        throw Object.assign(new Error('You do not have permission to approve report cards.'), {
          statusCode: 403,
        });
      }
      if (!currentWorkflow.reviewed_at) {
        throw Object.assign(new Error('Review the report card before approval.'), { statusCode: 400 });
      }
      if (currentStatus === 'published') {
        throw Object.assign(new Error('Published report cards cannot be approved again.'), {
          statusCode: 400,
        });
      }
      settings.academics.report_card_workflow[reportCardId] = {
        ...currentWorkflow,
        report_card_id: reportCardId,
        status: 'approved',
        approved_by: actor.id,
        approved_at: now,
        approval_note: note || null,
      };
    } else if (action === 'publish') {
      if (!canManageReportCardStage({ actor, stage: 'publish' })) {
        throw Object.assign(new Error('You do not have permission to publish report cards.'), {
          statusCode: 403,
        });
      }
      if (!currentWorkflow.approved_at) {
        throw Object.assign(new Error('Approve the report card before publishing.'), {
          statusCode: 400,
        });
      }
      if (reportCard.is_published) {
        throw Object.assign(new Error('This report card is already published.'), { statusCode: 400 });
      }

      await reportCard.update(
        {
          is_published: true,
          published_at: new Date(),
        },
        { transaction }
      );
      settings.academics.report_card_workflow[reportCardId] = {
        ...currentWorkflow,
        report_card_id: reportCardId,
        status: 'published',
        published_by: actor.id,
        published_at: now,
        publish_note: note || null,
      };
    } else {
      throw Object.assign(new Error('Unsupported report card action.'), { statusCode: 400 });
    }

    await institution.update({ settings }, { transaction });

    const nextWorkflow = settings.academics.report_card_workflow[reportCardId];
    const serialized = serializeReportCard({
      reportCard: {
        ...reportCard.toJSON(),
      },
      workflow: nextWorkflow,
    });

    await logAudit({
      userId: actor.id,
      action: 'UPDATE',
      resourceType: 'report_card_workflow',
      resourceId: reportCardId,
      newValues: {
        action,
        workflow: nextWorkflow,
      },
      ip,
    });

    await analyticsService.invalidateAnalyticsCache(institutionId);
    return serialized;
  });

const transitionReportCardWorkflowInRuntime = async ({
  institutionId,
  reportCardId,
  action,
  actor,
  ip,
  note,
}) => {
  const settings = ensureAcademicSettings(store.settingsByInstitution[institutionId]);
  const reportCard = store.academics.reportCards.find(
    (item) => item.id === reportCardId && item.institution_id === institutionId
  );
  if (!reportCard) {
    throw Object.assign(new Error('Report card not found.'), { statusCode: 404 });
  }

  const currentWorkflow = normalizeReportCardWorkflow(settings.academics.report_card_workflow?.[reportCardId]);
  const currentStatus = resolveReportCardStatus({ reportCard, workflow: currentWorkflow });
  const now = new Date().toISOString();

  if (action === 'review') {
    if (!canManageReportCardStage({ actor, stage: 'review' })) {
      throw Object.assign(new Error('You do not have permission to review report cards.'), {
        statusCode: 403,
      });
    }
    if (currentStatus === 'published') {
      throw Object.assign(new Error('Published report cards cannot be reviewed again.'), {
        statusCode: 400,
      });
    }
    settings.academics.report_card_workflow[reportCardId] = {
      ...currentWorkflow,
      report_card_id: reportCardId,
      status: 'reviewed',
      reviewed_by: actor.id,
      reviewed_at: now,
      review_note: note || null,
    };
  } else if (action === 'approve') {
    if (!canManageReportCardStage({ actor, stage: 'approve' })) {
      throw Object.assign(new Error('You do not have permission to approve report cards.'), {
        statusCode: 403,
      });
    }
    if (!currentWorkflow.reviewed_at) {
      throw Object.assign(new Error('Review the report card before approval.'), { statusCode: 400 });
    }
    if (currentStatus === 'published') {
      throw Object.assign(new Error('Published report cards cannot be approved again.'), {
        statusCode: 400,
      });
    }
    settings.academics.report_card_workflow[reportCardId] = {
      ...currentWorkflow,
      report_card_id: reportCardId,
      status: 'approved',
      approved_by: actor.id,
      approved_at: now,
      approval_note: note || null,
    };
  } else if (action === 'publish') {
    if (!canManageReportCardStage({ actor, stage: 'publish' })) {
      throw Object.assign(new Error('You do not have permission to publish report cards.'), {
        statusCode: 403,
      });
    }
    if (!currentWorkflow.approved_at) {
      throw Object.assign(new Error('Approve the report card before publishing.'), {
        statusCode: 400,
      });
    }
    if (reportCard.is_published) {
      throw Object.assign(new Error('This report card is already published.'), { statusCode: 400 });
    }

    reportCard.is_published = true;
    reportCard.published_at = new Date().toISOString();
    settings.academics.report_card_workflow[reportCardId] = {
      ...currentWorkflow,
      report_card_id: reportCardId,
      status: 'published',
      published_by: actor.id,
      published_at: now,
      publish_note: note || null,
    };
  } else {
    throw Object.assign(new Error('Unsupported report card action.'), { statusCode: 400 });
  }

  store.settingsByInstitution[institutionId] = settings;
  await logAudit({
    userId: actor.id,
    action: 'UPDATE',
    resourceType: 'report_card_workflow',
    resourceId: reportCardId,
    newValues: {
      action,
      workflow: settings.academics.report_card_workflow[reportCardId],
    },
    ip,
  });
  await analyticsService.invalidateAnalyticsCache(institutionId);
  return serializeReportCard({
    reportCard: {
      ...reportCard,
      student: reportCard.student_name || reportCard.student || 'Student',
      term_name: reportCard.term || reportCard.term_name || 'Academic Term',
    },
    workflow: settings.academics.report_card_workflow[reportCardId],
  });
};

const transitionReportCardWorkflow = async (context) => {
  if (models.ReportCard && models.Institution && sequelize?.transaction) {
    return transitionReportCardWorkflowInDatabase(context);
  }
  return transitionReportCardWorkflowInRuntime(context);
};

const getRanking = async ({ className }) =>
  store.academics.reportCards
    .filter((item) => item.class_name === className)
    .sort((a, b) => b.overall_average - a.overall_average)
    .map((item, index) => ({ ...item, rank: index + 1 }));

module.exports = {
  listAcademicStructure,
  createAcademicGroup,
  updateAcademicGroup,
  deleteAcademicGroup,
  createAcademicPeriod,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  createAcademicOffering,
  updateAcademicOffering,
  deleteAcademicOffering,
  listAssessments,
  listGradeScales,
  updateGradeScale,
  getGradebook,
  calculateGrade,
  saveScores,
  transitionReportCardWorkflow,
  publishReportCard,
  getReportCards,
  getRanking,
};
