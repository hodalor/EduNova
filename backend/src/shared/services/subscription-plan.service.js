const plans = {
  starter: {
    key: 'starter',
    max_students: 200,
    modules: ['admissions', 'finance', 'academics', 'attendance'],
  },
  growth: {
    key: 'growth',
    max_students: 1000,
    modules: ['admissions', 'finance', 'academics', 'attendance', 'transport', 'hostel', 'timetable'],
  },
  enterprise: {
    key: 'enterprise',
    max_students: Number.POSITIVE_INFINITY,
    modules: 'all',
    sla: true,
  },
};

const getPlan = (planKey = 'starter') => plans[planKey] || plans.starter;

const includesModule = (planKey, moduleKey) => {
  const plan = getPlan(planKey);
  if (plan.modules === 'all') {
    return true;
  }
  return plan.modules.includes(moduleKey);
};

const canAddStudent = (planKey, currentCount = 0) => {
  const plan = getPlan(planKey);
  return currentCount < plan.max_students;
};

module.exports = {
  plans,
  getPlan,
  includesModule,
  canAddStudent,
};
