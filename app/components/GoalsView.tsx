"use client";
import type React from "react";
import type { GoalItem, RecurringItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { ASSET_TYPE_ICONS, ASSET_TYPE_LABELS } from "./AccountsView";
import {ArrowUpRight, BarChart3, PiggyBank, Plus, Settings, Trash2} from "lucide-react";


const DAY = 86_400_000;
function plural(n: number, one: string, few: string, many: string) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
}
/** Для депозитів/облігацій — час до кінця терміну; для банок — сума до цілі. */
function goalProgress(g: GoalItem): { left: string; right?: string; percent: number | null } {
    const symbol = currencySymbol(g.currency);
    const isTerm = Boolean(g.assetType && g.assetType !== "savings");
    if (isTerm) {
        if (!g.date) return { left: "Без дати завершення", percent: null };
        const end = new Date(g.date).getTime();
        const start = g.createdAt ? new Date(g.createdAt).getTime() : end - 365 * DAY;
        const now = Date.now();
        const daysLeft = Math.ceil((end - now) / DAY);
        const endLabel = new Date(g.date).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" });
        const percent = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100;
        if (daysLeft <= 0) return { left: `Завершено ${endLabel}`, right: "✓", percent: 100 };
        const left = daysLeft >= 60
            ? `${Math.round(daysLeft / 30.44)} ${plural(Math.round(daysLeft / 30.44), "місяць", "місяці", "місяців")}`
            : `${daysLeft} ${plural(daysLeft, "день", "дні", "днів")}`;
        let right = `до ${endLabel}`;
        if (g.annualRate && g.current > 0) {
            const years = daysLeft / 365;
            const r = g.annualRate / 100;
            const profit = g.compoundInterest ? g.current * (Math.pow(1 + r / 12, years * 12) - 1) : g.current * r * years;
            right = `+${symbol} ${formatMoney(Math.round(profit * 100) / 100)} до кінця`;
        }
        return { left: `Залишилось ${left}`, right, percent };
    }
    if (!g.target || g.target <= 0) return { left: "Без цільової суми", percent: null };
    const rest = Math.max(0, g.target - g.current);
    const percent = Math.min(100, (g.current / g.target) * 100);
    if (rest === 0) return { left: `Ціль ${symbol} ${formatMoney(g.target)} досягнуто`, right: "🎉", percent: 100 };
    return { left: `Ще ${symbol} ${formatMoney(rest)} до ${symbol} ${formatMoney(g.target)}`, right: `${Math.floor(percent)}%`, percent };
}

export function GoalsView({
                       goals,
                       authenticated,
                       add,
                       edit,
                       openAction
                   }: {
    goals: GoalItem[];
    authenticated: boolean;
    add: () => void;
    contribute: (id: string, amount: number, accountId: string) => void;
    recurring: RecurringItem[];
    addRecurring: () => void;
    edit: (goal: GoalItem) => void;
    openAction: (goal: GoalItem, mode: "withdraw" | "break" | "history" | "contribute") => void;
}) {
    const shown = goals.length
        ? goals
        : authenticated
            ? []
            : [
                {
                    id: "demo1",
                    name: "Резервний фонд",
                    target: 200000,
                    current: 120000,
                    currency: "UAH",
                    color: "#6558E8"
                },
                {
                    id: "demo2",
                    name: "Подорож до Японії",
                    target: 150000,
                    current: 38500,
                    currency: "UAH",
                    color: "#159B70"
                },
            ];
    const isEmpty = authenticated && !goals.length;
    return (
        <>
            <section className="panel full-view goals-panel">
                <div className="section-title">
                    <div>
                        <h2>Фінансові цілі</h2>
                        <p>Накопичення, депозити та цінні папери</p>
                    </div>
                    {!isEmpty && (
                        <button className="small-primary" onClick={add}>
                            <Plus /> Нова ціль
                        </button>
                    )}
                </div>
                {isEmpty && (
                    <div className="goals-empty">
            <span className="empty-state-icon">
              <PiggyBank />
            </span>
                        <p>У тебе ще немає фінансових цілей — створи першу банку, щоб почати накопичувати</p>
                        <button className="round-add-btn" onClick={add} aria-label="Нова ціль">
                            <Plus />
                        </button>
                    </div>
                )}
                {!isEmpty && (
                    <div className="goals-grid">
                        {shown.map((g, idx) => {
                            const symbol = currencySymbol(g.currency);
                            const AssetIcon = ASSET_TYPE_ICONS[g.assetType || "savings"] || PiggyBank;
                            const p = goalProgress(g);
                            return (
                                <article className="goal-card" key={g.id} style={{ "--i": idx } as React.CSSProperties}>
                                    <div className="goal-card-top">
                                        <span className="goal-icon">
                                            <AssetIcon size={18} />
                                        </span>
                                        <div className="goal-card-head">
                                            <h3 className="goal-card-title">{g.name}</h3>
                                            <small className="goal-card-label">
                                                {g.assetType && g.assetType !== "savings"
                                                    ? ASSET_TYPE_LABELS[g.assetType]
                                                    : "Банка"}
                                                {g.annualRate
                                                    ? ` · ${g.annualRate}% річних${g.compoundInterest ? " · кап." : ""}`
                                                    : ""}
                                            </small>
                                        </div>
                                    </div>
                                    <strong className="goal-card-amount">
                                        {symbol} {formatMoney(g.current)}
                                    </strong>
                                    <div className="goal-progress">
                                        <div className="goal-progress-text">
                                            <span>{p.left}</span>
                                            {p.right && <b>{p.right}</b>}
                                        </div>
                                        {p.percent !== null && (
                                            <div className="goal-card-bar">
                                                <i style={{ width: `${p.percent}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="goal-actions-row">
                                        <button
                                            className="goal-action-main"
                                            onClick={() => openAction(g, "contribute")}
                                        >
                                            <Plus size={15} /> Поповнити
                                        </button>
                                        <button className="goal-action-btn" onClick={() => openAction(g, "withdraw")} title="Зняти" aria-label="Зняти">
                                            <ArrowUpRight size={15} />
                                        </button>
                                        <button className="goal-action-btn" onClick={() => openAction(g, "history")} title="Історія" aria-label="Історія">
                                            <BarChart3 size={15} />
                                        </button>
                                        <button className="goal-action-btn" onClick={() => edit(g)} title="Налаштування" aria-label="Налаштування">
                                            <Settings size={15} />
                                        </button>
                                        <button className="goal-action-btn danger" onClick={() => openAction(g, "break")} title="Розбити банку" aria-label="Розбити банку">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}
