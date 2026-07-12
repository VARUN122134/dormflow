import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || SUPABASE_URL;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !["admin", "boys_warden", "girls_warden", "chief_warden"].includes(profile.role)) return null;
  return { user, profile };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace("/warden-api", "").replace(/\/$/, "");
  const method = req.method;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ---- AUTH ----
  if (path === "/login" && method === "POST") {
    try {
      const { email, password } = await req.json();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) return error("Invalid credentials", 401);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
      if (!profile || !["admin", "boys_warden", "girls_warden", "chief_warden"].includes(profile.role)) {
        await supabase.auth.signOut();
        return error("Unauthorized: not a warden or admin", 403);
      }
      return json({ token: authData.session.access_token, profile: serializeProfile(profile) });
    } catch (e) { return error(e.message, 400); }
  }

  if (path === "/me" && method === "GET") {
    const auth = await verifyAuth(req);
    if (!auth) return error("Unauthorized", 401);
    return json({ profile: serializeProfile(auth.profile) });
  }

  // ---- Verify auth for all remaining endpoints ----
  const auth = await verifyAuth(req);
  if (!auth) return error("Unauthorized", 401);

  const { profile: warden } = auth;

  // ---- DASHBOARD ----
  if (path === "/dashboard/stats" && method === "GET") {
    const { data: students } = await supabase.from("profiles").select("id, role, is_active, active_status, hostel_type").eq("role", "student");
    const { data: alerts } = await supabase.from("system_alerts").select("id").eq("status", "open");
    const { data: activeStaff } = await supabase.from("profiles").select("id").in("role", ["admin", "boys_warden", "girls_warden", "chief_warden", "security", "mess_incharge"]);
    const { data: spendData } = await supabase.from("stock_purchases").select("quantity, unit_price, date_purchased").gte("date_purchased", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
    const today = new Date().toISOString().split("T")[0];
    const { data: todayUsage } = await supabase.from("stock_usage").select("quantity_used, item_id").eq("date_used", today);

    const totalSpend = (spendData || []).reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0);
    const daysPassed = new Date().getDate();
    const avgDaily = daysPassed > 0 ? totalSpend / daysPassed : 0;
    const todayCost = (todayUsage || []).reduce((s, r) => s + Number(r.quantity_used), 0) * avgDaily / Math.max(1, daysPassed);

    const totalStudents = (students || []).length;
    const activeStudents = (students || []).filter(s => s.is_active !== false).length;
    const occupancyPct = totalStudents > 0 ? Math.round((activeStudents / 200) * 100) : 0;

    return json({
      occupancy: { allocated: 200, filled: activeStudents, percentage: Math.min(occupancyPct, 100) },
      fees: { outstanding: 145000, overdueStudents: 12 },
      messCost: { today: Math.round(todayCost * 100) / 100, average: Math.round(avgDaily * 100) / 100 },
      inventoryAlerts: (alerts || []).filter(a => true).length,
      activeStaff: (activeStaff || []).length,
    });
  }

  if (path === "/dashboard/alerts" && method === "GET") {
    const { data: alerts } = await supabase.from("system_alerts").select("*").order("created_at", { ascending: false }).limit(10);
    return json(alerts || []);
  }

  // ---- INVENTORY / COMMODITIES ----
  if (path === "/inventory/commodities" && method === "GET") {
    const { data } = await supabase.from("stock_items").select("id, name, category, unit, current_stock, min_stock_alert, unit_cost").order("name");
    return json(data || []);
  }

  if (path === "/inventory/items" && method === "GET") {
    const { data } = await supabase.from("stock_items").select("*").order("category").order("name");
    return json(data || []);
  }

  if (path === "/inventory/financials" && method === "GET") {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const { data: purchases } = await supabase.from("stock_purchases").select("quantity, unit_price, date_purchased").gte("date_purchased", monthStart);
    const { data: items } = await supabase.from("stock_items").select("current_stock, unit_cost");
    const { data: usage } = await supabase.from("stock_usage").select("quantity_used").gte("date_used", monthStart);

    const totalPurchased = (purchases || []).reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0);
    const dailyUsage = (usage || []).reduce((s, r) => s + Number(r.quantity_used), 0);
    const daysPassed = new Date().getDate();
    const dailyCostBurn = daysPassed > 0 ? Math.round((dailyUsage * (totalPurchased / Math.max(1, daysPassed)) / Math.max(1, daysPassed)) * 100) / 100 : 0;
    const remainingAsset = (items || []).reduce((s, r) => s + Number(r.current_stock) * Number(r.unit_cost), 0);

    return json({
      totalPurchased: Math.round(totalPurchased * 100) / 100,
      dailyCostBurn: Math.round(dailyCostBurn * 100) / 100,
      remainingAsset: Math.round(remainingAsset * 100) / 100,
    });
  }

  if (path === "/inventory/recent-issues" && method === "GET") {
    const [usageRes, purchaseRes] = await Promise.all([
      supabase.from("stock_usage").select("*, stock_items(name)").order("created_at", { ascending: false }).limit(10),
      supabase.from("stock_purchases").select("*, stock_items(name)").order("created_at", { ascending: false }).limit(10),
    ]);
    const activities: Array<Record<string, unknown>> = [];
    (usageRes.data || []).forEach((u: Record<string, unknown>) => activities.push({
      type: "issue", id: u.id, itemName: (u.stock_items as Record<string, unknown>)?.name || "Unknown",
      quantity: Number(u.quantity_used), kitchenUnit: u.kitchen_unit, reason: u.reason,
      date: u.date_used, createdAt: u.created_at, delta: -Number(u.quantity_used),
    }));
    (purchaseRes.data || []).forEach((p: Record<string, unknown>) => activities.push({
      type: "restock", id: p.id, itemName: (p.stock_items as Record<string, unknown>)?.name || "Unknown",
      quantity: Number(p.quantity), vendor: p.vendor, date: p.date_purchased,
      createdAt: p.created_at, delta: Number(p.quantity),
    }));
    activities.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
    return json(activities.slice(0, 15));
  }

  if (path === "/inventory/purchases" && method === "POST") {
    try {
      const body = await req.json();
      const { data: purchase, error: purchaseErr } = await supabase.from("stock_purchases").insert({
        item_id: body.itemId, quantity: body.quantity, unit_price: body.unitPrice,
        vendor: body.vendor || null, date_purchased: body.datePurchased || new Date().toISOString().split("T")[0],
        created_by: warden.id,
      }).select().single();
      if (purchaseErr) return error(purchaseErr.message);

      // Update current stock and unit_cost (weighted average)
      const { data: item } = await supabase.from("stock_items").select("*").eq("id", body.itemId).single();
      if (item) {
        const oldQty = Number(item.current_stock);
        const oldCost = Number(item.unit_cost);
        const newQty = Number(body.quantity);
        const newCost = Number(body.unitPrice);
        const totalQty = oldQty + newQty;
        const avgCost = totalQty > 0 ? ((oldQty * oldCost) + (newQty * newCost)) / totalQty : newCost;
        await supabase.from("stock_items").update({ current_stock: totalQty, unit_cost: Math.round(avgCost * 100) / 100 }).eq("id", body.itemId);
      }
      return json(purchase, 201);
    } catch (e) { return error(e.message); }
  }

  if (path === "/inventory/usage" && method === "POST") {
    try {
      const body = await req.json();
      const { data: item } = await supabase.from("stock_items").select("*").eq("id", body.itemId).single();
      if (!item) return error("Item not found");
      const newStock = Number(item.current_stock) - Number(body.quantity);
      if (newStock < 0) return error("Insufficient stock");

      const { data: usage, error: usageErr } = await supabase.from("stock_usage").insert({
        item_id: body.itemId, quantity_used: body.quantity,
        kitchen_unit: body.kitchenUnit || null, reason: body.reason || null,
        date_used: body.dateUsed || new Date().toISOString().split("T")[0],
        created_by: warden.id,
      }).select().single();
      if (usageErr) return error(usageErr.message);

      await supabase.from("stock_items").update({ current_stock: newStock }).eq("id", body.itemId);

      // Alert if below threshold
      if (item.min_stock_alert > 0 && newStock < Number(item.min_stock_alert)) {
        await supabase.from("system_alerts").insert({
          type: "inventory", entity_id: String(body.itemId),
          description: `${item.name} stock is ${newStock}${item.unit} (below alert threshold of ${item.min_stock_alert}${item.unit})`,
          status: "open",
        });
      }
      return json(usage, 201);
    } catch (e) { return error(e.message); }
  }

  // ---- STOCK ITEMS CRUD ----
  if (path.match(/^\/inventory\/items\/\d+$/) && method === "PUT") {
    const id = parseInt(path.split("/").pop()!);
    try {
      const body = await req.json();
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.category !== undefined) patch.category = body.category;
      if (body.unit !== undefined) patch.unit = body.unit;
      if (body.minStockAlert !== undefined) patch.min_stock_alert = body.minStockAlert;
      if (body.currentStock !== undefined) patch.current_stock = body.currentStock;
      if (body.unitCost !== undefined) patch.unit_cost = body.unitCost;
      patch.updated_at = new Date().toISOString();
      const { data, error: updateErr } = await supabase.from("stock_items").update(patch).eq("id", id).select().single();
      if (updateErr) return error(updateErr.message);
      return json(data);
    } catch (e) { return error(e.message); }
  }

  if (path.match(/^\/inventory\/items\/\d+$/) && method === "DELETE") {
    const id = parseInt(path.split("/").pop()!);
    const { error: delErr } = await supabase.from("stock_items").delete().eq("id", id);
    if (delErr) return error(delErr.message);
    return json({ success: true });
  }

  if (path === "/inventory/items" && method === "POST") {
    try {
      const body = await req.json();
      const { data, error: createErr } = await supabase.from("stock_items").insert({
        name: body.name, category: body.category, unit: body.unit || "kg",
        min_stock_alert: body.minStockAlert || 0, current_stock: body.currentStock || 0,
        unit_cost: body.unitCost || 0,
      }).select().single();
      if (createErr) return error(createErr.message);
      return json(data, 201);
    } catch (e) { return error(e.message); }
  }

  // ---- STUDENTS ----
  if (path === "/students/stats" && method === "GET") {
    const { data: students } = await supabase.from("profiles").select("id, wallet_balance, is_approved").eq("role", "student");
    const total = (students || []).length;
    const totalWallet = (students || []).reduce((s, r) => s + Number(r.wallet_balance || 0), 0);
    const pending = (students || []).filter(s => !s.is_approved).length;
    const paid = (students || []).filter(s => Number(s.wallet_balance || 0) > 0).length;
    const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;
    return json({
      totalReceivables: Math.round(totalWallet * 100) / 100,
      paymentsPending: pending,
      collectionRate,
      avgPaymentTime: 4.2,
      totalStudents: total,
    });
  }

  if (path === "/students" && method === "GET") {
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status") || "";

    let query = supabase.from("profiles").select("*", { count: "exact" }).eq("role", "student");
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,room_number.ilike.%${search}%`);
    }
    if (status === "pending") query = query.eq("is_approved", false);
    else if (status === "approved") query = query.eq("is_approved", true);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error: listErr } = await query.order("name").range(from, to);
    if (listErr) return error(listErr.message);
    return json({ students: (data || []).map(serializeProfile), total: count || 0, page, limit });
  }

  if (path === "/students" && method === "POST") {
    try {
      const body = await req.json();
      const email = body.rollNo ? `${body.rollNo}@ucea.edu.in` : body.email;
      const { data: user, error: signUpErr } = await supabase.auth.admin.createUser({
        email, password: body.password || "changeme123",
        email_confirm: true,
        user_metadata: { name: body.name, role: "student" },
      });
      if (signUpErr) return error(signUpErr.message);
      const { data: profile, error: profileErr } = await supabase.from("profiles").upsert({
        id: user.user.id, email, name: body.name, role: "student",
        gender: body.gender, hostel_type: body.hostelType, department: body.department,
        year: body.year, room_number: body.roomNumber, block_name: body.blockName,
        phone: body.phone, guardian_name: body.guardianName, guardian_phone: body.guardianPhone,
        is_approved: true, wallet_balance: body.initialDeposit || 0,
      }).select().single();
      if (profileErr) return error(profileErr.message);
      return json(serializeProfile(profile), 201);
    } catch (e) { return error(e.message); }
  }

  if (path.match(/^\/students\/[\w-]+$/) && method === "PUT") {
    const id = path.split("/").pop()!;
    try {
      const body = await req.json();
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.roomNumber !== undefined) patch.room_number = body.roomNumber;
      if (body.blockName !== undefined) patch.block_name = body.blockName;
      if (body.department !== undefined) patch.department = body.department;
      if (body.year !== undefined) patch.year = body.year;
      if (body.phone !== undefined) patch.phone = body.phone;
      if (body.gender !== undefined) patch.gender = body.gender;
      if (body.hostelType !== undefined) patch.hostel_type = body.hostelType;
      if (body.walletBalance !== undefined) patch.wallet_balance = body.walletBalance;
      if (body.isActive !== undefined) patch.is_active = body.isActive;
      const { data, error: updateErr } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
      if (updateErr) return error(updateErr.message);
      return json(serializeProfile(data));
    } catch (e) { return error(e.message); }
  }

  if (path.match(/^\/students\/[\w-]+$/) && method === "DELETE") {
    const id = path.split("/").pop()!;
    const { error: delErr } = await supabase.from("profiles").update({ is_active: false }).eq("id", id);
    if (delErr) return error(delErr.message);
    return json({ success: true });
  }

  // ---- KITCHEN UNITS ----
  if (path === "/kitchen-units" && method === "GET") {
    const { data } = await supabase.from("kitchen_units").select("*").eq("is_active", true);
    return json(data || []);
  }

  // ---- VENDORS ----
  if (path === "/vendors" && method === "GET") {
    const { data } = await supabase.from("vendors").select("*").eq("is_active", true);
    return json(data || []);
  }

  // ---- ATTENDANCE ----
  if (path === "/attendance/sync" && method === "POST") {
    try {
      const body = await req.json();
      const records = Array.isArray(body) ? body : body.records || [];
      if (!records.length) return error("No records provided");
      const { data, error: insErr } = await supabase.from("attendance_records").upsert(
        records.map((r: Record<string, unknown>) => ({
          student_id: r.studentId || r.student_id,
          date: r.date,
          status: r.status || "present",
          meal_type: r.mealType || r.meal_type || "all",
        })),
        { onConflict: "student_id, date, meal_type" },
      ).select();
      if (insErr) return error(insErr.message);
      return json({ inserted: (data || []).length });
    } catch (e) { return error(e.message); }
  }

  if (path === "/attendance" && method === "GET") {
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("attendance_records").select("*, profiles!attendance_records_student_id_fkey(name, email, room_number, department)").eq("date", date).order("student_id");
    return json(data || []);
  }

  // ---- REPORTS / BILLS ----
  if (path.match(/^\/reports\/bills\/(\d{4}-\d{2})$/) && method === "GET") {
    const month = path.match(/^\/reports\/bills\/(\d{4}-\d{2})$/)![1] + "-01";
    const { data: summary } = await supabase.from("monthly_expense_summary").select("*").eq("month", month).maybeSingle();
    const { data: bills } = await supabase.from("monthly_bills").select("*, profiles!monthly_bills_student_id_fkey(name, email, room_number, department, wallet_balance)").eq("month", month).order("total_bill", { ascending: false });
    return json({ summary, bills: (bills || []).map(serializeBill) });
  }

  if (path.match(/^\/reports\/month-end\/status$/) && method === "GET") {
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0].slice(0, 7) + "-01";
    const { data: summary } = await supabase.from("monthly_expense_summary").select("*").eq("month", lastMonth).maybeSingle();
    return json({ lastRun: summary?.calculated_at || null, hasRun: !!summary, summary });
  }

  // ---- PROFILE ----
  if (path === "/profile/password" && method === "PUT") {
    try {
      const { currentPassword, newPassword } = await req.json();
      if (!currentPassword || !newPassword) return error("Both passwords required");
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: warden.email, password: currentPassword });
      if (signInErr) return error("Current password is incorrect", 401);
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) return error(updateErr.message);
      return json({ success: true });
    } catch (e) { return error(e.message); }
  }

  // ---- 404 ----
  return error(`Not found: ${method} ${path}`, 404);
});

function serializeProfile(row: Record<string, unknown>) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, email: row.email, role: row.role,
    gender: row.gender, hostelType: row.hostel_type, department: row.department,
    year: row.year, roomNumber: row.room_number, blockName: row.block_name,
    phone: row.phone, guardianName: row.guardian_name, guardianPhone: row.guardian_phone,
    walletBalance: Number(row.wallet_balance || 0), isActive: row.is_active,
    isApproved: row.is_approved || false,
  };
}

function serializeBill(row: Record<string, unknown>) {
  const student = row.profiles as Record<string, unknown> || {};
  return {
    id: row.id, studentId: row.student_id, month: row.month,
    totalDaysPresent: row.total_days_present, perDayCost: row.per_day_cost,
    totalBill: row.total_bill, deducted: row.deducted_from_wallet,
    isPaid: row.is_paid,
    student: {
      name: student.name, email: student.email,
      roomNumber: student.room_number, department: student.department,
      walletBalance: Number(student.wallet_balance || 0),
    },
  };
}
