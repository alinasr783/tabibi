import supabase from "./supabase";

export async function getPricingPlans() {
    const { data, error } = await supabase
        .from("plan_pricing")
        .select("id, name, price, popular, features, description, discount_type, discount_value, discount_ends_at")
        .order("price", { ascending: true });

    if (error) throw error;
    return data;
}

export async function getPricingPlanById(id) {
    const { data, error } = await supabase
        .from("plan_pricing")
        .select("id, name, price, popular, features, description, discount_type, discount_value, discount_ends_at")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}
