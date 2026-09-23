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
    const eligible = (t: T) =>
        t.kind !== "transfer" &&
        t.kind !== "exchange" &&
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
    const internal = new Set<string | number>();

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
            if (sameCurrency) {
                if (dt > 36 * HOUR) continue;
                diff = Math.abs(Math.abs(o.amount) - i.amount);
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
            internal.add(o.id);
            internal.add(best.id);
        }
    }

    if (!internal.size) return transactions;
    return transactions.map((t) =>
        internal.has(t.id) ? { ...t, kind: "transfer", category: "Між своїми рахунками" } : t,
    );
}
