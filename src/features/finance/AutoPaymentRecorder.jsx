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

        // Set up real-time subscription to visit changes
        const visitChannel = supabase
            .channel('visit-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'visits'
                },
                async (payload) => {
                    try {
                        console.log("=== AUTO PAYMENT RECORDER DEBUG ===")
                        console.log("1. New visit detected:", payload.new.id)
                        
                        // Check if this visit belongs to the current user's clinic
                        if (payload.new.clinic_id !== clinicId) {
                            console.log("2. Visit not for current clinic - skipping")
                            return
                        }
                        
                        // A new visit was created, check if it's linked to a patient plan
                        const visit = payload.new
                        
                        // If the visit is linked to a patient plan, update the plan
                        if (visit.patient_plan_id) {
                            console.log("3. Visit linked to patient plan:", visit.patient_plan_id)
                            
                            // Get the patient plan details with treatment template
                            const { data: planData, error: planError } = await supabase
                                .from("patient_plans")
                                .select(`
                                    id,
                                    total_sessions,
                                    completed_sessions,
                                    total_price,
                                    status,
                                    template_id,
                                    treatment_templates(name, session_price)
                                `)
                                .eq("id", visit.patient_plan_id)
                                .single()

                            if (planError) {
                                console.log("4. Error fetching patient plan:", planError.message)
                                return
                            }

                            console.log("5. Patient plan fetched:", planData)

                            // Calculate session price
                            const sessionPrice = planData.treatment_templates?.session_price || 0
                            console.log("6. Session price calculated:", sessionPrice)

                            // Update the patient plan with incremented completed sessions
                            const updatedCompletedSessions = (planData.completed_sessions || 0) + 1
                            const isPlanCompleted = updatedCompletedSessions >= planData.total_sessions

                            console.log("7. Updating patient plan with completed sessions:", updatedCompletedSessions)

                            await updatePatientPlan(planData.id, {
                                completed_sessions: updatedCompletedSessions,
                                status: isPlanCompleted ? 'completed' : 'active'
                            })

                            console.log("8. Patient plan updated successfully")

                            // Create a financial record for the completed session
                            await createFinancialRecord({
                                visit_id: visit.id,
                                patient_id: visit.patient_id,
                                amount: sessionPrice,
                                type: 'income',
                                description: `دفع مقابل جلسة علاجية - ${planData.treatment_templates?.name || 'خطة علاجية'}`
                            })
                            
                            console.log("9. Financial record created successfully")
                            
                            // Invalidate relevant queries to refresh the UI
                            queryClient.invalidateQueries({ queryKey: ['patientPlans'] })
                            queryClient.invalidateQueries({ queryKey: ['financialRecords'] })
                            queryClient.invalidateQueries({ queryKey: ['financialSummary'] })
                            
                            console.log("10. Queries invalidated - payment recording complete")
                            
                            // Show success notification
                            toast.success('تم تسجيل الجلسة والدفع تلقائيًا')
                        } else {
                            console.log("3. Visit not linked to patient plan - skipping auto payment")
                        }
                    } catch (error) {
                        console.log("ERROR in AutoPaymentRecorder:", error.message)
                        toast.error('حدث خطأ أثناء تسجيل الجلسة والدفع التلقائي')
                    }
                }
            )
            .subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    console.log("AutoPaymentRecorder: Successfully subscribed to visit changes")
                } else if (status === 'CHANNEL_ERROR') {
                    console.log("AutoPaymentRecorder: Error subscribing to visit changes:", error?.message)
                }
            })

        // Set up real-time subscription to appointment changes (existing functionality)
        const appointmentChannel = supabase
            .channel('appointment-status-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
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
                            console.log("ERROR in appointment payment recorder:", error.message)
                            console.error("Full error:", error)
                            toast.error('حدث خطأ أثناء تسجيل الدفع التلقائي')
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
            supabase.removeChannel(visitChannel)
            supabase.removeChannel(appointmentChannel)
        }
    }, [user, queryClient, isOnline])

    // This component doesn't render anything
    return null
}