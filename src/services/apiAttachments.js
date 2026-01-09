import supabase from "./supabase";

/**
 * Upload a file for a patient
 * @param {Object} params
 * @param {string} params.patientId
 * @param {File} params.file
 * @param {string} params.category
 * @param {string} params.description
 */
export async function uploadPatientAttachment({ patientId, file, category, description }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: userData } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single();

  if (!userData?.clinic_id) throw new Error("User has no clinic assigned");

  const clinicId = userData.clinic_id;
  // Sanitize filename
  const sanitizedName = file.name.replace(/[^\x00-\x7F]/g, "file").replace(/[^a-zA-Z0-9.]/g, '_');
  const fileName = `${Date.now()}_${sanitizedName}`;
  const filePath = `${clinicId}/${patientId}/${fileName}`;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("patient-attachments")
    .upload(filePath, file);

  if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`فشل رفع الملف: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("patient-attachments")
    .getPublicUrl(filePath);

  // Insert record into patient_attachments table
  const { data, error: dbError } = await supabase
    .from("patient_attachments")
    .insert({
      patient_id: patientId,
      clinic_id: clinicId,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      category: category || 'other',
      description: description
    })
    .select()
    .single();

  if (dbError) {
      console.error("Database insert error:", dbError);
      throw new Error(`فشل حفظ بيانات الملف: ${dbError.message}`);
  }

  return data;
}

/**
 * Get all attachments for a patient
 * @param {string} patientId 
 */
export async function getPatientAttachments(patientId) {
    const { data, error } = await supabase
        .from("patient_attachments")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
        
    if (error) throw error;
    return data;
}

/**
 * Delete an attachment
 * @param {string} id 
 */
export async function deletePatientAttachment(id) {
    // First get the file path to delete from storage
    const { data: attachment, error: fetchError } = await supabase
        .from("patient_attachments")
        .select("file_url")
        .eq("id", id)
        .single();
        
    if (fetchError) throw fetchError;
    
    // Extract path from URL
    try {
        const urlParts = attachment.file_url.split('/patient-attachments/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { error: storageError } = await supabase.storage
                .from("patient-attachments")
                .remove([filePath]);
                
            if (storageError) console.error("Storage delete error:", storageError);
        }
    } catch (e) {
        console.error("Error parsing file path for deletion:", e);
    }

    const { error } = await supabase
        .from("patient_attachments")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return true;
}
