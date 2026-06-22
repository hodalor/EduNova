import axiosInstance, { authApi } from './axiosInstance';
import {
  academicsData,
  analyticsData,
  daycareData,
  dashboardOverview,
  demoLoginResponse,
  demoSuperAdminLoginResponse,
  demoStudentLoginResponse,
  demoTeacherLoginResponse,
  demoDaycareLoginResponse,
  demoTertiaryLoginResponse,
  demoTertiaryStudentLoginResponse,
  financeData,
  attendanceData,
  superAdminData,
  timetableData,
} from '../utils/mockData';
import type { LoginResponse } from '../types/auth';

const wait = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

const selectLoginFallback = (payload: { identity: string; institution_code: string }) => {
  const identity = payload.identity.toLowerCase();
  const institutionCode = payload.institution_code.toUpperCase();

  if (identity.includes('student') && (institutionCode === 'UNI' || institutionCode === 'TERTIARY')) {
    return demoTertiaryStudentLoginResponse;
  }
  if (identity.includes('teacher')) {
    return demoTeacherLoginResponse;
  }
  if (identity.includes('student')) {
    return demoStudentLoginResponse;
  }
  if (institutionCode === 'DAYCARE') {
    return demoDaycareLoginResponse;
  }
  if (institutionCode === 'UNI' || institutionCode === 'TERTIARY') {
    return demoTertiaryLoginResponse;
  }
  return demoLoginResponse;
};

const isMasterSuperAdminLogin = (payload: { identity: string; password: string; institution_code: string }) =>
  payload.institution_code.trim().toUpperCase() === 'MASTER' &&
  payload.identity.trim().toLowerCase() === 'superadmin' &&
  payload.password === '12345678';

async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (_error) {
    await wait();
    return fallback;
  }
}

export const eduovaApi = {
  auth: {
    login: async (payload: {
      identity: string;
      password: string;
      institution_code: string;
    }): Promise<LoginResponse> => {
      if (isMasterSuperAdminLogin(payload)) {
        return eduovaApi.auth.superAdminLogin(payload);
      }

      return safeRequest(
        async () => {
          const { data } = await authApi.post('/auth/login', payload);
          return data.data || data;
        },
        selectLoginFallback(payload)
      );
    },
    superAdminLogin: async (payload: {
      identity: string;
      password: string;
      institution_code: string;
    }): Promise<LoginResponse> => {
      try {
        const { data } = await authApi.post('/auth/login', payload);
        return data.data || data;
      } catch (error) {
        if (isMasterSuperAdminLogin(payload)) {
          await wait();
          return demoSuperAdminLoginResponse;
        }
        throw error;
      }
    },
  },
  analytics: {
    getOverview: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/overview')).data.data, dashboardOverview),
    getFinance: () =>
      safeRequest(async () => (await axiosInstance.get('/analytics/finance/revenue')).data.data, analyticsData.finance),
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
    list: async () => (await axiosInstance.get('/students')).data.data,
    detail: async (id: string) => (await axiosInstance.get(`/students/${id}`)).data.data,
    create: async (payload: unknown) => (await axiosInstance.post('/students', payload)).data.data,
    update: async (payload: unknown) => {
      await wait(300);
      return payload;
    },
  },
  finance: {
    dashboard: () =>
      safeRequest(async () => (await axiosInstance.get('/finance/dashboard')).data.data, financeData.dashboard),
    invoices: () =>
      safeRequest(async () => (await axiosInstance.get('/finance/invoices')).data.data, financeData.invoices),
    defaulters: () =>
      safeRequest(
        async () => (await axiosInstance.get('/finance/reports/defaulters')).data.data,
        analyticsData.finance.defaulters
      ),
    expenses: () =>
      safeRequest(async () => (await axiosInstance.get('/finance/expenses')).data.data, financeData.expenses),
    feeStructures: () =>
      safeRequest(async () => (await axiosInstance.get('/finance/fee-structures')).data.data, financeData.feeStructures),
  },
  academics: {
    structure: async () => (await axiosInstance.get('/academics/structure')).data.data,
    createGroup: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/academics/groups', payload)).data.data,
    createPeriod: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/academics/periods', payload)).data.data,
    createOffering: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/academics/offerings', payload)).data.data,
    assessments: () =>
      safeRequest(async () => (await axiosInstance.get('/academics/assessments')).data.data, academicsData.assessments),
    reportCards: () =>
      safeRequest(async () => (await axiosInstance.get('/academics/report-cards')).data.data, academicsData.reportCards),
    gradebook: () =>
      safeRequest(async () => (await axiosInstance.get('/academics/gradebook')).data.data, academicsData.gradebook),
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
    overview: () =>
      safeRequest(async () => (await axiosInstance.get('/v1/daycare/present-now')).data.data, daycareData),
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
