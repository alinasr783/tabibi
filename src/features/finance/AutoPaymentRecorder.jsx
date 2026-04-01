import { useEffect } from "react"
import { useAuth } from "../auth/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import supabase from "../../services/supabase"
import { createFinancialRecord } from "../../services/apiFinancialRecords"
import { toast } from "react-hot-toast"
import { useOffline } from "../offline-mode/OfflineContext"
import { resolveClinicUuid } from "../../services/clinicIds"

export default function AutoPaymentRecorder() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { isOnline, isOfflineMode } = useOffline();

    useEffect(() => {
        let channel;

        const setupRealtime = async () => {
            // Only run if user is authenticated
            if (!user) return;

            // Only set up real-time subscriptions when online and not in offline mode
            if (isOfflineMode || !isOnline) {
                console.log("AutoPaymentRecorder: Skipping real-time subscriptions while offline")
                return
            }

            const clinicId = await resolveClinicUuid();
            if (!clinicId) return;

            console.log("AutoPaymentRecorder: Setting up real-time subscriptions for clinic:", clinicId)

            // Set up real-time subscription to appointment changes
            channel = supabase
                .channel('appointment-status-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'appointments',
                        filter: `clinic_id=eq.${clinicId}`
                    },
                    async (payload) => {
                        // Check if the appointment status changed to "completed"
                        const becameCompleted = payload.new.status === 'completed' && (payload.eventType === 'INSERT' || payload.old?.status !== 'completed')
                        if (becameCompleted) {
                            try {
                                // Get patient details first
                                const { data: patientData } = await supabase
                                    .from('patients')
                                    .select('name')
                                    .eq('id', payload.new.patient_id)
                                    .single()
                                
                                const patientName = patientData?.name || 'مريض'
                                
                                await createFinancialRecord({
                                    appointment_id: payload.new.id,
                                    patient_id: payload.new.patient_id,
                                    amount: payload.new.price || 0,
                                    type: 'charge',
                                    reference_key: `appointment:${payload.new.id}`,
                                    description: `مستحقات مقابل الجلسة الطبية - ${patientName}`
                                })

                                // Invalidate relevant queries to refresh the UI
                                queryClient.invalidateQueries({ queryKey: ['financialRecords'] })
                                queryClient.invalidateQueries({ queryKey: ['financialSummary'] })
                                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })

                                // Show success notification
                                toast.success('تم إضافة المستحقات تلقائيًا عند إكمال الجلسة')
                            } catch (error) {
                                console.log("ERROR in appointment payment recorder:", error.message)
                                console.error("Full error:", error)
                                toast.error('حدث خطأ أثناء تسجيل المستحقات التلقائي')
                            }
                        }
                    }
                )
                .subscribe((status, error) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("AutoPaymentRecorder: Successfully subscribed to appointment changes")
                    } else if (status === 'CHANNEL_ERROR') {
                        console.log("AutoPaymentRecorder: Error subscribing to appointment changes (Likely offline)")
                    }
                })
        };

        setupRealtime();

        // Clean up subscriptions on unmount
        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [user, queryClient, isOnline, isOfflineMode])

    // This component doesn't render anything
    return null
}
