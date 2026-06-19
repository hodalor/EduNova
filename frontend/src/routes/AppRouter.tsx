import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';

const LoginPage = lazy(() => import('../modules/auth/LoginPage'));
const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const ModulePlaceholderPage = lazy(() => import('../modules/ModulePlaceholderPage'));

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
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="/admissions"
              element={
                <ModulePlaceholderPage
                  title="Admissions"
                  description="Configure enquiry capture, applicant pipelines, document verification and offer conversion workflows."
                />
              }
            />
            <Route
              path="/students"
              element={
                <ModulePlaceholderPage
                  title="Students"
                  description="Manage profiles, guardians, documents, class assignment and student lifecycle records."
                />
              }
            />
            <Route
              path="/staff"
              element={
                <ModulePlaceholderPage
                  title="Staff"
                  description="Support human resource records, duty allocation, contract tracking and internal access controls."
                />
              }
            />
            <Route
              path="/academics"
              element={
                <ModulePlaceholderPage
                  title="Academics"
                  description="Organize classes, subjects, grading structures and term-based academic operations."
                />
              }
            />
            <Route
              path="/attendance"
              element={
                <ModulePlaceholderPage
                  title="Attendance"
                  description="Monitor daily presence, exception handling and reporting across student and staff cohorts."
                />
              }
            />
            <Route
              path="/finance"
              element={
                <ModulePlaceholderPage
                  title="Finance"
                  description="Track invoices, collection status, concession workflows and revenue analytics."
                />
              }
            />
            <Route
              path="/communication"
              element={
                <ModulePlaceholderPage
                  title="Communication"
                  description="Coordinate announcements, targeted messaging and parent engagement workflows."
                />
              }
            />
            <Route
              path="/timetable"
              element={
                <ModulePlaceholderPage
                  title="Timetable"
                  description="Plan schedules, room allocation and teacher availability across the institution."
                />
              }
            />
            <Route
              path="/discipline"
              element={
                <ModulePlaceholderPage
                  title="Discipline"
                  description="Capture incidents, follow-up actions and behavioral history with clear auditability."
                />
              }
            />
            <Route
              path="/transport"
              element={
                <ModulePlaceholderPage
                  title="Transport"
                  description="Administer routes, vehicles, pickup rosters and transport communication channels."
                />
              }
            />
            <Route
              path="/hostel"
              element={
                <ModulePlaceholderPage
                  title="Hostel"
                  description="Manage boarding occupancy, room assignments and pastoral supervision workflows."
                />
              }
            />
            <Route
              path="/inventory"
              element={
                <ModulePlaceholderPage
                  title="Inventory"
                  description="Track supplies, allocation requests and stock accountability across departments."
                />
              }
            />
            <Route
              path="/analytics"
              element={
                <ModulePlaceholderPage
                  title="Analytics"
                  description="Consolidate institutional metrics, visual summaries and executive reporting views."
                />
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
