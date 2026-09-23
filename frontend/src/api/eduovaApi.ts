import axios from 'axios';
import axiosInstance, { authApi } from './axiosInstance';
import {
  analyticsData,
  attendanceData,
  superAdminData,
  timetableData,
} from '../utils/mockData';
import type { LoginResponse } from '../types/auth';

const wait = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (_error) {
    await wait();
    return fallback;
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown): number => Number(value) || 0;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const fallbackDashboardOverview = {
  stats: [
    {
      id: 'students',
      label: 'Total Students',
      value: '492',
      icon: 'Users',
      trend: { value: 0, direction: 'up', label: 'Current total' },
    },
    {
      id: 'collection',
      label: 'Fee Collection Rate',
      value: '84%',
      icon: 'Wallet',
      trend: { value: 0, direction: 'up', label: 'Current total' },
    },
    {
      id: 'attendance',
      label: "Today's Attendance",
      value: '91%',
      icon: 'ClipboardCheck',
      trend: { value: 0, direction: 'up', label: 'Current total' },
    },
    {
      id: 'staff',
      label: 'Active Staff',
      value: '38',
      icon: 'Briefcase',
      trend: { value: 0, direction: 'up', label: 'Current total' },
    },
  ],
  revenueTrend: analyticsData.finance.revenueByMonth.map((entry) => ({
    name: entry.month,
    revenue: entry.revenue,
    billed: entry.target,
  })),
  enrollmentByLevel: analyticsData.enrollment.levelDistribution.map((entry) => ({
    level: entry.name,
    count: entry.value,
  })),
  recentPayments: [
    {
      id: 'fallback-payment-1',
      student: 'Elikem Mensah',
      className: 'Level 100',
      amount: 1800,
      method: 'Mobile Money',
      receivedAt: '2026-06-18',
      status: 'verified',
    },
    {
      id: 'fallback-payment-2',
      student: 'Ama Tetteh',
      className: 'PR 5 Gold',
      amount: 950,
      method: 'Bank',
      receivedAt: '2026-06-14',
      status: 'verified',
    },
  ],
  alerts: analyticsData.alerts,
};

const normalizeDashboardOverview = (payload: unknown) => {
  const raw = asRecord(payload);

  const stats = Array.isArray(raw.stats)
    ? raw.stats.map((entry, index) => {
        const item = asRecord(entry);
        const trend = asRecord(item.trend);
        const trendValue = asNumber(trend.value);
        const rawDirection = asString(trend.direction, 'up');

        return {
          id: asString(item.id, `stat-${index + 1}`),
          label: asString(item.label, 'Metric'),
          value: asString(item.value, '0'),
          icon: asString(item.icon, 'Activity'),
          trend: {
            value: trendValue,
            direction: rawDirection === 'down' ? 'down' : 'up',
            label: asString(trend.label, trendValue === 0 ? 'No change' : 'vs previous period'),
          },
        };
      })
    : [];

  const revenueTrend = Array.isArray(raw.revenueTrend)
    ? raw.revenueTrend.map((entry) => {
        const item = asRecord(entry);
        const revenue = asNumber(item.revenue);
        return {
          name: asString(item.name, asString(item.month, '')),
          revenue,
          billed: asNumber(item.billed) || revenue,
        };
      })
    : [];

  const enrollmentByLevel = Array.isArray(raw.enrollmentByLevel)
    ? raw.enrollmentByLevel.map((entry) => {
        const item = asRecord(entry);
        return {
          level: asString(item.level, asString(item.name, 'Other')),
          count: asNumber(item.count) || asNumber(item.value),
        };
      })
    : [];

  const recentPayments = Array.isArray(raw.recentPayments)
    ? raw.recentPayments.map((entry, index) => {
        const item = asRecord(entry);
        return {
          id: asString(item.id, `payment-${index + 1}`),
          student: asString(item.student, asString(item.studentName, 'Student')),
          className: asString(item.className, '-'),
          amount: asNumber(item.amount),
          method: asString(item.method, 'Bank'),
          receivedAt: asString(item.receivedAt, asString(item.date, '')),
          status: asString(item.status, 'verified'),
        };
      })
    : [];

  const alerts = Array.isArray(raw.alerts)
    ? raw.alerts.map((entry, index) => {
        const item = asRecord(entry);
        const rawSeverity = asString(item.severity, 'info');
        return {
          id: asString(item.id, `alert-${index + 1}`),
          title: asString(item.title, asString(item.type, 'Notice')),
          description: asString(item.description, asString(item.message, 'No additional details.')),
          severity:
            rawSeverity === 'danger'
              ? 'error'
              : rawSeverity === 'success'
                ? 'success'
                : rawSeverity === 'warning'
                  ? 'warning'
                  : 'info',
        };
      })
    : [];

  return {
    stats,
    revenueTrend,
    enrollmentByLevel,
    recentPayments,
    alerts,
  };
};

export const eduovaApi = {
  auth: {
    login: async (payload: {
      identity: string;
      password: string;
      institution_code: string;
    }): Promise<LoginResponse> => {
      const { data } = await authApi.post('/auth/login', payload);
      return data.data || data;
    },
    superAdminLogin: async (payload: {
      identity: string;
      password: string;
      institution_code: string;
    }): Promise<LoginResponse> => {
      const { data } = await authApi.post('/auth/login', payload);
      return data.data || data;
    },
  },
  analytics: {
    getOverview: () =>
      safeRequest(
        async () => normalizeDashboardOverview((await axiosInstance.get('/analytics/overview')).data.data),
        normalizeDashboardOverview(fallbackDashboardOverview)
      ),
    getFinance: async () => {
      try {
        const response = await axiosInstance.get('/analytics/finance/revenue');
        return response.data.data || {};
      } catch (error) {
        throw error;
      }
    },
    getAcademics: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/academics/performance')).data.data, analyticsData.academics),
    getAttendance: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/attendance/rate')).data.data, analyticsData.attendance),
    getEnrollment: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/enrollment-trend')).data.data, analyticsData.enrollment),
    getAlerts: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/alerts/active')).data.data, analyticsData.alerts),
  },
  students: {
    list: async () => {
      try {
        return (await axiosInstance.get('/students')).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.get('/v1/students')).data.data;
        }
        throw error;
      }
    },
    detail: async (id: string) => {
      try {
        return (await axiosInstance.get(`/students/${id}`)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.get(`/v1/students/${id}`)).data.data;
        }
        throw error;
      }
    },
    create: async (payload: unknown) => {
      try {
        return (await axiosInstance.post('/students', payload)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.post('/v1/students', payload)).data.data;
        }
        throw error;
      }
    },
    update: async (payload: Record<string, unknown>) => {
      const { studentId, ...body } = payload;
      try {
        return (await axiosInstance.patch(`/students/${studentId}`, body)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.patch(`/v1/students/${studentId}`, body)).data.data;
        }
        throw error;
      }
    },
  },
  finance: {
    dashboard: async () => (await axiosInstance.get('/finance/dashboard')).data.data,
    invoices: async () => (await axiosInstance.get('/finance/invoices')).data.data,
    createInvoice: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/invoices', payload)).data.data,
    payments: async () => (await axiosInstance.get('/finance/payments')).data.data,
    recordPayment: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payments', payload)).data.data,
    defaulters: async () => (await axiosInstance.get('/finance/reports/defaulters')).data.data,
    debtors: async () => (await axiosInstance.get('/finance/debtors')).data.data,
    expenses: async () => (await axiosInstance.get('/finance/expenses')).data.data,
    feeStructures: async () => (await axiosInstance.get('/finance/fee-structures')).data.data,
    paymentTerms: async () => (await axiosInstance.get('/finance/payment-terms')).data.data,
    createPaymentTerm: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payment-terms', payload)).data.data,
    updatePaymentTerm: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/finance/payment-terms/${id}`, payload)).data.data,
    deletePaymentTerm: async (id: string) =>
      (await axiosInstance.delete(`/finance/payment-terms/${id}`)).data.data,
  },
  academics: {
    structure: async () => (await axiosInstance.get('/v1/academics/structure')).data.data,
    createGroup: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/groups', payload)).data.data,
    createPeriod: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/periods', payload)).data.data,
    createOffering: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/offerings', payload)).data.data,
    assessments: async () => (await axiosInstance.get('/v1/academics/assessments')).data.data,
    reportCards: async () => (await axiosInstance.get('/v1/academics/report-cards')).data.data,
    gradebook: async () => (await axiosInstance.get('/v1/academics/gradebook')).data.data,
  },
  attendance: {
    taking: () =>
      safeRequest(async () => (await axiosInstance.get('/attendance/today')).data.data, attendanceData.taking),
    report: () =>
      safeRequest(async () => (await axiosInstance.get('/attendance/report')).data.data, attendanceData.report),
  },
  timetable: {
    grid: () => safeRequest(async () => (await axiosInstance.get('/timetable')).data.data, timetableData.grid),
    subjects: () =>
      safeRequest(async () => (await axiosInstance.get('/timetable/config')).data.data, timetableData.subjects),
  },
  daycare: {
    overview: async () => (await axiosInstance.get('/v1/daycare/present-now')).data.data,
    createClass: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/daycare/classes', payload)).data.data,
    updateClass: async (classId: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/daycare/classes/${classId}`, payload)).data.data,
    deleteClass: async (classId: string) =>
      (await axiosInstance.delete(`/v1/daycare/classes/${classId}`)).data.data,
    createPolicy: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/daycare/policies', payload)).data.data,
    deletePolicy: async (index: number) =>
      (await axiosInstance.delete(`/v1/daycare/policies/${index}`)).data.data,
    createMilestoneBand: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/daycare/milestone-bands', payload)).data.data,
    deleteMilestoneBand: async (id: string) =>
      (await axiosInstance.delete(`/v1/daycare/milestone-bands/${id}`)).data.data,
    updateSettings: async (payload: Record<string, unknown>) =>
      (await axiosInstance.patch('/v1/daycare/settings', payload)).data.data,
  },
  tertiary: {
    overview: async () => (await axiosInstance.get('/v1/tertiary/overview')).data.data,
    createFaculty: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/faculties', payload)).data.data,
    createDepartment: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/departments', payload)).data.data,
    createProgram: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/programs', payload)).data.data,
    studentRegistration: async (studentId: string) =>
      (await axiosInstance.get(`/v1/tertiary/student-registration/${studentId}`)).data.data,
    registerCourses: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/course-registration', payload)).data.data,
  },
  users: {
    list: async () => (await axiosInstance.get('/v1/users')).data.data,
    create: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/users', payload)).data.data,
    searchParents: async (search: string, limit = 20) =>
      (
        await axiosInstance.get('/v1/users/parents', {
          params: { search, limit },
        })
      ).data.data,
  },
  superAdmin: {
    users: async () => (await axiosInstance.get('/super-admin/users')).data.data,
    createUser: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/super-admin/users', payload)).data.data,
    institutions: async () => (await axiosInstance.get('/super-admin/institutions')).data.data,
    institutionDetail: async (id: string) =>
      (await axiosInstance.get(`/super-admin/institutions/${id}`)).data.data,
    onboardInstitution: async (payload: unknown) =>
      (await axiosInstance.post('/super-admin/institutions', payload)).data.data,
    suspendInstitution: async (id: string) =>
      (await axiosInstance.put(`/super-admin/institutions/${id}/suspend`)).data.data,
    extendTrial: async (id: string, days = 14) =>
      (await axiosInstance.post(`/super-admin/institutions/${id}/trial`, { days })).data.data,
    analytics: () =>
      safeRequest(
        async () => (await axiosInstance.get('/super-admin/analytics')).data.data,
        superAdminData.analytics
      ),
    auditLogs: (filters?: { action?: string; resource_type?: string }) =>
      safeRequest(
        async () =>
          (
            await axiosInstance.get('/super-admin/audit-logs', {
              params: filters,
            })
          ).data.data,
        superAdminData.auditLogs
      ),
  },
};
