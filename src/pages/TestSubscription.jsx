import { useEffect } from "react";
import useSubscriptionExpiry from "../features/auth/useSubscriptionExpiry";

export default function TestSubscription() {
    const { data: subscriptionStatus, isLoading, error } = useSubscriptionExpiry();
    
    useEffect(() => {
        console.log("Subscription status:", subscriptionStatus);
    }, [subscriptionStatus]);
    
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error: {error.message}</div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">اختبار انتهاء الاشتراك</h1>
                
                <div className="bg-white rounded-[var(--radius)] shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">حالة الاشتراك</h2>
                    
                    {subscriptionStatus ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span>هل انتهى الاشتراك؟</span>
                                <span className={`font-semibold ${subscriptionStatus.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                    {subscriptionStatus.isExpired ? 'نعم' : 'لا'}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span>الأيام المتبقية</span>
                                <span className="font-semibold">
                                    {subscriptionStatus.daysRemaining !== null 
                                        ? subscriptionStatus.daysRemaining 
                                        : 'غير محدد'}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span>تاريخ الانتهاء</span>
                                <span className="font-semibold">
                                    {subscriptionStatus.expiryDate 
                                        ? new Date(subscriptionStatus.expiryDate).toLocaleDateString('ar-EG') 
                                        : 'غير محدد'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p>لا توجد بيانات اشتراك</p>
                    )}
                </div>
            </div>
        </div>
    );
}