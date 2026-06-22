const { models, sequelize } = require('../../config/database');
const { Op } = require('sequelize');
const { hashPassword } = require('../../shared/helpers/auth');
const { logAudit } = require('../../shared/services/audit-log.service');
const { getLevelConfig } = require('../../shared/services/level-config.service');
const { store } = require('../../shared/store/runtime-store');
const { getPlan, plans } = require('../../shared/services/subscription-plan.service');
const {
  buildTenantDatabaseConfig,
  getClusterMetadata,
  provisionTenantDatabase,
} = require('../../shared/services/tenant-cluster.service');
const {
  ensurePlatformInstitution,
  platformUserDatabaseReady,
  resolvePlatformUsername,
} = require('../../shared/services/platform-user.service');

const levelLabels = {
  DC: 'Daycare',
  PR: 'Primary',
  JH: 'Junior High',
  SH: 'Senior High',
  TR: 'Tertiary',
};

const databaseReady = () =>
  Boolean(
    models.Institution &&
      models.User &&
      models.Student &&
      models.EducationLevel &&
      models.AcademicYear &&
      sequelize?.transaction
  );

const requirePassword = (value, fieldLabel) => {
  if (!String(value || '').trim()) {
    throw Object.assign(new Error(`${fieldLabel} is required.`), { statusCode: 400 });
  }
};

const resolveLevelModules = (educationLevels = []) => [
  ...new Set(educationLevels.flatMap((level) => getLevelConfig(level)?.modules || [])),
];

const resolveWorkspaceProfile = (educationLevels = []) => {
  const normalized = [...new Set(educationLevels)];
  if (normalized.length === 1 && normalized[0] === 'TR') {
    return 'tertiary';
  }
  if (normalized.includes('DC') && normalized.includes('PR') && normalized.length <= 2) {
    return 'daycare_primary';
  }
  if (normalized.includes('PR') || normalized.includes('JH') || normalized.includes('SH')) {
    return 'basic_secondary';
  }
  return 'mixed';
};

const getDefaultAcademicYearWindow = () => {
  const today = new Date();
  const year = today.getFullYear();
  return {
    name: `${year}/${year + 1}`,
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
  };
};

const getDefaultProgressionRules = (educationLevels = []) => {
  const rules = [
    'Students only see courses or subjects assigned to their class or level.',
    'Registration opens only for the active term, semester, trimester, or block.',
  ];

  if (educationLevels.includes('TR')) {
    rules.push('Tertiary students can only register courses in their current semester after clearing prerequisites.');
    rules.push('Outstanding resits block forward registration until the carry-over load is cleared.');
  }

  if (educationLevels.some((level) => ['PR', 'JH', 'SH'].includes(level))) {
    rules.push('Promotion uses class performance and completed term records for the selected academic year.');
  }

  return rules;
};

const buildInstitutionSettings = ({ educationLevels, tenantDatabase, plan }) => {
  const levelModules = resolveLevelModules(educationLevels);
  return {
    tenant_database: tenantDatabase,
    workspace_profile: {
      label: resolveWorkspaceProfile(educationLevels),
      menus: levelModules,
    },
    lifecycle: {
      status: 'active',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    metrics: {
      monthly_revenue: 0,
    },
    academics: {
      groups: [],
      periods: [],
      offerings: [],
      progression_rules: getDefaultProgressionRules(educationLevels),
    },
    admissions: {
      student_profiles: [],
    },
    tertiary: {
      faculties: [],
      departments: [],
      programs: [],
      student_progress: [],
      registrations: [],
      transcripts: [],
      progression: educationLevels.includes('TR')
        ? [
            'Students register from their current level and semester only.',
            'Failed prerequisite courses remain as carry-overs before progression.',
            'Program roadmap determines the next available semester courses.',
          ]
        : [],
      credentials: plan.key === 'enterprise'
        ? ['Certificate', 'Diploma', 'Degree', 'Masters', 'PhD']
        : ['Certificate', 'Diploma', 'Degree'],
      id_format: 'FAC/DEPT/YEAR/SEQ',
    },
  };
};

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const serializeInstitution = ({ institution, activeStudents = 0, activeStaff = 0 }) => {
  const settings = cloneSettings(institution.settings);
  const lifecycle = settings.lifecycle || {};

  return {
    id: institution.id,
    name: institution.name,
    code: institution.code,
    education_levels: institution.education_levels || [],
    subscription_plan: institution.subscription_plan,
    status: lifecycle.status || (institution.is_active ? 'active' : 'suspended'),
    trial_ends_at: lifecycle.trial_ends_at || null,
    monthly_revenue: Number(settings.metrics?.monthly_revenue || 0),
    active_students: Number(activeStudents || 0),
    active_staff: Number(activeStaff || 0),
    modules_enabled:
      settings.workspace_profile?.menus ||
      (getPlan(institution.subscription_plan)?.modules === 'all'
        ? 'all'
        : getPlan(institution.subscription_plan)?.modules || []),
    settings,
    created_at: institution.created_at,
    stats: {
      students: Number(activeStudents || 0),
      staff: Number(activeStaff || 0),
      monthly_revenue: Number(settings.metrics?.monthly_revenue || 0),
    },
    cluster: getClusterMetadata(),
    tenant_database: settings.tenant_database,
  };
};

const appendAudit = (entry) => {
  store.platform.auditLogs.unshift({
    id: `plat-audit-${String(store.platform.auditLogs.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
    ...entry,
  });
};

const ensureEducationLevels = async ({ institutionId, educationLevels, transaction }) => {
  const existing = await models.EducationLevel.findAll({
    where: { institution_id: institutionId },
    transaction,
  });
  const existingCodes = new Set(existing.map((item) => item.level_code));
  const rows = educationLevels
    .filter((levelCode) => !existingCodes.has(levelCode))
    .map((levelCode) => ({
      institution_id: institutionId,
      level_code: levelCode,
      level_name: levelLabels[levelCode] || levelCode,
      age_min: getLevelConfig(levelCode)?.ageMin || null,
      age_max: getLevelConfig(levelCode)?.ageMax || null,
    }));

  if (rows.length) {
    await models.EducationLevel.bulkCreate(rows, { transaction });
  }
};

const ensureCurrentAcademicYear = async ({ institutionId, transaction }) => {
  const current = await models.AcademicYear.findOne({
    where: { institution_id: institutionId, is_current: true },
    transaction,
  });
  if (current) {
    return current;
  }

  const window = getDefaultAcademicYearWindow();
  return models.AcademicYear.create(
    {
      institution_id: institutionId,
      name: window.name,
      start_date: window.start_date,
      end_date: window.end_date,
      is_current: true,
    },
    { transaction }
  );
};

const listInstitutionsFromDatabase = async () => {
  const institutions = await models.Institution.findAll({
    order: [['created_at', 'DESC']],
  });

  const rows = await Promise.all(
    institutions.map(async (institution) => {
      const [activeStudents, activeStaff] = await Promise.all([
        models.Student.count({ where: { institution_id: institution.id, status: 'active' } }),
        models.User.count({
          where: {
            institution_id: institution.id,
            role: { [Op.in]: ['institution_admin', 'teacher'] },
            is_active: true,
          },
        }),
      ]);

      return serializeInstitution({ institution, activeStudents, activeStaff });
    })
  );

  return rows;
};

const listInstitutionsFromRuntime = async () =>
  store.platform.institutions.map((institution) => ({
    ...institution,
    stats: {
      students: institution.active_students,
      staff: institution.active_staff,
      monthly_revenue: institution.monthly_revenue,
    },
    cluster: store.platform.cluster,
    tenant_database: institution.settings?.tenant_database,
  }));

const listInstitutions = async () => {
  if (databaseReady()) {
    return listInstitutionsFromDatabase();
  }

  return listInstitutionsFromRuntime();
};

const getInstitutionDetailFromDatabase = async (institutionId) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const [activeStudents, activeStaff] = await Promise.all([
    models.Student.count({ where: { institution_id: institution.id, status: 'active' } }),
    models.User.count({
      where: {
        institution_id: institution.id,
        role: { [Op.in]: ['institution_admin', 'teacher'] },
        is_active: true,
      },
    }),
  ]);

  return {
    ...serializeInstitution({ institution, activeStudents, activeStaff }),
    usage: {
      active_students: activeStudents,
      active_staff: activeStaff,
      monthly_revenue: Number(institution.settings?.metrics?.monthly_revenue || 0),
      plan: getPlan(institution.subscription_plan),
    },
  };
};

const getInstitutionDetailFromRuntime = async (institutionId) => {
  const institution = store.platform.institutions.find((item) => item.id === institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  return {
    ...institution,
    cluster: store.platform.cluster,
    usage: {
      active_students: institution.active_students,
      active_staff: institution.active_staff,
      monthly_revenue: institution.monthly_revenue,
      plan: getPlan(institution.subscription_plan),
    },
  };
};

const getInstitutionDetail = async (institutionId) => {
  if (databaseReady()) {
    return getInstitutionDetailFromDatabase(institutionId);
  }

  return getInstitutionDetailFromRuntime(institutionId);
};

const onboardInstitutionInDatabase = async ({ payload, userId, ip }) => {
  const plan = getPlan(payload.subscription_plan);
  const educationLevels = [...new Set((payload.education_levels || []).map((item) => String(item).toUpperCase()))];
  const tenantDatabase =
    process.env.NODE_ENV === 'test'
      ? buildTenantDatabaseConfig({ code: payload.code, name: payload.name })
      : await provisionTenantDatabase({ code: payload.code, name: payload.name });

  const code = String(payload.code || '').trim().toUpperCase();
  const email = String(payload.admin_email || '').trim().toLowerCase();
  const transaction = await sequelize.transaction();

  try {
    const existingInstitution = await models.Institution.findOne({
      where: { code },
      transaction,
    });
    if (existingInstitution) {
      throw Object.assign(new Error('An institution with this code already exists.'), {
        statusCode: 409,
      });
    }

    const settings = buildInstitutionSettings({ educationLevels, tenantDatabase, plan });
    if (payload.trial_ends_at) {
      settings.lifecycle.trial_ends_at = payload.trial_ends_at;
    }

    const institution = await models.Institution.create(
      {
        name: payload.name,
        code,
        education_levels: educationLevels,
        subscription_plan: plan.key,
        is_active: true,
        settings,
      },
      { transaction }
    );

    await ensureEducationLevels({
      institutionId: institution.id,
      educationLevels,
      transaction,
    });
    await ensureCurrentAcademicYear({ institutionId: institution.id, transaction });

    const adminUser = await models.User.create(
      {
        institution_id: institution.id,
        email,
        password_hash: await hashPassword(payload.admin_password),
        role: 'institution_admin',
        first_name: payload.admin_first_name,
        last_name: payload.admin_last_name,
        is_active: true,
      },
      { transaction }
    );

    await transaction.commit();

    const serializedInstitution = serializeInstitution({
      institution,
      activeStudents: 0,
      activeStaff: 1,
    });

    await logAudit({
      userId,
      action: 'CREATE',
      resourceType: 'platform_institution',
      resourceId: institution.id,
      newValues: {
        institution: serializedInstitution,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          first_name: adminUser.first_name,
          last_name: adminUser.last_name,
          password_hash: 'redacted',
        },
      },
      ip,
    });

    return {
      cluster: getClusterMetadata(),
      institution: serializedInstitution,
      admin_user: {
        id: adminUser.id,
        institution_id: adminUser.institution_id,
        email: adminUser.email,
        role: adminUser.role,
        first_name: adminUser.first_name,
        last_name: adminUser.last_name,
        education_levels: educationLevels,
        workspace_profile: settings.workspace_profile.label,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const onboardInstitutionInRuntime = async ({ payload, userId, ip }) => {
  requirePassword(payload.admin_password, 'Admin temporary password');
  const nextInstitutionId = `inst-${String(store.platform.institutions.length + 1).padStart(3, '0')}`;
  const plan = getPlan(payload.subscription_plan);
  const educationLevels = (payload.education_levels || []).map((item) => String(item).toUpperCase());
  const levelModules = resolveLevelModules(educationLevels);
  const tenantDatabase =
    process.env.NODE_ENV === 'test'
      ? buildTenantDatabaseConfig({ code: payload.code, name: payload.name })
      : await provisionTenantDatabase({ code: payload.code, name: payload.name });
  const institution = {
    id: nextInstitutionId,
    name: payload.name,
    code: payload.code,
    education_levels: educationLevels,
    subscription_plan: plan.key,
    status: 'active',
    trial_ends_at:
      payload.trial_ends_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    monthly_revenue: 0,
    active_students: 0,
    active_staff: 1,
    modules_enabled:
      plan.modules === 'all' ? 'all' : [...new Set([...(plan.modules || []), ...levelModules])],
    settings: {
      tenant_database: tenantDatabase,
      workspace_profile: {
        label: resolveWorkspaceProfile(educationLevels),
        menus: levelModules,
      },
    },
    created_at: new Date().toISOString(),
  };

  const adminUser = {
    id: `usr-sa-${String(store.platform.institutions.length + 1).padStart(3, '0')}`,
    institution_id: nextInstitutionId,
    email: payload.admin_email,
    role: 'institution_admin',
    first_name: payload.admin_first_name,
    last_name: payload.admin_last_name,
    password_hash: await hashPassword(payload.admin_password),
    workspace_profile: institution.settings.workspace_profile.label,
    education_levels: educationLevels,
  };

  store.platform.institutions.push(institution);
  appendAudit({
    action: 'CREATE',
    resource_type: 'institution',
    resource_id: nextInstitutionId,
    actor_name: 'Super Admin',
    actor_role: 'super_admin',
    summary: `Onboarded ${payload.name}`,
  });

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'platform_institution',
    resourceId: nextInstitutionId,
    newValues: { institution, adminUser: { ...adminUser, password_hash: 'redacted' } },
    ip,
  });

  return {
    cluster: getClusterMetadata(),
    institution,
    admin_user: { ...adminUser, password_hash: undefined },
  };
};

const onboardInstitution = async (context) => {
  requirePassword(context.payload?.admin_password, 'Admin temporary password');
  if (databaseReady()) {
    return onboardInstitutionInDatabase(context);
  }

  return onboardInstitutionInRuntime(context);
};

const suspendInstitutionFromDatabase = async ({ institutionId, userId, ip }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = cloneSettings(institution.settings);
  settings.lifecycle = {
    ...(settings.lifecycle || {}),
    status: 'suspended',
  };

  await institution.update({ is_active: false, settings });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'platform_institution',
    resourceId: institutionId,
    newValues: serializeInstitution({ institution, activeStudents: 0, activeStaff: 0 }),
    ip,
  });

  return serializeInstitution({ institution, activeStudents: 0, activeStaff: 0 });
};

const suspendInstitutionFromRuntime = async ({ institutionId, userId, ip }) => {
  const institution = store.platform.institutions.find((item) => item.id === institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  institution.status = 'suspended';
  appendAudit({
    action: 'UPDATE',
    resource_type: 'institution',
    resource_id: institutionId,
    actor_name: 'Super Admin',
    actor_role: 'super_admin',
    summary: `Suspended ${institution.name}`,
  });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'platform_institution',
    resourceId: institutionId,
    newValues: institution,
    ip,
  });

  return institution;
};

const suspendInstitution = async (context) => {
  if (databaseReady()) {
    return suspendInstitutionFromDatabase(context);
  }

  return suspendInstitutionFromRuntime(context);
};

const extendTrialFromDatabase = async ({ institutionId, days = 14, userId, ip }) => {
  const institution = await models.Institution.findByPk(institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const settings = cloneSettings(institution.settings);
  const current = settings.lifecycle?.trial_ends_at
    ? new Date(settings.lifecycle.trial_ends_at)
    : new Date();
  current.setDate(current.getDate() + Number(days));

  settings.lifecycle = {
    ...(settings.lifecycle || {}),
    status: 'trial',
    trial_ends_at: current.toISOString(),
  };

  await institution.update({ settings, is_active: true });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'platform_institution_trial',
    resourceId: institutionId,
    newValues: serializeInstitution({ institution, activeStudents: 0, activeStaff: 0 }),
    ip,
  });

  return serializeInstitution({ institution, activeStudents: 0, activeStaff: 0 });
};

const extendTrialFromRuntime = async ({ institutionId, days = 14, userId, ip }) => {
  const institution = store.platform.institutions.find((item) => item.id === institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  const current = new Date(institution.trial_ends_at);
  current.setDate(current.getDate() + Number(days));
  institution.trial_ends_at = current.toISOString();
  institution.status = 'trial';

  appendAudit({
    action: 'UPDATE',
    resource_type: 'institution_trial',
    resource_id: institutionId,
    actor_name: 'Super Admin',
    actor_role: 'super_admin',
    summary: `Extended trial for ${institution.name} by ${days} days`,
  });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'platform_institution_trial',
    resourceId: institutionId,
    newValues: institution,
    ip,
  });

  return institution;
};

const extendTrial = async (context) => {
  if (databaseReady()) {
    return extendTrialFromDatabase(context);
  }

  return extendTrialFromRuntime(context);
};

const listPlatformUsersFromDatabase = async () => {
  const platformInstitution = await ensurePlatformInstitution();
  const users = await models.User.findAll({
    where: {
      institution_id: platformInstitution.id,
      role: 'super_admin',
    },
    order: [['created_at', 'DESC']],
  });

  return users.map((user) => ({
    id: user.id,
    institution_id: user.institution_id,
    username: resolvePlatformUsername(user),
    email: user.email,
    role: 'super_admin',
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: user.is_active,
    status: user.is_active ? 'active' : 'inactive',
  }));
};

const listPlatformUsersFromRuntime = async () =>
  [store.platform.superAdmin, ...(store.platform.superAdmins || [])].map((user) => ({
    id: user.id,
    institution_id: 'platform',
    username: user.username,
    email: user.email,
    role: 'super_admin',
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: user.is_active !== false,
    status: user.is_active === false ? 'inactive' : 'active',
  }));

const listPlatformUsers = async () => {
  if (platformUserDatabaseReady() && sequelize?.transaction) {
    return listPlatformUsersFromDatabase();
  }

  return listPlatformUsersFromRuntime();
};

const createPlatformUserInDatabase = async ({ payload, userId, ip }) => {
  const username = String(payload.username || '').trim().toLowerCase();
  const email = String(payload.email || '').trim().toLowerCase();

  if (!username || !email || !payload.first_name || !payload.last_name || !payload.temporary_password) {
    throw Object.assign(new Error('Username, name, email, and temporary password are required.'), {
      statusCode: 400,
    });
  }

  const platformInstitution = await ensurePlatformInstitution();
  const duplicate = await models.User.findOne({
    where: {
      institution_id: platformInstitution.id,
      role: 'super_admin',
      [Op.or]: [{ email }, { phone: username }],
    },
  });
  if (duplicate) {
    throw Object.assign(new Error('A super admin with this username or email already exists.'), {
      statusCode: 409,
    });
  }

  const user = await models.User.create({
    institution_id: platformInstitution.id,
    email,
    phone: username,
    password_hash: await hashPassword(payload.temporary_password),
    role: 'super_admin',
    first_name: payload.first_name,
    last_name: payload.last_name,
    is_active: true,
    email_verified: true,
  });

  const response = {
    id: user.id,
    institution_id: user.institution_id,
    username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: true,
    status: 'active',
  };

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'platform_user',
    resourceId: user.id,
    newValues: {
      ...response,
      temporary_password: 'redacted',
    },
    ip,
  });

  return response;
};

const createPlatformUser = async ({ payload, userId, ip }) => {
  requirePassword(payload.temporary_password, 'Temporary password');

  if (platformUserDatabaseReady() && sequelize?.transaction) {
    return createPlatformUserInDatabase({ payload, userId, ip });
  }

  const username = String(payload.username || '').trim().toLowerCase();
  const email = String(payload.email || '').trim().toLowerCase();

  if (!username || !email || !payload.first_name || !payload.last_name || !payload.temporary_password) {
    throw Object.assign(new Error('Username, name, email, and temporary password are required.'), {
      statusCode: 400,
    });
  }

  const allUsers = [store.platform.superAdmin, ...(store.platform.superAdmins || [])];
  const duplicate = allUsers.find(
    (user) => user.username === username || String(user.email || '').toLowerCase() === email
  );
  if (duplicate) {
    throw Object.assign(new Error('A super admin with this username or email already exists.'), {
      statusCode: 409,
    });
  }

  const record = {
    id: `usr-super-${String((store.platform.superAdmins || []).length + 1).padStart(3, '0')}`,
    institution_id: 'platform',
    username,
    email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    role: 'super_admin',
    password_hash: await hashPassword(payload.temporary_password),
    is_active: true,
  };

  store.platform.superAdmins = store.platform.superAdmins || [];
  store.platform.superAdmins.unshift(record);
  appendAudit({
    action: 'CREATE',
    resource_type: 'platform_user',
    resource_id: record.id,
    actor_name: 'Super Admin',
    actor_role: 'super_admin',
    summary: `Created platform user ${record.username}`,
  });

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'platform_user',
    resourceId: record.id,
    newValues: {
      ...record,
      password_hash: 'redacted',
    },
    ip,
  });

  return {
    id: record.id,
    institution_id: 'platform',
    username: record.username,
    email: record.email,
    role: record.role,
    first_name: record.first_name,
    last_name: record.last_name,
    is_active: true,
    status: 'active',
  };
};

const getPlatformAnalyticsFromDatabase = async () => {
  const institutions = await listInstitutionsFromDatabase();
  const totals = institutions.reduce(
    (accumulator, institution) => {
      accumulator.students += institution.active_students || 0;
      accumulator.revenue += institution.monthly_revenue || 0;
      return accumulator;
    },
    { students: 0, revenue: 0 }
  );

  return {
    total_schools: institutions.length,
    active_schools: institutions.filter((institution) => institution.status === 'active').length,
    trial_schools: institutions.filter((institution) => institution.status === 'trial').length,
    total_students: totals.students,
    monthly_recurring_revenue: totals.revenue,
    churn_rate: 1.2,
    monthly_active_users: totals.students + institutions.reduce((sum, item) => sum + item.active_staff, 0),
    growth_rate: 14.8,
    plans,
    cluster: getClusterMetadata(),
  };
};

const getPlatformAnalyticsFromRuntime = async () => {
  const institutions = store.platform.institutions;
  const totals = institutions.reduce(
    (accumulator, institution) => {
      accumulator.students += institution.active_students || 0;
      accumulator.revenue += institution.monthly_revenue || 0;
      return accumulator;
    },
    { students: 0, revenue: 0 }
  );

  const activeSchools = institutions.filter((institution) => institution.status === 'active').length;
  const trialSchools = institutions.filter((institution) => institution.status === 'trial').length;

  return {
    total_schools: institutions.length,
    active_schools: activeSchools,
    trial_schools: trialSchools,
    total_students: totals.students,
    monthly_recurring_revenue: totals.revenue,
    churn_rate: 1.2,
    monthly_active_users: 2840,
    growth_rate: 14.8,
    plans,
    cluster: getClusterMetadata(),
  };
};

const getPlatformAnalytics = async () => {
  if (databaseReady()) {
    return getPlatformAnalyticsFromDatabase();
  }

  return getPlatformAnalyticsFromRuntime();
};

const getPlatformAuditLogs = async ({ action, resourceType }) => {
  if (models.AuditLog) {
    const where = {};
    if (action) {
      where.action = action;
    }
    if (resourceType) {
      where.resource_type = resourceType;
    }

    return models.AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200,
    });
  }

  return store.platform.auditLogs.filter((entry) => {
    if (action && entry.action !== action) {
      return false;
    }
    if (resourceType && entry.resource_type !== resourceType) {
      return false;
    }
    return true;
  });
};

module.exports = {
  listInstitutions,
  getInstitutionDetail,
  onboardInstitution,
  suspendInstitution,
  extendTrial,
  listPlatformUsers,
  createPlatformUser,
  getPlatformAnalytics,
  getPlatformAuditLogs,
};
