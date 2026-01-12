import { Calendar, CheckSquare, Users, Share2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";

export default function IntegrationsSection() {
  const integrations = [
    {
      id: "google-calendar",
      title: "Google Calendar",
      description: "مزامنة فورية للمواعيد",
      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
      connected: true
    },
    {
      id: "google-tasks",
      title: "Google Tasks",
      description: "تحويل الحجوزات لمهام",
      icon: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Google_Tasks_2021.svg",
      connected: true
    },
    {
      id: "google-contacts",
      title: "Google Contacts",
      description: "حفظ جهات الاتصال تلقائياً",
      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Google_Contacts_icon_%282022%29.svg",
      connected: true
    },
    {
      id: "vezeeta",
      title: "Vezeeta",
      description: "قريباً",
      icon: "https://play-lh.googleusercontent.com/ttLkUcwcja5-8YAhk1ndWbPEglgdoCjs2tEDEOXsd09uq6WuIL-GjWRn_a7HVJbpN06Q",
      connected: false
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
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  };

  return (
    <section id="integrations" className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
          className="text-center"
        >
          <motion.div variants={item} className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 mb-4">
              <Share2 className="w-5 h-5" />
              <span className="font-bold">تكاملات</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              متصل بكل أدواتك المفضلة
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              اربط نظام Tabibi مع Google Calendar و Tasks وغيرها لتوحيد عملك في مكان واحد
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {integrations.map((integration, index) => (
              <motion.div
                key={index}
                variants={item}
                whileHover={{ y: -5 }}
              >
                <Card className="p-6 flex flex-col items-center justify-center gap-4 h-full hover:shadow-lg transition-shadow bg-white">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center p-3">
                    <img 
                      src={integration.icon} 
                      alt={integration.title} 
                      className={`w-full h-full object-contain ${!integration.connected ? 'opacity-50 grayscale' : ''}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{integration.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{integration.description}</p>
                  </div>
                  {integration.connected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      متاح الآن
                    </span>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
