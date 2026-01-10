import supabase from "./supabase";

export async function createTreatmentTemplate(payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    /*
    // Security checks disabled by user request
    /*
    // get clinic subscription plan
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, plans(limits)')
        .eq('clinic_id', userData.clinic_id)
        .eq('status', 'active')
        .single()

    if (!subscription) throw new Error("لا يوجد اشتراك مفعل")

    const maxTreatmentTemplates = subscription.plans.limits.max_treatment_templates

    if (maxTreatmentTemplates !== -1) {
        // 3. احسب عدد المرضى المضافين في الشهر الحالي فقط
        const { count } = await supabase
            .from('treatment_templates')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', userData.clinic_id)

        // 4. المقارنة الحاسمة
        if (count >= maxTreatmentTemplates) {
            throw new Error("لقد تجاوزت الحد المسموح من الخطط. يرجى ترقية الباقة.")
        }
    }
    */

    // Add clinic_id to the treatment template data
    const treatmentTemplateData = {
        ...payload,
        clinic_id: userData.clinic_id
    };

    const { data, error } = await supabase
        .from("treatment_templates")
        .insert(treatmentTemplateData)
        .select()
        .single();

    if (error) {
        console.error("Error creating treatment template:", error);
        throw error;
    }
    return data;
}

export async function updateTreatmentTemplate(id, payload) {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("treatment_templates")
        .update(payload)
        .eq("id", id)
        .eq("clinic_id", userData.clinic_id)
        .select()
        .single();

    if (error) {
        console.error("Error updating treatment template:", error);
        throw error;
    }
    return data;
}

export async function getTreatmentTemplates() {
    // Get current user's clinic_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    const { data, error } = await supabase
        .from("treatment_templates")
        .select("id, name, session_price, description, created_at")
        .eq("clinic_id", userData.clinic_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching treatment templates:", error);
        throw error;
    }
    return data;
}

export async function deleteTreatmentTemplate(id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data: userData } = await supabase
        .from("users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single();

    if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

    // Prevent deletion if template is used in patient plans
    const { count: usageCount, error: usageError } = await supabase
        .from('patient_plans')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', id)
        .eq('clinic_id', userData.clinic_id);

    if (usageError) throw new Error(usageError.message);
    if (usageCount && usageCount > 0) {
        throw new Error('لا يمكن حذف هذه الخطة لأنها مستخدمة في خطط المرضى');
    }

    const { error } = await supabase
        .from("treatment_templates")
        .delete()
        .eq("id", id)
        .eq("clinic_id", userData.clinic_id);

    if (error) throw new Error(error.message);
    return true;
}
