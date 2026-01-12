import { Receipt, Smartphone, Sparkles, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../features/auth/AuthContext";
import { Card, CardContent } from "../ui/card";

export default function Hero() {
  const { user, isLoading } = useAuth();

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    // Further reduced padding from py-16 to py-12 to make content appear even higher
    <section className="container py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="grid md:grid-cols-2 gap-12 items-center"
      >
        <motion.div variants={item} className="space-y-6">
          <motion.div 
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground"
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            <Sparkles className="size-4 text-primary" />
            ميرضناش تعبك - دير عيادتك بذكاء 
          </motion.div>
          
          <motion.h1 
            variants={item}
            className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
          >
            إدارة حديثة وسلسة لعيادتك
          </motion.h1>
          
          <motion.p 
            variants={item}
            className="text-muted-foreground text-lg leading-relaxed"
          >
            المواعيد , الماليات , حجز الكتروني , ادارة السكرتارية - كل ده من مكان واحد
          </motion.p>
          
          <motion.div variants={item} className="flex flex-wrap gap-4">
            {isLoading ? (
              // Show loading state
              <div className="flex gap-4">
                <div className="h-12 w-40 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-12 w-40 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : user ? (
              // If user is authenticated, show "الدخول" button
              <>
                <Link to="/dashboard">
                  <motion.button
                    className="gap-2 inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Stethoscope className="size-5" />
                    عارفينك - ادخل لوحة التحكم 
                  </motion.button>
                </Link>
                <motion.button
                  className="gap-2 inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 border border-border bg-transparent text-foreground hover:bg-muted h-10 px-4 py-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Smartphone className="size-5" />
                  شوف المنصة بتعمل ايه في دقيقة
                </motion.button>
              </>
            ) : (
              // If user is not authenticated, show signup buttons
              <>
                <Link to="/signup">
                  <motion.button
                    className="gap-2 inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Stethoscope className="size-5" />
                    ابدا ببلاش 
                  </motion.button>
                </Link>
                <motion.button
                  className="gap-2 inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 border border-border bg-transparent text-foreground hover:bg-muted h-10 px-4 py-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Smartphone className="size-5" />
                  شوف المنصة بتعمل ايه في دقيقة
                </motion.button>
              </>
            )}
          </motion.div>
          
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <Card className="text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold">+120</div>
                <div className="text-xs text-muted-foreground">عيادة بتستخدم Tabibi يوميا</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold">+15K</div>
                <div className="text-xs text-muted-foreground">ملف طبي متسجل بأمان</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold">99.9%</div>
                <div className="text-xs text-muted-foreground">استقرار النظام بدون توقف</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="py-4">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-xs text-muted-foreground">دعم فني حقيقي مش روبوت</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        
        <motion.div 
          variants={item} 
          className="relative"
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.3 }
          }}
        >
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius)]">
            {/* Eagerly load the hero image with high priority */}
            <img 
              src="/hero-optimized.webp" 
              alt="واجهة برنامج Tabibi لإدارة العيادات وتنظيم المواعيد" 
              className="w-full h-full object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <motion.div 
            className="absolute -bottom-6 -start-6 hidden md:block rounded-[var(--radius)] 
              border border-border bg-background/70 backdrop-blur p-4 shadow"
            whileHover={{ 
              y: -5,
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            <div className="flex items-center gap-3">
              <Receipt className="size-5 text-primary" />
              <span className="text-sm">تقارير الإيرادات المباشرة</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
