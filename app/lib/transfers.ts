import type { Transaction } from "../types";

export type OfflineQueueItem = { id: string; payload: Record<string, unknown>; createdAt: number };

export function getOfflineQueue(): OfflineQueueItem[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem("rivna-offline-queue") || "[]");
    } catch {
        return [];
    }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]) {
    localStorage.setItem("rivna-offline-queue", JSON.stringify(queue));
}

export function addToOfflineQueue(payload: Record<string, unknown>) {
    const queue = getOfflineQueue();
    queue.push({
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        payload,
        createdAt: Date.now(),
    });
    saveOfflineQueue(queue);
}

export function mergeTransferPairs(transactions: Transaction[], transfers: any[] = []): Transaction[] {
    const result: Transaction[] = [];
    const processed = new Set<string | number>();

    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        if (processed.has(t.id)) continue;

        // Шукаємо парну транзакцію (інший рахунок, протилежний знак суми, та сама дата та абсолютне значення)
        const pairIndex = transactions.findIndex(
            (other, j) =>
                i !== j &&
                !processed.has(other.id) &&
                Math.abs(t.amount) === Math.abs(other.amount) &&
                t.account !== other.account &&
                ((t.amount < 0 && other.amount > 0) || (t.amount > 0 && other.amount < 0)) &&
                t.date === other.date
        );

        if (pairIndex !== -1) {
            const pair = transactions[pairIndex];
            processed.add(t.id);
            processed.add(pair.id);

            // Визначаємо, яка з транзакцій була списанням, а яка — поповненням
            const outgoing = t.amount < 0 ? t : pair;
            const incoming = t.amount < 0 ? pair : t;

            result.push({
                ...outgoing,
                title: `${outgoing.account} → ${incoming.account}`,
                category: outgoing.category || "Переказ",
                kind: "transfer",
                amount: -Math.abs(outgoing.amount), // Фіксуємо від'ємне значення для відображення списання
            });
        } else {
            result.push(t);
        }
    }

    return result;
}

export function evaluateExpression(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed || !/^[0-9+\-*/.,\s()]+$/.test(trimmed)) return null;
    if (!/[+\-*/]/.test(trimmed)) return null;
    try {
        const normalized = trimmed.replace(/,/g, ".");
        const result = Function(`"use strict";return(${normalized})`)();
        if (typeof result === "number" && Number.isFinite(result) && result > 0)
            return Math.round(result * 100) / 100;
        return null;
    } catch {
        return null;
    }
}

export function budgetPeriodBounds(periodType: "month" | "week", anchorIso: string) {
    const anchor = new Date(`${anchorIso}T00:00:00`);
    if (periodType === "week") {
        const weekIndex = Math.floor((anchor.getDate() - 1) / 7);
        const periodStart = new Date(anchor.getFullYear(), anchor.getMonth(), weekIndex * 7 + 1);
        const nextMonthStart = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
        const naturalEnd = new Date(anchor.getFullYear(), anchor.getMonth(), weekIndex * 7 + 8);
        const periodEnd = naturalEnd < nextMonthStart ? naturalEnd : nextMonthStart;
        return { periodStart, periodEnd };
    }
    const periodStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const periodEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { periodStart, periodEnd };
}

export const isLight = (hex: string | undefined) => {
    if (typeof hex !== "string" || hex.length < 7) return false;
    const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};