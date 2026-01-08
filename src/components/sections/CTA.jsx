import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, Zap } from "lucide-react";

export default function CTA() {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
    <section id="cta" className="container py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
      >
        <motion.div 
          variants={item}
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.3 }
          }}
          className="bg-gradient-to-r from-primary to-secondary rounded-[var(--radius)] p-8 md:p-12 text-background"
        >
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.h2 
              variants={item}
              className="text-3xl md:text-4xl font-bold"
            >
              جاهز تفعّل Tabibi؟
            </motion.h2>
            
            <motion.p 
              variants={item}
              className="text-lg opacity-90"
            >
              انضم لـ 120+ عيادة بتستخدم Tabibi
            </motion.p>
            
            <motion.div 
              variants={container}
              className="flex flex-wrap justify-center gap-4 pt-4"
            >
              <motion.div variants={item}>
                <Link to="/signup">
                  <motion.button
                    size="lg" 
                    className="gap-2 bg-background text-primary hover:bg-background/90 inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 h-11 px-6"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    فعّل Tabibi دلوقتي
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link> 
              </motion.div>
              
              <motion.div variants={item}>
                <Link to="/#pricing">
                  <motion.button
                    className="gap-2 border border-border bg-transparent text-white hover:bg-muted inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 h-11 px-6"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Zap className="w-5 h-5" />
                    شوف الباقات
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
             
            <motion.div 
              variants={container}
              className="pt-8 flex flex-wrap justify-center items-center gap-6 text-sm"
            >
              <motion.div variants={item} className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span>رجع فلوسك خلال 14 يوم</span>
              </motion.div>
              <motion.div variants={item} className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span>بدون بطاقات ائتمان</span>
              </motion.div>
              <motion.div variants={item} className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span>دعم فني على مدار الساعة</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}