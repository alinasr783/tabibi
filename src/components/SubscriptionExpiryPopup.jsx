import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

export default function SubscriptionExpiryPopup({ daysRemaining, expiryDate }) {
    const navigate = useNavigate();
    
    const handleRenewSubscription = () => {
        navigate("/subscriptions");
    };
    
    const handleContactSupport = () => {
        // Open WhatsApp with a predefined message
        const phoneNumber = "+201234567890"; // Replace with actual support number
        const message = "مرحبًا، أحتاج إلى المساعدة بشأن تجديد اشتراكي في نظام طبيبي.";
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };
    
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ zIndex: 9999 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <Card className="relative w-full max-w-md bg-card rounded-[var(--radius)] shadow-xl z-10">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">الاشتراك انتهى</h2>
                </CardHeader>
                
                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                        {daysRemaining !== null ? (
                            daysRemaining === 0 ? (
                                "انتهت صلاحية اشتراكك اليوم"
                            ) : (
                                `انتهت صلاحية اشتراكك منذ ${Math.abs(daysRemaining)} يوم${Math.abs(daysRemaining) === 1 ? '' : 'ا'}`
                            )
                        ) : (
                            "انتهت صلاحية اشتراكك"
                        )}
                    </p>
                    
                    {expiryDate && (
                        <div className="bg-gray-50 rounded-[var(--radius)] p-3 flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                                تاريخ الانتهاء: {format(new Date(expiryDate), "dd MMMM yyyy", { locale: ar })}
                            </span>
                        </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius)] p-3">
                        <p className="text-sm text-blue-700">
                            يرجى تجديد اشتراكك للوصول إلى هذه الصفحة والميزات الأخرى
                        </p>
                    </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-3">
                    <Button 
                        onClick={handleRenewSubscription}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <RefreshCw className="w-4 h-4 ml-2" />
                        تجديد الاشتراك
                    </Button>
                    
                    <Button 
                        onClick={handleContactSupport}
                        variant="outline"
                        className="w-full border-gray-300 hover:bg-gray-50"
                    >
                        <MessageCircle className="w-4 h-4 ml-2" />
                        تواصل مع الدعم via واتساب
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}