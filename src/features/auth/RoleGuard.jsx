import { Navigate, useLocation } from "react-router-dom"
import useUser from "./useUser"

export default function RoleGuard({ allowedRoles = [], children, redirectTo }) {
  const { data: user, isLoading } = useUser()
  const location = useLocation()

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

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) return children

  if (redirectTo) return <Navigate to={redirectTo} replace />

  if (user.role === "affiliate") return <Navigate to="/affiliate/dashboard" replace />

  return <Navigate to="/dashboard" replace />
}
