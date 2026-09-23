const crypto = require('crypto');
const { Op } = require('sequelize');

const { redisClient } = require('../../config/redis');
const { models, sequelize } = require('../../config/database');
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

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatPercent = (value, digits = 1) =>
  `${(Number(value) || 0).toFixed(digits)}%`;

const databaseReady = () =>
  Boolean(
    models?.Institution &&
      models?.User &&
      models?.Student &&
      models?.Staff &&
      models?.AttendanceRecord &&
      models?.StudentInvoice &&
      models?.Payment &&
      models?.Class &&
      sequelize
  );

const computeRealtimeOverview = async ({ institutionId }) => {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const baseWhere = { institution_id: institutionId };

  const totalStudents = databaseReady()
    ? await models.Student.count({ where: baseWhere })
    : store.students.list.filter((s) => s.institution_id === institutionId).length;

  const staffRoles = ['institution_admin', 'teacher', 'accountant', 'librarian'];
  const totalStaff = databaseReady()
    ? await models.User.count({
        where: {
          institution_id: institutionId,
          role: { [Op.in]: staffRoles },
        },
      })
    : store.users.list.filter(
        (u) => u.institution_id === institutionId && staffRoles.includes(u.role)
      ).length;

  let attendanceRate = 0;
  if (databaseReady()) {
    const [presentCount, totalCount] = await Promise.all([
      models.AttendanceRecord.count({
        where: { institution_id: institutionId, date: todayIso, status: 'present' },
      }),
      models.AttendanceRecord.count({
        where: { institution_id: institutionId, date: todayIso },
      }),
    ]);
    attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
  } else {
    const todays = store.attendance.records.filter(
      (r) => r.institution_id === institutionId && String(r.date).slice(0, 10) === todayIso
    );
    const present = todays.filter((r) => r.status === 'present').length;
    attendanceRate = todays.length > 0 ? (present / todays.length) * 100 : 0;
  }

  let collectionRate = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  const recentPayments = [];
  if (databaseReady() && models.StudentInvoice && models.Payment) {
    try {
      const [invoiceAgg, paymentAgg, paymentsRows] = await Promise.all([
        models.StudentInvoice.sum('total_amount', { where: baseWhere }),
        models.Payment.sum('amount', { where: baseWhere }),
        models.Payment.findAll({
          where: baseWhere,
          order: [['createdAt', 'DESC']],
          limit: 5,
          raw: true,
        }),
      ]);
      totalInvoiced = Number(invoiceAgg) || 0;
      totalPaid = Number(paymentAgg) || 0;
      collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
      paymentsRows.forEach((row) => {
        recentPayments.push({
          id: row.id,
          studentName: row.student_name || `Student #${row.student_id || row.id}`,
          amount: Number(row.amount) || 0,
          method: row.payment_method || 'Bank',
          date: row.paid_at ? String(row.paid_at).slice(0, 10) : todayIso,
          status: 'Paid',
        });
      });
    } catch (_err) {
      totalInvoiced = 0;
      totalPaid = 0;
    }
  } else {
    const invoices = store.finance.invoices.filter((i) => i.institution_id === institutionId);
    const payments = store.finance.payments;
    totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
    payments
      .slice()
      .sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0))
      .slice(0, 5)
      .forEach((row) => {
        recentPayments.push({
          id: row.id,
          studentName:
            invoices.find((inv) => inv.id === row.invoice_id)?.student_name ||
            `Student #${row.invoice_id || row.id}`,
          amount: Number(row.amount) || 0,
          method: row.payment_method || 'Bank',
          date: row.paid_at ? String(row.paid_at).slice(0, 10) : todayIso,
          status: 'Paid',
        });
      });
  }

  const months = [];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: monthLabels[d.getMonth()],
      start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    });
  }

  const revenueTrend = [];
  if (databaseReady() && models.Payment) {
    for (const m of months) {
      const monthTotal = await models.Payment.sum('amount', {
        where: {
          institution_id: institutionId,
          paid_at: { [Op.between]: [m.start, m.end] },
        },
      }).catch(() => 0);
      revenueTrend.push({ month: m.label, revenue: Number(monthTotal) || 0 });
    }
  } else {
    for (const m of months) {
      const monthTotal = store.finance.payments.reduce((sum, p) => {
        const t = new Date(p.paid_at || 0).getTime();
        return t >= new Date(m.start).getTime() && t <= new Date(m.end).getTime()
          ? sum + (Number(p.amount) || 0)
          : sum;
      }, 0);
      revenueTrend.push({ month: m.label, revenue: monthTotal });
    }
  }

  let enrollmentByLevel = [];
  if (databaseReady()) {
    const rows = await models.Student.findAll({
      attributes: [
        'level_code',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: baseWhere,
      group: ['level_code'],
      raw: true,
    }).catch(() => []);
    enrollmentByLevel = rows.map((row) => ({
      name: row.level_code || 'Other',
      value: Number(row.count) || 0,
    }));
  } else {
    const agg = new Map();
    store.students.list
      .filter((s) => s.institution_id === institutionId)
      .forEach((s) => {
        const key = s.level_code || 'Other';
        agg.set(key, (agg.get(key) || 0) + 1);
      });
    enrollmentByLevel = Array.from(agg.entries()).map(([name, value]) => ({ name, value }));
  }

  const alerts = [];
  if (totalStudents === 0) {
    alerts.push({
      id: 'no-students',
      type: 'Operations',
      severity: 'info',
      date: todayIso,
      message: 'No students enrolled yet. Start by adding your first child to the roll.',
    });
  }
  if (collectionRate > 0 && collectionRate < 50) {
    alerts.push({
      id: 'low-collection',
      type: 'Financial',
      severity: 'warning',
      date: todayIso,
      message: `Fee collection is at ${formatPercent(collectionRate, 0)}. Follow up on outstanding invoices.`,
    });
  }
  if (attendanceRate > 0 && attendanceRate < 70) {
    alerts.push({
      id: 'low-attendance',
      type: 'Attendance',
      severity: 'warning',
      date: todayIso,
      message: `Today's attendance is ${formatPercent(attendanceRate, 0)}. Check in with families.`,
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: 'all-good',
      type: 'Operations',
      severity: 'success',
      date: todayIso,
      message: 'Everything is running smoothly. Keep up the great work!',
    });
  }

  return {
    stats: [
      {
        id: 'students',
        label: 'Total Students',
        value: formatNumber(totalStudents),
        icon: 'Users',
        trend: { value: 0, direction: 'flat', label: 'No prior period' },
      },
      {
        id: 'collection',
        label: 'Fee Collection Rate',
        value: formatPercent(collectionRate),
        icon: 'Wallet',
        trend: { value: 0, direction: 'flat', label: 'No prior period' },
      },
      {
        id: 'attendance',
        label: 'Today\'s Attendance',
        value: formatPercent(attendanceRate),
        icon: 'ClipboardCheck',
        trend: { value: 0, direction: 'flat', label: 'Today only' },
      },
      {
        id: 'staff',
        label: 'Active Staff',
        value: formatNumber(totalStaff),
        icon: 'Briefcase',
        trend: { value: 0, direction: 'flat', label: 'All time' },
      },
    ],
    revenueTrend,
    enrollmentByLevel,
    recentPayments,
    alerts,
    finance: {
      totalInvoiced,
      totalPaid,
      collectionRate,
    },
  };
};

const getOverview = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'overview',
    params,
    ttl: ttlMap.overview,
    producer: () => computeRealtimeOverview({ institutionId }),
  });

const buildRecentMonthWindows = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  });
};

const getRevenue = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'finance-revenue',
    params,
    ttl: ttlMap.charts,
    producer: async () => {
      const months = buildRecentMonthWindows(6);

      if (models.StudentInvoice && models.Payment) {
        const invoiceWhere = { institution_id: institutionId };
        const paymentWhere = { institution_id: institutionId };
        const [allInvoices, totalInvoicedAgg, totalPaidAgg] = await Promise.all([
          models.StudentInvoice.findAll({
            where: invoiceWhere,
            include: [
              {
                model: models.Student,
                as: 'student',
                required: false,
                include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
                attributes: ['id'],
              },
            ],
            order: [['due_date', 'ASC']],
          }),
          models.StudentInvoice.sum('total_amount', { where: invoiceWhere }).catch(() => 0),
          models.Payment.sum('amount', { where: paymentWhere }).catch(() => 0),
        ]);

        const revenueByMonth = [];
        for (const month of months) {
          const [revenueAgg, targetAgg] = await Promise.all([
            models.Payment.sum('amount', {
              where: {
                ...paymentWhere,
                paid_at: { [Op.between]: [month.start, month.end] },
              },
            }).catch(() => 0),
            models.StudentInvoice.sum('total_amount', {
              where: {
                ...invoiceWhere,
                createdAt: { [Op.between]: [month.start, month.end] },
              },
            }).catch(() => 0),
          ]);
          revenueByMonth.push({
            month: month.month,
            revenue: Number(revenueAgg) || 0,
            target: Number(targetAgg) || 0,
          });
        }

        let expenseBreakdown = [];
        if (models.Expense && models.ExpenseCategory) {
          const expenses = await models.Expense.findAll({
            where: { institution_id: institutionId, status: { [Op.in]: ['approved', 'paid'] } },
            include: [{ model: models.ExpenseCategory, as: 'category', required: false, attributes: ['name'] }],
            raw: true,
          }).catch(() => []);

          const expenseMap = new Map();
          expenses.forEach((row) => {
            const key = row['category.name'] || 'Other';
            expenseMap.set(key, (expenseMap.get(key) || 0) + (Number(row.amount) || 0));
          });
          expenseBreakdown = Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value }));
        }

        const today = new Date().toISOString().slice(0, 10);
        const defaulters = allInvoices
          .filter((invoice) => Number(invoice.balance || 0) > 0)
          .map((invoice) => ({
            id: invoice.id,
            student: invoice.student_name || `Student #${invoice.student_id}`,
            className: invoice.class_name || invoice.student?.class?.name || 'Unassigned',
            amount: Number(invoice.balance || 0),
            daysOverdue:
              invoice.due_date && String(invoice.due_date).slice(0, 10) < today
                ? Math.max(
                    Math.floor(
                      (new Date(today).getTime() - new Date(String(invoice.due_date).slice(0, 10)).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    0
                  )
                : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          revenueByMonth,
          collectionRate:
            Number(totalInvoicedAgg || 0) > 0
              ? Math.round((Number(totalPaidAgg || 0) / Number(totalInvoicedAgg || 0)) * 100)
              : 0,
          expenseBreakdown,
          defaulters,
        };
      }

      const invoices = store.finance.invoices.filter((invoice) => invoice.institution_id === institutionId);
      const payments = store.finance.payments.filter((payment) => {
        const invoice = invoices.find((item) => item.id === payment.invoice_id);
        return !invoice || invoice.institution_id === institutionId;
      });

      return {
        revenueByMonth: months.map((month) => ({
          month: month.month,
          revenue: payments.reduce((sum, payment) => {
            const paidAt = new Date(payment.paid_at || 0).toISOString();
            return paidAt >= month.start && paidAt <= month.end ? sum + (Number(payment.amount) || 0) : sum;
          }, 0),
          target: invoices.reduce((sum, invoice) => {
            const createdAt = new Date(invoice.created_at || invoice.createdAt || 0).toISOString();
            return createdAt >= month.start && createdAt <= month.end
              ? sum + (Number(invoice.total_amount) || 0)
              : sum;
          }, 0),
        })),
        collectionRate:
          invoices.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0) > 0
            ? Math.round(
                (payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) /
                  invoices.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0)) *
                  100
              )
            : 0,
        expenseBreakdown: [],
        defaulters: invoices
          .filter((invoice) => Number(invoice.balance || 0) > 0)
          .map((invoice) => ({
            id: invoice.id,
            student: invoice.student_name || `Student #${invoice.student_id}`,
            className: invoice.class_name || 'Unassigned',
            amount: Number(invoice.balance || 0),
            daysOverdue:
              invoice.due_date && String(invoice.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10)
                ? Math.max(
                    Math.floor(
                      (new Date().setHours(0, 0, 0, 0) - new Date(String(invoice.due_date).slice(0, 10)).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    0
                  )
                : 0,
          })),
      };
    },
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
