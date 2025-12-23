import supabase from "./supabase";

/**
 * Search for a discount code in the discounts table
 * @param {string} code - The discount code to search for
 * @param {string} planId - The plan ID to check against (optional)
 * @returns {Promise<Object|null>} - Discount object or null if not found
 */
export async function getDiscountByCode(code, planId = null) {
    const { data, error } = await supabase
        .from("discounts")
        .select("id, code, value, is_percentage, is_active, plan_id, max_uses, used_count, expiration_date, message, min_amount, clinic_id")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        console.error("Error fetching discount:", error);
        throw error;
    }

    return data;
}

/**
 * Validate and calculate discount amount
 * @param {Object} discount - Discount object from DB
 * @param {number} originalAmount - Original price amount
 * @param {string} planId - Current subscription plan ID
 * @returns {Object} - { isValid, discountAmount, finalAmount, message, discount }
 */
export function calculateDiscount(discount, originalAmount, planId = null) {
    if (!discount) {
        return {
            isValid: false,
            discountAmount: 0,
            finalAmount: originalAmount,
            message: "الكود المدخل غير صحيح",
        };
    }

    // Check if discount is active
    if (!discount.is_active) {
        return {
            isValid: false,
            discountAmount: 0,
            finalAmount: originalAmount,
            message: "هذا الكود منتهي الصلاحية أو غير متاح",
        };
    }

    // Check if discount has expired
    if (discount.expiration_date) {
        const now = new Date();
        const expirationDate = new Date(discount.expiration_date);
        if (now > expirationDate) {
            return {
                isValid: false,
                discountAmount: 0,
                finalAmount: originalAmount,
                message: "هذا الكود منتهي الصلاحية",
            };
        }
    }

    // Check if discount has reached max uses
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
        return {
            isValid: false,
            discountAmount: 0,
            finalAmount: originalAmount,
            message: "هذا الكود وصل للحد الأقصى من الاستخدامات",
        };
    }

    // Check if discount is limited to specific plan
    if (discount.plan_id && planId && discount.plan_id !== planId) {
        return {
            isValid: false,
            discountAmount: 0,
            finalAmount: originalAmount,
            message: "هذا الكود غير متاح للباقة الحالية",
        };
    }

    // Check minimum amount
    if (discount.min_amount && originalAmount < discount.min_amount) {
        return {
            isValid: false,
            discountAmount: 0,
            finalAmount: originalAmount,
            message: `الحد الأدنى للطلب ${discount.min_amount} جنيه`,
        };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.is_percentage) {
        discountAmount = (originalAmount * discount.value) / 100;
    } else {
        discountAmount = discount.value;
    }

    // Ensure discount doesn't exceed original amount
    discountAmount = Math.min(discountAmount, originalAmount);
    const finalAmount = Math.max(0, originalAmount - discountAmount);

    return {
        isValid: true,
        discountAmount,
        finalAmount,
        message: discount.message || "تم تطبيق الخصم بنجاح",
        discount,
    };
}

/**
 * Increment the usage count of a discount code
 * @param {number} discountId - The discount ID
 * @returns {Promise<void>}
 */
export async function incrementDiscountUsage(discountId) {
    const { error } = await supabase.rpc('increment_discount_usage', {
        discount_id: discountId
    });

    if (error) {
        console.error("Error incrementing discount usage:", error);
        // Don't throw error to avoid blocking the payment
    }
}
