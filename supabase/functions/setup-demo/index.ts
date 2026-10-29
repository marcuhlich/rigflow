import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-setup-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This function wipes and recreates the demo account with admin rights, so it
  // must not be callable by anyone. Set SETUP_DEMO_SECRET as a function secret
  // and send it in the "x-setup-secret" header.
  const expectedSecret = Deno.env.get("SETUP_DEMO_SECRET");
  if (!expectedSecret || req.headers.get("x-setup-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const DEMO_EMAIL = "demo@rigflow.app";
    const DEMO_PASSWORD = "demo1234";

    // Check if demo user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find(u => u.email === DEMO_EMAIL);

    let userId: string;

    if (existingDemo) {
      userId = existingDemo.id;
      // Clean existing demo data
      await supabaseAdmin.from("audit_log").delete().eq("user_id", userId);
      const { data: checklists } = await supabaseAdmin.from("checklists").select("id").eq("user_id", userId);
      if (checklists?.length) {
        await supabaseAdmin.from("checklist_items").delete().in("checklist_id", checklists.map(c => c.id));
      }
      await supabaseAdmin.from("checklists").delete().eq("user_id", userId);
      const { data: sets } = await supabaseAdmin.from("event_sets").select("id").eq("user_id", userId);
      if (sets?.length) {
        await supabaseAdmin.from("event_set_items").delete().in("set_id", sets.map(s => s.id));
      }
      await supabaseAdmin.from("event_sets").delete().eq("user_id", userId);
      await supabaseAdmin.from("dmx_instances").delete().in(
        "item_id",
        ((await supabaseAdmin.from("inventory_items").select("id").eq("user_id", userId)).data || []).map(i => i.id)
      );
      await supabaseAdmin.from("lending_history").delete().eq("user_id", userId);
      await supabaseAdmin.from("inventory_items").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
    } else {
      // Create demo user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "Demo Benutzer" },
      });

      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Ensure profile exists
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      display_name: "Demo Benutzer",
    }, { onConflict: "user_id" });

    // Categories are global (public.categories); items reference them by id.

    // Seed inventory items
    const items = [
      { user_id: userId, name: "XLR-Kabel 10m", category: "audio", quantity: 20, condition: "verfügbar" as const, location: "Lager A - Regal 1", notes: "Neutrik-Stecker, schwarz", accessories: null, unit_price: 12.50 },
      { user_id: userId, name: "XLR-Kabel 5m", category: "audio", quantity: 15, condition: "verfügbar" as const, location: "Lager A - Regal 1", notes: "Neutrik-Stecker, schwarz", unit_price: 8.90 },
      { user_id: userId, name: "Powercon-Kabel 3m", category: "strom", quantity: 10, condition: "verfügbar" as const, location: "Lager A - Regal 2", unit_price: 15.00 },
      { user_id: userId, name: "CAT6 Ethercon 20m", category: "it-netzwerk", quantity: 6, condition: "verfügbar" as const, location: "Lager A - Regal 2", unit_price: 25.00 },
      { user_id: userId, name: "DMX-Kabel 10m", category: "licht", quantity: 12, condition: "verfügbar" as const, location: "Lager A - Regal 3", unit_price: 14.00 },
      { user_id: userId, name: "QSC K12.2", category: "audio", quantity: 4, condition: "verfügbar" as const, location: "Lager B - Boden", notes: "Aktive 12\" Topteile", unit_price: 899.00 },
      { user_id: userId, name: "QSC KS118", category: "audio", quantity: 2, condition: "verfügbar" as const, location: "Lager B - Boden", notes: "18\" Aktiv-Subwoofer", unit_price: 1499.00 },
      { user_id: userId, name: "JBL EON715", category: "audio", quantity: 2, condition: "verliehen" as const, location: "Extern", lent_to: "Musikverein Harmonie", lent_until: "2026-03-20", unit_price: 649.00 },
      { user_id: userId, name: "Stairville MH-x200 Pro Spot", category: "licht", quantity: 4, condition: "verfügbar" as const, location: "Lager C - Regal 1", notes: "Moving Head Spot, 200W LED", dmx_channels: 16, dmx_universe: 1, unit_price: 549.00 },
      { user_id: userId, name: "Cameo FLAT PAR CAN RGB 10", category: "licht", quantity: 8, condition: "verfügbar" as const, location: "Lager C - Regal 2", notes: "LED PAR, 144x10mm RGB", dmx_channels: 6, dmx_universe: 1, unit_price: 89.00 },
      { user_id: userId, name: "Eurolite LED BAR-12 QCL", category: "licht", quantity: 4, condition: "in-einsatz" as const, location: "Stadtfest Bühne", notes: "RGBW LED Bar", dmx_channels: 5, dmx_universe: 1, unit_price: 159.00 },
      { user_id: userId, name: "ADJ Fog Fury Jett Pro", category: "licht", quantity: 1, condition: "verfügbar" as const, location: "Lager C - Regal 3", notes: "Vertikal-Nebelmaschine mit LED", dmx_channels: 4, dmx_universe: 2, unit_price: 699.00 },
      { user_id: userId, name: "Antari Z-1520 RGB", category: "licht", quantity: 1, condition: "verfügbar" as const, location: "Lager C - Regal 3", notes: "Hazer mit RGB LEDs", dmx_channels: 3, dmx_universe: 2, unit_price: 890.00 },
      { user_id: userId, name: "Shure SM58", category: "audio", quantity: 6, condition: "verfügbar" as const, location: "Lager A - Schrank 1", notes: "Dynamisches Gesangsmikrofon", accessories: "Klammer, Tasche", unit_price: 99.00 },
      { user_id: userId, name: "Sennheiser e835", category: "audio", quantity: 4, condition: "verfügbar" as const, location: "Lager A - Schrank 1", accessories: "Klammer", unit_price: 89.00 },
      { user_id: userId, name: "Sennheiser EW 100 G4", category: "audio", quantity: 2, condition: "verliehen" as const, location: "Extern", notes: "Drahtlos-Set UHF", lent_to: "Theater am Park", lent_until: "2026-03-25", accessories: "Handsender, Empfänger, Antenne", unit_price: 599.00 },
      { user_id: userId, name: "Behringer X32 Compact", category: "audio", quantity: 1, condition: "verfügbar" as const, location: "Lager B - Rack 1", notes: "Digitalmischpult 32 Kanäle", accessories: "Flightcase, Netzkabel", unit_price: 1799.00 },
      { user_id: userId, name: "Allen & Heath SQ-5", category: "audio", quantity: 1, condition: "in-einsatz" as const, location: "Stadtfest Bühne", notes: "48-Kanal Digitalmixer", accessories: "Flightcase", unit_price: 3299.00 },
      { user_id: userId, name: "Boxenständer", category: "rigging", quantity: 8, condition: "verfügbar" as const, location: "Lager B - Ecke", unit_price: 35.00 },
      { user_id: userId, name: "Mikrofonständer", category: "werkzeug", quantity: 10, condition: "verfügbar" as const, location: "Lager A - Ecke", unit_price: 19.90 },
      { user_id: userId, name: "Strom-Verteiler 32A", category: "strom", quantity: 2, condition: "verfügbar" as const, location: "Lager A - Regal 4", notes: "CEE 32A auf 6x Schuko", unit_price: 189.00 },
      { user_id: userId, name: "GrandMA2 onPC Node", category: "licht", quantity: 1, condition: "defekt" as const, location: "Werkstatt", notes: "USB-Port defekt, Reparatur angefragt", dmx_channels: 2048, dmx_universe: 1, unit_price: 1200.00 },
    ];

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("inventory_items")
      .insert(items)
      .select("id, name, category, dmx_channels, dmx_universe");

    if (itemsError) throw itemsError;

    // DMX instances for light fixtures
    const dmxItems = insertedItems.filter(i => i.dmx_channels && i.dmx_channels < 100);
    const dmxInstances: { item_id: string; instance_number: number; dmx_start_address: number; dmx_universe: number }[] = [];
    
    const mhSpot = dmxItems.find(i => i.name.includes("MH-x200"));
    if (mhSpot) {
      for (let i = 0; i < 4; i++) {
        dmxInstances.push({ item_id: mhSpot.id, instance_number: i + 1, dmx_start_address: 1 + i * 16, dmx_universe: 1 });
      }
    }
    const flatPar = dmxItems.find(i => i.name.includes("FLAT PAR"));
    if (flatPar) {
      for (let i = 0; i < 8; i++) {
        dmxInstances.push({ item_id: flatPar.id, instance_number: i + 1, dmx_start_address: 65 + i * 6, dmx_universe: 1 });
      }
    }
    const ledBar = dmxItems.find(i => i.name.includes("LED BAR"));
    if (ledBar) {
      for (let i = 0; i < 4; i++) {
        dmxInstances.push({ item_id: ledBar.id, instance_number: i + 1, dmx_start_address: 113 + i * 5, dmx_universe: 1 });
      }
    }
    const fogFury = dmxItems.find(i => i.name.includes("Fog Fury"));
    if (fogFury) {
      dmxInstances.push({ item_id: fogFury.id, instance_number: 1, dmx_start_address: 1, dmx_universe: 2 });
    }
    const hazer = dmxItems.find(i => i.name.includes("Z-1520"));
    if (hazer) {
      dmxInstances.push({ item_id: hazer.id, instance_number: 1, dmx_start_address: 5, dmx_universe: 2 });
    }

    if (dmxInstances.length) {
      await supabaseAdmin.from("dmx_instances").insert(dmxInstances);
    }

    // Seed event set: "Stadtfest 2026"
    const { data: eventSet } = await supabaseAdmin.from("event_sets").insert({
      user_id: userId,
      name: "Stadtfest 2026",
      description: "Komplettes Setup für die Hauptbühne beim Stadtfest",
      event_date_start: "2026-04-15",
      event_date_end: "2026-04-17",
      is_favorite: true,
      notes: "Aufbau ab 14.04. 08:00 Uhr, Kontakt: Hr. Müller (Stadt)",
    }).select("id").single();

    if (eventSet) {
      const setItemNames = [
        { name: "QSC K12.2", qty: 4 },
        { name: "QSC KS118", qty: 2 },
        { name: "Eurolite LED BAR-12 QCL", qty: 4 },
        { name: "Stairville MH-x200 Pro Spot", qty: 4 },
        { name: "Allen & Heath SQ-5", qty: 1 },
        { name: "Shure SM58", qty: 4 },
        { name: "XLR-Kabel 10m", qty: 12 },
        { name: "Powercon-Kabel 3m", qty: 6 },
        { name: "Boxenständer", qty: 4 },
        { name: "Mikrofonständer", qty: 4 },
        { name: "Strom-Verteiler 32A", qty: 1 },
      ];

      const setItems = setItemNames.map(si => {
        const item = insertedItems.find(i => i.name === si.name);
        return item ? { set_id: eventSet.id, item_id: item.id, quantity: si.qty } : null;
      }).filter(Boolean);

      if (setItems.length) {
        await supabaseAdmin.from("event_set_items").insert(setItems);
      }
    }

    // Second event set
    const { data: eventSet2 } = await supabaseAdmin.from("event_sets").insert({
      user_id: userId,
      name: "Hochzeit Meyer",
      description: "Beschallung & Licht für Hochzeitsfeier",
      event_date_start: "2026-05-10",
      event_date_end: "2026-05-10",
      is_favorite: false,
      notes: "Location: Schloss Rosenberg, Einlass 17:00",
    }).select("id").single();

    if (eventSet2) {
      const set2ItemNames = [
        { name: "QSC K12.2", qty: 2 },
        { name: "Cameo FLAT PAR CAN RGB 10", qty: 8 },
        { name: "ADJ Fog Fury Jett Pro", qty: 1 },
        { name: "Behringer X32 Compact", qty: 1 },
        { name: "Sennheiser e835", qty: 2 },
        { name: "XLR-Kabel 5m", qty: 8 },
        { name: "Boxenständer", qty: 2 },
      ];

      const set2Items = set2ItemNames.map(si => {
        const item = insertedItems.find(i => i.name === si.name);
        return item ? { set_id: eventSet2.id, item_id: item.id, quantity: si.qty } : null;
      }).filter(Boolean);

      if (set2Items.length) {
        await supabaseAdmin.from("event_set_items").insert(set2Items);
      }
    }

    // Seed lending history
    const jblItem = insertedItems.find(i => i.name === "JBL EON715");
    const ewItem = insertedItems.find(i => i.name.includes("EW 100"));
    const lendingRecords = [];
    if (jblItem) {
      lendingRecords.push({
        user_id: userId, item_id: jblItem.id, item_name: jblItem.name,
        lent_to: "Musikverein Harmonie", lent_at: "2026-03-10", due_date: "2026-03-20",
      });
    }
    if (ewItem) {
      lendingRecords.push({
        user_id: userId, item_id: ewItem.id, item_name: ewItem.name,
        lent_to: "Theater am Park", lent_at: "2026-03-08", due_date: "2026-03-25",
      });
    }
    // Past lending
    if (insertedItems.length > 2) {
      const sm58 = insertedItems.find(i => i.name === "Shure SM58");
      if (sm58) {
        lendingRecords.push({
          user_id: userId, item_id: sm58.id, item_name: sm58.name,
          lent_to: "DJ Max", lent_at: "2026-02-15", due_date: "2026-02-20", returned_at: "2026-02-19",
        });
      }
    }
    if (lendingRecords.length) {
      await supabaseAdmin.from("lending_history").insert(lendingRecords);
    }

    // Seed a checklist
    const { data: checklist } = await supabaseAdmin.from("checklists").insert({
      user_id: userId,
      event_name: "Stadtfest 2026 - Aufbau",
      type: "setup",
      description: "Checkliste für den Aufbau der Hauptbühne",
    }).select("id").single();

    if (checklist) {
      await supabaseAdmin.from("checklist_items").insert([
        { checklist_id: checklist.id, text: "Strom-Anschluss prüfen (32A CEE)", item_order: 0, status: "done" },
        { checklist_id: checklist.id, text: "Subwoofer positionieren", item_order: 1, status: "done" },
        { checklist_id: checklist.id, text: "Topteile auf Stative montieren", item_order: 2, status: "pending" },
        { checklist_id: checklist.id, text: "FOH-Position einrichten", item_order: 3, status: "pending" },
        { checklist_id: checklist.id, text: "Verkabelung Audio (XLR)", item_order: 4, status: "pending" },
        { checklist_id: checklist.id, text: "Moving Heads trussen & ausrichten", item_order: 5, status: "pending" },
        { checklist_id: checklist.id, text: "DMX-Verkabelung & Patch", item_order: 6, status: "pending" },
        { checklist_id: checklist.id, text: "Soundcheck durchführen", item_order: 7, status: "pending" },
        { checklist_id: checklist.id, text: "Lichtprogrammierung testen", item_order: 8, status: "pending" },
      ]);
    }

    return new Response(
      JSON.stringify({ success: true, userId, itemsCount: insertedItems.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Setup demo error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
