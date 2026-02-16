import supabase from "./supabase"
import { generateClinicId } from "../lib/clinicIdGenerator"
import {
  normalizePlanLimits,
  requireActiveSubscription,
  assertCountLimit,
} from "./subscriptionEnforcement"

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

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/dashboard`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) throw new Error(error.message)
    return data
}

export async function linkGoogleAccount(scope) {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/integrations?google_auth_callback=true`,
            scopes: scope,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) throw new Error(error.message)
    return data
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
            emailRedirectTo: `${window.location.origin}/dashboard`,
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
                name: (userData.clinicName || "").trim(),
                address: (userData.clinicAddress || "").trim(),
            },
        ])

        if (clinicError) {
            console.error("Error creating clinic:", clinicError)
            throw clinicError
        }
    }

    // Track signup from affiliate link (best-effort)
    if (userData.role === "doctor" && userData.referralCode) {
        try {
            await supabase.from("affiliate_link_events").insert({
                referral_code: userData.referralCode,
                event_type: "signup",
                path: window.location.pathname + window.location.search,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent || null,
            })
        } catch (e) {
            console.warn("Affiliate signup tracking failed (non-blocking):", e)
        }
    }

    // Apply affiliate referral if present (best-effort)
    if (userData.role === "doctor" && userData.referralCode) {
        try {
            await supabase.rpc("apply_affiliate_referral", {
                referral_code: userData.referralCode,
                clinic_id: userData.clinicId,
            })
        } catch (e) {
            console.warn("Affiliate referral apply failed (non-blocking):", e)
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
        
        // Helper to get session with a wait mechanism
        const getSessionWithWait = async () => {
            // 1. Try immediate session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error("getCurrentUser: Initial session check error:", error);
            }
            if (session) return session;

            // 2. Check if we are in an OAuth redirect flow
            // Implicit flow uses hash with access_token
            // PKCE flow uses query params with code
            const isOAuthRedirect = 
                (window.location.hash && window.location.hash.includes('access_token')) ||
                (window.location.search && window.location.search.includes('code='));

            if (!isOAuthRedirect) {
                console.log("getCurrentUser: No session and no OAuth redirect detected");
                return null;
            }

            // 3. If in OAuth flow but no session yet, wait for SIGNED_IN event
            console.log("getCurrentUser: OAuth redirect detected, waiting for auth state change...");
            
            return new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    console.log("getCurrentUser: Auth wait timeout");
                    resolve(null);
                }, 5000); // Wait up to 5 seconds for OAuth processing

                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        console.log("getCurrentUser: Detected SIGNED_IN event");
                        clearTimeout(timeoutId);
                        subscription.unsubscribe();
                        resolve(session);
                    } else if (event === 'SIGNED_OUT') {
                         // If we explicitly get signed out, no need to wait further
                         console.log("getCurrentUser: Detected SIGNED_OUT event");
                         clearTimeout(timeoutId);
                         subscription.unsubscribe();
                         resolve(null);
                    }
                });
            });
        };

        const session = await getSessionWithWait();
        
        if (!session) {
            console.log("getCurrentUser: No session found after checks");
            return null;
        }
        
        console.log("getCurrentUser: Session found, fetching user data for user_id:", session.user.id);
        
        // Try to fetch user data with a timeout wrapper
        const fetchUserData = async () => {
            console.log("getCurrentUser: Creating user data promise");
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("user_id, email, name, phone, role, clinic_id, permissions, avatar_url, banner_url, bio, education, certificates, specialty, contacts")
                .eq("user_id", session.user.id)
                .single();
            
            if (userError) {
                // If user not found, check if we have pending google signup data
                if (userError.code === 'PGRST116') { // no rows found
                    const pendingSignupJson = localStorage.getItem('pending_google_signup');
                    if (pendingSignupJson) {
                        console.log("Found pending Google signup data, creating user profile...");
                        const pendingData = JSON.parse(pendingSignupJson);
                        
                        // Insert user
                        const { error: insertError } = await supabase.from("users").insert([
                            {
                                user_id: session.user.id,
                                email: session.user.email,
                                name: pendingData.name || session.user.user_metadata.full_name || "User",
                                phone: pendingData.phone || "",
                                role: pendingData.role,
                                clinic_id: pendingData.clinicId,
                                permissions: pendingData.permissions || null,
                            },
                        ]);

                        if (insertError) {
                            console.error("Error creating user profile from Google signup:", insertError);
                            throw insertError;
                        }

                        // If doctor, create clinic
                        if (pendingData.role === "doctor") {
                             const { error: clinicError } = await supabase.from("clinics").insert([
                                {
                                    clinic_uuid: pendingData.clinicId,
                                    name: pendingData.clinicName,
                                    address: pendingData.clinicAddress,
                                    clinic_id_bigint: null
                                },
                            ]);
                            
                            if (clinicError) {
                                console.error("Error creating clinic from Google signup:", clinicError);
                            }
                        }

                        // Clear local storage
                        localStorage.removeItem('pending_google_signup');

                        // Return the new user data
                         return {
                             data: {
                                user_id: session.user.id,
                                email: session.user.email,
                                name: pendingData.name || session.user.user_metadata.full_name,
                                phone: pendingData.phone,
                                role: pendingData.role,
                                clinic_id: pendingData.clinicId,
                                permissions: pendingData.permissions,
                             },
                             error: null
                        };
                    }
                }
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
                        .select("user_id, role, clinic_id, contacts")
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

  const subscription = await requireActiveSubscription(clinicId)
  const limits = normalizePlanLimits(subscription?.plans?.limits)

  await assertCountLimit({
    clinicId,
    table: "users",
    maxAllowed: limits.maxSecretaries,
    errorMessage: "لقد تجاوزت الحد المسموح من السكرتارية. يرجى ترقية الباقة.",
    extraFilter: (query) => query.eq("role", "secretary"),
  })

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

export async function updateProfile({ name, phone, email, avatar_url, bio, education, certificates, specialty, banner_url, contacts }) {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error("جلسة المصادقة مفقودة! برجاء تسجيل الدخول مرة أخرى.")

    const userId = session.user.id

    // Update auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
        data: {
            name,
            phone
        }
    })

    if (authError) throw authError

    // Prepare updates object
    const updates = {
        name,
        phone,
        email
    }
    
    // Add optional fields if they are provided
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    if (bio !== undefined) updates.bio = bio
    if (education !== undefined) updates.education = education
    if (certificates !== undefined) updates.certificates = certificates
    if (specialty !== undefined) updates.specialty = specialty
    if (banner_url !== undefined) updates.banner_url = banner_url
    if (contacts !== undefined) updates.contacts = contacts

    // Update user in users table
    const { data, error: userError } = await supabase
        .from("users")
        .update(updates)
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
