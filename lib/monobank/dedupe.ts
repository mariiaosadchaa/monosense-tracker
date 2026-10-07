import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Шукає операцію, додану вручну / регулярним платежем, яка відповідає запису з банку:
 * той самий рахунок і тип, сума з допуском ~0,5% (мін. ₴0,5), різниця в часі до ±2 діб,
 * і яка ще не прив'язана до жодного запису Monobank.
 */
export async function findPossibleDuplicate(
    admin: SupabaseClient,
    p: { accountId: string; amount: number; type: "expense" | "income"; timeSec: number },
): Promise<{ id: string } | null> {
    const tol = Math.max(0.5, p.amount * 0.005);
    const t = p.timeSec * 1000;
    const window = 2 * 24 * 60 * 60 * 1000;
    const { data: candidates, error } = await admin
        .from("transactions")
        .select("id,amount,booked_at")
        .eq("account_id", p.accountId)
        .eq("type", p.type)
        .gte("amount", p.amount - tol)
        .lte("amount", p.amount + tol)
        .gte("booked_at", new Date(t - window).toISOString())
        .lte("booked_at", new Date(t + window).toISOString());
    if (error || !candidates?.length) return null;

    const { data: used } = await admin
        .from("monobank_synced_items")
        .select("transaction_id")
        .in("transaction_id", candidates.map((c) => c.id));
    const usedIds = new Set((used || []).map((u) => String(u.transaction_id)));

    const best = candidates
        .filter((c) => !usedIds.has(String(c.id)))
        .sort(
            (a, b) =>
                Math.abs(Number(a.amount) - p.amount) - Math.abs(Number(b.amount) - p.amount) ||
                Math.abs(new Date(a.booked_at).getTime() - t) - Math.abs(new Date(b.booked_at).getTime() - t),
        )[0];
    return best ? { id: String(best.id) } : null;
}
