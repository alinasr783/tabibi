import { useCallback } from "react"
import toast from "react-hot-toast"
import useUpdateAppointment from "./useUpdateAppointment"

/**
 * Hook to handle appointment update with validation and error handling
 * Encapsulates all logic for updating appointments including:
 * - Data validation
 * - Price validation
 * - Toast notifications
 * - Success/Error callbacks
 */
export default function useUpdateAppointmentHandler() {
    const { mutate: updateAppointment, isPending } = useUpdateAppointment()

    /**
     * Validate appointment update data
     * @param {Object} data - Update data
     * @returns {string|null} Error message or null if valid
     */
    const validateUpdateData = useCallback((data) => {
        // Only validate date if it's being updated
        if (data.date !== undefined) {
            if (!data.date) {
                return "تاريخ ووقت الموعد مطلوب"
            }
            
            // Check if date is valid
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                return "تاريخ ووقت الموعد غير صحيح"
            }
            
            // Allow editing past appointments - removed past date validation
            // This is useful for correcting historical records
        }

        // Only validate price if it's being updated
        if (data.price !== undefined) {
            if (data.price === null || data.price === "") return null
            const parsed =
                typeof data.price === "string" ? parseFloat(data.price) : data.price
            if (Number.isNaN(parsed) || parsed < 0) {
                return "سعر الحجز مطلوب ويجب أن يكون رقمًا موجبًا"
            }
        }

        return null
    }, [])

    /**
     * Handle appointment update
     * @param {string} appointmentId - Appointment ID
     * @param {Object} data - Update data
     * @param {Function} onSuccess - Success callback
     * @returns {void}
     */
    const handleAppointmentUpdate = useCallback(
        (appointmentId, data, onSuccess) => {
            // Check if we're only updating status
            const isStatusUpdate = Object.keys(data).length === 1 && data.status;
            
            // If it's a status update, we don't need to validate other fields
            if (!isStatusUpdate) {
                const validationError = validateUpdateData(data);
                if (validationError) {
                    toast.error(validationError);
                    return;
                }
            }
            
            const payload = {}

            if (data.date !== undefined) payload.date = data.date
            if (data.notes !== undefined) payload.notes = data.notes
            if (data.status !== undefined) payload.status = data.status?.toLowerCase()
            if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis
            if (data.treatment !== undefined) payload.treatment = data.treatment
            if (data.custom_fields !== undefined) payload.custom_fields = data.custom_fields

            if (data.price !== undefined && data.price !== null && data.price !== "") {
                payload.price =
                    typeof data.price === "string" ? parseFloat(data.price) : data.price
            }
            
            Object.keys(payload).forEach((key) => {
                if (payload[key] === undefined) delete payload[key]
            })
            
            updateAppointment(
                { id: appointmentId, ...payload },
                {
                    onSuccess: () => {
                        onSuccess?.();
                    },
                }
            );
        },
        [updateAppointment, validateUpdateData]
    )

    return {
        handleAppointmentUpdate,
        isPending,
    }
}
