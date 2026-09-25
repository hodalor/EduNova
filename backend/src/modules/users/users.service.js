const { models, sequelize } = require('../../config/database');
const { getPermissionsForRole } = require('../../shared/constants/permissions');
const { hashPassword } = require('../../shared/helpers/auth');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const { Op } = require('sequelize');

const allowedRoles = ['institution_admin', 'teacher', 'accountant'];
const allowedEmploymentTypes = ['full_time', 'part_time', 'contract'];
const allowedCustomPermissions = ['finance_approve_director', 'finance_approve_accountant'];

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const ensureAccessControlSettings = (settings) => {
  const next = clone(settings);
  next.access_control = next.access_control || {};
  next.access_control.finance_approval_grants = next.access_control.finance_approval_grants || {};
  return next;
};

const normalizeCustomPermissions = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => String(item || '').trim())
        .filter((item) => allowedCustomPermissions.includes(item))
    )
  );

const getCustomPermissionsFromSettings = ({ settings, userId }) =>
  normalizeCustomPermissions(settings?.access_control?.finance_approval_grants?.[userId]);

const setCustomPermissionsInSettings = ({ settings, userId, permissions }) => {
  const normalized = normalizeCustomPermissions(permissions);
  settings.access_control.finance_approval_grants = settings.access_control.finance_approval_grants || {};
  if (normalized.length) {
    settings.access_control.finance_approval_grants[userId] = normalized;
  } else {
    delete settings.access_control.finance_approval_grants[userId];
  }
  return normalized;
};

const serializeRuntimeUser = (item) => ({
  id: item.id,
  institution_id: item.institution_id,
  email: item.email,
  phone: item.phone,
  role: item.role,
  first_name: item.first_name,
  last_name: item.last_name,
  staff_number: item.staff_number,
  department: item.department,
  designation: item.designation,
  qualification: item.qualification,
  specialization: item.specialization,
  employment_type: item.employment_type,
  date_joined: item.date_joined,
  is_active: item.is_active,
  status: item.status || (item.is_active ? 'active' : 'inactive'),
  custom_permissions: normalizeCustomPermissions(item.custom_permissions),
  permissions: getPermissionsForRole(item.role).concat(normalizeCustomPermissions(item.custom_permissions)),
});

const listUsersFromRuntime = async ({ institutionId, role }) =>
  store.users.accounts
    .filter(
      (item) =>
        item.institution_id === institutionId && (!role || item.role === role)
    )
    .map(serializeRuntimeUser);

const listUsersFromDatabase = async ({ institutionId, role }) => {
  const where = { institution_id: institutionId };
  if (role) {
    where.role = role;
  }

  const [users, institution] = await Promise.all([
    models.User.findAll({
      where,
      include: [{ model: models.Staff, as: 'staffProfile', required: false }],
      order: [['created_at', 'DESC']],
    }),
    models.Institution.findByPk(institutionId, { attributes: ['id', 'settings'] }).catch(() => null),
  ]);
  const settings = ensureAccessControlSettings(institution?.settings);

  return users
    .filter((item) => allowedRoles.includes(item.role))
    .map((user) => {
      const customPermissions = getCustomPermissionsFromSettings({
        settings,
        userId: user.id,
      });
      return {
        id: user.id,
        institution_id: user.institution_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        staff_number: user.staffProfile?.staff_number || null,
        department: user.staffProfile?.department || null,
        designation: user.staffProfile?.designation || null,
        qualification: user.staffProfile?.qualification || null,
        specialization: user.staffProfile?.specialization || null,
        employment_type: user.staffProfile?.employment_type || null,
        date_joined: user.staffProfile?.date_joined || null,
        is_active: user.is_active,
        status: user.is_active ? 'active' : 'inactive',
        custom_permissions: customPermissions,
        permissions: getPermissionsForRole(user.role).concat(customPermissions),
      };
    });
};

const listUsers = async ({ institutionId, role }) => {
  if (models.User && models.Staff) {
    return listUsersFromDatabase({ institutionId, role });
  }

  return listUsersFromRuntime({ institutionId, role });
};

const validatePayload = (payload) => {
  if (!allowedRoles.includes(payload.role)) {
    throw Object.assign(
      new Error('Only institution_admin, teacher, and accountant accounts can be created here.'),
      { statusCode: 400 }
    );
  }

  if (!allowedEmploymentTypes.includes(payload.employment_type)) {
    throw Object.assign(new Error('Invalid employment type.'), { statusCode: 400 });
  }
};

const incrementInstitutionStaffCount = (institutionId) => {
  const institution = store.platform.institutions.find((item) => item.id === institutionId);
  if (institution) {
    institution.active_staff = Number(institution.active_staff || 0) + 1;
  }
};

const createUserInRuntime = async ({ institutionId, payload, actorId, ip }) => {
  const email = String(payload.email || '').trim().toLowerCase();
  const duplicateEmail = store.users.accounts.find(
    (item) => item.institution_id === institutionId && item.email === email
  );
  if (duplicateEmail) {
    throw Object.assign(new Error('A user with this email already exists.'), { statusCode: 409 });
  }

  const duplicateStaffNumber = store.users.accounts.find(
    (item) =>
      item.institution_id === institutionId &&
      item.staff_number.toLowerCase() === String(payload.staff_number || '').trim().toLowerCase()
  );
  if (duplicateStaffNumber) {
    throw Object.assign(new Error('A user with this staff number already exists.'), {
      statusCode: 409,
    });
  }

  const account = {
    id: `usr-${String(store.users.accounts.length + 1).padStart(3, '0')}`,
    institution_id: institutionId,
    email,
    phone: payload.phone || null,
    role: payload.role,
    first_name: payload.first_name,
    last_name: payload.last_name,
    staff_number: payload.staff_number,
    department: payload.department,
    designation: payload.designation,
    qualification: payload.qualification || null,
    specialization: payload.specialization || null,
    employment_type: payload.employment_type,
    date_joined: payload.date_joined,
    is_active: true,
    status: 'active',
    custom_permissions: normalizeCustomPermissions(payload.custom_permissions),
    password_hash: await hashPassword(payload.temporary_password),
  };

  store.users.accounts.unshift(account);
  incrementInstitutionStaffCount(institutionId);

  await logAudit({
    userId: actorId,
    action: 'CREATE',
    resourceType: 'user_access',
    resourceId: account.id,
    newValues: { ...serializeRuntimeUser(account), temporary_password: 'redacted' },
    ip,
  });

  return serializeRuntimeUser(account);
};

const createUserInDatabase = async ({ institutionId, payload, actorId, ip }) => {
  const email = String(payload.email || '').trim().toLowerCase();
  const normalizedStaffNumber = String(payload.staff_number || '').trim();

  const existingUser = await models.User.findOne({
    where: { institution_id: institutionId, email },
  });
  if (existingUser) {
    throw Object.assign(new Error('A user with this email already exists.'), { statusCode: 409 });
  }

  const existingStaff = await models.Staff.findOne({
    where: { institution_id: institutionId, staff_number: normalizedStaffNumber },
  });
  if (existingStaff) {
    throw Object.assign(new Error('A user with this staff number already exists.'), {
      statusCode: 409,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const institution = await models.Institution.findByPk(institutionId, {
      attributes: ['id', 'settings'],
      transaction,
    });
    const user = await models.User.create(
      {
        institution_id: institutionId,
        email,
        phone: payload.phone || null,
        password_hash: await hashPassword(payload.temporary_password),
        role: payload.role,
        first_name: payload.first_name,
        last_name: payload.last_name,
        is_active: true,
      },
      { transaction }
    );

    const staff = await models.Staff.create(
      {
        user_id: user.id,
        institution_id: institutionId,
        staff_number: normalizedStaffNumber,
        department: payload.department,
        designation: payload.designation,
        qualification: payload.qualification || null,
        specialization: payload.specialization || null,
        employment_type: payload.employment_type,
        date_joined: payload.date_joined,
      },
      { transaction }
    );

    const settings = ensureAccessControlSettings(institution?.settings);
    const customPermissions = setCustomPermissionsInSettings({
      settings,
      userId: user.id,
      permissions: payload.custom_permissions,
    });
    if (institution) {
      await institution.update({ settings }, { transaction });
    }

    await transaction.commit();

    incrementInstitutionStaffCount(institutionId);

    const response = {
      id: user.id,
      institution_id: institutionId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      staff_number: staff.staff_number,
      department: staff.department,
      designation: staff.designation,
      qualification: staff.qualification,
      specialization: staff.specialization,
      employment_type: staff.employment_type,
      date_joined: staff.date_joined,
      is_active: user.is_active,
      status: user.is_active ? 'active' : 'inactive',
      custom_permissions: customPermissions,
      permissions: getPermissionsForRole(user.role).concat(customPermissions),
    };

    await logAudit({
      userId: actorId,
      action: 'CREATE',
      resourceType: 'user_access',
      resourceId: user.id,
      newValues: { ...response, temporary_password: 'redacted' },
      ip,
    });

    return response;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createUser = async ({ institutionId, payload, actorId, ip }) => {
  validatePayload(payload);

  if (models.User && models.Staff && sequelize?.transaction) {
    return createUserInDatabase({ institutionId, payload, actorId, ip });
  }

  return createUserInRuntime({ institutionId, payload, actorId, ip });
};

const updateUserAccess = async ({ institutionId, userId, payload, actorId, ip }) => {
  const customPermissions = normalizeCustomPermissions(payload.custom_permissions);

  if (models.Institution && models.User) {
    const institution = await models.Institution.findByPk(institutionId);
    if (!institution) {
      throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
    }
    const user = await models.User.findOne({
      where: { id: userId, institution_id: institutionId },
    });
    if (!user) {
      throw Object.assign(new Error('User not found.'), { statusCode: 404 });
    }

    const settings = ensureAccessControlSettings(institution.settings);
    const previous = getCustomPermissionsFromSettings({ settings, userId });
    const next = setCustomPermissionsInSettings({
      settings,
      userId,
      permissions: customPermissions,
    });
    await institution.update({ settings });

    await logAudit({
      userId: actorId,
      action: 'UPDATE',
      resourceType: 'user_access',
      resourceId: userId,
      previousValues: { custom_permissions: previous },
      newValues: { custom_permissions: next },
      ip,
    });

    return {
      user_id: userId,
      custom_permissions: next,
      permissions: getPermissionsForRole(user.role).concat(next),
    };
  }

  const runtimeUser = store.users.accounts.find(
    (item) => item.id === userId && item.institution_id === institutionId
  );
  if (!runtimeUser) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }
  runtimeUser.custom_permissions = customPermissions;

  await logAudit({
    userId: actorId,
    action: 'UPDATE',
    resourceType: 'user_access',
    resourceId: userId,
    newValues: { custom_permissions: customPermissions },
    ip,
  });

  return {
    user_id: userId,
    custom_permissions: customPermissions,
    permissions: getPermissionsForRole(runtimeUser.role).concat(customPermissions),
  };
};

const serializeParent = (item) => ({
  id: item.id,
  institution_id: item.institution_id,
  email: item.email,
  phone: item.phone,
  role: item.role,
  first_name: item.first_name,
  last_name: item.last_name,
  full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
  is_active: item.is_active,
  status: item.status || (item.is_active ? 'active' : 'inactive'),
});

const searchParentsFromRuntime = async ({ institutionId, search, limit = 20 }) => {
  const query = String(search || '').trim().toLowerCase();
  const matches = store.users.accounts
    .filter((item) => {
      if (item.institution_id !== institutionId || item.role !== 'parent') return false;
      if (!query) return true;
      const full = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
      return (
        full.includes(query) ||
        String(item.email || '').toLowerCase().includes(query) ||
        String(item.phone || '').toLowerCase().includes(query)
      );
    })
    .map(serializeParent);
  return matches.slice(0, limit);
};

const searchParentsFromDatabase = async ({ institutionId, search, limit = 20 }) => {
  const where = { institution_id: institutionId, role: 'parent' };
  const query = String(search || '').trim();
  if (query) {
    where[Op.or] = [
      sequelize.where(
        sequelize.fn('LOWER', sequelize.literal(`"first_name" || ' ' || "last_name"`)),
        { [Op.like]: `%${query.toLowerCase()}%` }
      ),
      sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), {
        [Op.like]: `%${query.toLowerCase()}%`,
      }),
      { phone: { [Op.iLike]: `%${query}%` } },
    ];
  }
  const rows = await models.User.findAll({ where, limit, order: [['last_name', 'ASC']] });
  return rows.map(serializeParent);
};

const searchParents = async ({ institutionId, search, limit }) => {
  if (models.User && sequelize?.literal) {
    try {
      return await searchParentsFromDatabase({ institutionId, search, limit });
    } catch (_error) {
      // fall through to runtime
    }
  }
  return searchParentsFromRuntime({ institutionId, search, limit });
};

module.exports = {
  listUsers,
  createUser,
  updateUserAccess,
  searchParents,
};
