import { Bot, MessageSquare, CalendarCheck, Sparkles, BrainCircuit, Languages } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function TabibiAI() {
  const features = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "محادثة طبيعية",
      description: "تحدث مع النظام باللغة العربية واللهجة المصرية كأنك بتكلم مساعدك الشخصي"
    },
    {
      icon: <CalendarCheck className="w-8 h-8" />,
      title: "إدارة المواعيد",
      description: "اطلب حجز موعد، تأجيله، أو الاستعلام عن المواعيد المتاحة بمجرد الكتابة"
    },
    {
      icon: <BrainCircuit className="w-8 h-8" />,
      title: "فهم السياق",
      description: "يفهم سياق الحديث ويعرف بيانات عيادتك ومرضاك لتقديم إجابات دقيقة"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "إجراءات تلقائية",
      description: "يقوم بتنفيذ المهام نيابة عنك مثل إضافة مريض جديد أو تسجيل زيارة"
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
    <section id="tabibi-ai" className="py-16 bg-gradient-to-b from-white to-primary/5">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          {/* Section Header */}
          <motion.div variants={item} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Bot className="w-5 h-5" />
              <span className="font-bold">جديد</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tabibi AI - مساعدك الذكي
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              أول مساعد ذكي لإدارة العيادات في مصر، يفهمك وينفذ طلباتك فوراً
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Column: Chat Simulation */}
            <motion.div variants={item} className="order-2 md:order-1">
              <Card className="border-2 border-primary/20 shadow-lg bg-white overflow-hidden">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-xs text-gray-500 mr-auto">Tabibi AI Assistant</span>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tr-none p-3 text-sm text-gray-800 max-w-[85%]">
                      أهلاً يا دكتور، إزاي أقدر أساعدك النهاردة في العيادة؟
                    </div>
                  </div>
                  
                  <div className="flex gap-3 items-start flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600">DR</span>
                    </div>
                    <div className="bg-primary text-white rounded-2xl rounded-tl-none p-3 text-sm max-w-[85%]">
                      احجز موعد لمحمد أحمد بكرة الساعة 5
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tr-none p-3 text-sm text-gray-800 max-w-[85%]">
                      تمام يا دكتور، تم حجز موعد للمريض <strong>محمد أحمد</strong> غداً الساعة <strong>05:00 مساءً</strong>. هل محتاج تفاصيل تانية؟
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column: Features List */}
            <div className="grid gap-6 order-1 md:order-2">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={item}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
