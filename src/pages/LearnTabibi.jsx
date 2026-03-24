import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  MessageCircleQuestion,
  Search,
  HelpCircle,
  Settings,
  Share2,
  Stethoscope,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import supabase from "../services/supabase";
import { useAuth } from "../features/auth/AuthContext";
import { GROUPS_ORDER, GROUP_LABELS, NAV_ITEMS_CONFIG } from "../components/layout/DoctorLayout";
import { X } from "lucide-react";
import Header from "../components/layout/Header";

const FALLBACK_SYSTEMS = [
  { key: "patients_management", label: "إدارة المرضى" },
  { key: "examinations_management", label: "إدارة الكشوفات" },
  { key: "appointments_management", label: "إدارة الحجوزات" },
  { key: "online_booking_management", label: "إدارة الحجوزات الإلكترونية" },
  { key: "treatment_plans_management", label: "إدارة الخطط العلاجية" },
  { key: "work_mode", label: "وضع العمل" },
  { key: "staff_management", label: "إدارة الموظفين" },
  { key: "finance_management", label: "إدارة الماليات" },
  { key: "integrations", label: "التكاملات" },
  { key: "personalization", label: "تخصيص طبيبي على مقاسك" },
  { key: "tabibi_apps", label: "تطبيقات طبيبي" },
  { key: "tabibi_ai", label: "ذكاء طبيبي (Tabibi AI)" },
];

const SYSTEM_LABEL_BY_KEY = FALLBACK_SYSTEMS.reduce((acc, s) => {
  acc[s.key] = s.label;
  return acc;
}, {});

const ICON_COMPONENT_BY_NAME = {
  Users,
  Stethoscope,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  UserCog,
  CreditCard,
  Share2,
  Settings,
  Zap,
  MessageCircleQuestion,
  BookOpen,
};

const SYSTEM_ICON_BY_KEY = {
  patients_management: Users,
  examinations_management: Stethoscope,
  appointments_management: Calendar,
  online_booking_management: CalendarDays,
  treatment_plans_management: ClipboardList,
  work_mode: Clock,
  staff_management: UserCog,
  finance_management: CreditCard,
  integrations: Share2,
  personalization: Settings,
  tabibi_apps: Zap,
  tabibi_ai: MessageCircleQuestion,
};

function sanitizeHtml(html) {
  const s = String(html || "");
  return s
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

export default function LearnTabibi() {
  const navigate = useNavigate();
  const { systemKey, topicKey } = useParams();
  const [params, setParams] = useSearchParams();
  const initialSystem = params.get("system") || "";
  const [learnQuery, setLearnQuery] = useState("");
  const { user } = useAuth();
  const [isDashSidebarOpen, setIsDashSidebarOpen] = useState(false);
  const [isLandingSidebarOpen, setIsLandingSidebarOpen] = useState(false);

  const [systems, setSystems] = useState([]);
  const [topicsMeta, setTopicsMeta] = useState([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(true);
  const [indexError, setIndexError] = useState("");
  const [article, setArticle] = useState(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);

  const selectedSystemKey = systemKey || initialSystem;
  const isSystemSelected = Boolean(selectedSystemKey);

  const systemsForUi = useMemo(() => {
    if (systems.length > 0) return systems;
    if (isLoadingIndex) return [];
    return FALLBACK_SYSTEMS.map((s) => ({ ...s, icon: null }));
  }, [isLoadingIndex, systems]);

  const systemLabelByKey = useMemo(() => {
    if (systems.length === 0) return SYSTEM_LABEL_BY_KEY;
    const acc = {};
    for (const s of systems) acc[s.key] = s.label;
    return acc;
  }, [systems]);

  const topicsCountBySystem = useMemo(() => {
    const m = new Map();
    for (const t of topicsMeta) {
      const k = t.systemKey;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [topicsMeta]);

  useEffect(() => {
    let cancelled = false;

    const loadIndex = async () => {
      setIsLoadingIndex(true);
      setIndexError("");

      const [{ data: systemsData, error: systemsError }, { data: topicsData, error: topicsError }] = await Promise.all([
        supabase
          .from("tabibi_learning_systems")
          .select("key,label,icon,sort_order,is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("tabibi_learning_topics")
          .select("system_key,topic_key,title,summary,sort_order,is_published")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (cancelled) return;

      if (systemsError || topicsError) {
        setIndexError((systemsError || topicsError)?.message || "حدث خطأ أثناء تحميل المحتوى.");
        setSystems([]);
        setTopicsMeta([]);
        setIsLoadingIndex(false);
        return;
      }

      setSystems((systemsData || []).map((s) => ({ key: s.key, label: s.label, icon: s.icon })));
      setTopicsMeta(
        (topicsData || []).map((t) => ({
          systemKey: t.system_key,
          topicKey: t.topic_key,
          title: t.title,
          summary: t.summary || "",
          sortOrder: t.sort_order ?? 0,
        }))
      );
      setIsLoadingIndex(false);
    };

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadArticle = async () => {
      if (!systemKey || !topicKey) return;
      setIsLoadingArticle(true);
      setArticle(null);

      const { data, error } = await supabase
        .from("tabibi_learning_topics")
        .select("system_key,topic_key,title,summary,html_content,is_published")
        .eq("system_key", systemKey)
        .eq("topic_key", topicKey)
        .eq("is_published", true)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setArticle(null);
        setIsLoadingArticle(false);
        return;
      }

      setArticle(
        data
          ? {
              systemKey: data.system_key,
              topicKey: data.topic_key,
              title: data.title,
              summary: data.summary || "",
              html: data.html_content || "",
            }
          : null
      );
      setIsLoadingArticle(false);
    };

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [systemKey, topicKey]);

  const availableTopicsForSystem = useMemo(() => {
    if (!selectedSystemKey) return [];
    const list = topicsMeta.filter((t) => t.systemKey === selectedSystemKey);
    list.sort((a, b) => {
      const ao = a.sortOrder ?? 0;
      const bo = b.sortOrder ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.title || "").localeCompare(b.title || "", "ar");
    });
    return list;
  }, [topicsMeta, selectedSystemKey]);

  const filteredLearnTopics = useMemo(() => {
    const q = learnQuery.trim().toLowerCase();
    if (!q) return availableTopicsForSystem;
    return availableTopicsForSystem.filter((t) => {
      const hay = `${t.title} ${t.summary}`.toLowerCase();
      return hay.includes(q);
    });
  }, [availableTopicsForSystem, learnQuery]);

  const systemTitle = systemLabelByKey[selectedSystemKey] || selectedSystemKey || "";

  const renderMenuButton = () => {
    if (user) return null;
    return (
      <button
        className="fixed top-6 left-6 z-[9999] p-3 rounded-full bg-primary text-primary-foreground shadow-lg menu-button md:hidden"
        onClick={() => setIsLandingSidebarOpen(true)}
        aria-label="فتح القائمة"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    );
  };

  const hasPermission = (key) => {
    if (!user) return false;
    if (user?.role === "doctor") return true;
    if (key === "settings" && user?.role === "secretary") return true;
    return Array.isArray(user?.permissions) ? user.permissions.includes(key) : false;
  };

  const DashboardSidebar = () => {
    const visibleGroups = GROUPS_ORDER;
    return (
      <>
        {isDashSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[9998] md:hidden" onClick={() => setIsDashSidebarOpen(false)} />}
        <aside
          className={`sidebar fixed top-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-[9999]
            ${isDashSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            md:hidden flex-shrink-0 flex-col border-e border-border bg-card h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
        >
          <div className="p-4 flex items-center justify-between gap-3 border-b border-border">
            <button onClick={() => setIsDashSidebarOpen(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius)] hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 select-none">
              <Stethoscope className="size-5 text-primary" />
              <span className="font-semibold">Tabibi</span>
            </div>
          </div>
          <nav className="px-3 space-y-6 flex-1 py-2">
            {visibleGroups.map(groupKey => {
              const items = NAV_ITEMS_CONFIG.filter(item => item.group === groupKey);
              if (items.length === 0) return null;
              const visibleItems = items.filter(item => {
                if (!user) return false;
                if (item.role && user?.role !== item.role) return false;
                if (item.permissionKey && !hasPermission(item.permissionKey)) return false;
                return true;
              });
              if (visibleItems.length === 0) return null;
              return (
                <div key={groupKey} className="space-y-1">
                  {groupKey !== 'main' && (
                    <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground">
                      {GROUP_LABELS[groupKey]}
                    </div>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsDashSidebarOpen(false);
                            navigate(item.to);
                          }}
                          className="w-full flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 hover:bg-muted text-right"
                        >
                          <Icon className="size-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>
      </>
    );
  };

  const landingNavItems = [
    { id: "core-features", label: "المميزات", icon: Share2 },
    { id: "online-booking", label: "الحجز الإلكتروني", icon: CalendarDays },
    { id: "pricing", label: "الأسعار", icon: CreditCard },
    { id: "blog", label: "المدونة", icon: ClipboardList },
    { id: "testimonials", label: "آراء الأطباء", icon: MessageCircleQuestion },
    { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  ];

  const LandingSidebar = () => {
    return (
      <>
        {isLandingSidebarOpen && (
          <div className="fixed inset-0 bg-[#93C5FD]/12 z-[9998] md:hidden" onClick={() => setIsLandingSidebarOpen(false)} />
        )}
        <aside
          className={`sidebar fixed top-0 right-0 w-80 transform transition-transform duration-300 ease-in-out z-[9999] ${
            isLandingSidebarOpen ? "translate-x-0" : "translate-x-full"
          } md:hidden flex flex-col border-l border-border bg-card h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
        >
          <div className="p-4 flex flex-row-reverse items-center justify-between gap-3 border-b border-border">
            <div className="flex items-center gap-2 select-none">
              <img src="/assits/full-logo.png" alt="Tabibi" className="h-10 w-auto" />
            </div>
            <button
              className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius)] hover:bg-muted"
              onClick={() => setIsLandingSidebarOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-3 py-4 space-y-1 flex-1">
            {landingNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsLandingSidebarOpen(false);
                    navigate(`/#${item.id}`);
                  }}
                  className="w-full flex flex-row-reverse items-center justify-end gap-3 rounded-[var(--radius)] px-4 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors text-right"
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <button onClick={() => { setIsLandingSidebarOpen(false); navigate("/login"); }} className="w-full inline-flex items-center justify-center h-10 rounded-[var(--radius)] border">
              سجل دخول
            </button>
            <button onClick={() => { setIsLandingSidebarOpen(false); navigate("/signup"); }} className="w-full inline-flex items-center justify-center h-10 rounded-[var(--radius)] bg-primary text-primary-foreground">
              جربني ببلاش
            </button>
          </div>
        </aside>
      </>
    );
  };

  if (systemKey && topicKey) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-background min-h-screen pb-24 md:pb-6" dir="rtl">
        {!user && <Header />}
        <div className="flex items-center gap-3 mb-2" dir="rtl">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/learn-tabibi?system=${encodeURIComponent(systemKey)}`)}
            className="h-10 w-10 shrink-0 rounded-lg border-dashed"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>

          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{article?.title || "غير موجود"}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{article?.summary || "المحتوى غير متاح حالياً."}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {isLoadingArticle ? (
              <div className="py-10 text-center text-sm text-muted-foreground">جاري تحميل المحتوى…</div>
            ) : article ? (
              <div
                dir="rtl"
                className={cn(
                  "text-[15px] sm:text-base leading-7 text-foreground",
                  "[&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mt-0 [&_h1]:mb-3",
                  "[&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-3",
                  "[&_h3]:text-lg sm:[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2",
                  "[&_p]:my-3 [&_p]:text-foreground/90",
                  "[&_strong]:text-foreground [&_strong]:font-semibold",
                  "[&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-4 [&_ol]:space-y-2",
                  "[&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-4 [&_ul]:space-y-2",
                  "[&_li]:leading-7",
                  "[&_figure]:my-4 [&_figure]:overflow-hidden [&_figure]:rounded-[var(--radius)] [&_figure]:border [&_figure]:border-border",
                  "[&_img]:block [&_img]:w-full [&_img]:h-auto"
                )}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.html) }}
              />
            ) : (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground">الصفحة دي مش موجودة أو لسه ما اتنشرتش.</p>
                <Button variant="outline" onClick={() => navigate("/learn-tabibi")}>
                  العودة لصفحة التعلم
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-background min-h-screen pb-24 md:pb-6" dir="rtl">
      {!user && <Header />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">تعلم طبيبي</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              محتوى تعليمي يساعدك تستخدم كل مميزات Tabibi بسهولة
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-l from-primary/[0.08] via-muted/30 to-transparent p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">ابدأ اتعلم</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                اختار النظام ثم اختار الموضوع… وبعدها هتفتح صفحة شرح كاملة مدعومة بصور وفيديو
              </p>
            </div>
            <div
              className={cn(
                "shrink-0 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold",
                isSystemSelected ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isSystemSelected ? "الخطوة 2 من 2" : "الخطوة 1 من 2"}
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-5">
          <AnimatePresence mode="wait" initial={false}>
            {!isSystemSelected ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">اختار النظام اللي هتتعلم عليه</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">هتلاقي جوه كل نظام مواضيع تدريبية مرتبة</p>
                  </div>
                </div>

                {indexError ? (
                  <div className="rounded-[var(--radius)] border border-border bg-muted/20 p-4 text-sm text-muted-foreground mb-3">
                    {indexError}
                  </div>
                ) : null}

                {isLoadingIndex ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-[92px] rounded-[var(--radius)] border border-border bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {systemsForUi.map((s) => {
                      const count = topicsCountBySystem.get(s.key) || 0;
                      const IconByName = s.icon ? ICON_COMPONENT_BY_NAME[s.icon] : null;
                      const Icon = IconByName || SYSTEM_ICON_BY_KEY[s.key] || BookOpen;
                      return (
                        <motion.button
                          key={s.key}
                          type="button"
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => {
                            const next = new URLSearchParams(params);
                            next.set("system", s.key);
                            setParams(next, { replace: true });
                            setLearnQuery("");
                          }}
                          className={cn(
                            "text-right rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5 shadow-sm",
                            "transition-colors hover:border-primary/40 hover:bg-muted/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-base sm:text-[17px] font-bold text-foreground">{s.label}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {count > 0 ? `${count} موضوع جاهز` : "قريباً"}
                              </div>
                            </div>
                            <div className="mt-0.5 rounded-[var(--radius)] bg-primary/10 text-primary p-2">
                              <Icon className="size-4 sm:size-5" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      اختار الموضوع جوه {systemTitle || "النظام"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">كل اختيار هيفتح صفحة شرح كاملة</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.delete("system");
                      setParams(next, { replace: true });
                      setLearnQuery("");
                    }}
                  >
                    <ArrowLeft className="size-4" />
                    رجوع
                  </Button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={learnQuery}
                    onChange={(e) => setLearnQuery(e.target.value)}
                    placeholder="ابحث داخل مواضيع النظام…"
                    className="pr-10"
                  />
                </div>

                {isLoadingIndex && topicsMeta.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">جاري تحميل المواضيع…</div>
                ) : filteredLearnTopics.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-muted-foreground">مفيش مواضيع متاحة للنظام ده حالياً.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.delete("system");
                        setParams(next, { replace: true });
                        setLearnQuery("");
                      }}
                    >
                      رجوع لاختيار نظام
                    </Button>
                  </div>
                ) : (
                  <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredLearnTopics.map((t) => (
                      <motion.button
                        key={`${t.systemKey}/${t.topicKey}`}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => navigate(`/learn-tabibi/${t.systemKey}/${t.topicKey}`)}
                        className="text-right"
                      >
                        <Card className="h-full hover:border-primary/40 hover:bg-muted/20 transition-colors">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{t.title}</CardTitle>
                            <CardDescription className="mt-1">{t.summary}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">صفحة شرح كاملة</span>
                              <span className="text-xs text-primary">فتح</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
