import supabase from "./supabase"

export async function signup({ email, password, userData }) {
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

    if (error) throw error

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

    // If user is a doctor, create clinic record
    if (userData.role === "doctor") {
        const { error: clinicError } = await supabase.from("clinics").insert([
            {
                clinic_uuid: userData.clinicId, // Use clinic_uuid as the main identifier
                clinic_id_bigint: null, // Don't set clinic_id_bigint for new records
                name: userData.clinicName,
                address: userData.clinicAddress,
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

    if (error) throw error

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
            throw new Error("معرف العيادة غير موجود")
        }
        throw error
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

export async function addSecretary({ name, email, phone, clinicId, permissions = [] }) {
  // Validate inputs
  if (!name || !email || !clinicId) {
    throw new Error("الاسم والبريد الإلكتروني ومعرف العيادة مطلوبة");
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    throw new Error("هذا البريد الإلكتروني مستخدم بالفعل");
  }

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-8);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: {
        name,
        phone: phone || "",
        role: "secretary",
      },
    },
  });

  if (authError) throw authError;

  // Insert user data into users table
  // Use clinic_id instead of clinic_id_bigint
  const { error: insertError } = await supabase.from("users").insert([
    {
      user_id: authData.user.id,
      email,
      name,
      phone: phone || "",
      role: "secretary",
      clinic_id: clinicId, // Use clinic_id instead of clinic_id_bigint
      permissions: permissions.length > 0 ? permissions : ["dashboard", "calendar", "patients"],
    },
  ]);

  if (insertError) {
    // If user insertion fails, delete the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw insertError;
  }

  // Send invitation email (in a real implementation, you would send an actual email)
  console.log(`Send invitation email to ${email} with password: ${tempPassword}`);

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

  // Delete from users table
  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) throw authError;

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