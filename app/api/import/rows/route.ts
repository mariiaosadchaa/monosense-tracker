import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";
import { applyJarMovement } from "@/lib/monobank/jar";

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.role === "viewer") return NextResponse.json({ error: "Роль глядача дозволяє лише перегляд" }, { status: 403 });
  const { supabase, householdId, user } = context;

  const body = await request.json();
  const accountId = String(body.accountId || "");
  const rows: { note: string; amount: number; type: string; booked_at: string; category_id?: string | null }[] = body.rows || [];

  if (!accountId) return NextResponse.json({ error: "Не вказано рахунок" }, { status: 422 });
  if (!rows.length && body.setBalance == null) return NextResponse.json({ error: "Немає рядків для імпорту" }, { status: 400 });

  // Verify account belongs to this household
  const { data: account } = await supabase
    .from("accounts").select("id,currency").eq("id", accountId).eq("household_id", householdId).single();
  if (!account) return NextResponse.json({ error: "Рахунок не знайдено" }, { status: 422 });

  const records = rows.map(r => ({
    type: r.type === "income" ? "income" : "expense",
    amount: Math.abs(Number(r.amount)),
    note: String(r.note || "").replace(/\s+/g, " ").trim().slice(0, 500),
    category_id: r.category_id || null,
    booked_at: r.booked_at,
  })).filter(r => Number.isFinite(r.amount) && r.amount > 0);

  // Рядкам без категорії підбираємо її автоматично (Gemini)
  const { data: cats } = await supabase.from("categories").select("id,name,kind").eq("household_id", householdId);
  const missing = records.map((r, i) => ({ r, i })).filter(({ r }) => !r.category_id);
  if (missing.length && cats?.length) {
    const names = await categorizeMonobankItems(
      missing.map(({ r, i }) => ({ id: String(i), description: r.note, type: r.type as "income" | "expense" })),
      cats
    );
    for (const { r, i } of missing) {
      const name = (names[String(i)] || "").toLowerCase();
      const cat = cats.find((c) => c.kind === r.type && c.name.toLowerCase() === name);
      if (cat) r.category_id = cat.id;
    }
  }

  const { data: imported, error } = await supabase.rpc("import_finance_transactions", {
    p_account_id: accountId,
    p_rows: records,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Операції з банками («Поповнення банки …», «Округлення залишку») → банка в «Накопиченнях»
  for (const r of records) {
    await applyJarMovement(supabase, {
      householdId, userId: user.id, description: r.note,
      amount: r.type === "income" ? r.amount : -r.amount,
      currency: account.currency || "UAH", accountId,
    });
  }

  // Звірка з випискою: встановлюємо баланс, який має бути за залишком банку
  let balance: number | undefined;
  if (body.setBalance != null && Number.isFinite(Number(body.setBalance))) {
    balance = Math.round(Number(body.setBalance) * 100) / 100;
    await supabase.from("accounts").update({ balance, updated_at: new Date().toISOString() })
      .eq("id", accountId).eq("household_id", householdId);
  }
  return NextResponse.json({ imported: Number(imported) || 0, balance });
}
