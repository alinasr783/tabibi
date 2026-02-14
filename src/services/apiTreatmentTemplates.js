import supabase from "./supabase";
import {
    normalizePlanLimits,
    requireActiveSubscription,
    assertCountLimit,
} from "./subscriptionEnforcement";

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

    const subscription = await requireActiveSubscription(userData.clinic_id);
    const limits = normalizePlanLimits(subscription?.plans?.limits);

    await assertCountLimit({
        clinicId: userData.clinic_id,
        table: "treatment_templates",
        maxAllowed: limits.maxTreatmentTemplates,
        errorMessage: "لقد تجاوزت الحد المسموح من الخطط العلاجية. يرجى ترقية الباقة.",
    });

    // Add clinic_id to the treatment template data
    const treatmentTemplateData = {
        ...payload,
        clinic_id: userData.clinic_id,
        advanced_settings: payload.advanced_settings || {},
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("treatment_templates")
        .insert(treatmentTemplateData)
        .select("id, name, session_count, session_price, description, created_at, updated_at, clinic_id, advanced_settings")
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
        .update({
            ...payload,
            advanced_settings: payload.advanced_settings || {},
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("clinic_id", userData.clinic_id)
        .select("id, name, session_count, session_price, description, created_at, updated_at, clinic_id, advanced_settings")
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

    // 1. Fetch Templates
    const { data: templates, error: templatesError } = await supabase
        .from("treatment_templates")
        .select("id, name, session_price, description, created_at, advanced_settings")
        .eq("clinic_id", userData.clinic_id)
        .order("created_at", { ascending: false });

    if (templatesError) {
        console.error("Error fetching treatment templates:", templatesError);
        throw templatesError;
    }

    // 2. Fetch Usage Stats (Patient Plans)
    // Fetch all patient plans for this clinic to calculate stats client-side
    // This is more efficient than N+1 queries or complex joins that might not be supported
    const { data: usages, error: usagesError } = await supabase
        .from("patient_plans")
        .select("template_id, total_price, patient_id, created_at")
        .eq("clinic_id", userData.clinic_id)
        .not("template_id", "is", null);

    if (usagesError) {
        console.error("Error fetching plan usages:", usagesError);
        // We don't throw here, just return templates with 0 stats if usages fail
    }

    // 3. Aggregate Stats in JS
    const templatesWithStats = templates.map(template => {
        const templateUsages = usages ? usages.filter(u => u.template_id === template.id) : [];
        
        const usageCount = templateUsages.length;
        const totalRevenue = templateUsages.reduce((sum, u) => sum + (Number(u.total_price) || 0), 0);
        const uniquePatients = new Set(templateUsages.map(u => u.patient_id)).size;
        
        // Find last usage date
        let lastUsageDate = null;
        if (templateUsages.length > 0) {
            const dates = templateUsages.map(u => new Date(u.created_at).getTime());
            if (dates.length > 0) {
                lastUsageDate = new Date(Math.max(...dates)).toISOString();
            }
        }

        return {
            ...template,
            stats: {
                usageCount,
                totalRevenue,
                uniquePatients,
                lastUsageDate
            },
            rawUsages: templateUsages.map(u => ({
                created_at: u.created_at,
                total_price: u.total_price,
                patient_id: u.patient_id
            }))
        };
    });

    return templatesWithStats;
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
