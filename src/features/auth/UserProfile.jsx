import { useAuth } from "./AuthContext"

export default function UserProfile() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="animate-pulse h-8 w-32 bg-gray-200 rounded-[var(--radius)]"></div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{user.name}</p>
        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
      </div>
      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
        {user.name?.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}
