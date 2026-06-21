const { store } = require('../store/runtime-store');
const { canAddStudent, getPlan, includesModule } = require('../services/subscription-plan.service');

const getInstitutionRecord = (institutionId) =>
  store.platform.institutions.find((institution) => institution.id === institutionId);

const resolvePlanKey = (req) => {
  if (req.user?.role === 'super_admin') {
    return 'enterprise';
  }
  return (
    req.user?.institution?.subscription_plan ||
    getInstitutionRecord(req.institutionId)?.subscription_plan ||
    'starter'
  );
};

const buildUpgradePrompt = (planKey, moduleKey) => {
  const plan = getPlan(planKey);
  return `Your ${plan.key} plan does not include the ${moduleKey} module. Please upgrade to continue.`;
};

const enforceSubscriptionAccess = (moduleKey) => (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }

  const planKey = resolvePlanKey(req);
  if (!includesModule(planKey, moduleKey)) {
    return res.status(403).json({
      success: false,
      message: buildUpgradePrompt(planKey, moduleKey),
      upgrade_required: true,
      current_plan: planKey,
      requested_module: moduleKey,
    });
  }

  return next();
};

const enforceStudentPlanLimit = (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }

  const planKey = resolvePlanKey(req);
  const currentCount = store.students.profiles.filter(
    (student) => student.institution_id === req.institutionId
  ).length;

  if (!canAddStudent(planKey, currentCount)) {
    const plan = getPlan(planKey);
    return res.status(403).json({
      success: false,
      message: `Student limit reached for the ${plan.key} plan. Upgrade to enroll more learners.`,
      upgrade_required: true,
      current_plan: planKey,
      max_students: plan.max_students,
      current_students: currentCount,
    });
  }

  return next();
};

module.exports = {
  enforceSubscriptionAccess,
  enforceStudentPlanLimit,
};
