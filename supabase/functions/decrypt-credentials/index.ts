import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Get encryption key from environment
const ENCRYPTION_KEY_B64 = Deno.env.get("API_KEY_ENCRYPTION_KEY_B64") ?? "";
let ENCRYPTION_KEY: Uint8Array | null = null;

if (ENCRYPTION_KEY_B64) {
  try {
    ENCRYPTION_KEY = Uint8Array.from(atob(ENCRYPTION_KEY_B64), (c) =>
      c.charCodeAt(0),
    );
  } catch (error) {
    console.error("Failed to decode encryption key:", error);
    throw new Error("Encryption key decoding failed");
  }
}

// Decrypt function (same as mspace-balance)
async function decryptApiKey(encrypted: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not available");
  }

  const [ivB64, cipherB64] = encrypted.split(":");
  if (!ivB64 || !cipherB64) {
    throw new Error("Invalid encrypted API key format");
  }
  
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "raw",
    ENCRYPTION_KEY,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes,
    );
    return new TextDecoder().decode(plainBuffer);
  } catch (error) {
    throw new Error("Failed to decrypt API key");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL and service role key are required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from auth header
    const user AuthResult = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (!userAuthResult.data || !userAuthResult.data.user) {
      throw new Error("Invalid authentication");
    }

    // Get user's encrypted credentials
    const credentialsResult = await supabase
      .from("api_credentials")
      .select("*")
      .eq("user_id", userAuthResult.data.user.id)
      .eq("service_name", "mspace")
      .eq("is_active", true)
      .single();

    if (!credentialsResult.data) {
      throw new Error("No mspace credentials found");
    }

    // Check if credentials are encrypted
    if (!credentialsResult.data.api_key_encrypted) {
      // Return plain text credentials as-is
      return new Response(JSON.stringify({
        apiKey: credentialsResult.data.api_key,
        username: credentialsResult.data.username,
        senderId: credentialsResult.data.sender_id,
        source: 'plaintext'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt the API key
    const decryptedApiKey = await decryptApiKey(credentialsResult.data.api_key_encrypted as string);
    
    // Return decrypted credentials
    return new Response(JSON.stringify({
      apiKey: decryptedApiKey,
      username: credentialsResult.data.username,
      senderId: credentialsResult.data.sender_id,
      source: 'decrypted'
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Decrypt credentials error:", error);
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});