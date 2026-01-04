
// Follow this setup guide to integrate the Supabase Edge Function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// Using 'npm:' specifier to avoid esm.sh bundling issues with firebase-admin
import admin from "npm:firebase-admin@11.11.1";

// 1. Setup Firebase Admin SDK
// You need to generate a new Private Key from Firebase Console:
// Project Settings -> Service Accounts -> Generate new private key
// Save the JSON content to a secret in Supabase named FIREBASE_SERVICE_ACCOUNT
// format: {"type": "service_account", "project_id": "...", ...}

const serviceAccountEnv = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
if (!serviceAccountEnv) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT env var");
}

const serviceAccount = serviceAccountEnv ? JSON.parse(serviceAccountEnv) : {};

// Initialize Firebase Admin only if not already initialized
if (admin.apps.length === 0) {
  if (serviceAccount.project_id) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully");
    } catch (err) {
      console.error("Failed to initialize Firebase Admin:", err);
    }
  } else {
    console.error("Invalid service account config: missing project_id");
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // 2. This function is triggered via Database Webhook
    const payload = await req.json();
    const { type, record } = payload;

    console.log("Received webhook payload:", payload);

    // Check if it's an INSERT on the notifications table
    if (type === "INSERT" && record) {
      const { clinic_id, title, message } = record;

      if (!clinic_id) {
        return new Response("No clinic_id in record", { status: 400 });
      }

      // 3. Find users belonging to this clinic
      // We assume 'users' table has 'clinic_id' and 'auth_uid' (which links to auth.users.id)
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("auth_uid") 
        .eq("clinic_id", clinic_id);

      if (userError) {
        console.error("Error fetching users:", userError);
        return new Response("Error fetching users", { status: 500 });
      }

      if (!users || users.length === 0) {
        console.log("No users found for clinic:", clinic_id);
        return new Response("No users found", { status: 200 });
      }

      // Filter out users without auth_uid
      const userIds = users
        .map((u) => u.auth_uid)
        .filter((uid) => uid !== null && uid !== undefined);

      if (userIds.length === 0) {
        console.log("No valid auth_uid found for clinic users");
        return new Response("No valid users", { status: 200 });
      }

      console.log("Targeting users:", userIds);

      // 4. Get FCM tokens for these users
      const { data: tokens, error: tokenError } = await supabase
        .from("fcm_tokens")
        .select("token")
        .in("user_id", userIds);

      if (tokenError) {
        console.error("Error fetching tokens:", tokenError);
        return new Response("Error fetching tokens", { status: 500 });
      }

      if (!tokens || tokens.length === 0) {
        console.log("No FCM tokens found for users:", userIds);
        return new Response("No tokens found", { status: 200 });
      }

      const fcmTokens = tokens.map((t) => t.token);
      
      // Remove duplicates
      const uniqueTokens = [...new Set(fcmTokens)];

      console.log(`Sending notification to ${uniqueTokens.length} devices`);

      // 5. Send Notification
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: uniqueTokens,
          notification: {
            title: title || "New Notification",
            body: message || "You have a new update",
          },
          data: {
              // Add additional data if needed
              notification_id: record.id?.toString() || "",
              click_action: "/notifications" // Optional: URL to open when clicked
          }
        });

        console.log("Successfully sent message:", response);
        
        // Log failed tokens if any
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(uniqueTokens[idx]);
            }
          });
          console.log("Failed tokens:", failedTokens);
        }

        return new Response(JSON.stringify(response), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      } catch (sendError) {
        console.error("Error sending multicast message:", sendError);
        return new Response(JSON.stringify({ error: sendError.message }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    return new Response("Not an INSERT event", { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
