import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.role === "viewer") return NextResponse.json({ error: "Роль глядача дозволяє лише перегляд" }, { status: 403 });
  const { supabase, householdId } = context;

  const body = await request.json();
  const accountId = String(body.accountId || "");
  const rows: { note: string; amount: number; type: string; booked_at: string; category_id?: string | null }[] = body.rows || [];

  if (!accountId) return NextResponse.json({ error: "Не вказано рахунок" }, { status: 422 });
  if (!rows.length) return NextResponse.json({ error: "Немає рядків для імпорту" }, { status: 400 });

  // Verify account belongs to this household
  const { data: account } = await supabase
    .from("accounts").select("id").eq("id", accountId).eq("household_id", householdId).single();
  if (!account) return NextResponse.json({ error: "Рахунок не знайдено" }, { status: 422 });

  const records = rows.map(r => ({
    type: r.type === "income" ? "income" : "expense",
    amount: Math.abs(Number(r.amount)),
    note: String(r.note || "").replace(/\s+/g, " ").trim().slice(0, 500),
    category_id: r.category_id || null,
    booked_at: r.booked_at,
  })).filter(r => Number.isFinite(r.amount) && r.amount > 0);

  const { data: imported, error } = await supabase.rpc("import_finance_transactions", {
    p_account_id: accountId,
    p_rows: records,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: Number(imported) || 0 });
}
