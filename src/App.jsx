import { memo } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DoctorLayout from "./components/layout/DoctorLayout";
import { AuthProviderWrapper } from "./features/auth/AuthProviderWrapper";
import AutoPaymentRecorder from "./features/finance/AutoPaymentRecorder";
import PermissionGuard from "./features/auth/PermissionGuard";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import PublicRoute from "./features/auth/PublicRoute";
import SubscriptionExpiryGuard from "./features/auth/SubscriptionExpiryGuard";
import NoSubscriptionGuard from "./features/auth/NoSubscriptionGuard";
import AppointmentDetailPage from "./features/calendar/AppointmentDetailPage";
import PatientDetailPage from "./features/patients/PatientDetailPage";
import PatientPlanDetailPage from "./features/patients/PatientPlanDetailPage";
import VisitDetailPage from "./features/patients/VisitDetailPage";
import Booking from "./pages/Booking";
import Calendar from "./pages/Calendar";
import Clinic from "./pages/Clinic";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import OnlineBooking from "./pages/OnlineBooking";
import Patients from "./pages/Patients";
import PlanConfirmation from "./pages/PlanConfirmation";
import PaymentCallback from "./pages/PaymentCallback";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";
import TreatmentPlans from "./pages/TreatmentPlans";
import Staff from "./pages/Staff";
import Subscriptions from "./pages/Subscriptions";
import WorkMode from "./pages/WorkMode";
import OfflineIndicator from "./components/OfflineIndicator";
import { OfflineProvider } from "./features/offline-mode/OfflineContext";

// Memoize route components to prevent unnecessary re-renders
const MemoizedLanding = memo(Landing);
const MemoizedLogin = memo(Login);
const MemoizedPlanConfirmation = memo(PlanConfirmation);
const MemoizedPaymentCallback = memo(PaymentCallback);
const MemoizedSignup = memo(Signup);
const MemoizedBooking = memo(Booking);
const MemoizedDashboard = memo(Dashboard);
const MemoizedCalendar = memo(Calendar);
const MemoizedPatients = memo(Patients);
const MemoizedPatientDetailPage = memo(PatientDetailPage);
const MemoizedVisitDetailPage = memo(VisitDetailPage);
const MemoizedPatientPlanDetailPage = memo(PatientPlanDetailPage);
const MemoizedAppointmentDetailPage = memo(AppointmentDetailPage);
const MemoizedClinic = memo(Clinic);
const MemoizedTreatmentPlans = memo(TreatmentPlans);
const MemoizedSettings = memo(Settings);
const MemoizedFinance = memo(Finance);
const MemoizedOnlineBooking = memo(OnlineBooking);
const MemoizedNotifications = memo(Notifications);
const MemoizedStaff = memo(Staff);
const MemoizedSubscriptions = memo(Subscriptions);
const MemoizedWorkMode = memo(WorkMode);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MemoizedLanding />} />
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
      <Route
        element={
          <ProtectedRoute>
            <NoSubscriptionGuard>
              <DoctorLayout />
            </NoSubscriptionGuard>
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
                <MemoizedOnlineBooking />
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
          path="/settings"
          element={
            <PermissionGuard requiredPermission="settings">
              <MemoizedSettings />
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
      </Route>
      <Route path="/booking/:clinicId" element={<MemoizedBooking />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProviderWrapper>
        <OfflineProvider>
          <AutoPaymentRecorder />
          <OfflineIndicator />
          <AppRoutes />
          <Toaster position="top-center" />
        </OfflineProvider>
      </AuthProviderWrapper>
    </BrowserRouter>
  );
}

export default App;