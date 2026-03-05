import { 
  Calendar, CreditCard, Wallet, Smartphone, Bell, 
  FileText, User, Settings, Info 
} from "lucide-react";

// --- Utility: Egyptian Date Formatter ---
export const formatEgyptianDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  
  // Reset hours for accurate date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true })
    .replace('ص', 'صباحاً').replace('م', 'مساءً');
  
  if (targetDate.getTime() === today.getTime()) {
    return `النهاردة الساعة ${time}`;
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return `امبارح الساعة ${time}`;
  }
  
  const days = ['الاحد', 'الاتنين', 'التلات', 'الاربع', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  return `يوم ${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} الساعة ${time}`;
};

// --- Utility: Action Buttons Parser ---
export const parseActionButtons = (buttons) => {
  if (!buttons) return [];
  if (Array.isArray(buttons)) return buttons;
  if (typeof buttons === 'string') {
    try {
      const parsed = JSON.parse(buttons);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse action_buttons", e);
      return [];
    }
  }
  return [];
};

// --- Helper: Get Icon Component ---
export const getNotificationIcon = (type) => {
  const styles = {
    appointment: { icon: Calendar },
    online_appointment: { icon: Calendar },
    payment: { icon: CreditCard },
    wallet: { icon: Wallet },
    app: { icon: Smartphone },
    reminder: { icon: Bell },
    subscription: { icon: FileText },
    patient: { icon: User },
    system: { icon: Settings },
    alert: { icon: Bell },
    info: { icon: Info },
  };

  const style = styles[type] || { icon: Bell };
  return style.icon;
};

// --- Component: Notification Icon ---
export const NotificationIcon = ({ type, className }) => {
  const Icon = getNotificationIcon(type);

  return (
    <div className={`p-2 rounded-full shrink-0 bg-stone-800 ${className || ''}`}>
      <Icon className="h-5 w-5 text-primary" />
    </div>
  );
};
