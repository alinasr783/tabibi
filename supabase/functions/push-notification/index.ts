
// Follow this setup guide to integrate the Supabase Edge Function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import admin from "https://esm.sh/firebase-admin@11.5.0";

// 1. Setup Firebase Admin SDK
// You need to generate a new Private Key from Firebase Console:
// Project Settings -> Service Accounts -> Generate new private key
// Save the JSON content to a secret in Supabase named FIREBASE_SERVICE_ACCOUNT
// format: {"type": "service_account", "project_id": "...", ...}

const serviceAccount = JSON.parse(
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

if (serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT env var");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
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
    // We assume 'users' table has 'clinic_id' and 'user_id' (auth.id)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("user_id") // This should map to auth.uid
      .eq("clinic_id", clinic_id);

    if (userError || !users || users.length === 0) {
      console.log("No users found for clinic:", clinic_id);
      return new Response("No users found", { status: 200 });
    }

    const userIds = users.map((u) => u.user_id);

    // 4. Get FCM tokens for these users
    const { data: tokens, error: tokenError } = await supabase
      .from("fcm_tokens")
      .select("token")
      .in("user_id", userIds);

    if (tokenError || !tokens || tokens.length === 0) {
      console.log("No FCM tokens found for users:", userIds);
      return new Response("No tokens found", { status: 200 });
    }

    const fcmTokens = tokens.map((t) => t.token);
    
    // Remove duplicates
    const uniqueTokens = [...new Set(fcmTokens)];

    // 5. Send Notification
    try {
      const response = await admin.messaging().sendMulticast({
        tokens: uniqueTokens,
        notification: {
          title: title || "New Notification",
          body: message || "You have a new update",
        },
        data: {
            // Add additional data if needed
            notification_id: record.id?.toString() || ""
        }
      });

      console.log("Successfully sent message:", response);
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  return new Response("Not an INSERT event", { status: 200 });
});
