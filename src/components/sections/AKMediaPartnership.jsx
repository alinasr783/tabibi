import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "../ui/card";
import { TrendingUp, Users, BarChart3, Zap } from "lucide-react";

function PartnershipCard({ icon: Icon, title, desc }) {
  return (
    <Card className="bg-card/60 backdrop-blur border-border/60">
      <CardHeader className="flex items-center gap-3">
        <div className="size-10 rounded-[calc(var(--radius)-4px)] bg-gradient-to-br from-primary/15 to-secondary/15 text-primary grid place-items-center">
          <Icon className="size-5" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  );
}

export default function AKMediaPartnership() {
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
    <section id="ak-media-partnership" className="container py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
      >
        <motion.div variants={item} className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-bold">ليه Tabibi مع AK MEDIA؟</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            إعلان + نظام = شغل مظبوط
          </p>
        </motion.div>
        
        <motion.div variants={container} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={item}>
            <PartnershipCard 
              icon={TrendingUp} 
              title="حجوزات مش مكالمات" 
              desc="لينك حجز جاهز للإعلانات"
            />
          </motion.div>
          
          <motion.div variants={item}>
            <PartnershipCard 
              icon={Users} 
              title="إدارة سهلة للمواعيد" 
              desc="كل الحجوزات منظمة في مكان واحد"
            />
          </motion.div>
          
          <motion.div variants={item}>
            <PartnershipCard 
              icon={BarChart3} 
              title="متابعة النتايج" 
              desc="تقارير واضحة للحملات"
            />
          </motion.div>
          
          <motion.div variants={item}>
            <PartnershipCard 
              icon={Zap} 
              title="نظام متكامل" 
              desc="من الحجز للمتابعة"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}