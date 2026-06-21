const { hashPassword } = require('../../shared/helpers/auth');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const { getPlan, plans } = require('../../shared/services/subscription-plan.service');

const listInstitutions = async () =>
  store.platform.institutions.map((institution) => ({
    ...institution,
    stats: {
      students: institution.active_students,
      staff: institution.active_staff,
      monthly_revenue: institution.monthly_revenue,
    },
  }));

const getInstitutionDetail = async (institutionId) => {
  const institution = store.platform.institutions.find((item) => item.id === institutionId);
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }

  return {
    ...institution,
    usage: {
      active_students: institution.active_students,
      active_staff: institution.active_staff,
      monthly_revenue: institution.monthly_revenue,
      plan: getPlan(institution.subscription_plan),
    },
  };
};

const appendAudit = (entry) => {
  store.platform.auditLogs.unshift({
    id: `plat-audit-${String(store.platform.auditLogs.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
    ...entry,
  });
};

const onboardInstitution = async ({ payload, userId, ip }) => {
  const nextInstitutionId = `inst-${String(store.platform.institutions.length + 1).padStart(3, '0')}`;
  const plan = getPlan(payload.subscription_plan);
  const institution = {
    id: nextInstitutionId,
    name: payload.name,
    code: payload.code,
    subscription_plan: plan.key,
    status: 'active',
    trial_ends_at:
      payload.trial_ends_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    monthly_revenue: 0,
    active_students: 0,
    active_staff: 1,
    modules_enabled: plan.modules,
    created_at: new Date().toISOString(),
  };

  const adminUser = {
    id: `usr-sa-${String(store.platform.institutions.length + 1).padStart(3, '0')}`,
    institution_id: nextInstitutionId,
    email: payload.admin_email,
    role: 'institution_admin',
    first_name: payload.admin_first_name,
    last_name: payload.admin_last_name,
    password_hash: await hashPassword(payload.admin_password || 'Eduova123'),
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
    institution,
    admin_user: { ...adminUser, password_hash: undefined },
  };
};

const suspendInstitution = async ({ institutionId, userId, ip }) => {
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

const extendTrial = async ({ institutionId, days = 14, userId, ip }) => {
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

const getPlatformAnalytics = async () => {
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
  };
};

const getPlatformAuditLogs = async ({ action, resourceType }) =>
  store.platform.auditLogs.filter((entry) => {
    if (action && entry.action !== action) {
      return false;
    }
    if (resourceType && entry.resource_type !== resourceType) {
      return false;
    }
    return true;
  });

module.exports = {
  listInstitutions,
  getInstitutionDetail,
  onboardInstitution,
  suspendInstitution,
  extendTrial,
  getPlatformAnalytics,
  getPlatformAuditLogs,
};
