import {
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
} from "lucide-react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import ClinicInfo from "../../features/auth/ClinicInfo";
import LogoutButton from "../../features/auth/LogoutButton";
import { useState, useEffect, useCallback, useRef } from "react";
import { useUnreadNotifications } from "../../features/Notifications/useUnreadNotifications";
import useFcmToken from "../../hooks/useFcmToken";
import useGoogleCalendarSync from "../../features/calendar/useGoogleCalendarSync";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { useUserPreferences, useUpdateUserPreferences } from "../../hooks/useUserPreferences";

// Config for navigation items
const NAV_ITEMS_CONFIG = [
  { id: 'dashboard', to: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", permissionKey: "dashboard" },
  { id: 'appointments', to: "/appointments", icon: Calendar, label: "المواعيد", permissionKey: "appointments" },
  { id: 'work-mode', to: "/work-mode", icon: Clock, label: "وضع العمل", permissionKey: "appointments" },
  { id: 'patients', to: "/patients", icon: Users, label: "المرضى", permissionKey: "patients" },
  { id: 'examinations', to: "/examinations", icon: Stethoscope, label: "الكشوفات", permissionKey: "patients" },
  { id: 'clinic', to: "/clinic", icon: Building, label: "العيادة", permissionKey: "settings" },
  { id: 'treatments', to: "/treatments", icon: ClipboardList, label: "الخطط العلاجية", permissionKey: "treatments" },
  { id: 'finance', to: "/finance", icon: CreditCard, label: "الماليات", permissionKey: "finance" },
  { id: 'online-booking', to: "/online-booking", icon: CalendarDays, label: "الحجوزات الإلكترونية", permissionKey: "online-bookings" },
  { id: 'staff', to: "/staff", icon: UserCog, label: "الموظفين", role: "doctor" },
  { id: 'subscriptions', to: "/subscriptions", icon: FileText, label: "الاشتراكات", role: "doctor" },
  { id: 'notifications', to: "/notifications", icon: Bell, label: "الإشعارات", permissionKey: "notifications" },
  { id: 'integrations', to: "/integrations", icon: Share2, label: "التكاملات", permissionKey: "settings" },
  { id: 'settings', to: "/settings", icon: Settings, label: "الإعدادات", permissionKey: "settings" },
  { id: 'ask-tabibi', to: "/ask-tabibi", icon: MessageCircleQuestion, label: " Tabibi AI ", permissionKey: "dashboard" },
];

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

// Draggable wrapper for NavItem
function DraggableNavItem({ id, index, moveItem, saveOrder, children }) {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: "NAV_ITEM",
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // Save order when drag ends
      if (monitor.didDrop()) {
        saveOrder();
      }
    }
  });

  const [, drop] = useDrop({
    accept: "NAV_ITEM",
    hover: (draggedItem, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      // Time to actually perform the action
      moveItem(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      draggedItem.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref} 
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="select-none" // Prevent selection but allow touch scrolling
    >
      {children}
    </div>
  );
}

export default function DoctorLayout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { unreadCount = 0, loading } = useUnreadNotifications();
  const location = useLocation();
  
  // User Preferences for Sidebar Order
  const { data: preferences } = useUserPreferences();
  const { mutate: updatePreferences } = useUpdateUserPreferences();
  const [orderedNavItems, setOrderedNavItems] = useState(NAV_ITEMS_CONFIG);

  // Initialize FCM Token for notifications
  useFcmToken();

  // Initialize Google Calendar Sync (Background Sync)
  useGoogleCalendarSync();

  // Apply scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Sync with preferences
  useEffect(() => {
    if (preferences?.menu_items && Array.isArray(preferences.menu_items) && preferences.menu_items.length > 0) {
      const savedOrderIds = preferences.menu_items;
      
      // Sort config based on saved order
      const sortedItems = [...NAV_ITEMS_CONFIG].sort((a, b) => {
        const indexA = savedOrderIds.indexOf(a.id);
        const indexB = savedOrderIds.indexOf(b.id);
        
        // If both exist in saved order, sort by index
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        
        // If only A exists, it comes first
        if (indexA !== -1) return -1;
        
        // If only B exists, it comes first
        if (indexB !== -1) return 1;
        
        // If neither exists, keep original order (or put at end)
        return 0;
      });
      
      setOrderedNavItems(sortedItems);
    }
  }, [preferences]);

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

  // Move item handler for DnD
  const moveItem = useCallback((dragIndex, hoverIndex) => {
    setOrderedNavItems((prevItems) => {
      const newItems = [...prevItems];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, removed);
      return newItems;
    });
  }, []);

  // Save order handler
  const saveOrder = useCallback(() => {
    const itemIds = orderedNavItems.map(item => item.id);
    updatePreferences({ menu_items: itemIds });
  }, [orderedNavItems, updatePreferences]);

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

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true, delayTouchStart: 300 }}>
      <div dir="rtl" className="flex h-screen">
        {/* Floating Mobile menu button - Always visible and floating on small screens at the top */}
        <button
          className="md:hidden fixed top-6 left-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg menu-button"
          onClick={() => {
            // Prevent synchronous layout thrash during React commit
            requestAnimationFrame(() => setIsSidebarOpen((v) => !v));
          }}>
          <Menu className="size-6" />
        </button>

        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`sidebar fixed top-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-50
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:translate-x-0 md:static md:flex md:w-56 lg:w-60 xl:w-64 flex-shrink-0 flex-col border-e border-border bg-card h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
          <Link
            to="/"
            onClick={() => setIsSidebarOpen(false)}
            className="p-4 flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" />
            <span className="font-semibold">Tabibi</span>
          </Link>
          <nav className="px-3 space-y-3 flex-1">
            {orderedNavItems.map((item, index) => {
              // Check visibility
              let isVisible = true;
              if (item.role && user?.role !== item.role) isVisible = false;
              if (item.permissionKey && !hasPermission(item.permissionKey)) isVisible = false;
              
              if (!isVisible) return null;

              return (
                <DraggableNavItem 
                  key={item.id} 
                  id={item.id} 
                  index={index} 
                  moveItem={moveItem}
                  saveOrder={saveOrder}
                >
                  <NavItem
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isVisible={true}
                    onClick={handleNavItemClick}
                    badgeCount={item.id === 'notifications' ? unreadCount : undefined}
                  />
                </DraggableNavItem>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border space-y-3">
            <ClinicInfo />
            <LogoutButton />
          </div>
        </aside>
        <div className="flex-1 md:mr-0 lg:mr-0 xl:mr-0 flex flex-col min-h-0">
          <main className="flex-1 overflow-y-auto py-6 mt-0 md:mt-0">
            <div className="container">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </DndProvider>
  );
}
