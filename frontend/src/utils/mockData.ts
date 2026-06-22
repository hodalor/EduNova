import type { LoginResponse } from '../types/auth';

export const demoLoginResponse: LoginResponse = {
  user: {
    id: 'usr-001',
    first_name: 'Amina',
    last_name: 'Owusu',
    email: 'admin@eduova.test',
    role: 'institution_admin',
    institution_id: 'inst-001',
    phone: '+233200000001',
    profile_photo: null,
  },
  institution: {
    id: 'inst-001',
    name: 'EDUOVA Academy',
    code: 'EDUOVA',
    subscription_plan: 'enterprise',
    education_levels: ['PR', 'JH', 'SH'],
    settings: {},
  },
  permissions: ['dashboard:read', 'students:*', 'finance:*', 'analytics:*', 'attendance:*'],
  tokens: {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 900,
  },
};

export const demoTeacherLoginResponse: LoginResponse = {
  user: {
    id: 'usr-teacher-001',
    first_name: 'Kojo',
    last_name: 'Addo',
    email: 'teacher@eduova.test',
    role: 'teacher',
    institution_id: 'inst-001',
    phone: '+233200000010',
    profile_photo: null,
  },
  institution: {
    id: 'inst-001',
    name: 'EDUOVA Academy',
    code: 'EDUOVA',
    subscription_plan: 'enterprise',
    education_levels: ['PR', 'JH', 'SH'],
    settings: {},
  },
  permissions: ['academics:read', 'academics:write', 'attendance:read', 'attendance:write', 'communication:read', 'communication:write', 'timetable:read'],
  tokens: {
    access_token: 'demo-teacher-access-token',
    refresh_token: 'demo-teacher-refresh-token',
    expires_in: 900,
  },
};

export const demoStudentLoginResponse: LoginResponse = {
  user: {
    id: 'usr-student-001',
    first_name: 'Elikem',
    last_name: 'Mensah',
    email: 'student@eduova.test',
    role: 'student',
    institution_id: 'inst-001',
    phone: '+233200000011',
    profile_photo: null,
  },
  institution: {
    id: 'inst-001',
    name: 'EDUOVA Academy',
    code: 'EDUOVA',
    subscription_plan: 'enterprise',
    education_levels: ['PR', 'JH', 'SH'],
    settings: {},
  },
  permissions: ['academics:read', 'attendance:read', 'communication:read', 'timetable:read', 'transport:read'],
  tokens: {
    access_token: 'demo-student-access-token',
    refresh_token: 'demo-student-refresh-token',
    expires_in: 900,
  },
};

export const demoTertiaryStudentLoginResponse: LoginResponse = {
  user: {
    id: 'usr-tertiary-student-001',
    first_name: 'Nana',
    last_name: 'Kwesi',
    email: 'student@uni.test',
    role: 'student',
    institution_id: 'inst-tertiary-001',
    phone: '+233200000014',
    profile_photo: null,
  },
  institution: {
    id: 'inst-tertiary-001',
    name: 'EDUOVA University College',
    code: 'UNI',
    subscription_plan: 'enterprise',
    education_levels: ['TR'],
    settings: {
      tertiary: {
        calendar_model: 'semester',
        credentials: ['certificate', 'diploma', 'degree', 'masters', 'phd'],
        id_format: 'FAC/DEPT/YEAR/SEQ',
      },
    },
  },
  permissions: ['academics:read', 'attendance:read', 'communication:read', 'timetable:read'],
  tokens: {
    access_token: 'demo-tertiary-student-access-token',
    refresh_token: 'demo-tertiary-student-refresh-token',
    expires_in: 900,
  },
};

export const demoDaycareLoginResponse: LoginResponse = {
  user: {
    id: 'usr-daycare-001',
    first_name: 'Mabel',
    last_name: 'Owusu',
    email: 'admin@daycare.test',
    role: 'institution_admin',
    institution_id: 'inst-daycare-001',
    phone: '+233200000012',
    profile_photo: null,
  },
  institution: {
    id: 'inst-daycare-001',
    name: 'Little Stars Daycare',
    code: 'DAYCARE',
    subscription_plan: 'starter',
    education_levels: ['DC', 'PR'],
    settings: {
      daycare: {
        pickup_pin_required: true,
        session_model: 'halfDay',
      },
    },
  },
  permissions: ['admissions:*', 'attendance:*', 'communication:*', 'transport:*', 'finance:*'],
  tokens: {
    access_token: 'demo-daycare-access-token',
    refresh_token: 'demo-daycare-refresh-token',
    expires_in: 900,
  },
};

export const demoTertiaryLoginResponse: LoginResponse = {
  user: {
    id: 'usr-tertiary-001',
    first_name: 'Registrar',
    last_name: 'Mensah',
    email: 'admin@uni.test',
    role: 'institution_admin',
    institution_id: 'inst-tertiary-001',
    phone: '+233200000013',
    profile_photo: null,
  },
  institution: {
    id: 'inst-tertiary-001',
    name: 'EDUOVA University College',
    code: 'UNI',
    subscription_plan: 'enterprise',
    education_levels: ['TR'],
    settings: {
      tertiary: {
        calendar_model: 'semester',
        credentials: ['certificate', 'diploma', 'degree', 'masters', 'phd'],
        id_format: 'FAC/DEPT/YEAR/SEQ',
      },
    },
  },
  permissions: ['admissions:*', 'academics:*', 'finance:*', 'communication:*', 'attendance:*'],
  tokens: {
    access_token: 'demo-tertiary-access-token',
    refresh_token: 'demo-tertiary-refresh-token',
    expires_in: 900,
  },
};

export const demoSuperAdminLoginResponse: LoginResponse = {
  user: {
    id: 'usr-super-master',
    first_name: 'Master',
    last_name: 'Operator',
    email: 'superadmin@eduova.test',
    username: 'superadmin',
    role: 'super_admin',
    institution_id: 'platform',
    phone: '+233200000099',
    profile_photo: null,
  },
  institution: {
    id: 'platform',
    name: 'EDUOVA Master Control',
    code: 'MASTER',
    subscription_plan: 'enterprise',
    education_levels: ['DC', 'PR', 'JH', 'SH', 'TR'],
    settings: {
      platform: {
        god_mode: true,
        cluster: {
          cluster_name: 'eduova_test-cluster',
          engine: 'postgresql',
          host: '127.0.0.1',
          port: 5432,
          strategy: 'single_cluster_multi_database',
        },
      },
    },
  },
  permissions: ['*:*'],
  tokens: {
    access_token: 'demo-super-access-token',
    refresh_token: 'demo-super-refresh-token',
    expires_in: 900,
  },
};

export const superAdminData = {
  institutions: [
    {
      id: 'test-inst',
      name: 'EDUOVA Academy',
      code: 'EDUOVA',
      subscription_plan: 'enterprise',
      education_levels: ['PR', 'JH', 'SH'],
      status: 'active',
      active_students: 2,
      active_staff: 24,
      monthly_revenue: 12000,
      trial_ends_at: '2026-07-31T23:59:59.000Z',
      settings: {
        tenant_database: {
          cluster_name: 'eduova_test-cluster',
          database_name: 'eduova_eduova',
          database_user: 'postgres',
          schema_name: 'public',
          provision_status: 'provisioned',
        },
        workspace_profile: {
          label: 'basic_secondary',
          menus: ['admissions', 'students', 'academics', 'attendance', 'finance', 'communication'],
        },
      },
    },
    {
      id: 'inst-growth',
      name: 'North Ridge School',
      code: 'NRS',
      subscription_plan: 'growth',
      education_levels: ['DC', 'PR'],
      status: 'trial',
      active_students: 612,
      active_staff: 51,
      monthly_revenue: 4500,
      trial_ends_at: '2026-07-15T23:59:59.000Z',
      settings: {
        tenant_database: {
          cluster_name: 'eduova_test-cluster',
          database_name: 'eduova_nrs',
          database_user: 'postgres',
          schema_name: 'public',
          provision_status: 'provisioned',
        },
        workspace_profile: {
          label: 'daycare_primary',
          menus: ['admissions', 'students', 'attendance', 'communication', 'transport', 'finance'],
        },
      },
    },
  ],
  analytics: {
    total_schools: 2,
    active_schools: 1,
    trial_schools: 1,
    total_students: 614,
    monthly_recurring_revenue: 16500,
    churn_rate: 1.2,
    monthly_active_users: 2840,
    growth_rate: 14.8,
  },
  auditLogs: [
    {
      id: 'plat-audit-001',
      action: 'CREATE',
      resource_type: 'institution',
      resource_id: 'test-inst',
      actor_name: 'Platform Ops',
      actor_role: 'super_admin',
      created_at: '2026-06-02T10:00:00.000Z',
      summary: 'Onboarded EDUOVA Academy',
    },
    {
      id: 'plat-audit-002',
      action: 'UPDATE',
      resource_type: 'institution_trial',
      resource_id: 'inst-growth',
      actor_name: 'Platform Ops',
      actor_role: 'super_admin',
      created_at: '2026-06-18T15:30:00.000Z',
      summary: 'Extended trial for North Ridge School',
    },
  ],
};

export const tertiaryData = {
  faculties: [
    { id: 'fac-001', name: 'Faculty of Computing', dean: 'Dr. N. Asare', departments: 3 },
    { id: 'fac-002', name: 'Faculty of Business', dean: 'Prof. A. Mensah', departments: 2 },
  ],
  departments: [
    { id: 'dep-001', faculty: 'Faculty of Computing', name: 'Computer Science', code: 'CSC' },
    { id: 'dep-002', faculty: 'Faculty of Computing', name: 'Information Systems', code: 'INS' },
    { id: 'dep-003', faculty: 'Faculty of Business', name: 'Accounting', code: 'ACC' },
  ],
  programs: [
    { id: 'prog-001', name: 'BSc Computer Science', credential: 'degree', duration: '4 years', calendar: 'semester' },
    { id: 'prog-002', name: 'Diploma in Accounting', credential: 'diploma', duration: '2 years', calendar: 'trimester' },
    { id: 'prog-003', name: 'Certificate in Cybersecurity', credential: 'certificate', duration: '6 months', calendar: 'semester' },
    { id: 'prog-004', name: 'MSc Information Systems', credential: 'masters', duration: '18 months', calendar: 'semester' },
  ],
  progression: [
    'Promotion is based on passed registered courses, minimum GPA/CGPA thresholds, and fee clearance.',
    'Academic calendars vary by institution: semester, trimester, and short-course blocks are all supported.',
    'Student IDs are generated from configurable faculty, department, year, and sequential codes.',
  ],
};

export const academicStructureData = {
  groups: [
    {
      id: 'grp-pr5',
      name: 'PR 5 Gold',
      code: 'PR5-G',
      group_type: 'class',
      level_code: 'PR',
      calendar_type: 'term',
    },
    {
      id: 'grp-l100-cs',
      name: 'Level 100 Computer Science',
      code: 'L100-CS',
      group_type: 'level',
      level_code: 'TR',
      calendar_type: 'semester',
    },
  ],
  periods: [
    {
      id: 'prd-pr5-term1',
      group_id: 'grp-pr5',
      name: 'Term 1',
      sequence: 1,
      calendar_type: 'term',
      status: 'active',
      registration_open: true,
    },
    {
      id: 'prd-l100-sem1',
      group_id: 'grp-l100-cs',
      name: 'Semester 1',
      sequence: 1,
      calendar_type: 'semester',
      status: 'completed',
      registration_open: false,
    },
    {
      id: 'prd-l100-sem2',
      group_id: 'grp-l100-cs',
      name: 'Semester 2',
      sequence: 2,
      calendar_type: 'semester',
      status: 'active',
      registration_open: true,
    },
  ],
  offerings: [
    {
      id: 'off-pr5-math',
      group_id: 'grp-pr5',
      period_id: 'prd-pr5-term1',
      type: 'subject',
      code: 'MATH-PR5',
      name: 'Mathematics',
      credit_hours: null,
      is_core: true,
      prerequisite_codes: [],
      next_offering_codes: [],
    },
    {
      id: 'off-pr5-eng',
      group_id: 'grp-pr5',
      period_id: 'prd-pr5-term1',
      type: 'subject',
      code: 'ENG-PR5',
      name: 'English Language',
      credit_hours: null,
      is_core: true,
      prerequisite_codes: [],
      next_offering_codes: [],
    },
    {
      id: 'off-csc101',
      group_id: 'grp-l100-cs',
      period_id: 'prd-l100-sem1',
      type: 'course',
      code: 'CSC101',
      name: 'Introduction to Programming',
      credit_hours: 3,
      is_core: true,
      prerequisite_codes: [],
      next_offering_codes: ['CSC102'],
    },
    {
      id: 'off-mth101',
      group_id: 'grp-l100-cs',
      period_id: 'prd-l100-sem1',
      type: 'course',
      code: 'MTH101',
      name: 'Algebra for Computing',
      credit_hours: 3,
      is_core: true,
      prerequisite_codes: [],
      next_offering_codes: ['MTH201'],
    },
    {
      id: 'off-csc102',
      group_id: 'grp-l100-cs',
      period_id: 'prd-l100-sem2',
      type: 'course',
      code: 'CSC102',
      name: 'Data Structures',
      credit_hours: 3,
      is_core: true,
      prerequisite_codes: ['CSC101'],
      next_offering_codes: ['CSC201'],
    },
    {
      id: 'off-gst102',
      group_id: 'grp-l100-cs',
      period_id: 'prd-l100-sem2',
      type: 'course',
      code: 'GST102',
      name: 'Communication Skills',
      credit_hours: 2,
      is_core: true,
      prerequisite_codes: [],
      next_offering_codes: [],
    },
  ],
  progression_rules: [
    'Assign subjects to classes and terms for K-12 schools.',
    'Assign courses to levels and semesters for tertiary institutions.',
    'Only offerings under the current class/level and active period are shown to the student.',
  ],
};

export const tertiaryRegistrationData = {
  student_id: 'usr-tertiary-student-001',
  current_group: {
    id: 'grp-l100-cs',
    name: 'Level 100 Computer Science',
    code: 'L100-CS',
    group_type: 'level',
    level_code: 'TR',
    calendar_type: 'semester',
  },
  current_period: {
    id: 'prd-l100-sem2',
    name: 'Semester 2',
    sequence: 2,
    calendar_type: 'semester',
    status: 'active',
    registration_open: true,
  },
  fee_clearance: true,
  can_progress: true,
  outstanding_resit_codes: [],
  eligible_courses: [
    {
      id: 'off-csc102',
      code: 'CSC102',
      name: 'Data Structures',
      credit_hours: 3,
      prerequisite_codes: ['CSC101'],
      next_offering_codes: ['CSC201'],
    },
    {
      id: 'off-gst102',
      code: 'GST102',
      name: 'Communication Skills',
      credit_hours: 2,
      prerequisite_codes: [],
      next_offering_codes: [],
    },
  ],
  blocked_courses: [],
  next_period_preview: [
    {
      id: 'off-csc201',
      code: 'CSC201',
      name: 'Object Oriented Programming',
      credit_hours: 3,
      prerequisite_codes: ['CSC102'],
      next_offering_codes: [],
    },
  ],
  already_registered: [],
};

export const daycareData = {
  pickupPolicies: [
    'Guardian pickup PIN is required before release.',
    'Morning and afternoon attendance are tracked separately.',
    'Medical observations and milestone notes are logged per child.',
  ],
  milestones: [
    { ageBand: '0-2', focus: 'Motor and sensory development' },
    { ageBand: '2-4', focus: 'Speech, play, and social adaptation' },
    { ageBand: '4-5', focus: 'School readiness and behavior routines' },
  ],
};

export const userManagementData = {
  users: [
    {
      id: 'usr-admin-ops-001',
      first_name: 'Amina',
      last_name: 'Owusu',
      email: 'admin@eduova.test',
      phone: '+233200000001',
      role: 'institution_admin',
      staff_number: 'ADM-001',
      department: 'Administration',
      designation: 'Operations Administrator',
      employment_type: 'full_time',
      date_joined: '2026-01-10',
      status: 'active',
    },
    {
      id: 'usr-teacher-ops-001',
      first_name: 'Kojo',
      last_name: 'Addo',
      email: 'teacher@eduova.test',
      phone: '+233200000010',
      role: 'teacher',
      staff_number: 'TCH-014',
      department: 'Science',
      designation: 'Physics Teacher',
      employment_type: 'full_time',
      date_joined: '2026-02-01',
      status: 'active',
    },
    {
      id: 'usr-teacher-ops-002',
      first_name: 'Esi',
      last_name: 'Mensima',
      email: 'esi.mensima@eduova.test',
      phone: '+233200000015',
      role: 'teacher',
      staff_number: 'TCH-021',
      department: 'Primary',
      designation: 'Class Teacher',
      employment_type: 'contract',
      date_joined: '2026-03-14',
      status: 'pending_activation',
    },
  ],
};

export const dashboardOverview = {
  stats: [
    {
      id: 'students',
      label: 'Total Students',
      value: '3,842',
      icon: 'Users',
      trend: { value: 8.4, direction: 'up' as const, label: 'vs last month' },
    },
    {
      id: 'collection',
      label: 'Fee Collection Rate',
      value: '84.6%',
      icon: 'Wallet',
      trend: { value: 4.1, direction: 'up' as const, label: 'vs last month' },
    },
    {
      id: 'attendance',
      label: "Today's Attendance",
      value: '91.3%',
      icon: 'ClipboardCheck',
      trend: { value: 1.8, direction: 'down' as const, label: 'vs yesterday' },
    },
    {
      id: 'staff',
      label: 'Active Staff',
      value: '286',
      icon: 'ShieldCheck',
      trend: { value: 2.7, direction: 'up' as const, label: 'vs last month' },
    },
  ],
  revenueTrend: [
    { name: 'Jan', revenue: 120000, billed: 144000 },
    { name: 'Feb', revenue: 132000, billed: 149000 },
    { name: 'Mar', revenue: 141000, billed: 155000 },
    { name: 'Apr', revenue: 138000, billed: 160000 },
    { name: 'May', revenue: 152000, billed: 171000 },
    { name: 'Jun', revenue: 168000, billed: 176000 },
  ],
  enrollmentByLevel: [
    { level: 'DC', count: 420 },
    { level: 'PR', count: 1140 },
    { level: 'JH', count: 950 },
    { level: 'SH', count: 840 },
    { level: 'TR', count: 492 },
  ],
  recentPayments: [
    { id: 'pay-001', student: 'Elikem Mensah', className: 'SH 2 Science', amount: 2200, method: 'Mobile Money', receivedAt: '2026-06-19 10:42', status: 'verified' },
    { id: 'pay-002', student: 'Ama Tetteh', className: 'PR 5 Gold', amount: 850, method: 'Cash', receivedAt: '2026-06-19 09:28', status: 'verified' },
    { id: 'pay-003', student: 'Yaw Boateng', className: 'JH 1 Blue', amount: 650, method: 'Bank', receivedAt: '2026-06-18 16:19', status: 'pending' },
  ],
  alerts: [
    { id: 'alt-001', title: 'Collection rate below threshold', severity: 'warning', description: 'Primary level collection rate is at 58% for the current term.' },
    { id: 'alt-002', title: 'Chronic absentee detected', severity: 'error', description: '3 students in JH 2 have missed 5 consecutive days.' },
    { id: 'alt-003', title: 'Exam scores pending', severity: 'info', description: '14 assessment scores still need verification before report cards.' },
  ],
};

export const analyticsData = {
  finance: {
    revenueByMonth: [
      { month: 'Jan', revenue: 120000, target: 132000 },
      { month: 'Feb', revenue: 132000, target: 138000 },
      { month: 'Mar', revenue: 141000, target: 145000 },
      { month: 'Apr', revenue: 138000, target: 150000 },
      { month: 'May', revenue: 152000, target: 157000 },
      { month: 'Jun', revenue: 168000, target: 163000 },
    ],
    collectionRate: 84,
    expenseBreakdown: [
      { name: 'Transport', value: 18000 },
      { name: 'Payroll', value: 54000 },
      { name: 'Utilities', value: 12000 },
      { name: 'Supplies', value: 9400 },
    ],
    defaulters: [
      { id: 'stu-001', student: 'Afia Adjei', amount: 1200, daysOverdue: 14, className: 'PR 4 Emerald' },
      { id: 'stu-002', student: 'Kwame Ofori', amount: 2250, daysOverdue: 28, className: 'SH 1 Business' },
    ],
  },
  academics: {
    averageGrades: [
      { className: 'PR 6', average: 78, benchmark: 74 },
      { className: 'JH 1', average: 71, benchmark: 70 },
      { className: 'JH 3', average: 69, benchmark: 73 },
      { className: 'SH 2', average: 76, benchmark: 72 },
    ],
    passRates: [
      { subject: 'Mathematics', rate: 82 },
      { subject: 'English', rate: 89 },
      { subject: 'Science', rate: 78 },
      { subject: 'ICT', rate: 92 },
    ],
    atRisk: [
      { id: 'risk-001', student: 'Nii Lamptey', className: 'JH 2 Blue', average: 48, attendance: 72, risk: 'high' },
      { id: 'risk-002', student: 'Rahim Issah', className: 'SH 1 Science', average: 55, attendance: 78, risk: 'medium' },
    ],
  },
  attendance: {
    rate: [
      { day: 'Mon', rate: 94 },
      { day: 'Tue', rate: 92 },
      { day: 'Wed', rate: 88 },
      { day: 'Thu', rate: 91 },
      { day: 'Fri', rate: 93 },
    ],
    heatmap: [
      { day: 'Mon', slots: [1, 2, 0, 1, 2, 1] },
      { day: 'Tue', slots: [0, 1, 2, 2, 1, 0] },
      { day: 'Wed', slots: [2, 2, 3, 2, 1, 1] },
      { day: 'Thu', slots: [1, 1, 2, 1, 0, 0] },
      { day: 'Fri', slots: [0, 1, 1, 0, 1, 0] },
    ],
    chronicAbsentees: [
      { id: 'abs-001', student: 'Kojo Arthur', className: 'PR 5 Ruby', attendance: 64, consecutive: 4 },
      { id: 'abs-002', student: 'Susan Danquah', className: 'JH 1 Red', attendance: 71, consecutive: 3 },
    ],
  },
  enrollment: {
    trend: [
      { month: 'Jan', enrolled: 110 },
      { month: 'Feb', enrolled: 92 },
      { month: 'Mar', enrolled: 101 },
      { month: 'Apr', enrolled: 96 },
      { month: 'May', enrolled: 123 },
      { month: 'Jun', enrolled: 117 },
    ],
    levelDistribution: [
      { name: 'DC', value: 420 },
      { name: 'PR', value: 1140 },
      { name: 'JH', value: 950 },
      { name: 'SH', value: 840 },
      { name: 'TR', value: 492 },
    ],
    capacity: [
      { className: 'PR 4 Emerald', capacity: 40, enrolled: 37 },
      { className: 'JH 3 Gold', capacity: 38, enrolled: 38 },
      { className: 'SH 2 Science', capacity: 42, enrolled: 39 },
    ],
  },
  alerts: [
    { id: 'al-1', type: 'Financial', student: 'Afia Adjei', severity: 'warning', date: '2026-06-18', message: 'Invoice overdue by 14 days.' },
    { id: 'al-2', type: 'Attendance', student: 'Kojo Arthur', severity: 'danger', date: '2026-06-19', message: '3+ consecutive absences detected.' },
    { id: 'al-3', type: 'Academic', student: 'Nii Lamptey', severity: 'warning', date: '2026-06-16', message: 'Average score dropped by 18 points.' },
  ],
};

export const studentsData = {
  list: [
    { id: 'stu-001', name: 'Elikem Mensah', student_number: 'EDU-2026-0001', className: 'SH 2 Science', level: 'SH', status: 'active', photo: '', guardian: 'Grace Mensah' },
    { id: 'stu-002', name: 'Ama Tetteh', student_number: 'EDU-2026-0002', className: 'PR 5 Gold', level: 'PR', status: 'active', photo: '', guardian: 'Yaw Tetteh' },
    { id: 'stu-003', name: 'Fatima Noor', student_number: 'EDU-2026-0003', className: 'TR 1 B.Ed', level: 'TR', status: 'pending', photo: '', guardian: 'Hafsa Noor' },
    { id: 'stu-004', name: 'Kojo Arthur', student_number: 'EDU-2026-0004', className: 'JH 2 Blue', level: 'JH', status: 'inactive', photo: '', guardian: 'Mary Arthur' },
  ],
  detail: {
    id: 'stu-001',
    name: 'Elikem Mensah',
    student_number: 'EDU-2026-0001',
    className: 'SH 2 Science',
    level: 'SH',
    status: 'active',
    guardian: { name: 'Grace Mensah', phone: '+233240000111', relation: 'Mother' },
    medical: { allergies: 'Peanuts', bloodGroup: 'O+', notes: 'Carries inhaler.' },
    academicTrend: [
      { term: 'Term 1', gpa: 3.4 },
      { term: 'Term 2', gpa: 3.6 },
      { term: 'Term 3', gpa: 3.7 },
    ],
    attendanceCalendar: [
      { date: '2026-06-14', value: 1 },
      { date: '2026-06-15', value: 1 },
      { date: '2026-06-16', value: 0 },
      { date: '2026-06-17', value: 1 },
    ],
    invoices: [
      { invoice_number: 'INV-2026-0001', total: 2400, paid: 1800, balance: 600, status: 'partial' },
      { invoice_number: 'INV-2026-0002', total: 950, paid: 950, balance: 0, status: 'paid' },
    ],
    discipline: [{ id: 'inc-001', category: 'Late Coming', points: 2, date: '2026-05-22', status: 'resolved' }],
    documents: [
      { id: 'doc-001', name: 'Birth Certificate.pdf', type: 'PDF' },
      { id: 'doc-002', name: 'Midterm Report.pdf', type: 'PDF' },
    ],
  },
};

export const financeData = {
  dashboard: {
    stats: [
      { id: 'billed', label: 'Total Billed', value: 'GHS 412,000', icon: 'Receipt', trend: { value: 6.5, direction: 'up' as const, label: 'term to date' } },
      { id: 'collected', label: 'Total Collected', value: 'GHS 348,200', icon: 'Wallet', trend: { value: 5.2, direction: 'up' as const, label: 'term to date' } },
      { id: 'outstanding', label: 'Outstanding', value: 'GHS 63,800', icon: 'AlertTriangle', trend: { value: 2.1, direction: 'down' as const, label: 'from last week' } },
      { id: 'rate', label: 'Collection Rate', value: '84.5%', icon: 'PieChart', trend: { value: 1.8, direction: 'up' as const, label: 'from last month' } },
    ],
    revenueByWeek: [
      { week: 'Week 1', amount: 72000 },
      { week: 'Week 2', amount: 84000 },
      { week: 'Week 3', amount: 91000 },
      { week: 'Week 4', amount: 101200 },
    ],
  },
  invoices: [
    { id: 'inv-001', student: 'Elikem Mensah', className: 'SH 2 Science', invoice_number: 'INV-2026-001', total: 2400, paid: 1800, balance: 600, status: 'partial', due_date: '2026-06-28' },
    { id: 'inv-002', student: 'Ama Tetteh', className: 'PR 5 Gold', invoice_number: 'INV-2026-002', total: 950, paid: 950, balance: 0, status: 'paid', due_date: '2026-06-12' },
    { id: 'inv-003', student: 'Kojo Arthur', className: 'JH 2 Blue', invoice_number: 'INV-2026-003', total: 1180, paid: 500, balance: 680, status: 'overdue', due_date: '2026-06-01' },
  ],
  expenses: [
    { id: 'exp-001', category: 'Utilities', description: 'Power bill', amount: 3200, status: 'approved', date: '2026-06-11' },
    { id: 'exp-002', category: 'Transport', description: 'Fuel top-up', amount: 1880, status: 'pending', date: '2026-06-17' },
  ],
  feeStructures: [
    { id: 'fee-001', level: 'PR', className: 'All PR', term: 'Term 2', fee_type: 'Tuition', amount: 950, due_date: '2026-06-20' },
    { id: 'fee-002', level: 'SH', className: 'SH 2 Science', term: 'Term 2', fee_type: 'Exam', amount: 200, due_date: '2026-06-24' },
  ],
};

export const academicsData = {
  assessments: [
    { id: 'ass-001', className: 'SH 2 Science', subject: 'Physics', term: 'Term 2', assessment: 'Midterm', max_score: 100 },
    { id: 'ass-002', className: 'PR 5 Gold', subject: 'Mathematics', term: 'Term 2', assessment: 'Quiz 4', max_score: 20 },
  ],
  gradebook: [
    { student: 'Elikem Mensah', quiz: 18, assignment: 16, exam: 72, final: 88 },
    { student: 'Esi Owusu', quiz: 15, assignment: 17, exam: 68, final: 83 },
  ],
  reportCards: [
    { id: 'rc-001', student: 'Elikem Mensah', status: 'Generated' },
    { id: 'rc-002', student: 'Esi Owusu', status: 'Pending' },
    { id: 'rc-003', student: 'Yaw Boadi', status: 'Published' },
  ],
};

export const attendanceData = {
  taking: [
    { id: 'stu-001', student: 'Elikem Mensah', status: 'present' },
    { id: 'stu-002', student: 'Ama Tetteh', status: 'late' },
    { id: 'stu-003', student: 'Kojo Arthur', status: 'absent' },
  ],
  report: [
    { id: 'rep-1', student: 'Elikem Mensah', days: 42, present: 40, absent: 1, late: 1, rate: 95 },
    { id: 'rep-2', student: 'Ama Tetteh', days: 42, present: 36, absent: 4, late: 2, rate: 86 },
    { id: 'rep-3', student: 'Kojo Arthur', days: 42, present: 29, absent: 10, late: 3, rate: 69 },
  ],
};

export const timetableData = {
  grid: [
    { day: 'Monday', period: '8:00', subject: 'Mathematics', teacher: 'Mr. Addo', room: 'A1' },
    { day: 'Monday', period: '9:00', subject: 'English', teacher: 'Ms. Owusu', room: 'A1' },
    { day: 'Tuesday', period: '8:00', subject: 'Physics', teacher: 'Mr. Botchway', room: 'Lab 1' },
    { day: 'Wednesday', period: '10:00', subject: 'ICT', teacher: 'Mrs. Mensima', room: 'ICT 2' },
  ],
  subjects: [
    { id: 'sub-1', subject: 'Mathematics', teacher: 'Mr. Addo', periods: 5, room: 'A1' },
    { id: 'sub-2', subject: 'English', teacher: 'Ms. Owusu', periods: 4, room: 'A1' },
    { id: 'sub-3', subject: 'Physics', teacher: 'Mr. Botchway', periods: 3, room: 'Lab 1' },
  ],
};
