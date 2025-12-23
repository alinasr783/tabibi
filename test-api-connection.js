// Test API Connection Script
// This script tests if the Supabase connection and queries are working

// Import the Supabase client
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hvbjysojjrdkszuvczbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Ymp5c29qanJka3N6dXZjemJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzE2NjYsImV4cCI6MjA3OTUwNzY2Nn0.mv-Lrl1fvXbwFSlgeNSex_HcGiEriOmcjthtrXRZpFA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserQuery() {
  console.log("Testing user query...");
  
  try {
    // Test: Query user by user_id
    console.log("Test: Querying user by user_id");
    const userId = '295dc901-f614-41a4-96c2-664dca756b1b'; // The user ID from the error
    console.log("Looking for user with ID:", userId);
    
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("user_id, email, name, phone, role, clinic_id, permissions")
      .eq("user_id", userId)
      .single();
      
    if (userError) {
      console.log("Error querying user:", userError);
    } else {
      console.log("Success querying user:", userData);
    }
    
    // Test: Check if user exists with different column name
    console.log("\nTest: Querying user by id column");
    const { data: userData2, error: userError2 } = await supabase
      .from("users")
      .select("id, user_id, email, name, phone, role, clinic_id, permissions")
      .eq("id", userId)
      .single();
      
    if (userError2) {
      console.log("Error querying user by id:", userError2);
    } else {
      console.log("Success querying user by id:", userData2);
    }
    
    console.log("\n=== Test Complete ===");
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run the test
testUserQuery();