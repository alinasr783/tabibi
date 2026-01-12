import { AppWindow, LayoutGrid, UserCircle, MessageCircle, FileBarChart, Clock, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";

export default function TabibiAppsSection() {
  const apps = [
    {
      title: "Profile Generator",
      category: "Marketing",
      icon: <UserCircle className="w-6 h-6" />,
      color: "bg-purple-500"
    },
    {
      title: "Doctor Shift",
      category: "Management",
      icon: <Clock className="w-6 h-6" />,
      color: "bg-blue-500"
    },
    {
      title: "Clinic Daily Reports",
      category: "Analytics",
      icon: <FileBarChart className="w-6 h-6" />,
      color: "bg-amber-500"
    },
    {
      title: "WhatsApp API",
      category: "Integration",
      icon: <MessageCircle className="w-6 h-6" />,
      color: "bg-green-500"
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <section id="tabibi-apps" className="py-16 bg-white overflow-hidden">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
          className="relative"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 z-0" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
            {/* Content */}
            <div className="lg:w-1/2">
              <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
                  <AppWindow className="w-5 h-5" />
                  <span className="font-bold">Tabibi Apps</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  متجر تطبيقات متكامل داخل عيادتك
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  نظام Tabibi مش بس برنامج، ده منصة متكاملة. تقدر تضيف تطبيقات وأدوات جديدة حسب احتياج عيادتك بضغطة زر، من غير ما تحتاج تغير النظام كله.
                </p>
                
                <ul className="space-y-4 mb-8">
                  {[
                    "تطبيقات متخصصة لكل تخصص طبي",
                    "تثبيت وإزالة التطبيقات بسهولة",
                    "تحديثات مستمرة وتطبيقات جديدة شهرياً",
                    "تكامل تام مع بيانات المرضى والمواعيد"
                  ].map((point, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {point}
                    </li>
                  ))}
                </ul>

                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    استكشف التطبيقات
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Visual */}
            <div className="lg:w-1/2 w-full">
              <motion.div variants={item} className="relative">
                <div className="grid grid-cols-2 gap-4">
                  {apps.map((app, i) => (
                    <motion.div
                      key={i}
                      className={`${i % 2 !== 0 ? 'translate-y-8' : ''}`}
                      whileHover={{ y: i % 2 !== 0 ? 24 : -8 }}
                    >
                      <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white h-full">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${app.color} text-white flex items-center justify-center shadow-lg`}>
                            {app.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{app.title}</h3>
                            <span className="text-xs text-gray-500">{app.category}</span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            تثبيت
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
