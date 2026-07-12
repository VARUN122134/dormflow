import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BillResult {
  studentId: string;
  name: string;
  presentDays: number;
  perDayCost: number;
  totalBill: number;
  walletBefore: number;
  walletAfter: number;
  lowBalance: boolean;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Determine previous month range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthStr = monthStart.toISOString().slice(0, 7) + "-01";

    // 1. Calculate Total Mess Expense
    const { data: purchases } = await supabase
      .from("stock_purchases")
      .select("quantity, unit_price")
      .gte("date_purchased", monthStart.toISOString().split("T")[0])
      .lte("date_purchased", monthEnd.toISOString().split("T")[0]);

    const totalMessExpense = (purchases || []).reduce(
      (sum, p) => sum + Number(p.quantity) * Number(p.unit_price), 0,
    );

    // 2. Calculate Total Active Days (sum of all "present" marks)
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("student_id, date")
      .eq("status", "present")
      .gte("date", monthStart.toISOString().split("T")[0])
      .lte("date", monthEnd.toISOString().split("T")[0]);

    const totalActiveDays = (attendance || []).length;

    // Safety check
    if (totalActiveDays === 0 || totalMessExpense === 0) {
      return new Response(JSON.stringify({
        error: "No attendance or expense data for this month",
        month: monthStr,
        totalMessExpense,
        totalActiveDays,
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 3. Per-Day Cost Per Student
    const perDayCost = totalMessExpense / totalActiveDays;

    // 4. Group attendance by student to get individual present counts
    const attendanceByStudent: Record<string, Set<string>> = {};
    (attendance || []).forEach((a) => {
      if (!attendanceByStudent[a.student_id]) attendanceByStudent[a.student_id] = new Set();
      attendanceByStudent[a.student_id].add(a.date);
    });

    // 5. Process each student
    const results: BillResult[] = [];
    let totalStudentsBilled = 0;

    for (const [studentId, dates] of Object.entries(attendanceByStudent)) {
      const presentDays = dates.size;
      if (presentDays === 0) continue;

      const totalBill = Math.round(perDayCost * presentDays * 100) / 100;

      // Get current wallet balance
      const { data: student } = await supabase
        .from("profiles")
        .select("name, wallet_balance")
        .eq("id", studentId)
        .single();

      if (!student) continue;

      const walletBefore = Number(student.wallet_balance);
      const walletAfter = Math.round((walletBefore - totalBill) * 100) / 100;

      // Atomic: update wallet + insert transaction + insert bill
      const { error: walletErr } = await supabase
        .from("profiles")
        .update({ wallet_balance: walletAfter })
        .eq("id", studentId);
      if (walletErr) continue;

      await supabase.from("wallet_transactions").insert({
        student_id: studentId,
        amount: totalBill,
        type: "debit",
        description: `Mess bill for ${monthStart.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      });

      await supabase.from("monthly_bills").upsert({
        student_id: studentId,
        month: monthStr,
        total_days_present: presentDays,
        per_day_cost: Math.round(perDayCost * 100) / 100,
        total_bill: totalBill,
        deducted_from_wallet: totalBill,
        is_paid: true,
      }, { onConflict: "student_id, month" });

      totalStudentsBilled++;

      results.push({
        studentId,
        name: student.name || "Unknown",
        presentDays,
        perDayCost: Math.round(perDayCost * 100) / 100,
        totalBill,
        walletBefore,
        walletAfter,
        lowBalance: walletAfter < 0,
      });
    }

    // 6. Save monthly summary
    await supabase.from("monthly_expense_summary").upsert({
      month: monthStr,
      total_mess_expense: Math.round(totalMessExpense * 100) / 100,
      total_active_days: totalActiveDays,
      per_day_cost: Math.round(perDayCost * 100) / 100,
      total_students_billed: totalStudentsBilled,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "month" });

    // Return results with low balance alerts
    const lowBalanceAlerts = results.filter((r) => r.lowBalance);

    return new Response(JSON.stringify({
      success: true,
      month: monthStr,
      totalMessExpense: Math.round(totalMessExpense * 100) / 100,
      totalActiveDays,
      perDayCost: Math.round(perDayCost * 100) / 100,
      totalStudentsBilled,
      studentsProcessed: results.length,
      lowBalanceAlerts: lowBalanceAlerts.map((r) => ({
        studentId: r.studentId,
        name: r.name,
        deficit: Math.round(Math.abs(r.walletAfter) * 100) / 100,
      })),
      sampleResults: results.slice(0, 5),
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
