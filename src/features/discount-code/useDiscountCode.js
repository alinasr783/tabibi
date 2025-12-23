import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getDiscountByCode, calculateDiscount, incrementDiscountUsage } from "../../services/apiDiscounts";

/**
 * Custom hook to manage discount code logic
 * @param {number} originalAmount - Original price amount
 * @param {string} planId - Current subscription plan ID (optional)
 * @returns {Object} - { code, appliedDiscount, discountAmount, finalAmount, message, error, isPending, applyDiscount, clearDiscount }
 */
export default function useDiscountCode(originalAmount = 0, planId = null) {
    const [code, setCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [finalAmount, setFinalAmount] = useState(originalAmount);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(null);
    const [showMessage, setShowMessage] = useState(false);

    // Auto-hide success message after 3 seconds
    useEffect(() => {
        if (showMessage && !error) {
            const timer = setTimeout(() => {
                setShowMessage(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showMessage, error]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (discountCode) => {
            const trimmedCode = discountCode.trim().toUpperCase();
            if (!trimmedCode) {
                throw new Error("يرجى إدخال كود الخصم");
            }

            const discount = await getDiscountByCode(trimmedCode, planId);
            return discount;
        },
        onSuccess: (discount) => {
            const result = calculateDiscount(discount, originalAmount, planId);

            if (result.isValid) {
                setAppliedDiscount(result.discount);
                setDiscountAmount(result.discountAmount);
                setFinalAmount(result.finalAmount);
                setMessage(result.message);
                setError(null);
                setShowMessage(true);
            } else {
                setAppliedDiscount(null);
                setDiscountAmount(0);
                setFinalAmount(originalAmount);
                setMessage(result.message);
                setError(result.message);
                setShowMessage(false);
            }
        },
        onError: (err) => {
            const errorMsg = "حدث خطأ في التحقق من الكود";
            setAppliedDiscount(null);
            setDiscountAmount(0);
            setFinalAmount(originalAmount);
            setMessage(errorMsg);
            setError(errorMsg);
            setShowMessage(false);
            console.error("Discount error:", err);
        },
    });

    const applyDiscount = (discountCode) => {
        setCode(discountCode);
        mutate(discountCode);
    };

    const clearDiscount = () => {
        setCode("");
        setAppliedDiscount(null);
        setDiscountAmount(0);
        setFinalAmount(originalAmount);
        setMessage("");
        setError(null);
        setShowMessage(false);
    };

    const confirmDiscountUsage = async () => {
        if (appliedDiscount?.id) {
            await incrementDiscountUsage(appliedDiscount.id);
        }
    };

    return {
        code,
        appliedDiscount,
        discountAmount,
        finalAmount,
        message,
        error,
        isPending,
        showMessage,
        applyDiscount,
        clearDiscount,
        confirmDiscountUsage,
    };
}
