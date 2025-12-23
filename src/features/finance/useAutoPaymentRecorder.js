import { useEffect } from "react"
import { useAuth } from "../auth/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import supabase from "../../services/supabase"
import { createFinancialRecord } from "../../services/apiFinancialRecords"
import { toast } from "react-hot-toast"

export default function useAutoPaymentRecorder() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        // Only run if user is authenticated and has a clinic
        if (!user?.clinic_id) return

        // Set up real-time subscription to appointment changes
        const channel = supabase
            .channel('appointment-status-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'appointments',
                    filter: `clinic_id=eq.${user.clinic_id}`
                },
                async (payload) => {
                    // Check if the appointment status changed to "completed"
                    if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
                        try {
                            // Get patient details first
                            const { data: patientData } = await supabase
                                .from('patients')
                                .select('name')
                                .eq('id', payload.new.patient_id)
                                .single()
                            
                            const patientName = patientData?.name || 'مريض'
                            
                            // Create a financial record for the completed appointment
                            // Note: We don't include appointment_id because appointments table uses UUID
                            // but financial_records.appointment_id is still bigint (legacy schema)
                            await createFinancialRecord({
                                patient_id: payload.new.patient_id,
                                amount: payload.new.price || 0,
                                type: 'income',
                                description: `دفع مقابل الجلسة الطبية - ${patientName}`
                            })

                            // Invalidate relevant queries to refresh the UI
                            queryClient.invalidateQueries({ queryKey: ['financialRecords'] })
                            queryClient.invalidateQueries({ queryKey: ['financialSummary'] })
                            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })

                            // Show success notification
                            toast.success('تم تسجيل الدفع تلقائيًا عند إكمال الجلسة')
                        } catch (error) {
                            console.error('Error recording automatic payment:', error)
                            toast.error('حدث خطأ أثناء تسجيل الدفع التلقائي')
                        }
                    }
                }
            )
            .subscribe()

        // Clean up subscription on unmount
        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, queryClient])
}