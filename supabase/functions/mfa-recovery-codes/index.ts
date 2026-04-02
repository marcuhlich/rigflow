// supabase/functions/mfa-recovery-codes/index.ts
// Deploy via: Lovable UI → New Edge Function → Name: "mfa-recovery-codes"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Charset ohne ambigue Zeichen: kein 0/O, 1/I/L
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 10; // → XXXXX-XXXXX
const CODE_COUNT = 8;

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  const raw = Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

async function hashCode(code: string): Promise<string> {
  // Normalize: uppercase, remove dash
  const normalized = code.toUpperCase().replace("-", "");
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Init Supabase with service role (to bypass RLS for writes)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Init user client (to verify JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── COUNT ──────────────────────────────────────────────────────────────
    if (action === "count") {
      const { count, error } = await supabaseAdmin
        .from("mfa_recovery_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      if (error) throw error;

      return new Response(JSON.stringify({ count: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GENERATE ───────────────────────────────────────────────────────────
    if (action === "generate") {
      // Delete all existing codes for this user
      await supabaseAdmin
        .from("mfa_recovery_codes")
        .delete()
        .eq("user_id", user.id);

      // Generate new codes
      const plainCodes: string[] = [];
      const rows: { user_id: string; code_hash: string }[] = [];

      for (let i = 0; i < CODE_COUNT; i++) {
        const plain = generateCode();
        const hash = await hashCode(plain);
        plainCodes.push(plain);
        rows.push({ user_id: user.id, code_hash: hash });
      }

      const { error: insertError } = await supabaseAdmin
        .from("mfa_recovery_codes")
        .insert(rows);

      if (insertError) throw insertError;

      // Return plaintext codes ONCE – never stored
      return new Response(JSON.stringify({ codes: plainCodes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VERIFY (für Login-Flow) ────────────────────────────────────────────
    if (action === "verify") {
      const { code } = body as { code: string };
      if (!code) {
        return new Response(JSON.stringify({ error: "Code fehlt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hash = await hashCode(code);

      // Find matching unused code
      const { data: found, error: findError } = await supabaseAdmin
        .from("mfa_recovery_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_hash", hash)
        .is("used_at", null)
        .limit(1)
        .single();

      if (findError || !found) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as used
      await supabaseAdmin
        .from("mfa_recovery_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", found.id);

      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unbekannte Aktion" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Interner Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});