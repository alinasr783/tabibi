import supabase from './supabase';

export async function initiatePayment({ amount, type = 'subscription', metadata = {}, buyer = {}, paymentMethod } = {}) {
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

        console.log("Invoking Edge Function: create-payment-link");
        console.log("Payload:", JSON.stringify(payload, null, 2));

        const { data, error } = await supabase.functions.invoke('create-payment-link', {
            body: payload
        });
        if (error) {
            console.error("Edge Function Error:", error);
            throw new Error(error.message || "فشل في الاتصال بخدمة الدفع");
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

        if (typeof paymentUrl === 'string') {
            paymentUrl = paymentUrl.trim().replace(/`/g, "");
        }

        if (!paymentUrl.startsWith('http')) {
            if (paymentUrl.startsWith('/')) {
                console.warn("Received relative URL:", paymentUrl);
                paymentUrl = `https://www.easykash.net${paymentUrl}`;
            } else {
                 paymentUrl = `https://${paymentUrl}`;
            }
        }

        return {
            type: 'redirect',
            url: paymentUrl,
            transactionId: data.transactionId || (data.data && data.data.transactionId) || null,
            referenceNumber: data.referenceNumber || (data.data && data.data.referenceNumber) || null
        };

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
