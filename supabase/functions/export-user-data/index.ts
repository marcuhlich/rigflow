// supabase/functions/export-user-data/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Kein Token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Ungültiger Token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  async function fetchTable(table: string) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.warn(`'${table}' nicht abrufbar:`, error.message);
      return null;
    }
    return data;
  }

  const [
    inventoryItems,
    eventChecklists,
    checklistItems,
    auditLogs,
    dmxFixtures,
    dmxPatchplans,
    pushSubscriptions,
  ] = await Promise.all([
    fetchTable("inventory_items"),
    fetchTable("event_checklists"),
    fetchTable("checklist_items"),
    fetchTable("audit_log"),
    fetchTable("dmx_fixtures"),
    fetchTable("dmx_patchplans"),
    fetchTable("push_subscriptions"),
  ]);

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    },
    data: {
      ...(inventoryItems   !== null && { inventoryItems }),
      ...(eventChecklists  !== null && { eventChecklists }),
      ...(checklistItems   !== null && { checklistItems }),
      ...(auditLogs        !== null && { auditLogs }),
      ...(dmxFixtures      !== null && { dmxFixtures }),
      ...(dmxPatchplans    !== null && { dmxPatchplans }),
      ...(pushSubscriptions !== null && { pushSubscriptions }),
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});