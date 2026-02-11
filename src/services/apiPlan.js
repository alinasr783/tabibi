import supabase from "./supabase"

export async function getCurrentPlan() {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession()
    console.log("=== DEBUG: getCurrentPlan started ===")
    console.log("Session data:", session)
    
    if (!session) {
        console.log("No session, throwing error")
        throw new Error("Not authenticated")
    }

    const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

    console.log("User data result:", { userData, userError })

    if (userError) {
        console.log("User data error:", userError)
        throw userError
    }

    if (!userData?.clinic_id) {
        console.log("User has no clinic assigned")
        throw new Error("User has no clinic assigned")
    }

    // Get active subscription plan for the clinic
    console.log("Fetching active subscription for clinic_id:", userData.clinic_id)
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plans:plan_id(*)')
        .eq('clinic_id', userData.clinic_id)
        .eq('status', 'active')
        .single()

    console.log("Subscription data result:", { data, error })

    if (error) {
        // If no active subscription found, return null
        if (error.code === "PGRST116") {
            console.log("No active subscription found, returning null")
            return null
        }
        console.log("Subscription error:", error)
        throw error
    }

    console.log("Returning plan data:", data)
    console.log("=== DEBUG: getCurrentPlan completed ===")
    
    return data
}