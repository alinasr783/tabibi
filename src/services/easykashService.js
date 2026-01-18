import supabase from './supabase';

export async function initiatePayment({ amount, type = 'subscription', metadata = {}, buyer = {}, paymentMethod = 'card' }) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("يجب تسجيل الدخول أولاً");
        const user = session.user;

        // First try to find clinic_id from users table
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (userError) {
             console.error("Error fetching user data:", userError);
             throw new Error("حدث خطأ أثناء البحث عن بيانات المستخدم");
        }
        
        if (!userData || !userData.clinic_id) {
             throw new Error("لم يتم العثور على عيادة مرتبطة بهذا الحساب");
        }

        const clinicId = userData.clinic_id;

        const payload = {
            amount,
            currency: 'EGP',
            user_id: user.id,
            clinic_id: clinicId,
            redirect_url: `${window.location.origin}/payment/callback`,
            payment_method: paymentMethod,
            metadata: {
                ...metadata,
                type,
                buyer_name: buyer.name,
                buyer_email: buyer.email,
                buyer_mobile: buyer.mobile
            }
        };

        // Call the Edge Function using direct fetch to bypass potential SDK auth issues
        console.log("Invoking Edge Function: create-payment-link");
        console.log("Payload:", JSON.stringify(payload, null, 2));

        const functionUrl = 'https://hvbjysojjrdkszuvczbc.supabase.co/functions/v1/create-payment-link';
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });

        let data;
        const responseText = await response.text();
        
        try {
            data = JSON.parse(responseText);
        } catch {
            console.error("Non-JSON response:", responseText);
            throw new Error("استجابة غير صالحة من الخادم");
        }

        if (!response.ok) {
            console.error("Edge Function Error:", data);
            const errorMessage = data.error || data.message || "فشل في الاتصال بخدمة الدفع";
            throw new Error(errorMessage);
        }
        console.log("Edge Function Response Data:", data);

        const isVoucherLike =
            data &&
            (data.voucher || (data.data && data.data.voucher));

        if (paymentMethod === 'fawry' && isVoucherLike) {
            const voucherData = data.data || data;
            return {
                type: 'voucher',
                voucher: voucherData.voucher,
                easykashRef: voucherData.easykashRef || voucherData.easyKashRef || null,
                expiryDate: voucherData.expiryDate || null,
                provider: voucherData.provider || null,
                customerReference: voucherData.customerReference || voucherData.reference_number || null
            };
        }

        let paymentUrl = data.url || data.link || (data.data && data.data.url);

        if (!paymentUrl) {
            console.error("Missing URL in response:", data);
            throw new Error("لم يتم استلام رابط الدفع من الخادم. تفاصيل الاستجابة: " + JSON.stringify(data));
        }

        if (!paymentUrl.startsWith('http')) {
            if (paymentUrl.startsWith('/')) {
                console.warn("Received relative URL:", paymentUrl);
                paymentUrl = `https://www.easykash.net${paymentUrl}`;
            } else {
                 paymentUrl = `https://${paymentUrl}`;
            }
        }

        return paymentUrl;

    } catch (error) {
        console.error("Payment initiation error:", error);
        throw error;
    }
}

/**
 * Verifies a payment status (placeholder - handled via webhook/callback)
 * @returns {Promise<Object>}
 */
export async function verifyPayment() {
    // Placeholder - verification happens via Webhook or Callback page logic
    return { status: 'success' }; 
}
