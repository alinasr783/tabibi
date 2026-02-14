import { useCallback } from "react"
import toast from "react-hot-toast"
import { searchPatientsPublic } from "../../services/apiAppointments"
import useCreatePatientPublic from "../patients/useCreatePatientPublic"
import { dbg } from "../../lib/debug"

export default function usePatientHandling() {
    const { mutateAsync: createPatient, isPending: isCreatingPatient } =
        useCreatePatientPublic()

    /**
     * Search for existing patient or create new one
     * @param {Object} patientData - Patient form data
     * @param {string} clinicId - Clinic ID
     * @returns {Promise<Object>} Patient data (existing or newly created)
     */
    const handlePatientSubmit = useCallback(
        async (patientData, clinicId) => {
            try {
                dbg("booking/patientHandling/input", { patientData, clinicId })
                // Search for existing patient by phone
                const searchResults = await searchPatientsPublic(
                    patientData.phone,
                    clinicId
                )
                dbg("booking/patientHandling/searchResults", searchResults)

                // If patient exists, return existing patient
                if (searchResults && searchResults.length > 0) {
                    const existingPatient = searchResults[0]
                    // toast.success("تم العثور على المريض في النظام")
                    return existingPatient
                }

                // If patient doesn't exist, create new patient
                const ageNumber = Number(patientData.age);
                const payload = {
                    name: patientData.name,
                    phone: patientData.phone,
                    gender: patientData.gender,
                    age: Number.isFinite(ageNumber) ? Math.max(1, Math.min(120, Math.trunc(ageNumber))) : null,
                    clinic_id: clinicId,
                }

                dbg("booking/patientHandling/createPayload", {
                    ...payload,
                    __types: {
                        age: typeof payload.age,
                        clinic_id: typeof payload.clinic_id,
                    },
                })
                const newPatient = await createPatient(payload)
                dbg("booking/patientHandling/createdPatient", newPatient)
                // toast.success("تم إضافة المريض بنجاح")
                return newPatient
            } catch (error) {
                console.error("Error handling patient:", error)
                dbg("booking/patientHandling/error", { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint })
                // toast.error("حدث خطأ أثناء معالجة بيانات المريض")
                throw error
            }
        },
        [createPatient]
    )

    return {
        handlePatientSubmit,
        isCreatingPatient,
    }
}
