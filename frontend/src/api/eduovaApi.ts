import axios from 'axios';
import axiosInstance, { authApi } from './axiosInstance';
import type { LoginResponse } from '../types/auth';

async function requestOrDefault<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (axios.isAxiosError(error) && [404, 501].includes(error.response?.status || 0)) {
      return fallback;
    }
    throw error;
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown): number => Number(value) || 0;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

interface AcademicAssessmentRecord {
  id: string;
  className: string;
  levelName: string;
  subject: string;
  courseName: string;
  term: string;
  semesterName: string;
  assessment: string;
  max_score: number;
  class_id?: string;
  subject_id?: string;
  level_code?: string;
  credit_hours?: number | null;
}

export interface UploadedMedia {
  bucket: string;
  path: string;
  fullPath?: string;
  fileName: string;
  mimeType: string;
  size: number;
  visibility: string;
  url: string;
}

export interface LearningCourse {
  id: string;
  code: string;
  name: string;
  course_type?: string;
  credit_hours?: number;
  program_id?: string | null;
  program_name?: string | null;
  group_id?: string;
  group_name?: string;
  period_id?: string;
  period_name?: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  description?: string | null;
  material_type: string;
  course_id: string;
  course_code: string;
  course_name: string;
  program_name?: string | null;
  group_name?: string | null;
  period_name?: string | null;
  attachment_url: string;
  attachment_name?: string;
  attachment_mime_type?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

export interface LearningQuestion {
  id: string;
  type: 'objective' | 'theory' | string;
  prompt: string;
  options: string[];
  correct_answer?: string;
  model_answer?: string | null;
  max_score: number;
}

export interface LearningAssessment {
  id: string;
  title: string;
  instructions?: string | null;
  assessment_type: string;
  course_id: string;
  course_code: string;
  course_name: string;
  program_name?: string | null;
  group_name?: string | null;
  period_name?: string | null;
  duration_minutes?: number;
  due_at?: string | null;
  is_published?: boolean;
  attempts_allowed?: number;
  total_score?: number;
  questions: LearningQuestion[];
  created_at?: string;
  created_by_name?: string;
}

export interface LearningSubmissionAnswer {
  question_id: string;
  prompt: string;
  type: string;
  response: string | string[];
  max_score: number;
  awarded_score: number | null;
  is_correct: boolean | null;
}

export interface LearningSubmission {
  id: string;
  assessment_id: string;
  assessment_title: string;
  course_id: string;
  course_code: string;
  course_name: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  answers: LearningSubmissionAnswer[];
  auto_score: number;
  final_score: number | null;
  max_score: number;
  status: string;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
}

const normalizeAcademicNames = (payload: unknown): Record<string, unknown> => {
  const item = asRecord(payload);
  const className = asString(item.className, asString(item.class_name, asString(item.levelName, '-')));
  const subject = asString(item.subject, asString(item.courseName, ''));
  const term = asString(item.term, asString(item.term_name, asString(item.semesterName, '')));

  return {
    ...item,
    className,
    levelName: asString(item.levelName, className),
    subject,
    courseName: asString(item.courseName, subject),
    term,
    semesterName: asString(item.semesterName, term),
  };
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
        const item = normalizeAcademicNames(entry);
        return {
          id: asString(item.id, `payment-${index + 1}`),
          student: asString(item.student, asString(item.studentName, 'Student')),
          className: asString(item.className, '-'),
          levelName: asString(item.levelName, asString(item.className, '-')),
          amount: asNumber(item.amount),
          currencyCode: asString(item.currencyCode, asString(item.currency_code, '')),
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
    getOverview: async () =>
      normalizeDashboardOverview((await axiosInstance.get('/analytics/overview')).data.data),
    getFinance: async () => {
      try {
        const response = await axiosInstance.get('/analytics/finance/revenue');
        return response.data.data || {};
      } catch (error) {
        throw error;
      }
    },
    getAcademics: async () => (await axiosInstance.get('/analytics/academics/performance')).data.data,
    getAttendance: async () => (await axiosInstance.get('/analytics/attendance/rate')).data.data,
    getEnrollment: async () => (await axiosInstance.get('/analytics/enrollment-trend')).data.data,
    getAlerts: async () => (await axiosInstance.get('/analytics/alerts/active')).data.data,
  },
  media: {
    upload: async (payload: {
      file: File;
      folder?: string;
      bucketName?: string;
      visibility?: 'public' | 'private';
    }): Promise<UploadedMedia> => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.folder) {
        formData.append('folder', payload.folder);
      }
      if (payload.bucketName) {
        formData.append('bucketName', payload.bucketName);
      }
      formData.append('visibility', payload.visibility || 'public');

      try {
        return (await axiosInstance.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.post('/v1/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })).data.data;
        }
        throw error;
      }
    },
  },
  learning: {
    courses: async (): Promise<LearningCourse[]> =>
      (await axiosInstance.get('/v1/learning/courses')).data.data,
    materials: async (courseId?: string): Promise<LearningMaterial[]> =>
      (
        await axiosInstance.get('/v1/learning/materials', {
          params: courseId ? { course_id: courseId } : undefined,
        })
      ).data.data,
    createMaterial: async (payload: Record<string, unknown>): Promise<LearningMaterial> =>
      (await axiosInstance.post('/v1/learning/materials', payload)).data.data,
    assessments: async (courseId?: string): Promise<LearningAssessment[]> =>
      (
        await axiosInstance.get('/v1/learning/assessments', {
          params: courseId ? { course_id: courseId } : undefined,
        })
      ).data.data,
    createAssessment: async (payload: Record<string, unknown>): Promise<LearningAssessment> =>
      (await axiosInstance.post('/v1/learning/assessments', payload)).data.data,
    assessmentSubmissions: async (assessmentId: string): Promise<LearningSubmission[]> =>
      (await axiosInstance.get(`/v1/learning/assessments/${assessmentId}/submissions`)).data.data,
    submitAssessment: async (
      assessmentId: string,
      payload: Record<string, unknown>
    ): Promise<LearningSubmission> =>
      (await axiosInstance.post(`/v1/learning/assessments/${assessmentId}/submissions`, payload)).data.data,
    gradeSubmission: async (
      submissionId: string,
      payload: Record<string, unknown>
    ): Promise<LearningSubmission> =>
      (await axiosInstance.post(`/v1/learning/submissions/${submissionId}/grade`, payload)).data.data,
    myResults: async (): Promise<LearningSubmission[]> =>
      (await axiosInstance.get('/v1/learning/results/me')).data.data,
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
    deleted: async () => {
      try {
        return (await axiosInstance.get('/students/deleted')).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.get('/v1/students/deleted')).data.data;
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
    delete: async (id: string) => {
      try {
        return (await axiosInstance.delete(`/students/${id}`)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.delete(`/v1/students/${id}`)).data.data;
        }
        throw error;
      }
    },
    restore: async (id: string) => {
      try {
        return (await axiosInstance.post(`/students/${id}/restore`)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.post(`/v1/students/${id}/restore`)).data.data;
        }
        throw error;
      }
    },
    deletePermanent: async (id: string) => {
      try {
        return (await axiosInstance.delete(`/students/${id}/permanent`)).data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return (await axiosInstance.delete(`/v1/students/${id}/permanent`)).data.data;
        }
        throw error;
      }
    },
  },
  finance: {
    settings: async () => (await axiosInstance.get('/finance/settings')).data.data,
    updateSettings: async (payload: Record<string, unknown>) =>
      (await axiosInstance.patch('/finance/settings', payload)).data.data,
    dashboard: async () => (await axiosInstance.get('/finance/dashboard')).data.data,
    invoices: async () => (await axiosInstance.get('/finance/invoices')).data.data,
    createInvoice: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/invoices', payload)).data.data,
    payments: async () => (await axiosInstance.get('/finance/payments')).data.data,
    recordPayment: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payments', payload)).data.data,
    paymentApprovals: async () => (await axiosInstance.get('/finance/payment-approvals')).data.data,
    initiatePaymentApproval: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payment-approvals', payload)).data.data,
    approvePaymentApproval: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.post(`/finance/payment-approvals/${id}/action`, payload)).data.data,
    paymentGatewayRequests: async () =>
      (await axiosInstance.get('/finance/payment-channels/requests')).data.data,
    lookupPaymentAccount: async (identifier: string) =>
      (await axiosInstance.get('/finance/payment-channels/account', { params: { identifier } })).data
        .data,
    initiateGatewayPayment: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payment-channels/initiate', payload)).data.data,
    handleGatewayCallback: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/finance/payment-channels/callback', payload)).data.data,
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
    updateGroup: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.put(`/v1/academics/groups/${id}`, payload)).data.data,
    deleteGroup: async (id: string) =>
      (await axiosInstance.delete(`/v1/academics/groups/${id}`)).data.data,
    createPeriod: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/periods', payload)).data.data,
    updatePeriod: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.put(`/v1/academics/periods/${id}`, payload)).data.data,
    deletePeriod: async (id: string) =>
      (await axiosInstance.delete(`/v1/academics/periods/${id}`)).data.data,
    createOffering: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/offerings', payload)).data.data,
    updateOffering: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.put(`/v1/academics/offerings/${id}`, payload)).data.data,
    deleteOffering: async (id: string) =>
      (await axiosInstance.delete(`/v1/academics/offerings/${id}`)).data.data,
    saveScores: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/academics/scores', payload)).data.data,
    assessments: async (): Promise<AcademicAssessmentRecord[]> => {
      const data = (await axiosInstance.get('/v1/academics/assessments')).data.data;
      return Array.isArray(data)
        ? data.map((item, index) => {
            const normalized = normalizeAcademicNames(item);
            return {
              id: asString(normalized.id, `assessment-${index + 1}`),
              className: asString(normalized.className, '-'),
              levelName: asString(normalized.levelName, asString(normalized.className, '-')),
              subject: asString(normalized.subject, ''),
              courseName: asString(normalized.courseName, asString(normalized.subject, '')),
              term: asString(normalized.term, ''),
              semesterName: asString(normalized.semesterName, asString(normalized.term, '')),
              assessment: asString(normalized.assessment, 'Assessment'),
              max_score: asNumber(normalized.max_score),
              class_id: asString(normalized.class_id, '') || undefined,
              subject_id: asString(normalized.subject_id, '') || undefined,
              level_code: asString(normalized.level_code, '') || undefined,
              credit_hours:
                normalized.credit_hours === null || normalized.credit_hours === undefined
                  ? null
                  : asNumber(normalized.credit_hours),
            };
          })
        : [];
    },
    gradeScales: async (levelCode?: string) =>
      (
        await axiosInstance.get('/v1/academics/grade-scales', {
          params: levelCode ? { level_code: levelCode } : undefined,
        })
      ).data.data,
    updateGradeScale: async (payload: Record<string, unknown>) =>
      (await axiosInstance.put('/v1/academics/grade-scales', payload)).data.data,
    reportCards: async () => (await axiosInstance.get('/v1/academics/report-cards')).data.data,
    transitionReportCard: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.post(`/v1/academics/report-cards/${id}/workflow`, payload)).data.data,
    publishReportCard: async (id: string) =>
      (await axiosInstance.put(`/v1/academics/report-cards/${id}/publish`)).data.data,
    gradebook: async () => (await axiosInstance.get('/v1/academics/gradebook')).data.data,
  },
  attendance: {
    taking: () => requestOrDefault(async () => (await axiosInstance.get('/attendance/today')).data.data, []),
    report: async () => (await axiosInstance.get('/attendance/report')).data.data,
  },
  timetable: {
    grid: async () => (await axiosInstance.get('/timetable')).data.data,
    subjects: () =>
      requestOrDefault(async () => (await axiosInstance.get('/timetable/config')).data.data, []),
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
    updateFaculty: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/tertiary/faculties/${id}`, payload)).data.data,
    deleteFaculty: async (id: string) =>
      (await axiosInstance.delete(`/v1/tertiary/faculties/${id}`)).data.data,
    createDepartment: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/departments', payload)).data.data,
    updateDepartment: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/tertiary/departments/${id}`, payload)).data.data,
    deleteDepartment: async (id: string) =>
      (await axiosInstance.delete(`/v1/tertiary/departments/${id}`)).data.data,
    createProgram: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/programs', payload)).data.data,
    updateProgram: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/tertiary/programs/${id}`, payload)).data.data,
    deleteProgram: async (id: string) =>
      (await axiosInstance.delete(`/v1/tertiary/programs/${id}`)).data.data,
    updateProgressionPolicy: async (payload: Record<string, unknown>) =>
      (await axiosInstance.patch('/v1/tertiary/progression-policy', payload)).data.data,
    updateFinancePolicy: async (payload: Record<string, unknown>) =>
      (await axiosInstance.patch('/v1/tertiary/finance-policy', payload)).data.data,
    updateStudentProgress: async (studentId: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/tertiary/student-progress/${studentId}`, payload)).data.data,
    studentRegistration: async (studentId: string) =>
      (await axiosInstance.get(`/v1/tertiary/student-registration/${studentId}`)).data.data,
    transcript: async (studentId: string) =>
      (await axiosInstance.get(`/v1/tertiary/transcript/${studentId}`)).data.data,
    verifyTranscript: async (code: string) =>
      (await authApi.get(`/v1/tertiary/transcript-verify/${encodeURIComponent(code)}`)).data.data,
    registerCourses: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/tertiary/course-registration', payload)).data.data,
  },
  users: {
    list: async () => (await axiosInstance.get('/v1/users')).data.data,
    create: async (payload: Record<string, unknown>) =>
      (await axiosInstance.post('/v1/users', payload)).data.data,
    update: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/users/${id}`, payload)).data.data,
    updateAccess: async (id: string, payload: Record<string, unknown>) =>
      (await axiosInstance.patch(`/v1/users/${id}/access`, payload)).data.data,
    delete: async (id: string) => (await axiosInstance.delete(`/v1/users/${id}`)).data.data,
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
    analytics: async () => (await axiosInstance.get('/super-admin/analytics')).data.data,
    auditLogs: (filters?: { action?: string; resource_type?: string }) =>
      requestOrDefault(
        async () =>
          (
            await axiosInstance.get('/super-admin/audit-logs', {
              params: filters,
            })
          ).data.data,
        []
      ),
  },
};
