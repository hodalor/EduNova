const crypto = require('crypto');

const { redisClient } = require('../../config/redis');
const { store } = require('../../shared/store/runtime-store');

const ttlMap = {
  overview: 300,
  charts: 600,
  reports: 1800,
};

const buildCacheKey = ({ institutionId, endpoint, params = {} }) => {
  const paramsHash = crypto
    .createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex');
  return `analytics:${institutionId}:${endpoint}:${paramsHash}`;
};

const fromCache = async (key) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (_error) {
    return null;
  }
};

const storeCache = async (key, ttl, value) => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (_error) {
    return null;
  }
  return value;
};

const getOrCache = async ({ institutionId, endpoint, params, ttl, producer }) => {
  const key = buildCacheKey({ institutionId, endpoint, params });
  const cached = await fromCache(key);
  if (cached) {
    return cached;
  }

  const fresh = await producer();
  await storeCache(key, ttl, fresh);
  return fresh;
};

const getOverview = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'overview',
    params,
    ttl: ttlMap.overview,
    producer: async () => ({
      stats: [
        {
          id: 'students',
          label: 'Total Students',
          value: '3,842',
          icon: 'Users',
          trend: { value: 8.4, direction: 'up', label: 'vs last month' },
        },
        {
          id: 'collection',
          label: 'Fee Collection Rate',
          value: '84.6%',
          icon: 'Wallet',
          trend: { value: 4.1, direction: 'up', label: 'vs last month' },
        },
      ],
      finance: {
        totalInvoices: store.finance.invoices.length,
        totalPayments: store.finance.payments.length,
      },
    }),
  });

const getRevenue = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'finance-revenue',
    params,
    ttl: ttlMap.charts,
    producer: async () => ({
      revenueByMonth: [
        { month: 'Jan', revenue: 120000, target: 132000 },
        { month: 'Feb', revenue: 132000, target: 138000 },
        { month: 'Mar', revenue: 141000, target: 145000 },
      ],
      collectionRate: 84,
      expenseBreakdown: [
        { name: 'Payroll', value: 54000 },
        { name: 'Utilities', value: 12000 },
      ],
      defaulters: store.finance.invoices.filter((invoice) => invoice.balance > 0),
    }),
  });

const getAttendanceRate = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'attendance-rate',
    params,
    ttl: ttlMap.charts,
    producer: async () => ({
      rate: [
        { day: 'Mon', rate: 94 },
        { day: 'Tue', rate: 92 },
      ],
      chronicAbsentees: store.attendance.records.filter((record) => record.status === 'absent'),
    }),
  });

const getPerformance = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'academics-performance',
    params,
    ttl: ttlMap.reports,
    producer: async () => ({
      averageGrades: [
        { className: 'SH 2 Science', average: 78, benchmark: 74 },
        { className: 'PR 5 Gold', average: 82, benchmark: 76 },
      ],
      publishedReports: store.academics.reportCards.filter((item) => item.is_published).length,
    }),
  });

const getEnrollmentTrend = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'enrollment-trend',
    params,
    ttl: ttlMap.reports,
    producer: async () => ({
      trend: [
        { month: 'Jan', enrolled: 110 },
        { month: 'Feb', enrolled: 92 },
      ],
      levelDistribution: [
        { name: 'PR', value: 1140 },
        { name: 'SH', value: 840 },
      ],
    }),
  });

const getActiveAlerts = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'alerts-active',
    params,
    ttl: ttlMap.charts,
    producer: async () => [
      {
        id: 'al-1',
        type: 'Financial',
        student: 'Elikem Mensah',
        severity: 'warning',
        date: '2026-06-20',
        message: 'Outstanding balance remains unpaid.',
      },
    ],
  });

const invalidateAnalyticsCache = async (institutionId) => {
  try {
    const keys = await redisClient.keys(`analytics:${institutionId}:*`);
    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (_error) {
    return null;
  }
  return true;
};

module.exports = {
  getOverview,
  getRevenue,
  getAttendanceRate,
  getPerformance,
  getEnrollmentTrend,
  getActiveAlerts,
  invalidateAnalyticsCache,
};
