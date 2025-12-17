import { Calendar, User, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function BookingSuccessCard({ onReset, appointmentId, clinic }) {
  const animationContainer = useRef(null);

  useEffect(() => {
    let anim;
    if (animationContainer.current) {
      anim = lottie.loadAnimation({
        container: animationContainer.current,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: '/animations/tick-animation.json'
      });
    }

    return () => {
      if (anim) anim.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          {/* Success Animation and Message */}
          <div className="text-center mb-8">
            <div 
              className="w-48 h-48 mx-auto mb-4 transform scale-150 origin-center" 
              ref={animationContainer}
              style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
            ></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">كده خلصنا</h2>
            <p className="text-gray-600">حجزك اتبعت للعيادة ورقمك هو </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-bold text-lg text-gray-900">{appointmentId || "قيد المعالجة"}</p>
            </div>
          </div>

          {/* Clinic Info */}
          {clinic && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{clinic.name}</p>
                  {clinic.specialization && (
                    <p className="text-sm text-gray-600">{clinic.specialization}</p>
                  )}
                </div>
              </div>

              {clinic.phone && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">عشان اي استفسار</p>
                    <a 
                      href={`tel:${clinic.phone}`}
                      className="font-bold text-blue-600 hover:text-blue-700"
                    >
                      {clinic.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Important Instructions - RTL Fixed */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-3">نقاط مهمة قبل ما تيجي:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-xs text-blue-600">١</span>
                </div>
                <span className="text-sm text-gray-700">حاول تجي قبل الموعد بـ 10 دقائق</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-xs text-blue-600">٢</span>
                </div>
                <span className="text-sm text-gray-700">خد معاك بطاقتك الشخصية</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-xs text-blue-600">٣</span>
                </div>
                <span className="text-sm text-gray-700">لو هتتأخر، ابعتلنا على واتساب أو كلمنا</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onReset}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              احجز موعد تاني في العيادة دي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}