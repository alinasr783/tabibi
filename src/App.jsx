import { memo, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import DoctorLayout from "./components/layout/DoctorLayout";
import AffiliateLayout from "./components/layout/AffiliateLayout";
import { AuthProviderWrapper } from "./features/auth/AuthProviderWrapper";
import { UserPreferencesProvider } from "./features/user-preferences/UserPreferencesProvider";
import AutoPaymentRecorder from "./features/finance/AutoPaymentRecorder";
import { initAnalytics } from "./lib/firebase";
import PermissionGuard from "./features/auth/PermissionGuard";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import PublicRoute from "./features/auth/PublicRoute";
import RoleGuard from "./features/auth/RoleGuard";
import SubscriptionExpiryGuard from "./features/auth/SubscriptionExpiryGuard";
import NoSubscriptionGuard from "./features/auth/NoSubscriptionGuard";
import IntegrationGuard from "./features/tabibi-tools/components/IntegrationGuard";
import AppointmentDetailPage from "./features/calendar/AppointmentDetailPage";
import PatientDetailPage from "./features/patients/PatientDetailPage";
import PatientPlanDetailPage from "./features/patients/PatientPlanDetailPage";
import PatientFinanceMonitorPage from "./features/patients/PatientFinanceMonitorPage";
import VisitDetailPage from "./features/patients/VisitDetailPage";
import ExaminationsPage from "./features/examinations/ExaminationsPage";
import Booking from "./pages/Booking";
import Calendar from "./pages/Calendar";
import Clinic from "./pages/Clinic";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import OnlineBooking from "./pages/OnlineBooking";
import Patients from "./pages/Patients";
import PlanConfirmation from "./pages/PlanConfirmation";
import PaymentCallback from "./pages/PaymentCallback";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import Signup from "./pages/Signup";
import EmailConfirmed from "./pages/EmailConfirmed";
import AffiliateEntry from "./pages/AffiliateEntry";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import TreatmentPlans from "./pages/TreatmentPlans";
import Staff from "./pages/Staff";
import Subscriptions from "./pages/Subscriptions";
import WorkMode from "./pages/WorkMode";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Finance from "./pages/Finance";
import TabibiApps from "./pages/TabibiApps";
import TabibiAppDetailsWrapper from "./pages/TabibiAppDetailsWrapper";
import MyAppsPage from "./features/my-apps/MyAppsPage";
import MyAppViewer from "./features/my-apps/MyAppViewer";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import BlogPage from "./pages/BlogPage";
import ArticlePage from "./pages/ArticlePage";
import { AskTabibiPage } from "./ai/ui";
import OfflineIndicator from "./components/OfflineIndicator";
import { OfflineProvider } from "./features/offline-mode/OfflineContext";
import useScrollToTop from "./hooks/useScrollToTop";
import { PWAInstallPrompt } from "./components/ui/pwa-install";

// Memoize route components to prevent unnecessary re-renders
const MemoizedLanding = memo(Landing);
const MemoizedLogin = memo(Login);
const MemoizedPlanConfirmation = memo(PlanConfirmation);
const MemoizedPaymentCallback = memo(PaymentCallback);
const MemoizedSignup = memo(Signup);
const MemoizedEmailConfirmed = memo(EmailConfirmed);
const MemoizedAffiliateEntry = memo(AffiliateEntry);
const MemoizedAffiliateDashboard = memo(AffiliateDashboard);
const MemoizedBooking = memo(Booking);
const MemoizedDashboard = memo(Dashboard);
const MemoizedCalendar = memo(Calendar);
const MemoizedPatients = memo(Patients);
const MemoizedPatientDetailPage = memo(PatientDetailPage);
const MemoizedVisitDetailPage = memo(VisitDetailPage);
const MemoizedExaminationsPage = memo(ExaminationsPage);
const MemoizedPatientPlanDetailPage = memo(PatientPlanDetailPage);
const MemoizedPatientFinanceMonitorPage = memo(PatientFinanceMonitorPage);
const MemoizedAppointmentDetailPage = memo(AppointmentDetailPage);
const MemoizedClinic = memo(Clinic);
const MemoizedTreatmentPlans = memo(TreatmentPlans);
const MemoizedSettings = memo(Settings);
const MemoizedIntegrations = memo(Integrations);
const MemoizedOnlineBooking = memo(OnlineBooking);
const MemoizedNotifications = memo(Notifications);
const MemoizedStaff = memo(Staff);
const MemoizedSubscriptions = memo(Subscriptions);
const MemoizedWorkMode = memo(WorkMode);
const MemoizedPrivacyPolicy = memo(PrivacyPolicy);
const MemoizedTermsOfService = memo(TermsOfService);
const MemoizedFinance = memo(Finance);
const MemoizedTabibiApps = memo(TabibiApps);
const MemoizedMyAppsPage = memo(MyAppsPage);
const MemoizedMyAppViewer = memo(MyAppViewer);
const MemoizedDoctorProfilePage = memo(DoctorProfilePage);
const MemoizedAskTabibi = memo(AskTabibiPage);
const MemoizedBlogPage = memo(BlogPage);
const MemoizedArticlePage = memo(ArticlePage);

function AppRoutes() {
  // Auto scroll to top when route changes
  useScrollToTop();
  
  return (
    <Routes>
      <Route path="/" element={<MemoizedLanding />} />
      <Route path="/blog" element={<MemoizedBlogPage />} />
      <Route path="/blog/:slug" element={<MemoizedArticlePage />} />
      <Route path="/privacy-policy" element={<MemoizedPrivacyPolicy />} />
      <Route path="/terms-of-service" element={<MemoizedTermsOfService />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <MemoizedLogin />
          </PublicRoute>
        }
      />
      <Route path="/plan/:planId" element={<MemoizedPlanConfirmation />} />
      <Route path="/payment/callback" element={<MemoizedPaymentCallback />} />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <MemoizedSignup />
          </PublicRoute>
        }
      />
      <Route path="/auth/confirmed" element={<MemoizedEmailConfirmed />} />
      <Route path="/affiliate" element={<MemoizedAffiliateEntry />} />
      <Route
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["doctor", "secretary"]}>
              <NoSubscriptionGuard>
                <DoctorLayout />
              </NoSubscriptionGuard>
            </RoleGuard>
          </ProtectedRoute>
        }>
        <Route
          path="/dashboard"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <MemoizedDashboard />
            </PermissionGuard>
          }
        />
        <Route
          path="/appointments"
          element={
            <PermissionGuard requiredPermission="appointments">
              <SubscriptionExpiryGuard>
                <MemoizedCalendar />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/patients"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedPatients />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="examinations"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedExaminationsPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedPatientDetailPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/finance-monitor"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedPatientFinanceMonitorPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/visits/:visitId"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedVisitDetailPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/plans/:planId"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedPatientPlanDetailPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/clinic"
          element={
            <PermissionGuard requiredPermission="clinic">
              <MemoizedClinic />
            </PermissionGuard>
          }
        />
        <Route
          path="/online-booking"
          element={
            <PermissionGuard requiredPermission="clinic">
              <SubscriptionExpiryGuard>
                <IntegrationGuard target="/online-booking">
                  <MemoizedOnlineBooking />
                </IntegrationGuard>
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/treatments"
          element={
            <PermissionGuard requiredPermission="patients">
              <SubscriptionExpiryGuard>
                <MemoizedTreatmentPlans />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/finance"
          element={
            <PermissionGuard requiredPermission="finance">
              <SubscriptionExpiryGuard>
                <MemoizedFinance />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <PermissionGuard requiredPermission="settings">
              <MemoizedSettings />
            </PermissionGuard>
          }
        />
        <Route
          path="/integrations"
          element={
            <PermissionGuard requiredPermission="settings">
              <MemoizedIntegrations />
            </PermissionGuard>
          }
        />
        <Route
          path="/appointments/:appointmentId"
          element={
            <PermissionGuard requiredPermission="appointments">
              <SubscriptionExpiryGuard>
                <MemoizedAppointmentDetailPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/notifications"
          element={
            <PermissionGuard requiredPermission="notifications">
              <SubscriptionExpiryGuard>
                <MemoizedNotifications />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/staff"
          element={
            <PermissionGuard requiredPermission="clinic">
              <MemoizedStaff />
            </PermissionGuard>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <PermissionGuard requiredPermission="clinic">
              <MemoizedSubscriptions />
            </PermissionGuard>
          }
        />
        <Route
          path="/work-mode"
          element={
            <PermissionGuard requiredPermission="appointments">
              <SubscriptionExpiryGuard>
                <MemoizedWorkMode />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/ask-tabibi"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <MemoizedAskTabibi />
            </PermissionGuard>
          }
        />
        <Route
          path="/tabibi-apps"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <MemoizedTabibiApps />
            </PermissionGuard>
          }
        />
        <Route
          path="/tabibi-apps/:appId"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <TabibiAppDetailsWrapper />
            </PermissionGuard>
          }
        />
        <Route
          path="/my-apps"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <MemoizedMyAppsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/my-apps/:appKey"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <MemoizedMyAppViewer />
            </PermissionGuard>
          }
        />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["affiliate"]}>
              <AffiliateLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
        <Route path="/affiliate/dashboard" element={<MemoizedAffiliateDashboard />} />
      </Route>
      <Route path="/booking/:clinicId" element={<MemoizedBooking />} />
      <Route path="/doctor-profile/:clinicId" element={<MemoizedDoctorProfilePage />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Initialize analytics only on client side
    initAnalytics();
  }, []);

  // Use TouchBackend for mobile devices, HTML5Backend for desktop
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <BrowserRouter>
      <AuthProviderWrapper>
        <UserPreferencesProvider>
          <OfflineProvider>
            <DndProvider 
              backend={isMobile ? TouchBackend : HTML5Backend}
              options={isMobile ? { delayTouchStart: 500, enableTouchEvents: true, ignoreContextMenu: true } : undefined}
            >
              <AutoPaymentRecorder />
              <OfflineIndicator />
              <PWAInstallPrompt />
              <AppRoutes />
              <Toaster position="top-center" />
            </DndProvider>
          </OfflineProvider>
        </UserPreferencesProvider>
      </AuthProviderWrapper>
    </BrowserRouter>
  );
}

export default App;
