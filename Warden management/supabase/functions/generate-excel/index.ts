import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import ExcelJS from "npm:exceljs@4.4.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const monthStart = month + "-01";
    const monthEndDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0);
    const monthEnd = monthEndDate.toISOString().split("T")[0];

    // Get all stock items with category info
    const { data: items } = await supabase.from("stock_items").select("*").order("category").order("name");
    if (!items || !items.length) {
      return new Response("No inventory data found", { status: 404 });
    }

    // Get purchases for this month
    const { data: purchases } = await supabase
      .from("stock_purchases")
      .select("item_id, quantity, unit_price")
      .gte("date_purchased", monthStart)
      .lte("date_purchased", monthEnd);

    // Get usage for this month
    const { data: usage } = await supabase
      .from("stock_usage")
      .select("item_id, quantity_used")
      .gte("date_used", monthStart)
      .lte("date_used", monthEnd);

    // Aggregate data
    const purchaseTotals: Record<number, { qty: number; value: number }> = {};
    (purchases || []).forEach((p) => {
      if (!purchaseTotals[p.item_id]) purchaseTotals[p.item_id] = { qty: 0, value: 0 };
      purchaseTotals[p.item_id].qty += Number(p.quantity);
      purchaseTotals[p.item_id].value += Number(p.quantity) * Number(p.unit_price);
    });

    const usageTotals: Record<number, number> = {};
    (usage || []).forEach((u) => {
      usageTotals[u.item_id] = (usageTotals[u.item_id] || 0) + Number(u.quantity_used);
    });

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "UCE IT Hub - Warden Portal";
    workbook.created = new Date();

    const ws = workbook.addWorksheet(`Inventory Report - ${month}`, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Column headers
    const columns = [
      { header: "Category", key: "category", width: 20 },
      { header: "Item Name", key: "name", width: 30 },
      { header: "Opening Stock", key: "opening", width: 18 },
      { header: "Total Purchased", key: "purchased", width: 18 },
      { header: "Total Used", key: "used", width: 15 },
      { header: "Remaining Stock", key: "remaining", width: 18 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Unit Cost (INR)", key: "unitCost", width: 16 },
      { header: "Total Value Consumed (INR)", key: "valueConsumed", width: 26 },
    ];

    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12, name: "Inter" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005AC2" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });

    // Group items by category and write rows
    const grouped: Record<string, typeof items> = {};
    items.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    let rowIndex = 2;
    const categoryOrder = ["Groceries", "Perishables", "Dairy", "Beverages", "Condiments", "Other"];

    for (const cat of categoryOrder) {
      const catItems = grouped[cat];
      if (!catItems || !catItems.length) continue;

      // Category header row
      const catRow = ws.getRow(rowIndex);
      catRow.height = 26;
      catRow.getCell(1).value = cat.toUpperCase();
      catRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF005AC2" }, name: "Inter" };
      catRow.getCell(1).alignment = { vertical: "middle" };
      catRow.eachCell((cell, col) => {
        if (col > 1) cell.value = "";
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" } };
      });
      ws.mergeCells(rowIndex, 1, rowIndex, 9);
      rowIndex++;

      let catTotalPurchased = 0;
      let catTotalUsed = 0;
      let catTotalValue = 0;

      for (const item of catItems) {
        const opening = Number(item.opening_stock);
        const purchased = purchaseTotals[item.id]?.qty || 0;
        const used = usageTotals[item.id] || 0;
        const remaining = Number(item.current_stock);
        const unitCost = Number(item.unit_cost);
        const valueConsumed = used * unitCost;

        catTotalPurchased += purchased;
        catTotalUsed += used;
        catTotalValue += valueConsumed;

        const row = ws.getRow(rowIndex);
        row.height = 22;
        row.getCell(1).value = ""; // Category already shown
        row.getCell(2).value = item.name;
        row.getCell(3).value = opening;
        row.getCell(4).value = purchased;
        row.getCell(5).value = used;
        row.getCell(6).value = remaining;
        row.getCell(7).value = item.unit;
        row.getCell(8).value = unitCost;
        row.getCell(9).value = Math.round(valueConsumed * 100) / 100;

        // Format currency columns
        [8, 9].forEach((col) => {
          const cell = row.getCell(col);
          cell.numFmt = '#,##0.00';
        });
        [3, 4, 5, 6].forEach((col) => {
          row.getCell(col).numFmt = '#,##0.00';
        });

        // Color code remaining stock vs alert
        if (item.min_stock_alert > 0 && remaining < Number(item.min_stock_alert)) {
          row.getCell(6).font = { color: { argb: "FFE11D48" }, bold: true }; // Red - low stock
        } else if (remaining > 0) {
          row.getCell(6).font = { color: { argb: "FF10B981" }, bold: true }; // Green - healthy
        }

        // Alternate row shading
        if (rowIndex % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          });
        }

        row.eachCell((cell) => {
          cell.font = { ...cell.font, size: 11, name: "Inter" };
          cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });

        rowIndex++;
      }

      // Category subtotal row
      const subRow = ws.getRow(rowIndex);
      subRow.height = 24;
      subRow.getCell(1).value = "";
      subRow.getCell(2).value = `${cat} Subtotal`;
      subRow.getCell(2).font = { bold: true, italic: true, size: 11, name: "Inter" };
      subRow.getCell(4).value = Math.round(catTotalPurchased * 100) / 100;
      subRow.getCell(4).numFmt = '#,##0.00';
      subRow.getCell(5).value = Math.round(catTotalUsed * 100) / 100;
      subRow.getCell(5).numFmt = '#,##0.00';
      subRow.getCell(9).value = Math.round(catTotalValue * 100) / 100;
      subRow.getCell(9).numFmt = '#,##0.00';
      subRow.eachCell((cell, col) => {
        if ([4, 5, 9].includes(col)) {
          cell.font = { bold: true, size: 11, name: "Inter" };
        }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF94A3B8" } },
        };
        cell.alignment = { vertical: "middle", horizontal: col === 2 ? "left" : "center" };
      });
      ws.mergeCells(rowIndex, 1, rowIndex, 3);
      rowIndex++;
    }

    // Grand total row
    const grandRow = ws.getRow(rowIndex);
    grandRow.height = 28;
    grandRow.getCell(2).value = "GRAND TOTAL";
    grandRow.getCell(2).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" }, name: "Inter" };
    grandRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Inter" };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium" }, bottom: { style: "medium" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });
    // Calculate grand totals
    let grandPurchased = 0, grandUsed = 0, grandValue = 0;
    items.forEach((item) => {
      grandPurchased += purchaseTotals[item.id]?.qty || 0;
      grandUsed += usageTotals[item.id] || 0;
      grandValue += (usageTotals[item.id] || 0) * Number(item.unit_cost);
    });
    grandRow.getCell(4).value = Math.round(grandPurchased * 100) / 100;
    grandRow.getCell(4).numFmt = '#,##0.00';
    grandRow.getCell(5).value = Math.round(grandUsed * 100) / 100;
    grandRow.getCell(5).numFmt = '#,##0.00';
    grandRow.getCell(9).value = Math.round(grandValue * 100) / 100;
    grandRow.getCell(9).numFmt = '#,##0.00';
    ws.mergeCells(rowIndex, 1, rowIndex, 3);

    // Write buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const monthLabel = new Date(month + "-01").toLocaleString("en-US", { month: "long", year: "numeric" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Inventory_Report_${month}.xlsx"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
