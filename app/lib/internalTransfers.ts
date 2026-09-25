import type { Transaction } from "../types";

type AccountLike = { name: string; owner?: string };

const HOUR = 3600 * 1000;

/**
 * Перекази між ВЛАСНИМИ рахунками однієї людини не мають потрапляти в статистику.
 * Шукаємо пари «списання на рахунку A → надходження на рахунку B» одного власника,
 * близькі в часі та за сумою (з урахуванням конвертації), і позначаємо обидві як transfer.
 * Перекази на картки, яких немає в застосунку, або на рахунки іншого учасника бюджету — лишаються.
 */
export function markInternalTransfers<T extends Transaction>(transactions: T[], accounts: AccountLike[]): T[] {
    const ownerOf = new Map(accounts.map((a) => [a.name.trim(), (a.owner || "").trim().toLowerCase()]));
    // Беремо і операції, які банк/імпорт уже позначив як переказ ("transfer"/"exchange"):
    // інакше пари між своїми картками лишались з категорією «Переказ» і двома рядками.
    const eligible = (t: T) =>
        t.kind !== "credit_limit_change" &&
        !!t.bookedAt &&
        !!t.account &&
        ownerOf.has(t.account.trim());

    const ins = transactions
        .filter((t) => eligible(t) && t.amount > 0)
        .map((t) => ({ t, time: Date.parse(t.bookedAt!) }))
        .sort((a, b) => a.time - b.time);
    const outs = transactions.filter((t) => eligible(t) && t.amount < 0);

    const used = new Set<string | number>();
    const internal = new Map<string | number, { title: string; pairId: string; pairRole: "out" | "in" }>();

    for (const o of outs) {
        const oTime = Date.parse(o.bookedAt!);
        const oAcc = o.account!.trim();
        const oOwner = ownerOf.get(oAcc);
        const oCur = o.currency || "UAH";
        let best: T | null = null;
        let bestScore = Infinity;
        for (const { t: i, time } of ins) {
            if (time < oTime - 4 * HOUR) continue;
            if (time > oTime + 96 * HOUR) break;
            if (used.has(i.id)) continue;
            const iAcc = i.account!.trim();
            if (iAcc === oAcc || ownerOf.get(iAcc) !== oOwner) continue;
            const sameCurrency = (i.currency || "UAH") === oCur;
            const dt = Math.abs(time - oTime);
            let diff: number;
            const iCur = i.currency || "UAH";
            if (sameCurrency) {
                if (dt > 36 * HOUR) continue;
                // Списання може містити комісію (₴258,8 = ₴250 + ₴8,8 комісії)
                const gross = Math.abs(o.amount);
                const net = oCur === "UAH" && o.feeAmount ? gross - o.feeAmount : gross;
                diff = Math.min(Math.abs(gross - i.amount), Math.abs(net - i.amount));
                if (diff > 0.01) continue;
            } else if (o.originalCurrency === iCur && o.originalAmount) {
                // Банк уже вказав суму зарахування в чеку (-$6 → чек ₴267,3)
                diff = Math.abs(o.originalAmount - i.amount) / Math.max(i.amount, 1);
                if (diff > 0.01) continue;
            } else if (i.originalCurrency === oCur && i.originalAmount) {
                diff = Math.abs(i.originalAmount - Math.abs(o.amount)) / Math.max(Math.abs(o.amount), 1);
                if (diff > 0.01) continue;
            } else {
                const a = Math.abs(o.baseAmount ?? o.amount),
                    b = Math.abs(i.baseAmount ?? i.amount);
                diff = Math.abs(a - b) / Math.max(a, b, 1);
                if (diff > 0.04) continue;
            }
            const score = dt / HOUR + diff * 100;
            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        }
        if (best) {
            used.add(best.id);
            const title = `${oAcc} → ${best.account!.trim()}`;
            const pairId = `${o.id}~${best.id}`;
            internal.set(o.id, { title, pairId, pairRole: "out" });
            // нога зарахування — з погляду рахунку, куди прийшли гроші: «Біла ← Platinum»
            internal.set(best.id, { title: `${best.account!.trim()} ← ${oAcc}`, pairId, pairRole: "in" });
        }
    }

    if (!internal.size) return transactions;
    return transactions.map((t) =>
        internal.has(t.id) ? { ...t, kind: "transfer", category: "Між своїми рахунками", ...internal.get(t.id)! } : t,
    );
}

/**
 * Переказ без другої ноги в застосунку (людині, на картку поза Rivna):
 *  - якщо поруч є звичайна операція з тією ж сумою на тому ж рахунку (±3 год) — це дубль,
 *    лишаємо як переказ (не рахується) і позначаємо duplicateOf;
 *  - інакше це реальна витрата/надходження — рахуємо в статистиці (категорія «Переказ»).
 */
export function resolveOrphanTransfers<T extends Transaction>(transactions: T[]): T[] {
    const regular = transactions.filter(
        (t) => t.kind !== "transfer" && t.kind !== "exchange" && t.kind !== "credit_limit_change" && t.bookedAt && t.account,
    );
    return transactions.map((t) => {
        if (!t.orphanTransfer || t.pairRole || !t.bookedAt) return t;
        const time = Date.parse(t.bookedAt);
        const twin = regular.find(
            (r) =>
                r.account!.trim() === (t.account || "").trim() &&
                Math.sign(r.amount) === Math.sign(t.amount) &&
                Math.abs(Math.abs(r.amount) - Math.abs(t.amount)) < 0.01 &&
                Math.abs(Date.parse(r.bookedAt!) - time) <= 3 * HOUR,
        );
        if (twin) return { ...t, duplicateOf: twin.id };
        return { ...t, kind: t.amount < 0 ? "expense" : "income", category: t.category || "Переказ" };
    });
}
