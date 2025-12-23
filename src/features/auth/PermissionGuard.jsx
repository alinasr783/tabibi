import { Navigate, useLocation } from "react-router-dom"
import useUser from "./useUser"

export default function PermissionGuard({ children, requiredPermission }) {
  const { data: user, isLoading } = useUser()
  const location = useLocation()

  // Debugging: log user data to see what's being received
  console.log("PermissionGuard - User data:", user)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check if this is a user with missing custom data
  if (user.userDataMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">بيانات المستخدم غير مكتملة</h2>
          <p className="text-gray-600">
            لم يتم العثور على بيانات المستخدم في قاعدة البيانات. يرجى تسجيل الخروج وإعادة تسجيل الدخول.
          </p>
        </div>
      </div>
    )
  }

  // Check if user has the default "authenticated" role (meaning custom data wasn't fetched)
  if (user.role === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">خطأ في تحميل بيانات المستخدم</h2>
          <p className="text-gray-600">
            لم يتم تحميل بيانات المستخدم بشكل صحيح. يرجى تسجيل الخروج وإعادة تسجيل الدخول.
          </p>
        </div>
      </div>
    )
  }

  // Check if user has a role property
  if (!user.hasOwnProperty('role')) {
    console.error("User object missing role property:", user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">خطأ في بيانات المستخدم</h2>
          <p className="text-gray-600">
            بيانات المستخدم غير مكتملة. يرجى تسجيل الخروج وإعادة تسجيل الدخول.
          </p>
        </div>
      </div>
    )
  }

  // Doctors have full access
  if (user.role === "doctor") {
    return children
  }

  // For secretaries, check permissions
  if (user.role === "secretary") {
    // Settings page is always accessible for secretaries as it's their profile page
    if (location.pathname === "/settings") {
      return children
    }

    // If permissions is null/undefined or empty array, deny access
    if (!user.permissions || (Array.isArray(user.permissions) && user.permissions.length === 0)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">الوصول مرفوض</h2>
            <p className="text-gray-600 mb-6">
              ليس لديك الصلاحيات اللازمة للوصول إلى هذا القسم. يرجى التواصل مع الطبيب لإعطاءك الصلاحيات المطلوبة.
            </p>
            <div className="backdrop-blur-sm bg-white/30 p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500">
                سيتم إزالة الضبابية تلقائيًا بمجرد منحك الطبيب الصلاحيات المناسبة.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Handle case where permissions is a string (JSON) instead of array
    let permissionsArray = user.permissions;
    if (typeof user.permissions === 'string') {
      try {
        permissionsArray = JSON.parse(user.permissions);
      } catch (e) {
        console.error("Error parsing permissions string:", e);
        permissionsArray = [];
      }
    }

    // If a specific permission is required, check if user has it
    if (requiredPermission) {
      if (!permissionsArray || !Array.isArray(permissionsArray) || !permissionsArray.includes(requiredPermission)) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">الوصول مرفوض</h2>
              <p className="text-gray-600 mb-6">
                ليس لديك الصلاحيات اللازمة للوصول إلى هذا القسم.
              </p>
              <div className="backdrop-blur-sm bg-white/30 p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">
                  يرجى التواصل مع الطبيب لطلب الصلاحية: {requiredPermission}
                </p>
              </div>
            </div>
          </div>
        )
      }
    }

    // If no specific permission is required, check if user has any permissions
    return children
  }

  // For any other role, deny access
  console.error("Unknown user role:", user.role)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">الوصول مرفوض</h2>
        <p className="text-gray-600">
          دور المستخدم غير معتمد: {user.role || 'غير محدد'}
        </p>
      </div>
    </div>
  )
}