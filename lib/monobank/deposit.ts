import type { SupabaseClient } from "@supabase/supabase-js";

export const isDepositOpening = (description?: string, amountKop?: number) =>
    /відкриття\s+депозит/i.test(description || "") && (amountKop ?? 0) < 0;

/** «Відкриття депозиту» в Monobank → ціль-депозит у накопиченнях. */
export async function createDepositGoal(
    admin: SupabaseClient,
    p: { householdId: string; userId: string; amountKop: number; currency: string; accountId?: string | null; time: number },
) {
    const amount = Math.abs(p.amountKop) / 100;
    const date = new Date(p.time * 1000).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
    const { error } = await admin.from("goals").insert({
        household_id: p.householdId,
        created_by: p.userId,
        name: `Депозит · ${date}`,
        target_amount: amount,
        current_amount: amount,
        currency: p.currency,
        color: "#B8935A",
        asset_type: "deposit",
        source_account_id: p.accountId || null,
    });
    if (error) console.error("createDepositGoal:", error.message);
}
