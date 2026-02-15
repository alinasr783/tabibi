import { Outlet, NavLink } from "react-router-dom"
import { useAuth } from "../../features/auth/AuthContext"
import LogoutButton from "../../features/auth/LogoutButton"
import { Badge } from "../ui/badge"
import { Handshake, LayoutDashboard } from "lucide-react"

export default function AffiliateLayout() {
  const { user } = useAuth()

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center">
              <Handshake className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-gray-900">Tabibi Affiliate</div>
              <div className="text-xs text-gray-600">لوحة شركاء التسويق بالعمولة</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.name && <Badge variant="secondary">{user.name}</Badge>}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex items-center gap-2">
          <NavLink
            to="/affiliate/dashboard"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted"
              }`
            }>
            <LayoutDashboard className="size-4" />
            لوحة التحكم
          </NavLink>
        </nav>

        <Outlet />
      </div>
    </div>
  )
}
