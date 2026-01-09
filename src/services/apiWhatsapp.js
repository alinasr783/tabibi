import supabase from "./supabase";

export const sendWhatsappMessage = async ({ clinicId, appointmentId, type }) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        clinicId,
        appointmentId,
        type
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error triggering WhatsApp function:', error);
    return { success: false, error: error.message };
  }
};

// Instance Management
export const createWhatsappInstance = async ({ clinicId, phone }) => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-whatsapp-instance', {
      body: { action: 'create', clinicId, phone }
    });
    if (error) {
      if (error.name === 'FunctionsFetchError' || error.message?.includes('Resource not found')) {
        throw new Error('يرجى التأكد من رفع الـ Edge Function (manage-whatsapp-instance) على Supabase');
      }
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error('Error creating instance:', error);
    throw error;
  }
};

export const getWhatsappQrCode = async (instanceId) => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-whatsapp-instance', {
      body: { action: 'get_qr', instanceId }
    });
    if (error) {
      if (error.name === 'FunctionsFetchError' || error.message?.includes('Resource not found')) {
        throw new Error('يرجى التأكد من رفع الـ Edge Function (manage-whatsapp-instance) على Supabase');
      }
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error('Error getting QR:', error);
    throw error;
  }
};

export const getWhatsappStatus = async (instanceId) => {
  try {
    const { data, error } = await supabase.functions.invoke('manage-whatsapp-instance', {
      body: { action: 'status', instanceId }
    });
    if (error) {
      if (error.name === 'FunctionsFetchError' || error.message?.includes('Resource not found')) {
        throw new Error('يرجى التأكد من رفع الـ Edge Function (manage-whatsapp-instance) على Supabase');
      }
      throw error;
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error('Error getting status:', error);
    throw error;
  }
};

// DB Operations for Integrations
export const getStoredWhatsappInstance = async (clinicId) => {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('provider', 'message-pro')
    .eq('integration_type', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle();
    
  if (error) throw error;
  return data;
};

export const saveStoredWhatsappInstance = async (clinicId, instanceId, phone) => {
  // Check if exists
  const existing = await getStoredWhatsappInstance(clinicId);
  
  const payload = {
    clinic_id: clinicId,
    provider: 'message-pro',
    integration_type: 'whatsapp',
    access_token: null,
    settings: { instance_id: instanceId, phone },
    is_active: true
  };

  if (existing) {
    const { data, error } = await supabase
      .from('integrations')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Get user_id for the insert (required by RLS usually, or just column constraint)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await supabase
      .from('integrations')
      .insert([{ ...payload, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const deleteStoredWhatsappInstance = async (clinicId) => {
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('provider', 'message-pro')
    .eq('integration_type', 'whatsapp');
  if (error) throw error;
};
