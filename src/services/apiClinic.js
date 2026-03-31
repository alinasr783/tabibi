import supabase from "./supabase"

const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));

export async function getCurrentClinic() {
  console.log("getCurrentClinic: Starting clinic data fetch");
  
  // Get current user's clinic_id
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  console.log("getCurrentClinic: Getting user data for user_id:", session.user.id);

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()

  if (userError) throw new Error(`فشل تحميل بيانات المستخدم: ${userError.message}`)
  
  console.log("getCurrentClinic: User data retrieved:", userData);
  
  // Handle clinic_id from user data (this is actually the UUID)
  let clinicUuid = userData.clinic_id;
  if (!clinicUuid) throw new Error("المستخدم ليس مرتبطًا بعيادة")

  console.log("getCurrentClinic: Querying clinic with clinic_uuid:", clinicUuid);

  // Get clinic data - querying by clinic_uuid (the actual UUID field in clinics table)
  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, clinic_uuid, name, address, booking_price, available_time, online_booking_enabled, whatsapp_enabled, whatsapp_number, prevent_conflicts, min_time_gap")
      .eq("clinic_uuid", clinicUuid)  // Query by clinic_uuid as per actual database schema
      .single()

    if (error) throw error
    
    console.log("getCurrentClinic: Clinic data retrieved:", data);
    return data
  } catch (error) {
    console.error("getCurrentClinic: Error querying clinic:", error);
    // If the online_booking_enabled column doesn't exist, try without it
    if (error.message.includes('online_booking_enabled')) {
      const { data, error: fallbackError } = await supabase
        .from("clinics")
        .select("id, clinic_uuid, name, address, booking_price, available_time")
        .eq("clinic_uuid", clinicUuid)  // Query by clinic_uuid as per actual database schema
        .single()
      
      if (fallbackError) throw fallbackError
      
      console.log("getCurrentClinic: Clinic data retrieved with fallback:", data);
      
      // Add the missing property with a default value
      return {
        ...data,
        online_booking_enabled: true
      }
    }
    throw error
  }
}

// New function to get clinic data by clinic_id for public booking page
export async function getClinicById(clinicId) {
  console.log("getClinicById: Getting clinic with clinicId:", clinicId);
  
  // Validate clinicId
  if (!clinicId) {
    throw new Error("Clinic ID is required");
  }

  const selectFull = "id, clinic_uuid, name, address, booking_price, available_time, online_booking_enabled, whatsapp_enabled, whatsapp_number, prevent_conflicts, min_time_gap";
  const selectFallback = "id, clinic_uuid, name, address, booking_price, available_time, whatsapp_enabled, whatsapp_number, prevent_conflicts, min_time_gap";

  const isPermissionError = (msg) => {
    const m = String(msg || "").toLowerCase();
    return m.includes("permission") || m.includes("denied");
  };

  const fetchByUuid = async (uuid) => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select(selectFull)
        .eq("clinic_uuid", uuid)
        .single();
      if (!error) return data;
      if (String(error.message).includes("online_booking_enabled")) {
        const { data: d2, error: e2 } = await supabase
          .from("clinics")
          .select(selectFallback)
          .eq("clinic_uuid", uuid)
          .single();
        if (e2) throw e2;
        return { ...d2, online_booking_enabled: true };
      }
      throw error;
    } catch (e) {
      throw e;
    }
  };

  const fetchByBigint = async (n) => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select(selectFull)
        .eq("clinic_id_bigint", n)
        .single();
      if (!error) return data;
      if (String(error.message).includes("online_booking_enabled")) {
        const { data: d2, error: e2 } = await supabase
          .from("clinics")
          .select(selectFallback)
          .eq("clinic_id_bigint", n)
          .single();
        if (e2) throw e2;
        return { ...d2, online_booking_enabled: true };
      }
      throw error;
    } catch (e) {
      throw e;
    }
  };

  try {
    if (isUuid(clinicId)) {
      const data = await fetchByUuid(clinicId);
      console.log("getClinicById: Clinic data retrieved:", data);
      return data;
    }

    const n = Number(clinicId);
    if (Number.isFinite(n)) {
      const data = await fetchByBigint(n);
      console.log("getClinicById: Clinic data retrieved (resolved bigint):", data);
      return data;
    }

    throw new Error("Invalid clinic identifier");
  } catch (error) {
    console.error("getClinicById: Error querying clinic:", error);
    if (isUuid(clinicId) && isPermissionError(error?.message)) {
      console.log("getClinicById: Permission error, returning fallback data");
      return {
        clinic_uuid: clinicId,
        name: "عيادة تجريبيّة",
        address: "عنوان العيادة التجريبيّة",
        booking_price: 0,
        available_time: {
          saturday: { start: "09:00", end: "17:00", off: false },
          sunday: { start: "09:00", end: "17:00", off: false },
          monday: { start: "09:00", end: "17:00", off: false },
          tuesday: { start: "09:00", end: "17:00", off: false },
          wednesday: { start: "09:00", end: "17:00", off: false },
          thursday: { start: "09:00", end: "17:00", off: false },
          friday: { start: "09:00", end: "17:00", off: true }
        },
        online_booking_enabled: true
      };
    }
    throw error;
  }
}

export async function updateClinic({ name, address, booking_price, available_time, online_booking_enabled, whatsapp_enabled, whatsapp_number, prevent_conflicts, min_time_gap }) {
  // Get current user's clinic_id
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  console.log("updateClinic: Getting user data for user_id:", session.user.id);

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("user_id", session.user.id)
    .single()

  if (userError) throw new Error(`فشل تحميل بيانات المستخدم: ${userError.message}`)
  
  console.log("updateClinic: User data retrieved:", userData);
  
  // Handle clinic_id from user data (this is actually the UUID)
  let clinicUuid = userData.clinic_id;
  if (!clinicUuid) throw new Error("المستخدم ليس مرتبطًا بعيادة")

  // Only doctors can update clinic info
  if (userData.role !== "doctor") {
    throw new Error("فقط الطبيب يمكنه تعديل بيانات العيادة")
  }

  // Prepare update data
  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address;
  if (booking_price !== undefined) updateData.booking_price = parseFloat(booking_price) || 0;
  if (available_time !== undefined) updateData.available_time = available_time;
  if (online_booking_enabled !== undefined) updateData.online_booking_enabled = online_booking_enabled;
  if (whatsapp_enabled !== undefined) updateData.whatsapp_enabled = whatsapp_enabled;
  if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
  if (prevent_conflicts !== undefined) updateData.prevent_conflicts = prevent_conflicts;
  if (min_time_gap !== undefined) updateData.min_time_gap = min_time_gap;

  console.log("updateClinic: Updating clinic with data:", updateData);

  // Update clinic data with comprehensive error handling
  try {
    // First, check if the clinic exists by querying clinic_uuid (the actual UUID field)
    const { data: existingClinic, error: checkError } = await supabase
      .from("clinics")
      .select("id, clinic_uuid")
      .eq("clinic_uuid", clinicUuid)  // Query by clinic_uuid as per project memory
      .single();

    if (checkError) {
      console.error("updateClinic: Error checking clinic existence:", checkError);
      // If clinic doesn't exist, provide helpful guidance
      if (checkError.code === 'PGRST116') {
        throw new Error("العيادة غير موجودة في قاعدة البيانات. يرجى التأكد من أن العيادة مسجلة بشكل صحيح.");
      }
      throw new Error(`فشل التحقق من وجود العيادة: ${checkError.message}`);
    }

    console.log("updateClinic: Clinic exists:", existingClinic);

    // Clinic exists, proceed with update using clinic_uuid (the actual UUID field)
    const { data, error } = await supabase
      .from("clinics")
      .update(updateData)
      .eq("clinic_uuid", clinicUuid)  // Update by clinic_uuid as per project memory
      .select()
      .single()

    if (error) {
      console.error("updateClinic: Error updating clinic:", error);
      throw error;
    }
    
    if (!data) {
      throw new Error("No data returned from update operation");
    }
    
    console.log("updateClinic: Clinic updated successfully:", data);
    return data
  } catch (error) {
    console.error("updateClinic: Error in update process:", error);
    
    // Handle specific error cases
    if (error.message.includes('online_booking_enabled') && error.message.includes('schema cache')) {
      // Schema cache issue - try without the problematic field
      const { online_booking_enabled, ...safeUpdateData } = updateData;
      
      console.log("updateClinic: Trying fallback update without online_booking_enabled");
      
      const { data, error: fallbackError } = await supabase
        .from("clinics")
        .update(safeUpdateData)
        .eq("clinic_uuid", clinicUuid)  // Update by clinic_uuid as per project memory
        .select()
        .single()

      if (fallbackError) {
        console.error("updateClinic: Fallback update error:", fallbackError);
        throw new Error(`فشل تحديث البيانات: ${fallbackError.message}`);
      }
      
      if (!data) {
        throw new Error("No data returned from fallback update operation");
      }
      
      console.log("updateClinic: Clinic updated with fallback:", data);
      return data
    }
    
    // Handle case where no rows were updated
    if (error.code === 'PGRST116' || error.message.includes('coerce')) {
      throw new Error("العيادة غير موجودة في قاعدة البيانات. يرجى التأكد من أن العيادة مسجلة بشكل صحيح.");
    }
    
    // If it's a general error
    if (error.message) {
      throw new Error(`حدث خطأ أثناء تحديث بيانات العيادة: ${error.message}`);
    }
    
    throw new Error("حدث خطأ غير متوقع أثناء تحديث بيانات العيادة");
  }
}
