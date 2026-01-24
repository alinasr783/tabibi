import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import * as LucideIcons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

// Import commonly used icons
const { 
  Calendar, 
  Users, 
  Building, 
  CreditCard, 
  Settings, 
  FileText,
  Bell,
  Clock,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Heart,
  Zap,
  TrendingUp,
  TrendingDown,
  Percent,
  Activity,
  BarChart,
  PieChart,
  Target,
  Award,
  Gift,
  Sparkles,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Pill,
  Syringe,
  Thermometer,
  HeartPulse,
  Clipboard,
  ClipboardList,
  ClipboardCheck,
  ListChecks,
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  UserPlus,
  UserCheck,
  UserX,
  Wallet,
  Receipt,
  Banknote,
  Coins,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Download,
  Upload,
  Share,
  Link,
  Copy,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Rocket,
  Crown,
  Flame,
  ThumbsUp,
  ThumbsDown,
  PartyPopper,
  Send
} = LucideIcons;

// ========================
// Animation Wrapper - Applies animations to any component
// ========================
function withAnimation(Component, animationConfig) {
  if (!animationConfig || !animationConfig.animation) {
    return Component;
  }
  
  const { animation, duration = 300, direction = 'right' } = animationConfig;
  
  const animationVariants = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: duration / 1000 }
    },
    slideIn: {
      initial: { 
        opacity: 0,
        x: direction === 'left' ? -20 : direction === 'right' ? 20 : 0,
        y: direction === 'up' ? -20 : direction === 'down' ? 20 : 0
      },
      animate: { opacity: 1, x: 0, y: 0 },
      transition: { duration: duration / 1000, ease: 'easeOut' }
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: duration / 1000, ease: 'easeOut' }
    },
    bounce: {
      initial: { opacity: 0, scale: 0.3 },
      animate: { 
        opacity: 1, 
        scale: [0.3, 1.1, 0.9, 1.05, 1],
      },
      transition: { 
        duration: duration / 1000,
        times: [0, 0.4, 0.6, 0.8, 1],
        ease: 'easeOut'
      }
    },
    pulse: {
      initial: { opacity: 1, scale: 1 },
      animate: { 
        opacity: [1, 0.8, 1],
        scale: [1, 1.05, 1]
      },
      transition: { 
        duration: duration / 1000,
        repeat: Infinity,
        repeatType: 'loop'
      }
    }
  };
  
  const variant = animationVariants[animation] || animationVariants.fadeIn;
  
  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      transition={variant.transition}
    >
      {Component}
    </motion.div>
  );
}

// ========================
// أنواع الـ Actions المتاحة
// ========================
export const ACTION_TYPES = {
  BUTTON: "button",
  LINK: "link",
  INPUT: "input",
  PROGRESS: "progress",
  CARD: "card",
  ALERT: "alert",
  STEPS: "steps",
  COMPONENT: "component",
  DATA_TABLE: "data_table",
  FORM: "form",
  CHART: "chart"
};

// ========================
// الصفحات المتاحة للتنقل
// ========================
export const AVAILABLE_PAGES = {
  dashboard: { path: "/dashboard", label: "لوحة التحكم", icon: "LayoutDashboard" },
  appointments: { path: "/appointments", label: "المواعيد", icon: "Calendar" },
  patients: { path: "/patients", label: "المرضى", icon: "Users" },
  clinic: { path: "/clinic", label: "العيادة", icon: "Building" },
  finance: { path: "/finance", label: "المالية", icon: "CreditCard" },
  settings: { path: "/settings", label: "الإعدادات", icon: "Settings" },
  treatments: { path: "/treatments", label: "العلاجات", icon: "FileText" },
  notifications: { path: "/notifications", label: "الإشعارات", icon: "Bell" },
  staff: { path: "/staff", label: "الموظفين", icon: "Users" },
  subscriptions: { path: "/subscriptions", label: "الاشتراكات", icon: "CreditCard" },
  "online-booking": { path: "/online-booking", label: "الحجز الإلكتروني", icon: "Calendar" },
  "work-mode": { path: "/work-mode", label: "وضع العمل", icon: "Clock" }
};

// ========================
// الـ Components المتاحة للاستدعاء
// ========================
export const AVAILABLE_COMPONENTS = {
  "new-appointment": "AppointmentCreateDialog",
  "add-appointment": "AppointmentCreateDialog",
  "appointment": "AppointmentCreateDialog",
  "new-patient": "PatientCreateDialog",
  "add-patient": "PatientCreateDialog",
  "patient": "PatientCreateDialog",
  "new-treatment": "TreatmentTemplateCreateDialog",
  "add-treatment": "TreatmentTemplateCreateDialog",
  "treatment": "TreatmentTemplateCreateDialog",
  "new-staff": "AddSecretaryDialog",
  "add-staff": "AddSecretaryDialog",
  "staff": "AddSecretaryDialog",
  "search-patients": "PatientSearch"
};

// ========================
// الأوامر التنفيذية المتاحة
// ========================
export const AVAILABLE_ACTIONS = {
  "enableOnlineBooking": "تفعيل الحجز الإلكتروني",
  "disableOnlineBooking": "إيقاف الحجز الإلكتروني",
  "copyBookingLink": "نسخ رابط الحجز",
  "reorderMenu": "تغيير ترتيب المنيو",
  "resetSettings": "إعادة الإعدادات الافتراضية"
};

// ========================
// Dynamic Icon Getter
// ========================
function getIcon(iconName) {
  if (!iconName) return null;
  return LucideIcons[iconName] || null;
}

// Legacy Icon Map for backwards compatibility
const IconMap = {
  Calendar,
  Users,
  Building,
  CreditCard,
  Settings,
  FileText,
  Bell,
  Clock,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Heart,
  Zap,
  TrendingUp,
  TrendingDown,
  Percent,
  Activity,
  BarChart,
  PieChart,
  Target,
  Award,
  Gift,
  Sparkles,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Pill,
  Syringe,
  Thermometer,
  HeartPulse,
  Clipboard,
  ClipboardList,
  ClipboardCheck,
  ListChecks,
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  UserPlus,
  UserCheck,
  UserX,
  Wallet,
  Receipt,
  Banknote,
  Coins,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Download,
  Upload,
  Share,
  Link,
  Copy,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Rocket,
  Crown,
  Flame,
  ThumbsUp,
  ThumbsDown,
  PartyPopper,
  Send
};

// ========================
// Inline Icon Component - renders icons within text
// ========================
export function InlineIcon({ name, className = "" }) {
  const IconComponent = getIcon(name) || IconMap[name];
  if (!IconComponent) return null;
  return <IconComponent className={cn("inline-block w-4 h-4 mx-0.5 align-text-bottom", className)} />;
}

// ========================
// Action Button Component - Clean & Simple
// ========================
function ActionButton({ action, onAction }) {
  const navigate = useNavigate();
  const IconComponent = getIcon(action.icon) || IconMap[action.icon];
  
  const handleClick = () => {
    if (action.navigate) {
      // Navigate to a page
      onAction?.("navigate", action.navigate);
    } else if (action.openComponent) {
      // Open a component/dialog
      onAction?.("openComponent", action.openComponent);
    } else if (action.action) {
      // Execute an action (enable/disable, copy, etc.)
      // Pass the FULL action object so data is accessible
      onAction?.("action", action);
    } else if (action.onClick) {
      onAction?.("custom", action.onClick);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant={action.variant || "default"}
        size="lg"
        onClick={handleClick}
        className={cn(
          "w-full gap-3 justify-center text-base font-medium",
          "shadow-sm hover:shadow-lg transition-all duration-200",
          "hover:translate-y-[-2px]",
          action.className
        )}
      >
        {IconComponent && <IconComponent className="w-5 h-5" />}
        {action.label}
        {action.navigate && <ArrowLeft className="w-4 h-4 mr-auto opacity-50" />}
      </Button>
    </motion.div>
  );
}

// ========================
// Action Link Component
// ========================
function ActionLink({ action }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(action.to)}
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      {action.label}
      <ArrowLeft className="w-3 h-3" />
    </button>
  );
}

// ========================
// Action Input Component - Enhanced for missing data collection
// ========================
function ActionInput({ action, onAction }) {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = async () => {
    if (!value.trim()) return;
    setIsLoading(true);
    await onAction?.("input", { id: action.id, value });
    setIsSubmitted(true);
    setIsLoading(false);
  };
  
  if (isSubmitted) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-600 dark:text-green-400">
          تم إرسال: {value}
        </span>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {action.label && (
        <label className="text-sm font-medium text-muted-foreground">
          {action.label}
        </label>
      )}
      <div className="flex gap-2 items-center">
        <Input
          placeholder={action.placeholder || "اكتب هنا..."}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1"
          type={action.inputType || "text"}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !value.trim()} 
          size="icon"
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
}

// ========================
// Action Form Component - Multiple inputs with single submit
// ========================
function ActionForm({ action, onAction }) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Initialize form data from fields
  useEffect(() => {
    const initialData = {};
    (action.fields || []).forEach(field => {
      initialData[field.id] = field.defaultValue || "";
    });
    setFormData(initialData);
  }, [action.fields]);
  
  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };
  
  const handleSubmit = async () => {
    setIsLoading(true);
    // Send all form data to the AI as a message
    const formattedData = Object.entries(formData)
      .filter(([_, value]) => value)
      .map(([key, value]) => {
        const field = action.fields.find(f => f.id === key);
        return `${field?.label || key}: ${value}`;
      })
      .join("\n");
    
    await onAction?.("formSubmit", { 
      formId: action.id, 
      data: formData,
      formattedMessage: formattedData,
      action: action.submitAction
    });
    setIsSubmitted(true);
    setIsLoading(false);
  };
  
  const isValid = (action.fields || []).every(field => {
    if (field.required) {
      return formData[field.id] && formData[field.id].toString().trim() !== "";
    }
    return true;
  });
  
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="font-medium text-green-600 dark:text-green-400">
            {action.successMessage || "تم الإرسال بنجاح!"}
          </span>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-4"
    >
      {action.title && (
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
          {action.icon && (() => {
            const IconComponent = getIcon(action.icon);
            return IconComponent ? <IconComponent className="w-4 h-4 text-primary" /> : null;
          })()}
          {action.title}
        </h4>
      )}
      
      <div className="space-y-3">
        {(action.fields || []).map((field, index) => (
          <div key={field.id || index} className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <Input
              placeholder={field.placeholder || ""}
              value={formData[field.id] || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              type={field.type || "text"}
              className="w-full"
            />
          </div>
        ))}
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !isValid}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin ml-2" />
        ) : (
          <Send className="w-4 h-4 ml-2" />
        )}
        {action.submitLabel || "إرسال"}
      </Button>
    </motion.div>
  );
}

// ========================
// Action Progress Component - Simple
// ========================
function ActionProgress({ action }) {
  // Determine color based on value
  const getProgressColor = () => {
    if (action.value >= 80) return 'bg-red-500';
    if (action.value >= 50) return 'bg-amber-500';
    return 'bg-primary';
  };
  
  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-sm">{action.label}</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-bold",
          action.value >= 80 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
          action.value >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
          "bg-primary/10 text-primary"
        )}>
          {action.value}%
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getProgressColor())}
          style={{ width: `${action.value}%` }}
        />
      </div>
    </div>
  );
}

// ========================
// Action Card Component
// ========================
function ActionCard({ action, onAction }) {
  const IconComponent = getIcon(action.icon) || IconMap[action.icon] || Info;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className={cn("overflow-hidden shadow-md hover:shadow-lg transition-shadow", action.className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <IconComponent className="w-5 h-5 text-primary" />
            </motion.div>
            {action.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(action.content) ? (
            <div className="space-y-2">
              {action.content.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * (i + 1) }}
                >
                  {item.type === 'text' && (
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  )}
                  {item.type === 'input' && (
                    <ActionInput action={item} onAction={onAction} />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{action.content}</p>
          )}
          {action.actions && (
            <div className="flex gap-2 mt-4">
              {action.actions.map((btn, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="flex-1"
                >
                  <ActionButton action={btn} onAction={onAction} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ========================
// Action Alert Component - Simple
// ========================
function ActionAlert({ action }) {
  const variants = {
    info: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
    success: "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    warning: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    error: "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
  };
  
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  };
  
  const variant = action.variant || "info";
  const IconComponent = icons[variant];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        variants[variant]
      )}
    >
      <motion.div
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
      </motion.div>
      <div className="flex-1 min-w-0">
        {action.title && <p className="font-semibold text-sm mb-0.5">{action.title}</p>}
        <p className="text-sm opacity-90">{action.message}</p>
      </div>
    </motion.div>
  );
}

// ========================
// Action Steps Component - Simple
// ========================
function ActionSteps({ action }) {
  return (
    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
      {action.title && (
        <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          {action.title}
        </h4>
      )}
      <div className="space-y-2">
        {action.steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
              step.completed 
                ? "bg-green-500 text-white" 
                : "bg-primary text-primary-foreground"
            )}>
              {step.completed ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
            </div>
            <p className={cn(
              "text-sm",
              step.completed && "line-through opacity-60"
            )}>
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================
// Quick Actions Grid - Simple
// ========================
function QuickActionsGrid({ actions, onAction }) {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action, index) => {
        const IconComponent = getIcon(action.icon) || IconMap[action.icon];
        
        return (
          <button
            key={index}
            onClick={() => {
              if (action.navigate) navigate(action.navigate);
              else if (action.openComponent) onAction?.("openComponent", action.openComponent);
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl",
              "bg-card border border-border",
              "hover:bg-muted/50 hover:border-primary/30 transition-colors"
            )}
          >
            {IconComponent && (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-primary" />
              </div>
            )}
            <span className="text-xs font-medium text-center">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ========================
// Action Chart Component - Multiple Chart Types
// ========================
function ActionChart({ action }) {
  const colorMap = {
    primary: 'bg-primary',
    secondary: 'bg-muted-foreground',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500'
  };
  
  const strokeColorMap = {
    primary: 'stroke-primary',
    secondary: 'stroke-muted-foreground',
    success: 'stroke-green-500',
    warning: 'stroke-amber-500',
    danger: 'stroke-red-500',
    blue: 'stroke-blue-500',
    purple: 'stroke-purple-500'
  };
  
  // Handle both array format (old charts) and object format (multi-line)
  const rawData = action.data || [];
  const data = Array.isArray(rawData) ? rawData : [];
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value), 1) : 1;
  
  // Vertical Bar Chart
  if (action.chartType === 'bar' || action.chartType === 'vertical-bar') {
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        {action.title && (
          <h4 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4 text-primary" />
            {action.title}
          </h4>
        )}
        <div className="flex items-end justify-around gap-2" style={{ height: '128px' }}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const heightPx = maxValue > 0 ? Math.max((item.value / maxValue) * 112, 8) : 8; // 112px is ~88% of 128px container
            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-bold text-foreground">{item.value}</span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500",
                    colorMap[item.color] || 'bg-primary'
                  )}
                  style={{ 
                    height: `${heightPx}px`
                  }}
                />
                <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Horizontal Bar Chart
  if (action.chartType === 'horizontal-bar') {
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        {action.title && (
          <h4 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4 text-primary" />
            {action.title}
          </h4>
        )}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-bold">{item.value}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    colorMap[item.color] || 'bg-primary'
                  )}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Line Chart
  if (action.chartType === 'line') {
    const width = 300;
    const height = 120;
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Calculate points
    const points = data.map((item, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - (item.value / maxValue) * chartHeight;
      return { x, y, ...item };
    });
    
    // Create path
    const pathD = points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');
    
    // Create area path
    const areaD = `${pathD} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;
    
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        {action.title && (
          <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {action.title}
          </h4>
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + chartHeight - (percent / 100) * chartHeight}
              x2={width - padding}
              y2={padding + chartHeight - (percent / 100) * chartHeight}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          
          {/* Area fill */}
          <path
            d={areaD}
            className="fill-primary/10"
          />
          
          {/* Line */}
          <path
            d={pathD}
            className="stroke-primary fill-none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className="fill-primary stroke-background"
                strokeWidth="2"
              />
              <text
                x={point.x}
                y={height - 5}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {point.label}
              </text>
              <text
                x={point.x}
                y={point.y - 8}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-bold"
              >
                {point.value}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }
  
  // Multi-Line Chart
  if (action.chartType === 'multi-line') {
    const width = 300;
    const height = 120;
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Parse data - use rawData for object format
    const chartData = typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {};
    const datasets = chartData.datasets || [];
    const labels = chartData.labels || [];
    
    // Calculate max value across all datasets
    const allValues = datasets.flatMap(ds => ds.data || []);
    const chartMaxValue = Math.max(...allValues, 1);
    
    // Color mapping for datasets
    const lineColorMap = {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      blue: '#3b82f6',
      purple: '#a855f7',
      pink: '#ec4899',
      indigo: '#4f46e5',
      cyan: '#06b6d4'
    };
    
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        {action.title && (
          <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {action.title}
          </h4>
        )}
        
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + chartHeight - (percent / 100) * chartHeight}
              x2={width - padding}
              y2={padding + chartHeight - (percent / 100) * chartHeight}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          
          {/* Render each dataset as a line */}
          {datasets.map((dataset, datasetIndex) => {
            const datasetData = dataset.data || [];
            const color = lineColorMap[dataset.color] || lineColorMap.primary;
            
            // Calculate points for this dataset
            const points = datasetData.map((value, index) => {
              const x = padding + (index / Math.max(labels.length - 1, 1)) * chartWidth;
              const y = padding + chartHeight - (value / chartMaxValue) * chartHeight;
              return { x, y, value, label: labels[index] };
            });
            
            // Create path for this dataset
            const pathD = points.map((point, index) => {
              return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
            }).join(' ');
            
            return (
              <g key={datasetIndex}>
                {/* Line */}
                <path
                  d={pathD}
                  stroke={color}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Points */}
                {points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={color}
                    className="stroke-background"
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {labels.map((label, index) => {
            const x = padding + (index / Math.max(labels.length - 1, 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {label}
              </text>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {datasets.map((dataset, index) => {
            const color = lineColorMap[dataset.color] || lineColorMap.primary;
            return (
              <div key={index} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{dataset.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Pie Chart
  if (action.chartType === 'pie' || action.chartType === 'donut') {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = 50;
    const centerX = 60;
    const centerY = 60;
    const innerRadius = action.chartType === 'donut' ? 25 : 0;
    
    // Calculate pie slices
    let currentAngle = -90; // Start from top
    const slices = data.map((item, index) => {
      const percentage = total > 0 ? (item.value / total) : 0;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      // Calculate arc path
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      let path;
      if (innerRadius > 0) {
        const ix1 = centerX + innerRadius * Math.cos(startRad);
        const iy1 = centerY + innerRadius * Math.sin(startRad);
        const ix2 = centerX + innerRadius * Math.cos(endRad);
        const iy2 = centerY + innerRadius * Math.sin(endRad);
        
        path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
      } else {
        path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }
      
      return {
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: Math.round(percentage * 100)
      };
    });
    
    const pieColors = {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      blue: '#3b82f6',
      purple: '#a855f7',
      pink: '#ec4899'
    };
    
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
        {action.title && (
          <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            {action.title}
          </h4>
        )}
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 120 120" className="w-28 h-28 flex-shrink-0">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.path}
                fill={pieColors[slice.color] || pieColors.primary}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
            {action.chartType === 'donut' && (
              <text
                x={centerX}
                y={centerY + 5}
                textAnchor="middle"
                className="fill-foreground text-lg font-bold"
              >
                {total}
              </text>
            )}
          </svg>
          <div className="flex flex-col gap-1.5">
            {slices.map((slice, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: pieColors[slice.color] || pieColors.primary }}
                />
                <span className="text-muted-foreground">{slice.label}:</span>
                <span className="font-bold">{slice.value}</span>
                <span className="text-xs text-muted-foreground">({slice.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

// ========================
// Main Action Renderer
// ========================
export function ActionRenderer({ actions, onAction }) {
  if (!actions || actions.length === 0) return null;
  
  return (
    <div className="space-y-3 mt-3">
      <AnimatePresence>
        {actions.map((action, index) => {
          switch (action.type) {
            case ACTION_TYPES.BUTTON:
              return <ActionButton key={index} action={action} onAction={onAction} />;
            case ACTION_TYPES.LINK:
              return <ActionLink key={index} action={action} />;
            case ACTION_TYPES.INPUT:
              return <ActionInput key={index} action={action} onAction={onAction} />;
            case ACTION_TYPES.PROGRESS:
              return <ActionProgress key={index} action={action} />;
            case ACTION_TYPES.CARD:
              return <ActionCard key={index} action={action} onAction={onAction} />;
            case ACTION_TYPES.ALERT:
              return <ActionAlert key={index} action={action} />;
            case ACTION_TYPES.STEPS:
              return <ActionSteps key={index} action={action} />;
            case ACTION_TYPES.CHART:
              return <ActionChart key={index} action={action} />;
            case ACTION_TYPES.FORM:
              return <ActionForm key={index} action={action} onAction={onAction} />;
            case "quick_actions":
              return <QuickActionsGrid key={index} actions={action.items} onAction={onAction} />;
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </div>
  );
}

// ========================
// Parse AI Response for Actions and Formatting - INLINE SUPPORT
// ========================
export function parseAIResponse(content) {
  // Split content into segments: text, actions, and execute commands
  const segments = [];
  const executeCommands = []; // Commands to execute automatically
  
  // More flexible regex to handle variations in code blocks
  const blockRegex = /```(action|execute)\s*\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = blockRegex.exec(content)) !== null) {
    // Add text before this block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore });
      }
    }
    
    const blockType = match[1]; // 'action' or 'execute'
    let blockContent = match[2].trim();
    
    try {
      // Try to extract JSON from the block content
      // Remove any leading/trailing text that's not part of JSON
      const jsonMatch = blockContent.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (jsonMatch) {
        blockContent = jsonMatch[0];
      }
      
      const parsedData = JSON.parse(blockContent);
      
      if (blockType === 'execute') {
        // This is an execute command - collect for automatic execution
        if (Array.isArray(parsedData)) {
          executeCommands.push(...parsedData);
        } else {
          executeCommands.push(parsedData);
        }
        // Also add a visual indicator that action was executed
        segments.push({ 
          type: 'execute', 
          content: parsedData,
          status: 'pending' // Will be updated after execution
        });
      } else {
        // Regular action (button, chart, etc.)
        if (Array.isArray(parsedData)) {
          parsedData.forEach(action => {
            segments.push({ type: 'action', content: action });
          });
        } else {
          segments.push({ type: 'action', content: parsedData });
        }
      }
    } catch (e) {
      console.error("Failed to parse block:", e);
      console.error("Block content:", blockContent);
      // Try to salvage by looking for JSON patterns
      const salvageMatch = blockContent.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (salvageMatch) {
        try {
          const salvaged = JSON.parse(salvageMatch[0]);
          if (blockType === 'action') {
            segments.push({ type: 'action', content: salvaged });
          }
        } catch (salvageError) {
          // Give up on this block
          console.error("Could not salvage block");
        }
      }
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      segments.push({ type: 'text', content: remainingText });
    }
  }
  
  // For backwards compatibility, also return text and actions separately
  const textContent = segments
    .filter(s => s.type === 'text')
    .map(s => s.content)
    .join('\n');
  const actions = segments
    .filter(s => s.type === 'action')
    .map(s => s.content);
  
  return {
    text: textContent,
    actions,
    segments, // Ordered segments for inline rendering
    executeCommands // Commands to execute automatically
  };
}

// ========================
// Format Text with Icons and Styling
// ========================
export function FormattedText({ text }) {
  if (!text) return null;
  
  // Split text into lines for processing
  const lines = text.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        // Process inline formatting
        let processedLine = line;
        
        // Check for heading patterns
        const h1Match = processedLine.match(/^###\s*(.+)$/);
        const h2Match = processedLine.match(/^##\s*(.+)$/);
        const h3Match = processedLine.match(/^#\s*(.+)$/);
        
        if (h1Match) {
          return (
            <h3 key={index} className="text-lg font-bold text-foreground mt-3 mb-1">
              {formatInlineContent(h1Match[1])}
            </h3>
          );
        }
        if (h2Match) {
          return (
            <h4 key={index} className="text-base font-semibold text-foreground mt-2 mb-1">
              {formatInlineContent(h2Match[1])}
            </h4>
          );
        }
        if (h3Match) {
          return (
            <h5 key={index} className="text-sm font-medium text-foreground mt-1">
              {formatInlineContent(h3Match[1])}
            </h5>
          );
        }
        
        // Check for bullet points
        const bulletMatch = processedLine.match(/^[-•]\s*(.+)$/);
        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pr-2">
              <span className="text-primary mt-1.5">•</span>
              <span>{formatInlineContent(bulletMatch[1])}</span>
            </div>
          );
        }
        
        // Check for numbered lists
        const numberedMatch = processedLine.match(/^(\d+)[.)]\s*(.+)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pr-2">
              <span className="text-primary font-medium min-w-[1.5rem]">{numberedMatch[1]}.</span>
              <span>{formatInlineContent(numberedMatch[2])}</span>
            </div>
          );
        }
        
        // Empty line
        if (!processedLine.trim()) {
          return <div key={index} className="h-2" />;
        }
        
        // Regular line
        return (
          <p key={index}>
            {formatInlineContent(processedLine)}
          </p>
        );
      })}
    </div>
  );
}

// Format inline content (bold, icons, etc.)
function formatInlineContent(text) {
  const parts = [];
  let remaining = text;
  let keyIndex = 0;
  
  // Pattern for icons: [icon:IconName]
  // Pattern for bold: **text** or __text__
  // Pattern for italic: *text* or _text_
  const combinedPattern = /\[icon:(\w+)\]|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(<span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    if (match[1]) {
      // Icon match
      const IconComponent = getIcon(match[1]) || IconMap[match[1]];
      if (IconComponent) {
        parts.push(
          <IconComponent 
            key={keyIndex++} 
            className="inline-block w-4 h-4 mx-0.5 align-text-bottom text-primary" 
          />
        );
      }
    } else if (match[2] || match[3]) {
      // Bold match
      parts.push(<strong key={keyIndex++} className="font-bold">{match[2] || match[3]}</strong>);
    } else if (match[4] || match[5]) {
      // Italic match
      parts.push(<em key={keyIndex++} className="italic">{match[4] || match[5]}</em>);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={keyIndex++}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : text;
}

// ========================
// Execute Indicator - Shows execution status
// ========================
function ExecuteIndicator({ execute, status = 'pending', result }) {
  const actionName = execute?.action || 'unknown';
  
  // Map action names to friendly labels
  const actionLabels = {
    createPatientAction: 'إضافة مريض',
    updatePatientAction: 'تعديل مريض',
    createAppointmentAction: 'إضافة موعد',
    cancelAppointmentAction: 'إلغاء موعد',
    createVisitAction: 'إضافة كشف',
    addStaffAction: 'إضافة موظف',
    setClinicDayOffAction: 'تعديل إجازة',
    updateClinicHoursAction: 'تعديل مواعيد',
    updateBookingPriceAction: 'تعديل سعر الكشف'
  };
  
  const label = actionLabels[actionName] || actionName;
  
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-primary">جاري تنفيذ: {label}...</span>
      </div>
    );
  }
  
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-600 dark:text-green-400">
          {result?.message || `تم ${label} بنجاح!`}
        </span>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400">
          {result?.message || 'حصل مشكلة'}
        </span>
      </div>
    );
  }
  
  return null;
}

// ========================
// Inline Message Renderer - Renders text and actions in order
// ========================
export function InlineMessageRenderer({ segments, onAction, executeResults = {} }) {
  if (!segments || segments.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <motion.div
                key={`text-${index}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <FormattedText text={segment.content} />
              </motion.div>
            );
          }
          
          if (segment.type === 'execute') {
            const execKey = JSON.stringify(segment.content);
            const execResult = executeResults[execKey];
            return (
              <motion.div
                key={`execute-${index}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
              >
                <ExecuteIndicator 
                  execute={segment.content} 
                  status={execResult?.status || 'pending'}
                  result={execResult?.result}
                />
              </motion.div>
            );
          }
          
          if (segment.type === 'action') {
            const action = segment.content;
            return (
              <motion.div
                key={`action-${index}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
              >
                {renderSingleAction(action, onAction, index)}
              </motion.div>
            );
          }
          
          return null;
        })}
      </AnimatePresence>
    </div>
  );
}

// Helper function to render a single action
function renderSingleAction(action, onAction, index) {
  let component;
  
  switch (action.type) {
    case ACTION_TYPES.BUTTON:
      component = <ActionButton action={action} onAction={onAction} />;
      break;
    case ACTION_TYPES.LINK:
      component = <ActionLink action={action} />;
      break;
    case ACTION_TYPES.INPUT:
      component = <ActionInput action={action} onAction={onAction} />;
      break;
    case ACTION_TYPES.PROGRESS:
      component = <ActionProgress action={action} />;
      break;
    case ACTION_TYPES.CARD:
      component = <ActionCard action={action} onAction={onAction} />;
      break;
    case ACTION_TYPES.ALERT:
      component = <ActionAlert action={action} />;
      break;
    case ACTION_TYPES.STEPS:
      component = <ActionSteps action={action} />;
      break;
    case ACTION_TYPES.CHART:
      component = <ActionChart action={action} />;
      break;
    case "quick_actions":
      component = <QuickActionsGrid actions={action.items} onAction={onAction} />;
      break;
    default:
      return null;
  }
  
  // Apply animation if specified
  if (action.animation) {
    return withAnimation(component, {
      animation: action.animation,
      duration: action.duration,
      direction: action.direction
    });
  }
  
  return component;
}

export default ActionRenderer;
