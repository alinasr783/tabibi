import { useEffect } from "react"
import { useAuth } from "../auth/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import supabase from "../../services/supabase"
import { createFinancialRecord } from "../../services/apiFinancialRecords"
import { updatePatientPlan } from "../../services/apiPatientPlans"
import { toast } from "react-hot-toast"
import { useOffline } from "../offline-mode/OfflineContext"

export default function AutoPaymentRecorder() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    
    // Add a try-catch block to handle cases where the hook is used outside the provider
    let isOnline = true;
    let hasOfflineContext = false;
    
    try {
        const offlineContext = useOffline();
        isOnline = offlineContext.isOnline;
        hasOfflineContext = true;
    } catch (error) {
        // If we're outside the OfflineProvider, we'll default to online mode
        console.warn("AutoPaymentRecorder used outside OfflineProvider, defaulting to online mode");
    }

    useEffect(() => {
        // Only run if user is authenticated and has a clinic
        if (!user?.clinic_id) {
            console.log("AutoPaymentRecorder: Not authenticated or no clinic ID")
            return
        }

        // Only set up real-time subscriptions when online
        if (hasOfflineContext && !isOnline) {
            console.log("AutoPaymentRecorder: Skipping real-time subscriptions while offline")
            return
        }

        console.log("AutoPaymentRecorder: Setting up real-time subscriptions")

        // Use clinic_id directly (now a UUID) for filtering
        const clinicId = user.clinic_id

        // Set up real-time subscription to appointment changes (existing functionality)
        const appointmentChannel = supabase
            .channel('appointment-status-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments'
                },
                async (payload) => {
                    // Check if this appointment belongs to the current user's clinic
                    if (payload.new.clinic_id !== clinicId) {
                        console.log("Appointment not for current clinic - skipping")
                        return
                    }
                    
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
                    console.log("AutoPaymentRecorder: Error subscribing to appointment changes:", error?.message)
                }
            })

        // Clean up subscriptions on unmount
        return () => {
            supabase.removeChannel(appointmentChannel)
        }
    }, [user, queryClient, isOnline])

    // This component doesn't render anything
    return null
}
