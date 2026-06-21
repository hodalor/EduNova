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
  studentsData,
  academicStructureData,
  attendanceData,
  superAdminData,
  tertiaryRegistrationData,
  tertiaryData,
  timetableData,
  userManagementData,
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
    }): Promise<LoginResponse> =>
      safeRequest(
        async () => {
          const { data } = await authApi.post('/auth/login', payload);
          return data.data || data;
        },
        selectLoginFallback(payload)
      ),
    superAdminLogin: async (payload: {
      identity: string;
      password: string;
      institution_code: string;
    }): Promise<LoginResponse> =>
      safeRequest(
        async () => {
          const { data } = await authApi.post('/auth/login', payload);
          return data.data || data;
        },
        demoSuperAdminLoginResponse
      ),
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
    list: () => safeRequest(async () => (await axiosInstance.get('/students')).data.data, studentsData.list),
    detail: (id: string) =>
      safeRequest(async () => (await axiosInstance.get(`/students/${id}`)).data.data, studentsData.detail),
    create: async (payload: unknown) => {
      await wait(400);
      return payload;
    },
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
    structure: () =>
      safeRequest(async () => (await axiosInstance.get('/academics/structure')).data.data, academicStructureData),
    createGroup: async (payload: Record<string, unknown>) =>
      safeRequest(async () => (await axiosInstance.post('/academics/groups', payload)).data.data, {
        id: `grp-${Date.now()}`,
        ...payload,
      }),
    createPeriod: async (payload: Record<string, unknown>) =>
      safeRequest(async () => (await axiosInstance.post('/academics/periods', payload)).data.data, {
        id: `prd-${Date.now()}`,
        ...payload,
      }),
    createOffering: async (payload: Record<string, unknown>) =>
      safeRequest(async () => (await axiosInstance.post('/academics/offerings', payload)).data.data, {
        id: `off-${Date.now()}`,
        ...payload,
      }),
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
    overview: () =>
      safeRequest(async () => (await axiosInstance.get('/v1/tertiary/programs')).data.data, tertiaryData),
    studentRegistration: (studentId: string) =>
      safeRequest(
        async () => (await axiosInstance.get(`/v1/tertiary/student-registration/${studentId}`)).data.data,
        tertiaryRegistrationData
      ),
    registerCourses: async (payload: Record<string, unknown>) =>
      safeRequest(async () => (await axiosInstance.post('/v1/tertiary/course-registration', payload)).data.data, {
        id: `reg-${Date.now()}`,
        registered_at: new Date().toISOString(),
        ...payload,
      }),
  },
  users: {
    list: () =>
      safeRequest(async () => (await axiosInstance.get('/v1/users')).data.data, userManagementData.users),
    create: async (payload: Record<string, unknown>) =>
      safeRequest(
        async () => (await axiosInstance.post('/v1/users', payload)).data.data,
        {
          id: `usr-${Date.now()}`,
          status: 'pending_activation',
          ...payload,
        }
      ),
  },
  superAdmin: {
    institutions: () =>
      safeRequest(
        async () => (await axiosInstance.get('/super-admin/institutions')).data.data,
        superAdminData.institutions
      ),
    institutionDetail: (id: string) =>
      safeRequest(
        async () => (await axiosInstance.get(`/super-admin/institutions/${id}`)).data.data,
        superAdminData.institutions.find((item) => item.id === id) || superAdminData.institutions[0]
      ),
    onboardInstitution: async (payload: unknown) =>
      safeRequest(
        async () => (await axiosInstance.post('/super-admin/institutions', payload)).data.data,
        payload
      ),
    suspendInstitution: async (id: string) =>
      safeRequest(
        async () => (await axiosInstance.put(`/super-admin/institutions/${id}/suspend`)).data.data,
        { id, status: 'suspended' }
      ),
    extendTrial: async (id: string, days = 14) =>
      safeRequest(
        async () => (await axiosInstance.post(`/super-admin/institutions/${id}/trial`, { days })).data.data,
        { id, days }
      ),
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
