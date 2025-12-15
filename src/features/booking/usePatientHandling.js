import { useCallback } from "react"
import toast from "react-hot-toast"
import { searchPatientsPublic } from "../../services/apiAppointments"
import useCreatePatientPublic from "../patients/useCreatePatientPublic"

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
                // Search for existing patient by phone
                const searchResults = await searchPatientsPublic(
                    patientData.phone,
                    clinicId
                )

                // If patient exists, return existing patient
                if (searchResults && searchResults.length > 0) {
                    const existingPatient = searchResults[0]
                    // toast.success("تم العثور على المريض في النظام")
                    return existingPatient
                }

                // If patient doesn't exist, create new patient
                const payload = {
                    name: patientData.name,
                    phone: patientData.phone,
                    gender: patientData.gender,
                    age: patientData.age,
                    clinic_id: clinicId,
                }

                const newPatient = await createPatient(payload)
                // toast.success("تم إضافة المريض بنجاح")
                return newPatient
            } catch (error) {
                console.error("Error handling patient:", error)
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
