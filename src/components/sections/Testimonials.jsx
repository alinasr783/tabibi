import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";

export default function Testimonials() {
  const testimonials = [
    {
      name: "د. أحمد محمد",
      role: "طبيب أمراض جلدية",
      clinic: "عيادة الأمراض الجلدية - القاهرة",
      content: "تابيبي غيّر طريقة عملي بالكامل. أصبحت أعرف كل مريض بتاريخه الكامل، والمرضى راضين عن سرعة الحجز والتعامل.",
      rating: 5
    },
    {
      name: "د. سارة عبدالله",
      role: "طبيب أسنان",
      clinic: "مركز الأسنان الحديث - الإسكندرية",
      content: "النظام سهل الاستخدام ووفر لي ساعات في الشهر. خاصة ميزة الحجز الإلكتروني والروشتة الآلية.",
      rating: 5
    },
    {
      name: "د. محمد علي",
      role: "طبيب باطني",
      clinic: "عيادة الطب الباطني - الجيزة",
      content: "التقارير المالية نظيفة وواضحة. لم أعد أحتاج محاسب لأن النظام بيحسب كل حاجة بدقة.",
      rating: 4
    }
  ];

  const renderStars = (count) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < count ? "fill-primary text-primary" : "text-gray-300"}`}
      />
    ));
  };

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
    <section id="testimonials" className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
        >
          <motion.div variants={item} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              آراء الأطباء
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              قصص نجاح من زملائنا الأطباء
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
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
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1 mb-4">
                      {renderStars(testimonial.rating)}
                    </div>
                    
                    <div className="relative">
                      <Quote className="w-8 h-8 text-gray-200 absolute -top-2 -right-2" />
                      <p className="text-gray-600 leading-relaxed">{testimonial.content}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                      <p className="text-xs text-gray-500">{testimonial.clinic}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}