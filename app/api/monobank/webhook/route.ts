import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";
import { mccCategoryCandidates } from "@/lib/monobank/mcc";
import { monoItemFee } from "@/lib/monobank/fee";

export async function POST(request: Request) {
  let payload: { type?: string; data?: { account?: string; statementItem?: { id: string; time: number; description?: string; amount: number; mcc?: number; operationAmount?: number; currencyCode?: number; commissionRate?: number } } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (payload.type !== "StatementItem" || !payload.data?.statementItem || !payload.data.account) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const item = payload.data.statementItem;
  const monoAccountId = payload.data.account;

// було: SELECT-перевірка, потім пізніше insert
  const { error: lockError } = await admin
      .from("monobank_synced_items")
      .insert({ statement_item_id: item.id, transaction_id: null });
  if (lockError) return NextResponse.json({ ok: true }); // вже обробляється/оброблено

  const { data: link } = await admin
      .from("monobank_account_links")
      .select("app_account_id,household_id")
      .eq("mono_account_id", monoAccountId)
      .maybeSingle();
  if (!link) return NextResponse.json({ ok: true });

  const { data: account } = await admin.from("accounts").select("id,currency").eq("id", link.app_account_id).maybeSingle();
  if (!account) return NextResponse.json({ ok: true });

  const { data: connection } = await admin
      .from("monobank_connections")
      .select("connected_by")
      .eq("household_id", link.household_id)
      .maybeSingle();
  if (!connection?.connected_by) return NextResponse.json({ ok: true });

  const { data: categories } = await admin
      .from("categories")
      .select("id,name,kind")
      .eq("household_id", link.household_id);

  const amount = item.amount / 100;
  const type = amount < 0 ? "expense" : "income";

  // Check learned note_contains rules first
  const { data: learnedRules } = await admin
      .from("transaction_rules")
      .select("condition_value,action_category_id")
      .eq("household_id", link.household_id)
      .eq("condition_type", "note_contains")
      .eq("active", true);

  const salaryCategoryId = type === "income" && /універсал\s*банк|universal\s*bank|universalbank/i.test(item.description || "")
      ? ((categories || []).find((c) => c.name === "Зарплата" && c.kind === "income")
          || (categories || []).find((c) => c.kind === "income" && /^зарплата/i.test(c.name)))?.id || null
      : null;

  const jarCategoryId = /(зняття\s+(з\s+)?банки|виплата\s+банки|поповнення\s+банки|на\s+банку|з\s+банки)/i.test(item.description || "")
      ? (categories || []).find((c) => c.name === "Переказ" && c.kind === type)?.id
        || (categories || []).find((c) => c.name === "Переказ")?.id || null
      : null;

  const learnedCategoryId = salaryCategoryId || jarCategoryId || (learnedRules || []).find(
      (r) => (item.description || "").toLowerCase().replace(/\s+/g, " ").trim().includes(String(r.condition_value || "").toLowerCase().replace(/\s+/g, " ").trim())
  )?.action_category_id || null;

  const mccCategoryId = !learnedCategoryId
      ? (categories || []).find(
      (c) => c.kind === type && mccCategoryCandidates(item.mcc).some((n) => c.name.toLowerCase() === n.toLowerCase())
  )?.id || null
      : null;

  const categoryNameByItemId = (learnedCategoryId || mccCategoryId)
      ? {}
      : await categorizeMonobankItems(
          [{ id: item.id, description: item.description || "", type }],
          categories || []
      );
  const categoryName = categoryNameByItemId[item.id];
  const category = learnedCategoryId
      ? { id: learnedCategoryId }
      : mccCategoryId
          ? { id: mccCategoryId }
          : (categories || []).find(
              (c) => c.kind === type && c.name.toLowerCase() === (categoryName || "").toLowerCase()
          );

  const { data: transaction } = await admin.rpc("create_finance_transaction_admin", {
    p_user_id: connection.connected_by,
    p_account_id: account.id,
    p_category_id: category?.id || null,
    p_type: type,
    p_amount: Math.abs(amount),
    p_currency: account.currency,
    p_note: item.description || "Monobank",
    p_booked_at: new Date(item.time * 1000).toISOString(),
    p_is_impulsive: false,
    p_split_total: null,
    p_personal_share: null,
  });

  const feeInfo = await monoItemFee(item, account.currency);
  if (feeInfo && transaction?.id) {
    await admin.from("transactions").update({
      fee_amount: feeInfo.feeUah,
      original_amount: feeInfo.originalAmount,
      original_currency: feeInfo.originalCurrency,
    }).eq("id", transaction.id);
  }

  await admin
      .from("monobank_synced_items")
      .update({ transaction_id: transaction?.id || null })
      .eq("statement_item_id", item.id);
  await admin
      .from("monobank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("household_id", link.household_id);

  return NextResponse.json({ ok: true });
}