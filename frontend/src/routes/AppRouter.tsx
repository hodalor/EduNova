import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const LoginPage = lazy(() => import('../modules/auth/LoginPage'));
const SuperAdminLoginPage = lazy(() => import('../modules/super-admin/SuperAdminLoginPage'));
const PlatformHomePage = lazy(() => import('../modules/super-admin/PlatformHomePage'));
const InstitutionListPage = lazy(() => import('../modules/super-admin/InstitutionListPage'));
const InstitutionOnboardPage = lazy(() => import('../modules/super-admin/InstitutionOnboardPage'));
const PlatformUserManagementPage = lazy(
  () => import('../modules/super-admin/PlatformUserManagementPage')
);
const PlatformAnalyticsPage = lazy(() => import('../modules/super-admin/PlatformAnalyticsPage'));
const AuditLogPage = lazy(() => import('../modules/super-admin/AuditLogPage'));
const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const AnalyticsLayout = lazy(() => import('../modules/analytics/AnalyticsLayout'));
const FinanceAnalyticsPage = lazy(() => import('../modules/analytics/FinanceAnalyticsPage'));
const AcademicsAnalyticsPage = lazy(() => import('../modules/analytics/AcademicsAnalyticsPage'));
const AttendanceAnalyticsPage = lazy(() => import('../modules/analytics/AttendanceAnalyticsPage'));
const EnrollmentAnalyticsPage = lazy(() => import('../modules/analytics/EnrollmentAnalyticsPage'));
const AlertsPage = lazy(() => import('../modules/analytics/AlertsPage'));
const StudentsListPage = lazy(() => import('../modules/students/StudentsListPage'));
const StudentDetailPage = lazy(() => import('../modules/students/StudentDetailPage'));
const StudentEnrollmentForm = lazy(() => import('../modules/students/StudentEnrollmentForm'));
const StudentIDCard = lazy(() => import('../modules/students/StudentIDCard'));
const FinanceDashboardPage = lazy(() => import('../modules/finance/FinanceDashboardPage'));
const InvoicesPage = lazy(() => import('../modules/finance/InvoicesPage'));
const PaymentFormPage = lazy(() => import('../modules/finance/PaymentFormPage'));
const DefaultersPage = lazy(() => import('../modules/finance/DefaultersPage'));
const ExpensesPage = lazy(() => import('../modules/finance/ExpensesPage'));
const FeeStructurePage = lazy(() => import('../modules/finance/FeeStructurePage'));
const ResultsEntryPage = lazy(() => import('../modules/academics/ResultsEntryPage'));
const ReportCardsPage = lazy(() => import('../modules/academics/ReportCardsPage'));
const GradebookPage = lazy(() => import('../modules/academics/GradebookPage'));
const AttendanceTakingPage = lazy(() => import('../modules/attendance/AttendanceTakingPage'));
const AttendanceReportPage = lazy(() => import('../modules/attendance/AttendanceReportPage'));
const TimetableViewPage = lazy(() => import('../modules/timetable/TimetableViewPage'));
const TimetableGeneratorPage = lazy(() => import('../modules/timetable/TimetableGeneratorPage'));
const WorkspaceHubPage = lazy(() => import('../modules/workspace/WorkspaceHubPage'));
const DaycareManagementPage = lazy(() => import('../modules/workspace/DaycareManagementPage'));
const TertiaryManagementPage = lazy(() => import('../modules/workspace/TertiaryManagementPage'));
const SettingsWorkspacePage = lazy(() => import('../modules/workspace/SettingsWorkspacePage'));
const UserManagementPage = lazy(() => import('../modules/workspace/UserManagementPage'));
const AcademicStructurePage = lazy(() => import('../modules/workspace/AcademicStructurePage'));
const StudentCourseRegistrationPage = lazy(
  () => import('../modules/workspace/StudentCourseRegistrationPage')
);

const Loader = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-mist text-brand-navy">
      <div className="rounded-2xl border border-brand-line bg-white px-6 py-4 shadow-panel">
        Loading EDUOVA...
      </div>
    </div>
  );
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/super-admin/login"
            element={
              <PublicRoute>
                <SuperAdminLoginPage />
              </PublicRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['institution_admin', 'teacher', 'student', 'parent', 'driver', 'accountant', 'librarian']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="/admissions"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <Navigate to="/students/enroll" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher', 'librarian']}>
                  <StudentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/enroll"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <StudentEnrollmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher', 'librarian']}>
                  <StudentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:studentId/id-card"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <StudentIDCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <Navigate to="/staff/users" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/users"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academics/structure"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <AcademicStructurePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academics/results-entry"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <ResultsEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academics/report-cards"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <ReportCardsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academics/gradebook"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <GradebookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance/taking"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <AttendanceTakingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance/report"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <AttendanceReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <FinanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/payments"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <PaymentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/defaulters"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <DefaultersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/expenses"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <ExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/fee-structures"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <FeeStructurePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/communication"
              element={
                <WorkspaceHubPage
                  title="Communication"
                  description="Coordinate announcements, targeted messaging, guardian outreach, and classroom communication from one hub."
                  metrics={[
                    { label: 'Active Channels', value: '12', helper: 'Broadcasts, class threads, and guardian notices.' },
                    { label: 'Unread Responses', value: '9', helper: 'Messages waiting for staff or guardian action.' },
                    { label: 'Notice Templates', value: '6', helper: 'Reusable school communication formats.' },
                    { label: 'Audience Groups', value: '18', helper: 'Classes, houses, guardians, departments, and cohorts.' },
                  ]}
                  links={[
                    { title: 'Teacher Workspace', description: 'Manage class-level communication and follow-ups.', to: '/' },
                    { title: 'Transport', description: 'Coordinate route and pickup notifications.', to: '/transport' },
                    { title: 'Attendance', description: 'Trigger attendance alerts and follow-up communication.', to: '/attendance/report' },
                  ]}
                  checklist={[
                    { title: 'Role-aware visibility', description: 'Teachers, students, parents, finance, and transport staff can access the communication hub that fits their role.', status: 'success' },
                    { title: 'Guardian support', description: 'Daycare and school guardians receive notices, pickup updates, and fee reminders.', status: 'success' },
                  ]}
                />
              }
            />
            <Route
              path="/timetable/view"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher', 'student']}>
                  <TimetableViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable/generator"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <TimetableGeneratorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discipline"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <WorkspaceHubPage
                    title="Discipline"
                    description="Track incidents, interventions, pastoral actions, and behaviour history with clear accountability."
                    metrics={[
                      { label: 'Open Cases', value: '5', helper: 'Incidents still requiring closure.' },
                      { label: 'Resolved This Week', value: '11', helper: 'Completed interventions and sign-off.' },
                      { label: 'At-risk Learners', value: '3', helper: 'Students needing counselling or guardian follow-up.' },
                      { label: 'Escalation Levels', value: '4', helper: 'From class action to institutional review.' },
                    ]}
                    links={[
                      { title: 'Students Register', description: 'Open learner records for follow-up.', to: '/students' },
                      { title: 'Communication', description: 'Notify guardians and staff teams on incidents.', to: '/communication' },
                      { title: 'Attendance Reports', description: 'Correlate discipline trends with attendance risks.', to: '/attendance/report' },
                    ]}
                    checklist={[
                      { title: 'Auditability', description: 'Incidents, action owners, and status updates are traceable by role.', status: 'success' },
                      { title: 'Cross-module follow-up', description: 'Behaviour records can feed communication and attendance workflows.', status: 'info' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transport"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'parent', 'student', 'driver']}>
                  <WorkspaceHubPage
                    title="Transport"
                    description="Manage routes, vehicles, pickup rosters, guardian coordination, and transport support operations."
                    metrics={[
                      { label: 'Active Routes', value: '9', helper: 'Morning and afternoon route plans.' },
                      { label: 'Vehicles', value: '6', helper: 'School buses and contracted vans.' },
                      { label: 'Pickup Points', value: '34', helper: 'Approved stops and guardian handover points.' },
                      { label: 'Drivers', value: '8', helper: 'Assigned route operators.' },
                    ]}
                    links={[
                      { title: 'Communication', description: 'Send delay and pickup updates to guardians.', to: '/communication' },
                      { title: 'Daycare Operations', description: 'Coordinate child release and pickup policies.', to: '/daycare', badge: 'early years' },
                      { title: 'Settings', description: 'Align transport operations to institution policy.', to: '/settings' },
                    ]}
                    checklist={[
                      { title: 'Guardian workflow', description: 'Parents and students can see transport-related operations without seeing admin-only data.', status: 'success' },
                      { title: 'Pickup safeguards', description: 'Daycare and lower-primary operations can be tied to guardian release rules.', status: 'info' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hostel"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <WorkspaceHubPage
                    title="Hostel"
                    description="Run boarding occupancy, room allocation, house supervision, and pastoral support for residential institutions."
                    metrics={[
                      { label: 'Occupied Beds', value: '412', helper: 'Current hostel occupancy across halls.' },
                      { label: 'Vacant Rooms', value: '18', helper: 'Available spaces for reassignment.' },
                      { label: 'House Staff', value: '21', helper: 'Wardens and hostel supervisors.' },
                      { label: 'Health Flags', value: '4', helper: 'Residents needing medical or welfare follow-up.' },
                    ]}
                    links={[
                      { title: 'Students Register', description: 'Open resident records and boarding eligibility.', to: '/students' },
                      { title: 'Communication', description: 'Send hostel notices and welfare updates.', to: '/communication' },
                      { title: 'Inventory', description: 'Track linen, furniture, and hostel consumables.', to: '/inventory' },
                    ]}
                    checklist={[
                      { title: 'Secondary and tertiary ready', description: 'Hostel functions are shown only for institutions where boarding is likely relevant.', status: 'success' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'librarian']}>
                  <WorkspaceHubPage
                    title="Inventory"
                    description="Track school supplies, lab items, hostel stock, and departmental allocation requests across the institution."
                    metrics={[
                      { label: 'Stock Items', value: '1,268', helper: 'Tracked units in stores and departments.' },
                      { label: 'Low Stock', value: '14', helper: 'Items that need replenishment soon.' },
                      { label: 'Pending Requests', value: '9', helper: 'Departmental or classroom issue requests.' },
                      { label: 'Store Locations', value: '5', helper: 'Main stores, labs, library, and boarding stores.' },
                    ]}
                    links={[
                      { title: 'Finance', description: 'Review procurement and expense tracking.', to: '/finance' },
                      { title: 'Hostel', description: 'Manage residential stock and room supplies.', to: '/hostel' },
                      { title: 'Settings', description: 'Configure inventory categories and controls.', to: '/settings' },
                    ]}
                    checklist={[
                      { title: 'Cross-campus accountability', description: 'Stock can be segmented by unit, store, and department.', status: 'success' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'accountant']}>
                  <AnalyticsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/analytics/finance" replace />} />
              <Route path="finance" element={<FinanceAnalyticsPage />} />
              <Route path="academics" element={<AcademicsAnalyticsPage />} />
              <Route path="attendance" element={<AttendanceAnalyticsPage />} />
              <Route path="enrollment" element={<EnrollmentAnalyticsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
            </Route>
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['institution_admin']}>
                  <SettingsWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daycare"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <DaycareManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tertiary"
              element={
                <ProtectedRoute allowedRoles={['institution_admin', 'teacher']}>
                  <TertiaryManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/academics"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <WorkspaceHubPage
                    title="My Academics"
                    description="Review report cards, academic standing, and how your institution promotes learners to the next stage."
                    metrics={[
                      { label: 'Promotion Rule', value: 'Pass all core requirements', helper: 'Promotion depends on assessment and progression policy.' },
                      { label: 'Calendar', value: 'Current session', helper: 'Follows the institution academic calendar and result cycle.' },
                      { label: 'Published Records', value: '3', helper: 'Term, semester, or block reports available.' },
                      { label: 'Study Plan', value: 'Active', helper: 'Current registered course or subject load.' },
                    ]}
                    links={[
                      { title: 'Main Workspace', description: 'Return to your student summary dashboard.', to: '/' },
                      { title: 'Attendance', description: 'Check attendance because promotion rules often depend on it.', to: '/student/attendance' },
                      { title: 'Timetable', description: 'View your learning schedule and class periods.', to: '/timetable/view' },
                      { title: 'Course Registration', description: 'Register semester courses that belong to your current level.', to: '/student/course-registration', badge: 'tertiary' },
                    ]}
                    checklist={[
                      { title: 'Promotion aware', description: 'Academic standing can reflect term, semester, trimester, or short-course progression.', status: 'success' },
                      { title: 'Level-aware pathway', description: 'The system supports K-12 grading and tertiary course progression in one platform.', status: 'success' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/course-registration"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentCourseRegistrationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <WorkspaceHubPage
                    title="My Attendance"
                    description="Follow your attendance, punctuality, and intervention alerts for the current period."
                    metrics={[
                      { label: 'Current Rate', value: '91%', helper: 'Attendance rate for the active cycle.' },
                      { label: 'Late Records', value: '2', helper: 'Tracked lateness events this period.' },
                      { label: 'Absences', value: '1', helper: 'Unpresent days requiring follow-up.' },
                      { label: 'Intervention Status', value: 'Stable', helper: 'No active attendance escalation.' },
                    ]}
                    links={[
                      { title: 'Main Workspace', description: 'Return to your student overview.', to: '/' },
                      { title: 'Communication', description: 'Check messages related to attendance and notices.', to: '/communication' },
                      { title: 'My Academics', description: 'See how attendance affects promotion and results.', to: '/student/academics' },
                    ]}
                    checklist={[
                      { title: 'Early warning support', description: 'Low attendance can trigger alerts for staff and guardians where relevant.', status: 'success' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/finance"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <WorkspaceHubPage
                    title="My Finance"
                    description="View fee balances, payment expectations, and finance-related reminders without exposing institution-wide billing data."
                    metrics={[
                      { label: 'Outstanding', value: 'GHS 1,280', helper: 'Current unpaid balance on linked invoices.' },
                      { label: 'Invoices', value: '3', helper: 'Issued finance records this term or semester.' },
                      { label: 'Payment Status', value: 'Partial', helper: 'Overall settlement standing.' },
                      { label: 'Reminder Cycle', value: 'Active', helper: 'Automated reminder flow for unpaid balances.' },
                    ]}
                    links={[
                      { title: 'Main Workspace', description: 'Return to the student overview.', to: '/' },
                      { title: 'Communication', description: 'Open notices and billing reminders.', to: '/communication' },
                      { title: 'My Academics', description: 'Check whether finance clearance affects results or progression.', to: '/student/academics' },
                    ]}
                    checklist={[
                      { title: 'Privacy aware', description: 'Students can only view their own finance area, not institution-wide collections.', status: 'success' },
                    ]}
                  />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/super-admin" element={<PlatformHomePage />} />
            <Route path="/super-admin/users" element={<PlatformUserManagementPage />} />
            <Route path="/super-admin/institutions" element={<InstitutionListPage />} />
            <Route path="/super-admin/institutions/new" element={<InstitutionOnboardPage />} />
            <Route path="/super-admin/analytics" element={<PlatformAnalyticsPage />} />
            <Route path="/super-admin/audit-logs" element={<AuditLogPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
