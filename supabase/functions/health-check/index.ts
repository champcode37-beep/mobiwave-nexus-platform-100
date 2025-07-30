import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Health check function called");
    
    // Test environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encryptionKey = Deno.env.get("API_KEY_ENCRYPTION_KEY_B64");
    
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: !!supabaseUrl,
        service_role_key: !!serviceRoleKey,
        encryption_key: !!encryptionKey,
        deno_version: Deno.version.deno,
      },
      request: {
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        url: req.url,
      }
    };

    console.log("Health check data:", healthData);

    return new Response(JSON.stringify(healthData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);
    
    const errorData = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };

    return new Response(JSON.stringify(errorData), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
