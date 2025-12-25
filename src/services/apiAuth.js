import supabase from "./supabase"

// Check if email already exists
export async function checkEmailExists(email) {
    const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle()
    
    if (error && error.code !== 'PGRST116') throw error
    return !!data
}

export async function signup({ email, password, userData }) {
    // Check if email already exists before creating account
    const emailExists = await checkEmailExists(email)
    if (emailExists) {
        throw new Error("الإيميل ده موجود قبل كده، جرب إيميل تاني")
    }

    // CRITICAL VALIDATION: For doctors, ensure clinic name and address are provided
    if (userData.role === "doctor") {
        if (!userData.clinicName || userData.clinicName.trim().length === 0) {
            throw new Error("لازم تدخل اسم العيادة")
        }
        if (userData.clinicName.trim().length < 3) {
            throw new Error("اسم العيادة لازم 3 أحرف على الأقل")
        }
        if (!userData.clinicAddress || userData.clinicAddress.trim().length === 0) {
            throw new Error("لازم تدخل عنوان العيادة")
        }
        if (userData.clinicAddress.trim().length < 5) {
            throw new Error("عنوان العيادة لازم 5 أحرف على الأقل")
        }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: userData.name,
                phone: userData.phone,
                role: userData.role,
            },
        },
    })

    if (error) {
        // Translate common Supabase errors to Egyptian Arabic
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
            throw new Error("الإيميل ده موجود قبل كده، جرب إيميل تاني")
        }
        throw new Error(error.message)
    }

    // Insert user data into users table
    // Use clinic_id as UUID string
    const { error: insertError } = await supabase.from("users").insert([
        {
            user_id: data.user.id,
            email: data.user.email,
            name: userData.name,
            phone: userData.phone,
            role: userData.role,
            clinic_id: userData.clinicId, // Use clinic_id as UUID string
            permissions: userData.permissions || null,
        },
    ])

    if (insertError) {
        console.error("Error inserting user:", insertError)
        throw insertError
    }

    // If user is a doctor, create clinic record with validated data
    if (userData.role === "doctor") {
        const { error: clinicError } = await supabase.from("clinics").insert([
            {
                clinic_uuid: userData.clinicId, // Use clinic_uuid as the main identifier
                clinic_id_bigint: null, // Don't set clinic_id_bigint for new records
                name: userData.clinicName.trim(),
                address: userData.clinicAddress.trim(),
            },
        ])

        if (clinicError) {
            console.error("Error creating clinic:", clinicError)
            throw clinicError
        }
    }

    return data
}

export async function login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Translate common login errors to Egyptian Arabic
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid")) {
            throw new Error("الإيميل أو الباسورد غلط")
        }
        if (error.message.includes("Email not confirmed")) {
            throw new Error("لازم تأكد الإيميل الأول")
        }
        throw new Error(error.message)
    }

    return data
}

export async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) throw error
}

export async function getCurrentUser() {
    console.log("getCurrentUser: Starting user data fetch");
    
    try {
        // First, get the session
        console.log("getCurrentUser: Attempting to fetch session");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error("Session error:", sessionError);
            return null;
        }
        
        if (!sessionData || !sessionData.session) {
            console.log("getCurrentUser: No session found");
            return null;
        }
        
        const session = sessionData.session;
        console.log("getCurrentUser: Session found, fetching user data for user_id:", session.user.id);
        
        // Try to fetch user data with a timeout wrapper
        const fetchUserData = async () => {
            console.log("getCurrentUser: Creating user data promise");
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("user_id, email, name, phone, role, clinic_id, permissions")
                .eq("user_id", session.user.id)
                .single();
            
            if (userError) {
                throw userError;
            }
            
            return { data: userData, error: userError };
        };
        
        // Simple timeout wrapper
        const withTimeout = (promise, ms) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
            ]);
        };
        
        try {
            console.log("getCurrentUser: Attempting to fetch user data with timeout");
            const result = await withTimeout(fetchUserData(), 20000); // 20 second timeout
            console.log("getCurrentUser: User data fetched successfully:", result.data);
            
            const userData = result.data;
            
            // Check if user has a valid role
            if (!userData || !userData.role) {
                console.error("User data missing role:", userData);
                // Return session data with indication that user data is missing
                return {
                    ...session.user,
                    role: session.user.role, // This will be "authenticated"
                    userDataMissing: true
                };
            }
            
            // Handle permissions - parse if it's a string
            let permissions = userData.permissions;
            if (typeof userData.permissions === 'string') {
                try {
                    permissions = JSON.parse(userData.permissions);
                } catch (e) {
                    console.error("Error parsing permissions string:", e);
                    permissions = [];
                }
            }
            
            // Merge session user data with our user data
            const mergedUser = {
                ...session.user,
                ...userData,
                permissions: permissions
            };
            
            console.log("getCurrentUser: Merged user data:", mergedUser);
            return mergedUser;
            
        } catch (timeoutError) {
            console.error("getCurrentUser: User data fetch timeout:", timeoutError);
            
            // Try a simpler fallback query
            console.log("getCurrentUser: Trying fallback query with minimal data");
            try {
                const { data: fallbackData, error: fallbackError } = await withTimeout(
                    supabase
                        .from("users")
                        .select("user_id, role, clinic_id")
                        .eq("user_id", session.user.id)
                        .single(),
                    10000 // 10 second timeout for fallback
                );
                
                if (fallbackError) {
                    throw fallbackError;
                }
                
                console.log("getCurrentUser: Fallback user data fetched successfully:", fallbackData);
                
                // Merge session user data with fallback user data
                const mergedUser = {
                    ...session.user,
                    ...fallbackData,
                    permissions: []
                };
                
                console.log("getCurrentUser: Merged user data with fallback:", mergedUser);
                return mergedUser;
                
            } catch (fallbackError) {
                console.error("getCurrentUser: Fallback query also failed:", fallbackError);
                // Even if we can't fetch user data, return the session data
                // This will allow users to see the "role not verified" error
                return {
                    ...session.user,
                    role: session.user.role // This will be "authenticated"
                };
            }
        }
        
    } catch (error) {
        console.error("getCurrentUser: General error:", error);
        return null;
    }
}

export async function verifyClinicId(clinicId) {
    const { data, error } = await supabase
        .from("users")
        .select("id, clinic_id, role") // Use clinic_id instead of clinic_id_bigint
        .eq("clinic_id", clinicId) // Use clinic_id instead of clinic_id_bigint
        .eq("role", "doctor")
        .single()

    if (error) {
        if (error.code === "PGRST116") {
            throw new Error("معرف العيادة ده مش موجود")
        }
        throw new Error("حصل مشكلة في التحقق من معرف العيادة")
    }

    return data
}

export async function getClinicSecretaries(clinicId) {
    // Validate clinicId
    if (!clinicId) {
        throw new Error("معرف العيادة مطلوب")
    }

    const { data, error } = await supabase
        .from("users")
        .select("user_id, name, email, phone, created_at, permissions")
        .eq("clinic_id", clinicId) // Use clinic_id instead of clinic_id_bigint
        .eq("role", "secretary")
        .order("created_at", { ascending: false })

    if (error) throw error
    return data
}

export async function addSecretary({ name, email, password, phone, clinicId, permissions = [] }) {
  // Validate inputs
  if (!name || !email || !password || !clinicId) {
    throw new Error("لازم تدخل كل البيانات");
  }

  if (password.length < 6) {
    throw new Error("كلمة السر لازم 6 أحرف على الأقل");
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    throw new Error("الإيميل ده مستخدم قبل كده");
  }

  // Get current session to restore later
  const { data: { session: currentSession } } = await supabase.auth.getSession();

  // Create auth user using signUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || "",
        role: "secretary",
      },
    },
  });

  if (authError) throw authError;

  // Immediately restore the original session to prevent logout
  if (currentSession) {
    await supabase.auth.setSession({
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
    });
  }

  // Insert user data into users table
  const { error: insertError } = await supabase.from("users").insert([
    {
      user_id: authData.user.id,
      email,
      name,
      phone: phone || "",
      role: "secretary",
      clinic_id: clinicId,
      permissions: permissions.length > 0 ? permissions : ["dashboard", "calendar", "patients"],
    },
  ]);

  if (insertError) {
    console.error("Failed to insert user data:", insertError);
    throw new Error("حصل خطأ في إضافة بيانات الموظف");
  }

  return authData.user;
}

export async function updateSecretary({ userId, name, email, phone, permissions }) {
  // Validate inputs
  if (!userId) {
    throw new Error("معرف المستخدم مطلوب");
  }

  // Update user in users table
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (permissions !== undefined) updates.permissions = permissions;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSecretary(userId) {
  // Validate inputs
  if (!userId) {
    throw new Error("معرف المستخدم مطلوب");
  }

  // Only delete from users table - we can't use admin.deleteUser without service_role
  // The auth user will remain but won't be able to access the system without a users record
  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error deleting secretary:", deleteError);
    throw new Error("حدث خطأ أثناء حذف السكرتير: " + deleteError.message);
  }

  return { success: true };
}

export async function updateSecretaryPermissions(secretaryId, permissions) {
    // Validate inputs
    if (!secretaryId) {
        throw new Error("معرف السكرتير مطلوب")
    }

    const { data, error } = await supabase
        .from("users")
        .update({ permissions })
        .eq("user_id", secretaryId)

    if (error) throw error
    return data
}

export async function updateProfile({ name, phone, email }) {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    const userId = session.user.id

    // Update auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
        data: {
            name,
            phone
        }
    })

    if (authError) throw authError

    // Update user in users table
    const { data, error: userError } = await supabase
        .from("users")
        .update({
            name,
            phone,
            email
        })
        .eq("user_id", userId)
        .select()
        .single()

    if (userError) throw userError
    return data
}

export async function changePassword({ currentPassword, newPassword }) {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("Not authenticated")

    // First, verify current password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword
    })

    if (signInError) {
        throw new Error("كلمة المرور الحالية غير صحيحة")
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) throw updateError
    return { success: true }
}