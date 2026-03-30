import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, RefreshCw, Sparkles, Zap, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

export default function SubscriptionExpiryPopup({ daysRemaining, expiryDate, status }) {
    const navigate = useNavigate();
    
    const isExpired = status === "expired";
    
    const handleAction = () => {
        navigate("/subscriptions");
    };
    
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ zIndex: 9999 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
            <Card className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border-none" dir="rtl">
                {/* Visual Header */}
                <div className={`h-32 flex items-center justify-center relative ${
                    isExpired ? "bg-red-50" : "bg-primary/10"
                }`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg rotate-3 ${
                        isExpired ? "bg-red-600" : "bg-primary"
                    }`}>
                        {isExpired ? (
                            <Zap className="size-8 text-white fill-current" />
                        ) : (
                            <Sparkles className="size-8 text-white fill-current" />
                        )}
                    </div>
                </div>

                <CardHeader className="text-center pt-6 pb-2">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        {isExpired ? "الاشتراك خلص!" : "خطوة واحدة تفصلك!"}
                    </h2>
                </CardHeader>
                
                <CardContent className="text-center space-y-5 px-6">
                    <p className="text-base text-gray-600 leading-relaxed">
                        {isExpired ? (
                            daysRemaining !== null ? (
                                daysRemaining === 0 ? (
                                    "اشتراك عيادتك خلص النهاردة.. جدد دلوقتي عشان متوقفش شغل."
                                ) : (
                                    `الاشتراك خلص من ${Math.abs(daysRemaining)} يوم.. محتاج تجدد عشان ترجع تستخدم طبيبي.`
                                )
                            ) : (
                                "الاشتراك خلص.. عيادتك محتاجة تجديد عشان تكمل شغل."
                            )
                        ) : (
                            "أهلاً بك في طبيبي! اشترك في باقة دلوقتي وفك كل المميزات لعيادتك."
                        )}
                    </p>
                    
                    {isExpired && expiryDate && (
                        <div className="bg-gray-50 rounded-2xl p-3.5 flex items-center justify-center gap-2 border border-gray-100">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                                خلص يوم: {format(new Date(expiryDate), "dd MMMM yyyy", { locale: ar })}
                            </span>
                        </div>
                    )}
                    
                    <div className={`${isExpired ? "bg-red-50/50 border-red-100 text-red-700" : "bg-primary/5 border-primary/10 text-primary"} border rounded-2xl p-4`}>
                        <p className="text-sm font-medium">
                            {isExpired 
                                ? "الصفحة دي مقفولة حالياً.. جدد اشتراكك عشان تفتحها هي وباقي المميزات."
                                : "اشترك دلوقتي وفعل إدارة المرضى، المواعيد، والتقارير المالية لعيادتك."}
                        </p>
                    </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-3 p-6 pt-2">
                    <Button 
                        onClick={handleAction}
                        className={`w-full h-12 rounded-2xl text-base font-bold gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                            isExpired 
                                ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                                : "bg-primary hover:bg-primary/90 shadow-primary/20"
                        }`}
                    >
                        {isExpired ? (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                جدد اشتراكك دلوقتي
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                اشترك في طبيبي
                            </>
                        )}
                        <ArrowLeft className="size-4" />
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate("/dashboard")}
                        className="w-full h-10 rounded-xl text-gray-500 font-medium"
                    >
                        الرجوع للرئيسية
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
