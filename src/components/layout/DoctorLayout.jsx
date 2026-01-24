import {
  ChevronDown,
  CalendarDays,
  LayoutDashboard,
  Stethoscope,
  Users,
  Building,
  Settings,
  Menu,
  FileText,
  Calendar,
  ClipboardList,
  UserCog,
  CreditCard,
  Bell,
  Clock,
  MessageCircleQuestion,
  Share2,
  Zap,
  LayoutGrid,
} from "lucide-react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import ClinicInfo from "../../features/auth/ClinicInfo";
import LogoutButton from "../../features/auth/LogoutButton";
import { useState, useEffect } from "react";
import { useUnreadNotifications } from "../../features/Notifications/useUnreadNotifications";
import useFcmToken from "../../hooks/useFcmToken";
import useGoogleCalendarSync from "../../features/calendar/useGoogleCalendarSync";

// Config for navigation items with Groups
const NAV_ITEMS_CONFIG = [
  // Overview
  { id: 'dashboard', to: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", permissionKey: "dashboard", group: "main" },
  { id: 'notifications', to: "/notifications", icon: Bell, label: "الإشعارات", permissionKey: "notifications", group: "main" },
  { id: 'ask-tabibi', to: "/ask-tabibi", icon: MessageCircleQuestion, label: "Tabibi AI", permissionKey: "dashboard", group: "main" },
  
  // Clinical
  { id: 'appointments', to: "/appointments", icon: Calendar, label: "المواعيد", permissionKey: "appointments", group: "practice" },
  { id: 'patients', to: "/patients", icon: Users, label: "المرضى", permissionKey: "patients", group: "practice" },
  { id: 'examinations', to: "/examinations", icon: Stethoscope, label: "الكشوفات", permissionKey: "patients", group: "practice" },
  { id: 'treatments', to: "/treatments", icon: ClipboardList, label: "الخطط العلاجية", permissionKey: "treatments", group: "practice" },
  { id: 'work-mode', to: "/work-mode", icon: Clock, label: "وضع العمل", permissionKey: "appointments", group: "practice" },

  // Administration
  { id: 'clinic', to: "/clinic", icon: Building, label: "العيادة", permissionKey: "settings", group: "management" },
  { id: 'staff', to: "/staff", icon: UserCog, label: "ادارة موظفينك", role: "doctor", group: "management" },
  { id: 'finance', to: "/finance", icon: CreditCard, label: "الماليات", permissionKey: "finance", group: "management" },
  { id: 'subscriptions', to: "/subscriptions", icon: FileText, label: "الاشتراكات", role: "doctor", group: "management" },
  { id: 'online-booking', to: "/online-booking", icon: CalendarDays, label: "الحجوزات الإلكترونية", permissionKey: "online-bookings", group: "management" },

  // Apps
  { id: 'tabibi-apps', to: "/tabibi-apps", icon: Zap, label: "Tabibi Apps", permissionKey: "dashboard", group: "apps" },
  { id: 'my-apps', to: "/my-apps", icon: LayoutGrid, label: "تطبيقاتي", permissionKey: "dashboard", group: "apps" },
  { id: 'integrations', to: "/integrations", icon: Share2, label: "التكاملات", permissionKey: "settings", group: "apps" },

  // Settings
  { id: 'settings', to: "/settings", icon: Settings, label: "الإعدادات", permissionKey: "settings", group: "system" },
];

const GROUP_LABELS = {
  main: "الرئيسية",
  practice: "العيادة والمرضى",
  management: "الإدارة",
  apps: "التطبيقات",
  system: "النظام"
};

const GROUPS_ORDER = ['main', 'practice', 'management', 'apps', 'system'];

function NavItem({ to, icon: Icon, label, isVisible = true, onClick, badgeCount }) {
  if (!isVisible) return null;

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        }`
      }>
      <div className="relative">
        <Icon className="size-4" />
        {badgeCount > 0 && (
          <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
}

export default function DoctorLayout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(GROUPS_ORDER);
  const { unreadCount = 0, loading } = useUnreadNotifications();
  const location = useLocation();
  
  // Initialize FCM Token for notifications
  useFcmToken();

  // Initialize Google Calendar Sync (Background Sync)
  useGoogleCalendarSync();

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // For doctors, show all navigation items
  const isDoctor = user?.role === "doctor";

  // Check permissions helper
  const hasPermission = (key) => {
    if (isDoctor) return true;
    if (key === "settings" && user?.role === "secretary") return true; // Special case for settings
    return user?.permissions && user.permissions.includes(key);
  };

  // Function to close sidebar on mobile after clicking a nav item
  const handleNavItemClick = () => {
    if (window.innerWidth < 768) {
      requestAnimationFrame(() => setIsSidebarOpen(false));
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(k => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSidebarOpen &&
        !event.target.closest(".sidebar") &&
        !event.target.closest(".menu-button")
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Close sidebar on window resize to large screen
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Check if current page is Tabibi App Details (needs full width control)
  const isAppDetails = /^\/tabibi-apps\/\d+$/.test(location.pathname);

  // Group items
  const groupedItems = GROUPS_ORDER.reduce((acc, groupKey) => {
    const items = NAV_ITEMS_CONFIG.filter(item => item.group === groupKey);
    if (items.length > 0) {
      acc[groupKey] = items;
    }
    return acc;
  }, {});

  return (
    <div dir="rtl" className="flex h-screen">
      {/* Floating Mobile menu button - Always visible and floating on small screens at the top */}
      <button
        className="md:hidden fixed top-6 left-6 z-[9999] p-3 rounded-full bg-primary text-primary-foreground shadow-lg menu-button"
        onClick={() => {
          // Prevent synchronous layout thrash during React commit
          requestAnimationFrame(() => setIsSidebarOpen((v) => !v));
        }}>
        <Menu className="size-6" />
      </button>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar fixed top-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-[9999]
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:static md:flex md:w-56 lg:w-60 xl:w-64 flex-shrink-0 flex-col border-e border-border bg-card h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
        <Link
          to="/"
          onClick={() => setIsSidebarOpen(false)}
          className="p-4 flex items-center gap-2">
          <Stethoscope className="size-5 text-primary" />
          <span className="font-semibold">Tabibi</span>
        </Link>
        <nav className="px-3 space-y-6 flex-1 py-2">
          {GROUPS_ORDER.map(groupKey => {
            const items = groupedItems[groupKey];
            if (!items || items.length === 0) return null;

            // Filter items by permission
            const visibleItems = items.filter(item => {
               if (item.role && user?.role !== item.role) return false;
               if (item.permissionKey && !hasPermission(item.permissionKey)) return false;
               return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-1">
                 {groupKey !== 'main' && (
                   <button
                     onClick={() => toggleGroup(groupKey)}
                     className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                   >
                     <span>{GROUP_LABELS[groupKey]}</span>
                     <ChevronDown 
                       className={`size-3 transition-transform duration-200 ${expandedGroups.includes(groupKey) ? "" : "rotate-90 rtl:rotate-90"}`} 
                     />
                   </button>
                 )}
                 {(groupKey === 'main' || expandedGroups.includes(groupKey)) && (
                   <div className="space-y-1">
                     {visibleItems.map(item => (
                       <NavItem
                        key={item.id}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        isVisible={true}
                        onClick={handleNavItemClick}
                        badgeCount={item.id === 'notifications' ? unreadCount : undefined}
                      />
                     ))}
                   </div>
                 )}
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <ClinicInfo />
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 md:mr-0 lg:mr-0 xl:mr-0 flex flex-col min-h-0">
        <main className={`flex-1 overflow-y-auto ${isAppDetails ? '' : 'py-6'} mt-0 md:mt-0`}>
          <div className={isAppDetails ? "" : "container"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
