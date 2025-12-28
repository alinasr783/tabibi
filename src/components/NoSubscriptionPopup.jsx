import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ShieldAlert } from "lucide-react";

export default function NoSubscriptionPopup() {
    const navigate = useNavigate();
    
    const handleSubscribe = () => {
        navigate("/subscriptions");
    };
    
    const handleContactSupport = () => {
        // In a real app, this would open a contact form or chat
        alert("يرجى التواصل مع الدعم الفني عبر البريد الإلكتروني support@tabibi.com");
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
            <Card className="max-w-md w-full bg-card rounded-lg shadow-xl">
                <div className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="rounded-full bg-red-100 p-3">
                            <ShieldAlert className="h-8 w-8 text-red-600" />
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                لا يوجد اشتراك فعال
                            </h2>
                            <p className="text-gray-600">
                                يجب أن يكون لديك اشتراك فعال لاستخدام المنصة. يرجى الاشتراك في إحدى الباقات للاستمرار.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                            <Button 
                                onClick={handleSubscribe}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                اشترك الآن
                            </Button>
                            
                            <Button 
                                onClick={handleContactSupport}
                                variant="outline"
                                className="flex-1"
                            >
                                تواصل مع الدعم الفني
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}