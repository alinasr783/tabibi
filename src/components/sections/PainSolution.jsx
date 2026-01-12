import { motion } from "framer-motion";
import { Calendar, Folder, FileText, BarChart3 } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export default function PainSolution() {
  const problems = [
    {
      problem: "فوضى في تنظيم المواعيد",
      solution: "جدولة ذكية تفاعلية تخلصك من الورق والهاتف",
      icon: Calendar
    },
    {
      problem: "ضياع تاريخ المرضى",
      solution: "ملف طبي إلكتروني منظم لكل مريض",
      icon: Folder
    },
    {
      problem: "حساب الفواتير يدوي",
      solution: "فوترة آلية مع تتبع الإيرادات",
      icon: FileText
    },
    {
      problem: "عدم وضوح الأداء المالي",
      solution: "تقارير مالية واضحة وتحليلية",
      icon: BarChart3
    }
  ];

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
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <section id="pain-solution" className="py-16 bg-white">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          <motion.div variants={item} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              حل مشاكل العيادات التقليدية
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              من المشاكل لحلولها العملية
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={item}
                  whileHover={{ 
                    y: -4,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Card className="h-full border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all bg-white">
                    <CardContent className="p-6 space-y-6">
                      <div className="p-3 w-fit rounded-lg bg-primary/10 text-primary">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            المشكلة
                          </div>
                          <h3 className="font-medium text-gray-900">{item.problem}</h3>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            الحل
                          </div>
                          <p className="text-gray-600">{item.solution}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}