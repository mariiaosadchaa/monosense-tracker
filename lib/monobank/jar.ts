import type { SupabaseClient } from "@supabase/supabase-js";

const JAR_RE = /(поповнення\s+банки|на\s+банку|зняття\s+(?:з\s+)?банки|виплата\s+банки|з\s+банки|округлення\s+(?:балансу|залишку))/i;

/**
 * Операція Monobank з банкою → назва банки. Null, якщо це не банка.
 * «Поповнення банки «Відпустка»» → «Відпустка»; «Округлення залишку» → «Округлення залишку».
 */
export function parseJarName(description?: string | null): string | null {
    const text = String(description || "").replace(/\s+/g, " ").trim();
    const m = JAR_RE.exec(text);
    if (!m) return null;
    const quoted = /[«"“„']([^»"”'“]{1,80})[»"”']/.exec(text);
    if (quoted?.[1]?.trim()) return quoted[1].trim();
    const rest = text.slice((m.index ?? 0) + m[0].length).replace(/^[\s:—–\-·,]+/, "").trim();
    if (rest && rest.length <= 60) return rest;
    if (/округлення/i.test(m[0])) return "Округлення залишку";
    return "Банка";
}

/**
 * Рух по банці з картки: списання з картки = поповнення банки, зарахування на картку = зняття з банки.
 * Якщо банки з такою назвою ще немає в «Накопиченнях» — створюємо. Помилки не ламають синхронізацію.
 */
export async function applyJarMovement(
    db: SupabaseClient,
    p: { householdId: string; userId?: string | null; description?: string | null; amount: number; currency: string; accountId?: string | null },
) {
    const name = parseJarName(p.description);
    const amount = Math.abs(Number(p.amount) || 0);
    if (!name || !amount) return null;
    const toJar = p.amount < 0;
    try {
        // Банку підключено як окремий рахунок (синхронізація Монобанку) — ціль не дублюємо
        const { data: sameAccount } = await db.from("accounts").select("id").eq("household_id", p.householdId)
            .eq("archived", false).ilike("name", name).limit(1);
        if (sameAccount?.length) return null;
        const { data: goals } = await db.from("goals").select("id,name,current_amount,target_amount,currency")
            .eq("household_id", p.householdId);
        const key = name.toLowerCase();
        let goal = (goals || []).find((g) => String(g.name).trim().toLowerCase() === key);
        if (!goal) {
            const { data, error } = await db.from("goals").insert({
                household_id: p.householdId,
                created_by: p.userId || null,
                name: name.slice(0, 100),
                target_amount: Math.max(1000, Math.ceil(amount / 1000) * 1000),
                current_amount: 0,
                currency: p.currency || "UAH",
                color: "#B8935A",
                asset_type: "savings",
                source_account_id: p.accountId || null,
            }).select("id,name,current_amount,target_amount,currency").single();
            if (error || !data) { console.error("applyJarMovement create:", error?.message); return null; }
            goal = data;
        }
        const current = Number(goal.current_amount) || 0;
        const next = Math.max(0, current + (toJar ? amount : -amount));
        const target = Math.max(Number(goal.target_amount) || 0, next);
        await db.from("goals").update({ current_amount: next, target_amount: target }).eq("id", goal.id).eq("household_id", p.householdId);
        await db.from("goal_transactions").insert({
            goal_id: goal.id, household_id: p.householdId, amount: toJar ? amount : -amount,
            kind: toJar ? "contribution" : "withdrawal", note: String(p.description || name).slice(0, 200), created_by: p.userId || null,
        });
        return goal.id as string;
    } catch (err) {
        console.error("applyJarMovement:", err);
        return null;
    }
}
