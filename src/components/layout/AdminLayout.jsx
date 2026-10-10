import { NavLink, Outlet, Link } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Menu,
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "../../features/auth/AuthContext"
import LogoutButton from "../../features/auth/LogoutButton"

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "نظرة عامة" },
  { to: "/admin/users", icon: Users, label: "المستخدمون" },
  { to: "/admin/clinics", icon: Building2, label: "العيادات" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "الاشتراكات والخطط" },
  { to: "/admin/apps", icon: LayoutGrid, label: "التطبيقات" },
  { to: "/admin/audit", icon: ScrollText, label: "سجل التدقيق" },
]

export default function AdminLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div dir="rtl" className="flex h-screen bg-muted/40">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed md:static top-0 right-0 h-full w-64 bg-card border-l border-border z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <Link to="/admin" onClick={() => setOpen(false)} className="p-4 flex items-center gap-2 border-b border-border">
          <span className="p-2 rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span className="font-bold">Super Admin</span>
        </Link>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <LogoutButton />
          <Link to="/dashboard" className="block text-xs text-center text-muted-foreground hover:text-foreground">
            العودة لمنصة الطبيب
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
          <button onClick={() => setOpen((v) => !v)} aria-label="القائمة" className="p-2 rounded-lg hover:bg-muted">
            <Menu className="size-5" />
          </button>
          <span className="font-bold text-sm">لوحة Super Admin</span>
          <span className="w-9" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
