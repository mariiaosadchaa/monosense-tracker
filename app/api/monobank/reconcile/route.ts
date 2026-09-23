import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";

type MonoItem = { id: string; time: number; description?: string; amount: number; balance: number };
type Status = "ok" | "missing" | "shared" | "wrong_account" | "amount_mismatch";

// Звірка однієї картки: виписка Монобанку ↔ операції в застосунку.
// repair: true — знімає позначку «вже завантажено» з відсутніх/склеєних операцій,
// щоб наступне оновлення картки їх довантажило.
export async function POST(request: Request) {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const monoAccountId = String(body.monoAccountId || "");
    const days = Math.min(31, Math.max(1, Number(body.days) || 31));
    if (!monoAccountId) return NextResponse.json({ error: "Не вказано картку" }, { status: 400 });

    const admin = createAdminClient();
    const { data: connection } = await admin.from("monobank_connections")
        .select("token").eq("household_id", context.householdId).maybeSingle();
    if (!connection?.token) return NextResponse.json({ error: "Monobank не підключено" }, { status: 400 });
    const { data: link } = await admin.from("monobank_account_links")
        .select("app_account_id").eq("household_id", context.householdId).eq("mono_account_id", monoAccountId).maybeSingle();
    if (!link) return NextResponse.json({ error: "Картку не прив'язано" }, { status: 400 });
    const { data: account } = await admin.from("accounts")
        .select("id,name,currency,balance").eq("id", link.app_account_id).maybeSingle();

    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 3600;
    const res = await fetch(`https://api.monobank.ua/personal/statement/${monoAccountId}/${from}/${to}`, {
        headers: { "X-Token": connection.token },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
            { error: res.status === 429 ? "Монобанк дозволяє 1 запит на хвилину — спробуй за хвилину" : `Monobank: ${text.slice(0, 150)}` },
            { status: 502 }
        );
    }
    const items = (await res.json()) as MonoItem[];

    const ids = items.map((i) => i.id);
    const { data: synced } = ids.length
        ? await admin.from("monobank_synced_items").select("statement_item_id,transaction_id").in("statement_item_id", ids)
        : { data: [] as { statement_item_id: string; transaction_id: string | null }[] };
    const txIdByItem = new Map((synced || []).map((r) => [r.statement_item_id, r.transaction_id]));
    const txIds = Array.from(new Set((synced || []).map((r) => r.transaction_id).filter(Boolean))) as string[];
    const { data: txRows } = txIds.length
        ? await admin.from("transactions").select("id,account_id,amount,note,type").in("id", txIds)
        : { data: [] as { id: string; account_id: string; amount: number; note: string | null; type: string }[] };
    const txById = new Map((txRows || []).map((t) => [t.id, t]));
    // Скільки операцій Монобанку вказують на ту саму операцію застосунку
    const usage = new Map<string, number>();
    for (const r of synced || []) if (r.transaction_id) usage.set(r.transaction_id, (usage.get(r.transaction_id) || 0) + 1);

    const result = items
        .sort((a, b) => b.time - a.time)
        .map((item) => {
            const amount = item.amount / 100;
            const txId = txIdByItem.get(item.id);
            const tx = txId ? txById.get(txId) : undefined;
            let status: Status = "ok";
            if (!txId || !tx) status = "missing";
            else if ((usage.get(txId) || 0) > 1) status = "shared";
            else if (String(tx.account_id) !== String(link.app_account_id)) status = "wrong_account";
            else if (Math.abs(Number(tx.amount) - Math.abs(amount)) > 0.01) status = "amount_mismatch";
            return {
                id: item.id,
                time: new Date(item.time * 1000).toISOString(),
                description: item.description || "",
                amount,
                status,
                appNote: tx?.note || null,
            };
        });

    // Для «склеєних» лишаємо одну операцію Монобанку на операцію застосунку, решту довантажимо окремо
    const keptForTx = new Set<string>();
    const problems = result.filter((r) => {
        if (r.status === "missing") return true;
        if (r.status !== "shared") return false;
        const txId = txIdByItem.get(r.id) as string;
        if (!keptForTx.has(txId)) { keptForTx.add(txId); return false; }
        return true;
    });
    if (body.repair && problems.length) {
        await admin.from("monobank_synced_items").delete().in("statement_item_id", problems.map((p) => p.id));
    }

    return NextResponse.json({
        account: account?.name || "",
        currency: account?.currency || "",
        monoBalance: items.length ? [...items].sort((a, b) => b.time - a.time)[0].balance / 100 : null,
        appBalance: account ? Number(account.balance) : null,
        total: result.length,
        okCount: result.filter((r) => r.status === "ok").length,
        items: result.filter((r) => r.status !== "ok"),
        repaired: body.repair ? problems.length : 0,
    });
}
