import supabase from "../../services/supabase";

export async function getAnalyticsSummary(clinicId) {
    if (!clinicId) return null;

    const { count: viewsCount } = await supabase
        .from('booking_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('event_type', 'view');

    const { count: conversionsCount } = await supabase
        .from('booking_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('event_type', 'conversion');
    
    const { count: blockedCount } = await supabase
        .from('booking_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('event_type', 'blocked_attempt');

    // Get locations (top cities)
    const { data: locations } = await supabase
        .from('booking_analytics')
        .select('city, country')
        .eq('clinic_id', clinicId)
        .not('city', 'is', null);
    
    // Process locations locally for simplicity
    const locationCounts = locations?.reduce((acc, curr) => {
        const key = `${curr.city || 'Unknown'}, ${curr.country || ''}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {}) || {};

    const topLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        totalViews: viewsCount || 0,
        totalConversions: conversionsCount || 0,
        totalBlocked: blockedCount || 0,
        topLocations
    };
}

export async function deleteBookingDraft(id) {
    const { error } = await supabase
        .from('booking_drafts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getBookingDrafts(clinicId) {
    if (!clinicId) return [];
    
    const { data, error } = await supabase
        .from('booking_drafts')
        .select('*')
        .eq('clinic_id', clinicId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getBlockedNumbers(clinicId) {
    if (!clinicId) return [];

    const { data, error } = await supabase
        .from('blocked_phones')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function blockNumber(clinicId, phone, reason) {
    const { data, error } = await supabase
        .from('blocked_phones')
        .insert({ clinic_id: clinicId, phone_number: phone, reason })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function unblockNumber(id) {
    const { error } = await supabase
        .from('blocked_phones')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
