import { Navigate, useLocation } from "react-router-dom"
import useUser from "./useUser"
import { isSuperAdminUser } from "./isSuperAdmin"

export default function SuperAdminGuard({ children }) {
  const { data: user, isLoading } = useUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحقق من صلاحيات الإدارة...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isSuperAdminUser(user)) {
    if (user.role === "affiliate") return <Navigate to="/affiliate/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}
