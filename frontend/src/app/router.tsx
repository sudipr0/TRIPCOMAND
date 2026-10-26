import { Navigate, createBrowserRouter } from 'react-router-dom';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { WorkspaceLayout } from '@/app/layouts/WorkspaceLayout';
import { FieldLayout } from '@/app/layouts/FieldLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewWorkspacePage } from '@/pages/workspaces/NewWorkspacePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StaffListPage, StaffCreatePage, StaffDetailPage, StaffEditPage } from '@/features/staff/pages';
import { DestinationsPage } from '@/features/destinations/pages';
import { TrekTemplatesPage, TrekTemplateDetailPage } from '@/features/trek-templates/pages';
import { CustomersPage, CustomerDetailPage } from '@/features/customers/pages';
import { InquiriesPage, InquiryDetailPage } from '@/features/inquiries/pages';
import { QuotationsPage, QuotationDetailPage } from '@/features/quotations/pages';
import { BookingsPage, BookingDetailPage } from '@/features/bookings/pages';
import { TripsPage, TripDetailPage } from '@/features/trips/pages';
import { ResourcesPage } from '@/features/resources/pages';
import { AvailabilityPage } from '@/features/availability/pages';
import { SuppliersPage, SupplierDetailPage } from '@/features/suppliers/pages';
import { FieldHomePage, FieldTripPage } from '@/features/field/pages';
import { DisruptionsPage, DisruptionDetailPage } from '@/features/disruptions/pages';
import { FinanceDashboardPage } from '@/features/finance/pages';
import { PortalPage } from '@/features/portal/pages';



export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginForm /> },
      { path: '/register', element: <RegisterForm /> },
      { path: '/forgot-password', element: <ForgotPasswordForm /> },
      { path: '/reset-password', element: <ResetPasswordForm /> },
    ],
  },
  { path: '/workspaces/new', element: <NewWorkspacePage /> },
  // Public client portal: the URL token is the only credential, so this sits
  // outside both the auth and workspace layouts — no sidebar, no session.
  { path: '/portal/view/:token', element: <PortalPage /> },
  {
    element: <WorkspaceLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/staff', element: <StaffListPage /> },
      { path: '/staff/new', element: <StaffCreatePage /> },
      { path: '/staff/:staffId/edit', element: <StaffEditPage /> },
      { path: '/staff/:staffId', element: <StaffDetailPage /> },
      { path: '/destinations', element: <DestinationsPage /> },
      { path: '/trek-templates', element: <TrekTemplatesPage /> },
      { path: '/trek-templates/:templateId', element: <TrekTemplateDetailPage /> },
      { path: '/customers', element: <CustomersPage /> },
      { path: '/customers/:customerId', element: <CustomerDetailPage /> },
      { path: '/inquiries', element: <InquiriesPage /> },
      { path: '/inquiries/:inquiryId', element: <InquiryDetailPage /> },
      { path: '/quotations', element: <QuotationsPage /> },
      { path: '/quotations/:quotationId', element: <QuotationDetailPage /> },
      { path: '/bookings', element: <BookingsPage /> },
      { path: '/bookings/:bookingId', element: <BookingDetailPage /> },
      { path: '/finance', element: <FinanceDashboardPage /> },
      { path: '/trips', element: <TripsPage /> },
      { path: '/trips/:tripId', element: <TripDetailPage /> },
      { path: '/disruptions', element: <DisruptionsPage /> },
      { path: '/disruptions/:disruptionId', element: <DisruptionDetailPage /> },
      { path: '/resources', element: <ResourcesPage /> },
      { path: '/availability', element: <AvailabilityPage /> },
      { path: '/suppliers', element: <SuppliersPage /> },
      { path: '/suppliers/:supplierId', element: <SupplierDetailPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  {
    element: <FieldLayout />,
    children: [
      { path: '/field', element: <FieldHomePage /> },
      { path: '/field/trips/:tripId', element: <FieldTripPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
