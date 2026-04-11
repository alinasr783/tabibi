import { memo, useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProviderWrapper } from "./features/auth/AuthProviderWrapper";
import { UserPreferencesProvider } from "./features/user-preferences/UserPreferencesProvider";
import PermissionGuard from "./features/auth/PermissionGuard";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import PublicRoute from "./features/auth/PublicRoute";
import RoleGuard from "./features/auth/RoleGuard";
import SubscriptionExpiryGuard from "./features/auth/SubscriptionExpiryGuard";
import NoSubscriptionGuard from "./features/auth/NoSubscriptionGuard";
import IntegrationGuard from "./features/tabibi-tools/components/IntegrationGuard";
import Landing from "./pages/Landing";
const Login = lazy(() => import("./pages/Login"));
const Notifications = lazy(() => import("./pages/Notifications"));
const OnlineBooking = lazy(() => import("./pages/OnlineBooking"));
const Patients = lazy(() => import("./pages/Patients"));
const PlanConfirmation = lazy(() => import("./pages/PlanConfirmation"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Settings = lazy(() => import("./pages/Settings"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Signup = lazy(() => import("./pages/Signup"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const EmailVerify = lazy(() => import("./pages/EmailVerify"));
const AffiliateEntry = lazy(() => import("./pages/AffiliateEntry"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const TreatmentPlans = lazy(() => import("./pages/TreatmentPlans"));
const Staff = lazy(() => import("./pages/Staff"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const WorkMode = lazy(() => import("./pages/WorkMode"));
const LearnTabibi = lazy(() => import("./pages/LearnTabibi"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Finance = lazy(() => import("./pages/Finance"));
const TabibiApps = lazy(() => import("./pages/TabibiApps"));
const TabibiAppDetailsWrapper = lazy(() => import("./pages/TabibiAppDetailsWrapper"));
const MyAppsPage = lazy(() => import("./features/my-apps/MyAppsPage"));
const MyAppViewer = lazy(() => import("./features/my-apps/MyAppViewer"));
const DoctorProfilePage = lazy(() => import("./pages/DoctorProfilePage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Clinic = lazy(() => import("./pages/Clinic"));
const Booking = lazy(() => import("./pages/Booking"));
const AppointmentDetailPage = lazy(() => import("./features/calendar/AppointmentDetailPage"));
const PatientDetailPage = lazy(() => import("./features/patients/PatientDetailPage"));
const PatientPlanDetailPage = lazy(() => import("./features/patients/PatientPlanDetailPage"));
const PatientFinanceMonitorPage = lazy(() => import("./features/patients/PatientFinanceMonitorPage"));
const VisitDetailPage = lazy(() => import("./features/patients/VisitDetailPage"));
const ExaminationsPage = lazy(() => import("./features/examinations/ExaminationsPage"));
const AskTabibiPage = lazy(() => import("./ai/ui").then(m => ({ default: m.AskTabibiPage })));
import useScrollToTop from "./hooks/useScrollToTop";
import { useAuth } from "./features/auth/AuthContext";

const DoctorLayout = lazy(() => import("./components/layout/DoctorLayout"));
const AffiliateLayout = lazy(() => import("./components/layout/AffiliateLayout"));
const AppAuthedProviders = lazy(() => import("./AppAuthedProviders"));

// Memoize route components to prevent unnecessary re-renders
const MemoizedLanding = memo(Landing);
const MemoizedLogin = memo(Login);
const MemoizedPlanConfirmation = memo(PlanConfirmation);
const MemoizedPaymentCallback = memo(PaymentCallback);
const MemoizedSignup = memo(Signup);
const MemoizedEmailConfirmed = memo(EmailConfirmed);
const MemoizedEmailVerify = memo(EmailVerify);
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
const MemoizedLearnTabibi = memo(LearnTabibi);
const MemoizedBlogPage = memo(BlogPage);
const MemoizedArticlePage = memo(ArticlePage);

function AppRoutes() {
  // Auto scroll to top when route changes
  useScrollToTop();
  
  function LearnTabibiGate() {
    const { user } = useAuth();
    if (user) {
      return (
        <AppAuthedProviders>
          <DoctorLayout>
            <MemoizedLearnTabibi />
          </DoctorLayout>
        </AppAuthedProviders>
      );
    }
    return <MemoizedLearnTabibi />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<MemoizedLanding />} />
      <Route path="/blog" element={<MemoizedBlogPage />} />
      <Route path="/blog/:slug" element={<MemoizedArticlePage />} />
      <Route path="/privacy-policy" element={<MemoizedPrivacyPolicy />} />
      <Route path="/terms-of-service" element={<MemoizedTermsOfService />} />
      <Route path="/learn-tabibi" element={<LearnTabibiGate />} />
      <Route path="/learn-tabibi/:systemKey/:topicKey" element={<LearnTabibiGate />} />
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
      <Route path="/auth/verify" element={<MemoizedEmailVerify />} />
      <Route path="/affiliate" element={<MemoizedAffiliateEntry />} />
      <Route
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["doctor", "secretary"]}>
                <AppAuthedProviders>
                  <DoctorLayout />
                </AppAuthedProviders>
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
                <MemoizedCalendar />
            </PermissionGuard>
          }
        />
        <Route
          path="/patients"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedPatients />
            </PermissionGuard>
          }
        />
        <Route
          path="examinations"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedExaminationsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedPatientDetailPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/finance-monitor"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedPatientFinanceMonitorPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/visits/:visitId"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedVisitDetailPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/patients/:patientId/plans/:planId"
          element={
            <PermissionGuard requiredPermission="patients">
                <MemoizedPatientPlanDetailPage />
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
          path="/clinic/:clinicId"
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
                <MemoizedTreatmentPlans />
            </PermissionGuard>
          }
        />
        <Route
          path="/finance"
          element={
            <PermissionGuard requiredPermission="finance">
                <MemoizedFinance />
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
                <MemoizedAppointmentDetailPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/notifications"
          element={
            <PermissionGuard requiredPermission="notifications">
                <MemoizedNotifications />
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
              <SubscriptionExpiryGuard>
                <MemoizedTabibiApps />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/tabibi-apps/:appId"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <SubscriptionExpiryGuard>
                <TabibiAppDetailsWrapper />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/my-apps"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <SubscriptionExpiryGuard>
                <MemoizedMyAppsPage />
              </SubscriptionExpiryGuard>
            </PermissionGuard>
          }
        />
        <Route
          path="/my-apps/:appKey"
          element={
            <PermissionGuard requiredPermission="dashboard">
              <SubscriptionExpiryGuard>
                <MemoizedMyAppViewer />
              </SubscriptionExpiryGuard>
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
      <Route path="/book/:clinicId" element={<MemoizedBooking />} />
      <Route path="/booking/u/:userId" element={<MemoizedBooking />} />
      <Route path="/book/u/:userId" element={<MemoizedBooking />} />
      <Route path="/doctor-profile/:clinicId" element={<MemoizedDoctorProfilePage />} />
      <Route path="/doctor/:clinicId" element={<MemoizedDoctorProfilePage />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const startAnalytics = () => {
      try {
        import("./lib/firebase").then((m) => m.initAnalytics?.()).catch(() => {});
      } catch (_) {}
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(startAnalytics, { timeout: 5000 });
    } else {
      setTimeout(startAnalytics, 3000);
    }
  }, []);

  const [toasterPosition, setToasterPosition] = useState("top-right");

  useEffect(() => {
    const handleResize = () => {
      setToasterPosition(window.innerWidth < 768 ? "top-center" : "top-right");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BrowserRouter>
      <AuthProviderWrapper>
        <UserPreferencesProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">... جاري التحميل</div>}>
            <AppRoutes />
          </Suspense>
          <Toaster position={toasterPosition} dir="rtl" />
        </UserPreferencesProvider>
      </AuthProviderWrapper>
    </BrowserRouter>
  );
}

export default App;
