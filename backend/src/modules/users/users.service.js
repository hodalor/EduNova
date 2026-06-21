const { models, sequelize } = require('../../config/database');
const { getPermissionsForRole } = require('../../shared/constants/permissions');
const { hashPassword } = require('../../shared/helpers/auth');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const allowedRoles = ['institution_admin', 'teacher'];
const allowedEmploymentTypes = ['full_time', 'part_time', 'contract'];

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
  permissions: getPermissionsForRole(item.role),
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

  const users = await models.User.findAll({
    where,
    include: [{ model: models.Staff, as: 'staffProfile', required: false }],
    order: [['created_at', 'DESC']],
  });

  return users
    .filter((item) => allowedRoles.includes(item.role))
    .map((user) => ({
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
      permissions: getPermissionsForRole(user.role),
    }));
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
      new Error('Only institution_admin and teacher accounts can be created here.'),
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
      permissions: getPermissionsForRole(user.role),
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

module.exports = {
  listUsers,
  createUser,
};
