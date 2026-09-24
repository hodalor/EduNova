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
    const todayRecords = await models.AttendanceRecord.findAll({
      where: { status: { [Op.in]: ['present', 'absent', 'late', 'excused'] } },
      include: [
        {
          model: models.Student,
          as: 'student',
          required: true,
          where: { institution_id: institutionId },
          attributes: ['id'],
        },
        {
          model: models.AttendanceSession,
          as: 'session',
          required: true,
          where: { date: todayIso },
          attributes: ['id', 'date'],
        },
      ],
    }).catch(() => []);
    const presentCount = todayRecords.filter(
      (record) => record.status === 'present' || record.status === 'late'
    ).length;
    attendanceRate = todayRecords.length > 0 ? (presentCount / todayRecords.length) * 100 : 0;
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
      const [invoiceRows, paymentsRows] = await Promise.all([
        models.StudentInvoice.findAll({
          where: baseWhere,
          include: [
            {
              model: models.Student,
              as: 'student',
              required: false,
              include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
            },
          ],
          order: [['created_at', 'DESC']],
        }),
        models.Payment.findAll({
          include: [
            {
              model: models.StudentInvoice,
              as: 'invoice',
              required: true,
              where: { institution_id: institutionId },
              include: [
                {
                  model: models.Student,
                  as: 'student',
                  required: false,
                  include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
                },
              ],
            },
            {
              model: models.Student,
              as: 'student',
              required: false,
              include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
            },
          ],
          order: [['paid_at', 'DESC']],
          limit: 5,
        }),
      ]);
      totalInvoiced = invoiceRows.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
      totalPaid = paymentsRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
      paymentsRows.forEach((row) => {
        recentPayments.push({
          id: row.id,
          studentName:
            `${row.student?.user?.first_name || ''} ${row.student?.user?.last_name || ''}`.trim() ||
            row.invoice?.student_name ||
            `Student #${row.student_id || row.id}`,
          className: row.student?.class?.name || row.invoice?.student?.class?.name || 'Unassigned',
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
    const payments = store.finance.payments.filter((payment) => {
      const invoice = invoices.find((item) => item.id === payment.invoice_id);
      return invoice?.institution_id === institutionId;
    });
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
      where: baseWhere,
      include: [{ model: models.EducationLevel, as: 'level', required: false, attributes: ['level_code'] }],
    }).catch(() => []);
    const levelMap = new Map();
    rows.forEach((row) => {
      const key = row.level?.level_code || 'Other';
      levelMap.set(key, (levelMap.get(key) || 0) + 1);
    });
    enrollmentByLevel = Array.from(levelMap.entries()).map(([name, value]) => ({ name, value }));
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
      severity: 'info',
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
    producer: async () => {
      const today = new Date();
      const recentDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return {
          key: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        };
      });

      if (databaseReady() && models.AttendanceSession) {
        const records = await models.AttendanceRecord.findAll({
          include: [
            {
              model: models.Student,
              as: 'student',
              required: true,
              where: { institution_id: institutionId },
              include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
              attributes: ['id'],
            },
            {
              model: models.AttendanceSession,
              as: 'session',
              required: true,
              attributes: ['date'],
            },
          ],
          raw: false,
        }).catch(() => []);

        const dailyMap = new Map(
          recentDays.map((item) => [item.key, { present: 0, total: 0 }])
        );
        const studentSummary = new Map();

        records.forEach((record) => {
          const dateKey = String(record.session?.date || '').slice(0, 10);
          if (dailyMap.has(dateKey)) {
            const entry = dailyMap.get(dateKey);
            entry.total += 1;
            if (record.status === 'present' || record.status === 'late') {
              entry.present += 1;
            }
          }

          const studentId = record.student_id;
          const current = studentSummary.get(studentId) || {
            id: studentId,
            student:
              `${record.student?.user?.first_name || ''} ${record.student?.user?.last_name || ''}`.trim() ||
              `Student ${studentId}`,
            className: record.student?.class?.name || 'Unassigned',
            total: 0,
            present: 0,
            absent: 0,
            consecutive: 0,
          };
          current.total += 1;
          if (record.status === 'present' || record.status === 'late') {
            current.present += 1;
            current.consecutive = 0;
          } else if (record.status === 'absent') {
            current.absent += 1;
            current.consecutive += 1;
          }
          studentSummary.set(studentId, current);
        });

        return {
          rate: recentDays.map((item) => {
            const entry = dailyMap.get(item.key);
            return {
              day: item.label,
              rate: entry && entry.total ? Math.round((entry.present / entry.total) * 100) : 0,
            };
          }),
          heatmap: recentDays.slice(-5).map((item) => ({
            day: item.label,
            slots: Array.from({ length: 6 }, (_, index) => {
              const rateEntry = dailyMap.get(item.key);
              if (!rateEntry || !rateEntry.total) {
                return 0;
              }
              const ratio = rateEntry.present / rateEntry.total;
              if (ratio >= 0.9) {
                return index < 2 ? 0 : 1;
              }
              if (ratio >= 0.75) {
                return index < 3 ? 1 : 2;
              }
              return index < 2 ? 2 : 3;
            }),
          })),
          chronicAbsentees: Array.from(studentSummary.values())
            .filter((item) => item.absent > 0)
            .map((item) => ({
              id: item.id,
              student: item.student,
              className: item.className,
              attendance: item.total ? Math.round((item.present / item.total) * 100) : 0,
              consecutive: item.consecutive,
            }))
            .sort((a, b) => a.attendance - b.attendance)
            .slice(0, 10),
        };
      }

      const records = store.attendance.records.filter((record) => record.institution_id === institutionId);
      const studentMap = new Map(
        store.students.profiles
          .filter((item) => item.institution_id === institutionId)
          .map((item) => [item.id, item])
      );
      const dailyMap = new Map(recentDays.map((item) => [item.key, { present: 0, total: 0 }]));
      const summaryMap = new Map();

      records.forEach((record) => {
        const dateKey = String(record.date || record.marked_at || '').slice(0, 10);
        if (dailyMap.has(dateKey)) {
          const day = dailyMap.get(dateKey);
          day.total += 1;
          if (record.status === 'present' || record.status === 'late') {
            day.present += 1;
          }
        }

        const profile = studentMap.get(record.student_id) || {};
        const current = summaryMap.get(record.student_id) || {
          id: record.student_id,
          student: record.student_name || profile.full_name || 'Student',
          className: profile.class_name || 'Unassigned',
          total: 0,
          present: 0,
          absent: 0,
          consecutive: 0,
        };
        current.total += 1;
        if (record.status === 'present' || record.status === 'late') {
          current.present += 1;
          current.consecutive = 0;
        } else if (record.status === 'absent') {
          current.absent += 1;
          current.consecutive += 1;
        }
        summaryMap.set(record.student_id, current);
      });

      return {
        rate: recentDays.map((item) => {
          const entry = dailyMap.get(item.key);
          return {
            day: item.label,
            rate: entry && entry.total ? Math.round((entry.present / entry.total) * 100) : 0,
          };
        }),
        heatmap: recentDays.slice(-5).map((item) => ({
          day: item.label,
          slots: Array.from({ length: 6 }, (_, index) => {
            const rateEntry = dailyMap.get(item.key);
            if (!rateEntry || !rateEntry.total) {
              return 0;
            }
            const ratio = rateEntry.present / rateEntry.total;
            if (ratio >= 0.9) {
              return index < 2 ? 0 : 1;
            }
            if (ratio >= 0.75) {
              return index < 3 ? 1 : 2;
            }
            return index < 2 ? 2 : 3;
          }),
        })),
        chronicAbsentees: Array.from(summaryMap.values())
          .filter((item) => item.absent > 0)
          .map((item) => ({
            id: item.id,
            student: item.student,
            className: item.className,
            attendance: item.total ? Math.round((item.present / item.total) * 100) : 0,
            consecutive: item.consecutive,
          }))
          .sort((a, b) => a.attendance - b.attendance)
          .slice(0, 10),
      };
    },
  });

const getPerformance = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'academics-performance',
    params,
    ttl: ttlMap.reports,
    producer: async () => {
      if (databaseReady() && models.ReportCard) {
        const reportCards = await models.ReportCard.findAll({
          include: [
            { model: models.Class, as: 'class', required: false, attributes: ['name'] },
            {
              model: models.Student,
              as: 'student',
              required: false,
              where: { institution_id: institutionId },
              include: [{ model: models.Class, as: 'class', required: false, attributes: ['name'] }],
            },
          ],
        }).catch(() => []);

        const classMap = new Map();
        reportCards.forEach((item) => {
          if (!item.student) {
            return;
          }
          const className = item.class?.name || item.student?.class?.name || 'Unassigned';
          const current = classMap.get(className) || { total: 0, sum: 0 };
          current.total += 1;
          current.sum += Number(item.overall_average || 0);
          classMap.set(className, current);
        });

        return {
          averageGrades: Array.from(classMap.entries()).map(([className, entry]) => ({
            className,
            average: entry.total ? Math.round(entry.sum / entry.total) : 0,
            benchmark: 70,
          })),
          passRates: [],
          atRisk: reportCards
            .filter((item) => Number(item.overall_average || 0) > 0 && Number(item.overall_average || 0) < 50)
            .map((item) => ({
              id: item.student_id,
              student:
                `${item.student?.user?.first_name || ''} ${item.student?.user?.last_name || ''}`.trim() ||
                item.student_id,
              className: item.class?.name || item.student?.class?.name || 'Unassigned',
              average: Math.round(Number(item.overall_average || 0)),
              attendance: 0,
              risk: 'high',
            })),
          publishedReports: reportCards.filter((item) => item.is_published).length,
        };
      }

      const reportCards = store.academics.reportCards.filter((item) => item.institution_id === institutionId);
      const classMap = new Map();
      reportCards.forEach((item) => {
        const className = item.class_name || 'Unassigned';
        const current = classMap.get(className) || { total: 0, sum: 0 };
        current.total += 1;
        current.sum += Number(item.overall_average || 0);
        classMap.set(className, current);
      });

      return {
        averageGrades: Array.from(classMap.entries()).map(([className, entry]) => ({
          className,
          average: entry.total ? Math.round(entry.sum / entry.total) : 0,
          benchmark: 70,
        })),
        passRates: [],
        atRisk: reportCards
          .filter((item) => Number(item.overall_average || 0) > 0 && Number(item.overall_average || 0) < 50)
          .map((item) => ({
            id: item.student_id,
            student: item.student_name || item.student_id,
            className: item.class_name || 'Unassigned',
            average: Math.round(Number(item.overall_average || 0)),
            attendance: 0,
            risk: 'high',
          })),
        publishedReports: reportCards.filter((item) => item.is_published).length,
      };
    },
  });

const getEnrollmentTrend = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'enrollment-trend',
    params,
    ttl: ttlMap.reports,
    producer: async () => {
      const months = buildRecentMonthWindows(6);

      if (databaseReady()) {
        const students = await models.Student.findAll({
          where: { institution_id: institutionId },
          include: [
            { model: models.EducationLevel, as: 'level', required: false, attributes: ['level_code'] },
            { model: models.Class, as: 'class', required: false, attributes: ['name', 'capacity'] },
          ],
        }).catch(() => []);

        return {
          trend: months.map((month) => ({
            month: month.month,
            enrolled: students.filter((item) => {
              const joinedAt = String(item.enrollment_date || item.createdAt || '');
              return joinedAt >= month.start && joinedAt <= month.end;
            }).length,
          })),
          levelDistribution: Array.from(
            students.reduce((acc, item) => {
              const level = item.level?.level_code || 'Other';
              acc.set(level, (acc.get(level) || 0) + 1);
              return acc;
            }, new Map())
          ).map(([name, value]) => ({ name, value })),
          capacity: Array.from(
            students.reduce((acc, item) => {
              const key = item.class?.name || 'Unassigned';
              const current = acc.get(key) || {
                className: key,
                capacity: Number(item.class?.capacity || 0),
                enrolled: 0,
              };
              current.enrolled += 1;
              current.capacity = Number(item.class?.capacity || current.capacity || 0);
              acc.set(key, current);
              return acc;
            }, new Map())
          ).map(([, value]) => value),
        };
      }

      const students = store.students.profiles.filter((item) => item.institution_id === institutionId);
      return {
        trend: months.map((month) => ({
          month: month.month,
          enrolled: students.filter((item) => {
            const joinedAt = String(item.created_at || item.enrollment_date || '');
            return joinedAt >= month.start && joinedAt <= month.end;
          }).length,
        })),
        levelDistribution: Array.from(
          students.reduce((acc, item) => {
            const level = item.level_code || 'Other';
            acc.set(level, (acc.get(level) || 0) + 1);
            return acc;
          }, new Map())
        ).map(([name, value]) => ({ name, value })),
        capacity: Array.from(
          students.reduce((acc, item) => {
            const key = item.class_name || 'Unassigned';
            const current = acc.get(key) || { className: key, capacity: 0, enrolled: 0 };
            current.enrolled += 1;
            acc.set(key, current);
            return acc;
          }, new Map())
        ).map(([, value]) => value),
      };
    },
  });

const getActiveAlerts = async ({ institutionId, params = {} }) =>
  getOrCache({
    institutionId,
    endpoint: 'alerts-active',
    params,
    ttl: ttlMap.charts,
    producer: async () => {
      const alerts = [];
      const today = new Date().toISOString().slice(0, 10);

      if (databaseReady() && models.StudentInvoice) {
        const invoices = await models.StudentInvoice.findAll({
          where: { institution_id: institutionId },
          order: [['created_at', 'DESC']],
          limit: 10,
        }).catch(() => []);

        invoices
          .filter((item) => Number(item.balance || 0) > 0)
          .forEach((item) => {
            alerts.push({
              id: `finance-${item.id}`,
              type: 'Financial',
              student: item.student_name || `Student ${item.student_id}`,
              severity: 'warning',
              date: String(item.due_date || item.created_at || today).slice(0, 10),
              message: `Outstanding balance of ${formatNumber(item.balance)} remains unpaid.`,
            });
          });
      } else {
        store.finance.invoices
          .filter(
            (item) => item.institution_id === institutionId && Number(item.balance || 0) > 0
          )
          .forEach((item) => {
            alerts.push({
              id: `finance-${item.id}`,
              type: 'Financial',
              student: item.student_name || `Student ${item.student_id}`,
              severity: 'warning',
              date: String(item.due_date || today).slice(0, 10),
              message: `Outstanding balance of ${formatNumber(item.balance)} remains unpaid.`,
            });
          });
      }

      return alerts.slice(0, 12);
    },
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
