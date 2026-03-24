import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Calendar, FileText, Tag, MessageCircle, HelpCircle, User, Stethoscope } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../features/auth/AuthContext";

export default function Header() {
  const [menuOpenPathname, setMenuOpenPathname] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRafRef = useRef(null);
  const isLanding = location.pathname === "/";
  const isMenuOpen = menuOpenPathname === location.pathname;
  const scrollAnimRaw = isLanding ? Math.min(Math.max((scrollTop - 10) / 240, 0), 1) : 0;
  const scrollAnim = 1 - Math.pow(1 - scrollAnimRaw, 3);
  const shellAnim = isLanding ? scrollAnim : 1;
  const shellInsetPx = isLanding ? 20 * scrollAnim : 8;
  const shellRadiusPx = isLanding ? 8 * scrollAnim : 8;
  const shellBorderAlpha = 0.18 * shellAnim;
  const ctaRadiusPx = isLanding ? 25 - (25 - 6) * scrollAnim : 6;
  const menuStartRadiusPx = 50;
  const menuRadiusPx = isLanding ? (menuStartRadiusPx - (menuStartRadiusPx - ctaRadiusPx) * scrollAnim) : ctaRadiusPx;

  useEffect(() => {
    const getScrollTop = () => {
      const root = document.getElementById("root");
      const scrollingElement = document.scrollingElement;
      const docEl = document.documentElement;
      const body = document.body;
      return Math.max(
        window.scrollY || 0,
        scrollingElement?.scrollTop || 0,
        docEl?.scrollTop || 0,
        body?.scrollTop || 0,
        root?.scrollTop || 0
      );
    };

    const handleScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        const nextScrollTop = getScrollTop();
        setScrollTop((prev) => (prev === nextScrollTop ? prev : nextScrollTop));
        scrollRafRef.current = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.getElementById("root")?.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
      document.getElementById("root")?.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const handleSectionClick = (sectionId) => {
    // Close mobile menu if open
    setMenuOpenPathname(null);
    
    // Scroll to section if already on landing page
    if (location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        // Scroll to the beginning of the section (no offset needed since header is not sticky)
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Navigate to landing page with hash
      navigate(`/#${sectionId}`);
    }
  };

  const navItems = [
    { id: "core-features", label: "المميزات", icon: FileText },
    { id: "online-booking", label: "الحجز الإلكتروني", icon: Calendar },
    { id: "pricing", label: "الأسعار", icon: Tag },
    { id: "blog", label: "المدونة", icon: FileText },
    { id: "testimonials", label: "آراء الأطباء", icon: MessageCircle },
    { id: "faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  ];

  const headerOuterClass = "fixed top-[env(safe-area-inset-top,0px)] left-0 right-0 z-[100]";
  const headerShellClass =
    "mt-[10px] overflow-hidden border bg-white/20 backdrop-blur-md backdrop-saturate-150 shadow-[0_12px_36px_rgba(147,197,253,0.10)] supports-[backdrop-filter]:bg-white/15 before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/20 before:to-[#93C5FD]/6 before:pointer-events-none transition-[margin,border-color,border-radius] duration-1800 ease-out";

  return (
    <>


      <header className={headerOuterClass}>
        <div
          className={`relative ${headerShellClass}`}
          style={{
            marginLeft: `${shellInsetPx}px`,
            marginRight: `${shellInsetPx}px`,
            borderRadius: `${shellRadiusPx}px`,
            borderColor: `rgba(147, 197, 253, ${shellBorderAlpha})`,
          }}
        >
        <div className="container flex h-[72px] items-center justify-between">
            <Link to="/" className="flex items-center gap-2 select-none">
              <img
                src="/assits/full-logo.png"
                alt="Tabibi"
                className="h-28 md:h-30 w-auto"
                loading="eager"
                decoding="async"
              />
            </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-full bg-transparent hover:bg-white/10"
              onClick={() => handleSectionClick(item.id)}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Button>
          ))}
        </nav>
        
        <div className="flex items-center gap-3">
          {isLoading ? (
            // Show loading state
            <div className="flex items-center gap-3">
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : user ? (
            // If user is authenticated, show user menu
            <>
              <div className="hidden md:flex items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" className="rounded-full bg-transparent hover:bg-white/10">
                    لوحة التحكم
                  </Button>
                </Link>
                <Button variant="outline" onClick={logout}>
                  تسجيل الخروج
                </Button>
              </div>
              <div className="flex md:hidden items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" size="icon" className="h-10">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  className="h-10 transition-[border-radius] duration-800 ease-out"
                  style={{ borderRadius: `${menuRadiusPx}px` }}
                  onClick={() => setMenuOpenPathname(isMenuOpen ? null : location.pathname)}
                  aria-label="فتح القائمة"
                >
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </>
          ) : (
            // If user is not authenticated, show auth buttons
            <>
              <div className="md:hidden flex items-center gap-3">
                <Link to="/signup">
                  <Button
                    className="h-10 transition-[border-radius] duration-800 ease-out"
                    style={{ borderRadius: `${ctaRadiusPx}px` }}
                  >
                    جربني ببلاش
                  </Button>
                </Link>
                <Button
                  className="h-10 transition-[border-radius] duration-800 ease-out"
                  style={{ borderRadius: `${menuRadiusPx}px` }}
                  onClick={() => setMenuOpenPathname(isMenuOpen ? null : location.pathname)}
                  aria-label="فتح القائمة"
                >
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
              <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="rounded-full bg-transparent hover:bg-white/10">
                  تسجيل الدخول
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  className="transition-[border-radius] duration-800 ease-out"
                  style={{ borderRadius: `${ctaRadiusPx}px` }}
                >
                  جربني ببلاش
                </Button>
              </Link>
              </div>
            </>
          )}
        </div>
          </div>
        </div>

      </header>

      <div className="md:hidden">
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setMenuOpenPathname(null)}
          />
        )}

        <aside
          className={`sidebar fixed top-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-[9999] ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          } flex flex-col border-e border-border bg-card h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
        >
          <Link
            to="/"
            onClick={() => setMenuOpenPathname(null)}
            className="p-4 flex items-center gap-2 border-b border-border"
          >
            <Stethoscope className="size-5 text-primary" />
            <span className="font-semibold">Tabibi</span>
          </Link>

          <nav className="px-3 py-4 space-y-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className="w-full flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {!user ? (
            <div className="p-4 border-t border-border space-y-4">
              <Link to="/login" onClick={() => setMenuOpenPathname(null)}>
                <Button variant="outline" className="w-full">
                  سجل دخول
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setMenuOpenPathname(null)}>
                <Button className="w-full">
                  جربني ببلاش
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-4 border-t border-border space-y-3">
              <Link to="/dashboard" onClick={() => setMenuOpenPathname(null)}>
                <Button variant="outline" className="w-full">
                  لوحة التحكم
                </Button>
              </Link>
              <Button variant="outline" onClick={logout} className="w-full">
                تسجيل الخروج
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
