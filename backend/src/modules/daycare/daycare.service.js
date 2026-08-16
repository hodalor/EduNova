const crypto = require('crypto');

const { models, sequelize } = require('../../config/database');
const { logAudit } = require('../../shared/services/audit-log.service');
const { getLevelConfig, requireLevelConfig } = require('../../shared/services/level-config.service');
const { store } = require('../../shared/store/runtime-store');

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const databaseReady = () =>
  Boolean(
    models?.Institution &&
      models?.EducationLevel &&
      models?.AcademicYear &&
      models?.Class &&
      sequelize?.transaction
  );

const ensureDaycareSettings = (settings) => {
  const next = cloneSettings(settings);
  next.daycare = next.daycare || {};
  next.daycare.session_model = next.daycare.session_model || 'fullDay';
  next.daycare.pickup_pin_required = Boolean(next.daycare.pickup_pin_required);
  next.daycare.policies = next.daycare.policies || [];
  next.daycare.milestone_bands = next.daycare.milestone_bands || [];
  next.academics = next.academics || {};
  next.academics.groups = next.academics.groups || [];
  next.academics.periods = next.academics.periods || [];
  next.academics.offerings = next.academics.offerings || [];
  return next;
};

const ensureLevelRecord = async ({ institutionId, transaction }) => {
  let level = await models.EducationLevel.findOne({
    where: { institution_id: institutionId, level_code: 'DC' },
    transaction,
  });
  if (!level) {
    const config = getLevelConfig('DC') || {};
    level = await models.EducationLevel.create(
      {
        institution_id: institutionId,
        level_code: 'DC',
        level_name: 'Daycare',
        age_min: config.ageMin || 0,
        age_max: config.ageMax || 5,
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

const getDaycareClassesFromSettings = (settings) =>
  (settings?.academics?.groups || []).filter((g) => g.level_code === 'DC');

const listPresentNow = async ({ institutionId }) =>
  store.daycare.presentNow.filter((item) => item.institution_id === institutionId);

const getOverview = async ({ institutionId }) => {
  let pickupPolicies = [];
  let milestones = [];
  let classes = [];
  let sessionModel = 'fullDay';
  let pickupPinRequired = false;

  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (institution) {
      const settings = ensureDaycareSettings(institution.settings);
      pickupPolicies = settings.daycare.policies;
      milestones = settings.daycare.milestone_bands.map((m) => ({
        id: m.id,
        ageBand: String(m.age_band || m.ageBand || ''),
        focus: String(m.focus || m.description || ''),
      }));
      classes = getDaycareClassesFromSettings(settings);
      sessionModel = settings.daycare.session_model;
      pickupPinRequired = Boolean(settings.daycare.pickup_pin_required);
    }
  } else {
    pickupPolicies = store.daycare.policies.filter((p) => p.institution_id === institutionId).map((p) => p.body);
    milestones = store.daycare.milestoneBands
      .filter((m) => m.institution_id === institutionId)
      .map((m) => ({ id: m.id, ageBand: m.age_band, focus: m.focus }));
    classes = store.academics.structure.groups.filter(
      (g) => g.institution_id === institutionId && g.level_code === 'DC'
    );
  }

  return {
    presentNow: await listPresentNow({ institutionId }),
    classes,
    pickupPolicies,
    milestones,
    sessionModel,
    pickupPinRequired,
  };
};

const createClass = async ({ institutionId, userId, payload, ip }) => {
  requireLevelConfig('DC');

  if (databaseReady()) {
    const transaction = await sequelize.transaction();
    try {
      const institution = await models.Institution.findByPk(institutionId, { transaction });
      if (!institution) {
        throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
      }

      const settings = ensureDaycareSettings(institution.settings);
      const normalizedCode = String(payload.code || '').trim().toUpperCase();
      const duplicate = settings.academics.groups.find((item) => item.code === normalizedCode);
      if (duplicate) {
        throw Object.assign(new Error('A daycare class with this code already exists.'), {
          statusCode: 409,
        });
      }

      const levelRecord = await ensureLevelRecord({ institutionId, transaction });
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

      const group = {
        id: crypto.randomUUID(),
        institution_id: institutionId,
        name: payload.name,
        code: normalizedCode,
        group_type: 'class',
        level_code: 'DC',
        calendar_type: payload.calendar_type || 'term',
        level_record_id: levelRecord.id,
        class_record_id: classRecord.id,
        academic_year_id: academicYear.id,
        age_min: payload.age_min === '' || payload.age_min == null ? null : Number(payload.age_min),
        age_max: payload.age_max === '' || payload.age_max == null ? null : Number(payload.age_max),
        capacity: classRecord.capacity,
      };

      settings.academics.groups.push(group);
      await institution.update({ settings }, { transaction });
      await transaction.commit();

      await logAudit({
        userId,
        action: 'CREATE',
        resourceType: 'daycare_class',
        resourceId: group.id,
        newValues: group,
        ip,
      });
      return group;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const group = {
    id: `grp-${store.academics.structure.groups.length + 1}`,
    institution_id: institutionId,
    name: payload.name,
    code: payload.code,
    group_type: 'class',
    level_code: 'DC',
    calendar_type: payload.calendar_type || 'term',
    age_min: payload.age_min == null ? null : Number(payload.age_min),
    age_max: payload.age_max == null ? null : Number(payload.age_max),
    capacity: payload.capacity == null ? null : Number(payload.capacity),
  };
  store.academics.structure.groups.push(group);
  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_class',
    resourceId: group.id,
    newValues: group,
    ip,
  });
  return group;
};

const updateClass = async ({ institutionId, userId, classId, payload, ip }) => {
  if (databaseReady()) {
    const transaction = await sequelize.transaction();
    try {
      const institution = await models.Institution.findByPk(institutionId, { transaction });
      if (!institution) {
        throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
      }
      const settings = ensureDaycareSettings(institution.settings);
      const group = settings.academics.groups.find(
        (g) => g.id === classId && g.level_code === 'DC'
      );
      if (!group) {
        throw Object.assign(new Error('Daycare class not found.'), { statusCode: 404 });
      }
      const previous = cloneSettings(group);

      if (payload.name) group.name = payload.name;
      if (payload.code) group.code = String(payload.code).trim().toUpperCase();
      if (payload.capacity !== undefined) group.capacity = Number(payload.capacity) || null;
      if (payload.age_min !== undefined) group.age_min = Number(payload.age_min) || null;
      if (payload.age_max !== undefined) group.age_max = Number(payload.age_max) || null;

      if (group.class_record_id && models.Class) {
        const classRecord = await models.Class.findByPk(group.class_record_id, { transaction });
        if (classRecord) {
          const patch = {};
          if (payload.name) patch.name = payload.name;
          if (payload.capacity !== undefined) patch.capacity = group.capacity;
          if (Object.keys(patch).length) {
            await classRecord.update(patch, { transaction });
          }
        }
      }

      await institution.update({ settings }, { transaction });
      await transaction.commit();
      await logAudit({
        userId,
        action: 'UPDATE',
        resourceType: 'daycare_class',
        resourceId: group.id,
        previousValues: previous,
        newValues: group,
        ip,
      });
      return group;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const group = store.academics.structure.groups.find(
    (g) => g.id === classId && g.institution_id === institutionId && g.level_code === 'DC'
  );
  if (!group) {
    throw Object.assign(new Error('Daycare class not found.'), { statusCode: 404 });
  }
  const previous = { ...group };
  if (payload.name) group.name = payload.name;
  if (payload.code) group.code = payload.code;
  if (payload.capacity !== undefined) group.capacity = Number(payload.capacity) || null;
  if (payload.age_min !== undefined) group.age_min = Number(payload.age_min) || null;
  if (payload.age_max !== undefined) group.age_max = Number(payload.age_max) || null;
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'daycare_class',
    resourceId: group.id,
    previousValues: previous,
    newValues: group,
    ip,
  });
  return group;
};

const deleteClass = async ({ institutionId, userId, classId, ip }) => {
  if (databaseReady()) {
    const transaction = await sequelize.transaction();
    try {
      const institution = await models.Institution.findByPk(institutionId, { transaction });
      if (!institution) {
        throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
      }
      const settings = ensureDaycareSettings(institution.settings);
      const idx = settings.academics.groups.findIndex(
        (g) => g.id === classId && g.level_code === 'DC'
      );
      if (idx < 0) {
        throw Object.assign(new Error('Daycare class not found.'), { statusCode: 404 });
      }
      const [removed] = settings.academics.groups.splice(idx, 1);
      if (removed.class_record_id && models.Class) {
        await models.Class.destroy({ where: { id: removed.class_record_id }, transaction });
      }
      await institution.update({ settings }, { transaction });
      await transaction.commit();
      await logAudit({
        userId,
        action: 'DELETE',
        resourceType: 'daycare_class',
        resourceId: classId,
        previousValues: removed,
        ip,
      });
      return { ok: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const idx = store.academics.structure.groups.findIndex(
    (g) => g.id === classId && g.institution_id === institutionId && g.level_code === 'DC'
  );
  if (idx < 0) {
    throw Object.assign(new Error('Daycare class not found.'), { statusCode: 404 });
  }
  const [removed] = store.academics.structure.groups.splice(idx, 1);
  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'daycare_class',
    resourceId: classId,
    previousValues: removed,
    ip,
  });
  return { ok: true };
};

const createPolicy = async ({ institutionId, userId, payload, ip }) => {
  const body = String(payload.body || '').trim();
  if (!body) {
    throw Object.assign(new Error('Policy text is required.'), { statusCode: 400 });
  }
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureDaycareSettings(institution.settings);
    settings.daycare.policies = [...settings.daycare.policies, body];
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'daycare_policy',
      resourceId: `policy-${settings.daycare.policies.length}`,
      newValues: { body },
      ip,
    });
    return { body };
  }
  const policy = {
    id: `dc-pol-${store.daycare.policies.length + 1}`,
    institution_id: institutionId,
    body,
  };
  store.daycare.policies.push(policy);
  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_policy',
    resourceId: policy.id,
    newValues: policy,
    ip,
  });
  return { body };
};

const deletePolicy = async ({ institutionId, userId, index, ip }) => {
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureDaycareSettings(institution.settings);
    const removed = settings.daycare.policies.splice(Number(index), 1);
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'DELETE',
      resourceType: 'daycare_policy',
      resourceId: `policy-${index}`,
      previousValues: removed,
      ip,
    });
    return { ok: true };
  }
  const filtered = store.daycare.policies.filter((p) => p.institution_id === institutionId);
  const target = filtered[Number(index)];
  if (!target) {
    throw Object.assign(new Error('Policy not found.'), { statusCode: 404 });
  }
  store.daycare.policies = store.daycare.policies.filter((p) => p.id !== target.id);
  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'daycare_policy',
    resourceId: target.id,
    previousValues: target,
    ip,
  });
  return { ok: true };
};

const createMilestoneBand = async ({ institutionId, userId, payload, ip }) => {
  const ageBand = String(payload.age_band || payload.ageBand || '').trim();
  const focus = String(payload.focus || '').trim();
  if (!ageBand || !focus) {
    throw Object.assign(new Error('Age band and focus are required.'), { statusCode: 400 });
  }
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureDaycareSettings(institution.settings);
    const record = { id: crypto.randomUUID(), age_band: ageBand, focus };
    settings.daycare.milestone_bands = [...settings.daycare.milestone_bands, record];
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'daycare_milestone_band',
      resourceId: record.id,
      newValues: record,
      ip,
    });
    return record;
  }
  const record = {
    id: `mb-${store.daycare.milestoneBands.length + 1}`,
    institution_id: institutionId,
    age_band: ageBand,
    focus,
  };
  store.daycare.milestoneBands.push(record);
  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_milestone_band',
    resourceId: record.id,
    newValues: record,
    ip,
  });
  return record;
};

const deleteMilestoneBand = async ({ institutionId, userId, id, ip }) => {
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureDaycareSettings(institution.settings);
    const idx = settings.daycare.milestone_bands.findIndex((m) => m.id === id);
    if (idx < 0) {
      throw Object.assign(new Error('Milestone band not found.'), { statusCode: 404 });
    }
    const [removed] = settings.daycare.milestone_bands.splice(idx, 1);
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'DELETE',
      resourceType: 'daycare_milestone_band',
      resourceId: id,
      previousValues: removed,
      ip,
    });
    return { ok: true };
  }
  const idx = store.daycare.milestoneBands.findIndex(
    (m) => m.id === id && m.institution_id === institutionId
  );
  if (idx < 0) {
    throw Object.assign(new Error('Milestone band not found.'), { statusCode: 404 });
  }
  const [removed] = store.daycare.milestoneBands.splice(idx, 1);
  await logAudit({
    userId,
    action: 'DELETE',
    resourceType: 'daycare_milestone_band',
    resourceId: id,
    previousValues: removed,
    ip,
  });
  return { ok: true };
};

const updateSettings = async ({ institutionId, userId, payload, ip }) => {
  if (databaseReady()) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const settings = ensureDaycareSettings(institution.settings);
    const previous = { daycare: { ...settings.daycare } };
    if (payload.session_model) settings.daycare.session_model = String(payload.session_model);
    if (payload.pickup_pin_required !== undefined) {
      settings.daycare.pickup_pin_required = Boolean(payload.pickup_pin_required);
    }
    await institution.update({ settings });
    await logAudit({
      userId,
      action: 'UPDATE',
      resourceType: 'daycare_settings',
      resourceId: String(institutionId),
      previousValues: previous,
      newValues: { daycare: { ...settings.daycare } },
      ip,
    });
    return {
      session_model: settings.daycare.session_model,
      pickup_pin_required: settings.daycare.pickup_pin_required,
    };
  }
  return {
    session_model: payload.session_model || 'fullDay',
    pickup_pin_required: Boolean(payload.pickup_pin_required),
  };
};

const addMilestone = async ({ institutionId, studentId, payload, userId, ip }) => {
  const current = store.daycare.milestones[studentId] || [];
  const milestone = {
    id: `mile-${current.length + 1}`,
    institution_id: institutionId,
    student_id: studentId,
    note: payload.note,
    age_group: payload.age_group || 'general',
    observed_at: payload.observed_at || new Date().toISOString(),
  };
  store.daycare.milestones[studentId] = [...current, milestone];

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_milestone',
    resourceId: milestone.id,
    newValues: milestone,
    ip,
  });

  return milestone;
};

const getMilestones = async ({ studentId }) => store.daycare.milestones[studentId] || [];

const authorizePickup = async ({ institutionId, payload, userId, ip }) => {
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const tokenId = crypto.randomUUID();
  const record = {
    id: tokenId,
    institution_id: institutionId,
    student_id: payload.student_id,
    authorized_for: payload.authorized_for,
    pin,
    expires_at: payload.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    used: false,
  };
  store.daycare.pickupPins[tokenId] = record;

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_pickup_pin',
    resourceId: tokenId,
    newValues: { ...record, pin: 'redacted' },
    ip,
  });

  return { pickup_id: tokenId, pin, expires_at: record.expires_at };
};

const verifyPickup = async ({ institutionId, payload, userId, ip }) => {
  const record = store.daycare.pickupPins[payload.pickup_id];
  if (!record || record.institution_id !== institutionId) {
    throw Object.assign(new Error('Pickup authorization not found.'), { statusCode: 404 });
  }
  if (record.used) {
    throw Object.assign(new Error('Pickup PIN has already been used.'), { statusCode: 400 });
  }
  if (record.pin !== payload.pin) {
    throw Object.assign(new Error('Invalid pickup PIN.'), { statusCode: 400 });
  }
  if (record.expires_at < new Date().toISOString()) {
    throw Object.assign(new Error('Pickup PIN has expired.'), { statusCode: 400 });
  }

  record.used = true;

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'daycare_pickup_pin',
    resourceId: record.id,
    newValues: { ...record, pin: 'redacted' },
    ip,
  });

  return { verified: true, student_id: record.student_id, authorized_for: record.authorized_for };
};

module.exports = {
  getOverview,
  listPresentNow,
  createClass,
  updateClass,
  deleteClass,
  createPolicy,
  deletePolicy,
  createMilestoneBand,
  deleteMilestoneBand,
  updateSettings,
  addMilestone,
  getMilestones,
  authorizePickup,
  verifyPickup,
};
