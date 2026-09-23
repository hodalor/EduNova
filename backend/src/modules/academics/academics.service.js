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

const normalizeCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

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
    await destroyIfExists(models.TermSemester, period.term_semester_id, { transaction });

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
    const nextCode = normalizeCode(payload.code ?? current.code);
    if (
      settings.academics.offerings.some(
        (item, index) =>
          index !== offeringIndex &&
          item.group_id === current.group_id &&
          item.period_id === current.period_id &&
          normalizeCode(item.code) === nextCode
      )
    ) {
      throw Object.assign(
        new Error('A subject or course with this code already exists in the selected period.'),
        { statusCode: 409 }
      );
    }

    const updated = {
      ...current,
      code: nextCode,
      name: payload.name || current.name,
      credit_hours:
        payload.credit_hours === '' || payload.credit_hours === undefined
          ? current.credit_hours
          : payload.credit_hours === null
            ? null
            : Number(payload.credit_hours),
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
  const updated = {
    ...current,
    code: normalizeCode(payload.code ?? current.code),
    name: payload.name || current.name,
    credit_hours:
      payload.credit_hours === '' || payload.credit_hours === undefined
        ? current.credit_hours
        : payload.credit_hours === null
          ? null
          : Number(payload.credit_hours),
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
  updateAcademicGroup,
  deleteAcademicGroup,
  createAcademicPeriod,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  createAcademicOffering,
  updateAcademicOffering,
  deleteAcademicOffering,
  calculateGrade,
  saveScores,
  publishReportCard,
  getReportCards,
  getRanking,
};
