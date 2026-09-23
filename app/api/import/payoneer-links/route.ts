import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { fxFeeUah } from "@/lib/nbu";

// Імпорт виводів Payoneer як переказів: створює списання на рахунку Payoneer,
// зв'язує його з уже наявним зарахуванням (Моно) і пише комісію в окреме поле.
export async function POST(request: Request) {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (context.role === "viewer") return NextResponse.json({ error: "Роль глядача дозволяє лише перегляд" }, { status: 403 });
    const { householdId } = context;
    const admin = createAdminClient();

    const body = await request.json().catch(() => ({}));
    const accountId = String(body.accountId || "");
    const links: { note: string; amount: number; booked_at: string; matchedTxId: string; existingFromTxId?: string }[] = Array.isArray(body.links) ? body.links : [];
    if (!accountId || !links.length) return NextResponse.json({ error: "Немає даних для імпорту" }, { status: 400 });

    const { data: source } = await admin.from("accounts").select("id,currency").eq("id", accountId).eq("household_id", householdId).maybeSingle();
    if (!source) return NextResponse.json({ error: "Рахунок не знайдено" }, { status: 422 });

    let linked = 0;
    const errors: string[] = [];
    for (const link of links) {
        const sent = Math.abs(Number(link.amount));
        if (!(sent > 0) || !link.matchedTxId) continue;

        const { data: target } = await admin.from("transactions")
            .select("id,account_id,amount,currency,type")
            .eq("id", link.matchedTxId).eq("household_id", householdId).maybeSingle();

        // Переказ уже створила синхронізація Монобанку: виправляємо суму списання з Payoneer і пишемо комісію
        if (link.existingFromTxId && target) {
            const { data: fromTx } = await admin.from("transactions")
                .select("id,account_id,amount").eq("id", link.existingFromTxId).eq("household_id", householdId).maybeSingle();
            if (!fromTx || String(fromTx.account_id) !== String(source.id)) { errors.push(`${link.note}: переказ не знайдено`); continue; }
            const received = Number(target.amount);
            const fee = await fxFeeUah({
                sentAmount: sent, sentCurrency: source.currency,
                receivedAmount: received, receivedCurrency: target.currency,
                date: link.booked_at || new Date().toISOString(),
            });
            const delta = Number(fromTx.amount) - sent; // списання збільшилось → баланс зменшується
            await admin.from("transactions").update({
                amount: sent, fee_amount: fee, original_amount: received, original_currency: target.currency,
            }).eq("id", fromTx.id);
            if (Math.abs(delta) >= 0.01) {
                const { data: acc } = await admin.from("accounts").select("balance").eq("id", source.id).maybeSingle();
                if (acc) await admin.from("accounts").update({ balance: Number(acc.balance) + delta }).eq("id", source.id);
            }
            await admin.from("transfers").update({
                sent_amount: sent,
                exchange_rate: sent > 0 ? Math.round((received / sent) * 1000000) / 1000000 : 1,
            }).eq("from_transaction_id", fromTx.id);
            linked++;
            continue;
        }
        if (!target || target.type !== "income") { errors.push(`${link.note}: зарахування вже зв'язане або не знайдене`); continue; }
        if (String(target.account_id) === String(source.id)) continue;

        const { data: existingLink } = await admin.from("transfers").select("id").eq("to_transaction_id", target.id).maybeSingle();
        if (existingLink) continue;

        const { data: outTx, error: outErr } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: context.user.id,
            p_account_id: source.id,
            p_category_id: null,
            p_type: "expense",
            p_amount: sent,
            p_currency: source.currency,
            p_note: String(link.note || "Payoneer").slice(0, 500),
            p_booked_at: link.booked_at || new Date().toISOString(),
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (outErr || !outTx?.id) { errors.push(`${link.note}: ${outErr?.message || "не створено"}`); continue; }

        const received = Number(target.amount);
        const sameCurrency = String(source.currency) === String(target.currency);
        const moveType = sameCurrency ? "transfer" : "exchange";
        const fee = await fxFeeUah({
            sentAmount: sent, sentCurrency: source.currency,
            receivedAmount: received, receivedCurrency: target.currency,
            date: link.booked_at || new Date().toISOString(),
        });

        await admin.from("transactions").update({
            type: moveType,
            fee_amount: fee,
            original_amount: received,
            original_currency: target.currency,
        }).eq("id", outTx.id);
        await admin.from("transactions").update({ type: moveType }).eq("id", target.id);
        const { error: trErr } = await admin.from("transfers").insert({
            household_id: householdId,
            from_account_id: source.id,
            to_account_id: target.account_id,
            from_transaction_id: outTx.id,
            to_transaction_id: target.id,
            sent_amount: sent,
            received_amount: received,
            exchange_rate: sent > 0 ? Math.round((received / sent) * 1000000) / 1000000 : 1,
            fee_amount: 0,
            fee_currency: null,
            booked_at: link.booked_at || new Date().toISOString(),
        });
        if (trErr) errors.push(`${link.note}: ${trErr.message}`);
        linked++;
    }
    return NextResponse.json({ linked, errors });
}
