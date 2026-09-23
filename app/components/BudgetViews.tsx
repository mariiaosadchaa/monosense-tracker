"use client";
import { useState } from "react";
import type { Transaction, BudgetItem } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { budgetPeriodBounds } from "../lib/transfers";
import { BudgetIcon } from "../lib/icons";
import { BarChart3, Bell, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "./ScanReceipt";

// Демо-ліміти, коли своїх ще немає
const budgetRows = [
    { name: "Продукти", spent: 6840, limit: 10000, color: "#ff6b55" },
    { name: "Транспорт", spent: 2260, limit: 4000, color: "#6c63ff" },
    { name: "Розваги", spent: 3920, limit: 4500, color: "#f4b740" },
    { name: "Здоров’я", spent: 1180, limit: 3000, color: "#19a974" },
];


export function BudgetView({
                        budgets,
                        transactions,
                        add,
                        baseCurrency,
                        remove,
                    }: {
    budgets: BudgetItem[];
    transactions: Transaction[];
    add: () => void;
    baseCurrency: string;
    remove: (id: number | string) => void;
}) {
    const active = budgets.length
        ? budgets
        : budgetRows.map((b, i) => ({
            id: `d${i}`,
            categoryId: "",
            name: b.name,
            icon: "CircleDollarSign",
            limit: b.limit,
            currency: "UAH",
            month: "2026-07-01",
            period: "month" as const,
            color: b.color,
        }));

    const spentBy = transactions
        .filter((t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange")
        .reduce<Record<string, number>>((a, t) => {
            a[t.category] = (a[t.category] || 0) + Math.abs(t.amount);
            return a;
        }, {});

    const plan = active.reduce((s, b) => s + b.limit, 0);
    const spent = Object.values(spentBy).reduce((s, v) => s + v, 0);
    const day = Math.max(1, new Date().getDate());
    const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const forecast = Math.round((spent / day) * days);
    const symbol = currencySymbol(baseCurrency);

    return (
        <>
            <div className="metric-grid">
                <article className="metric">
                    <small>Місячний план</small>
                    <strong>
                        {symbol} {formatMoney(plan)}
                    </strong>
                    <span>{plan ? Math.round((spent / plan) * 100) : 0}% використано</span>
                </article>
                <article className="metric">
                    <small>Прогноз витрат</small>
                    <strong>
                        {symbol} {formatMoney(forecast)}
                    </strong>
                    <span className={forecast > plan ? "negative" : "positive"}>
            {forecast > plan ? "Можливий перерозхід" : "У межах плану"}
          </span>
                </article>
                <article className="metric">
                    <small>Очікуваний залишок</small>
                    <strong>
                        {symbol} {formatMoney(Math.max(0, plan - forecast))}
                    </strong>
                    <span>За поточного темпу</span>
                </article>
            </div>

            <section className="panel full-view">
                <div className="section-title">
                    <div>
                        <h2>Ліміти за категоріями</h2>
                        <p>Поточний місяць</p>
                    </div>
                    <button className="small-primary" onClick={add}>
                        <Plus /> Додати ліміт
                    </button>
                </div>
                <div className="large-budget">
                    <div className="budget-list">
                        {active.map((b) => {
                            const used = spentBy[b.name] || 0;
                            const pct = Math.round((used / b.limit) * 100);
                            return (
                                <div
                                    className="budget-item"
                                    key={b.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "10px",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        backgroundColor: "#f9f9f9",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                        className="budget-icon"
                        style={{
                            color: b.color,
                            background: `${b.color}15`,
                            marginRight: "10px",
                            padding: "8px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                      <BudgetIcon name={b.icon} />
                    </span>
                                        <div>
                                            <div>
                                                <strong>{b.name}</strong>
                                                <small>
                                                    {symbol} {formatMoney(used)} / {formatMoney(b.limit)} · {pct}%
                                                </small>
                                            </div>
                                            <span>
                        <i
                            style={{
                                width: `${Math.min(100, pct)}%`,
                                background: pct >= 100 ? "#e05252" : pct >= 80 ? "#f4b740" : b.color,
                                display: "block",
                                height: "4px",
                            }}
                        />
                      </span>
                                        </div>
                                    </div>
                                    {/* Кнопка видалення */}
                                    <button
                                        onClick={() => {
                                            if (confirm("Ви впевнені, що хочете видалити цей ліміт?")) {
                                                remove(b.id);
                                            }
                                        }}
                                        className="icon-button danger"
                                        aria-label="Видалити ліміт"
                                        style={{ marginLeft: "10px" }}
                                    >
                                        <Trash2 />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {active.some((b) => (spentBy[b.name] || 0) / b.limit >= 0.8) && (
                    <div className="alert-card">
                        <Bell />
                        <div>
                            <strong>Наближення до ліміту</strong>
                            <p>Одна або кілька категорій використані більш ніж на 80%.</p>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}
export function LiveBudgetView({
                            budgets,
                            transactions,
                            periodType,
                            setPeriodType,
                            anchor,
                            setAnchor,
                            baseCurrency,
                            add,
                            remove,
                            update,
                            createFrom,
                            rolloverEnabled,
                        }: {
    budgets: BudgetItem[];
    transactions: Transaction[];
    periodType: "month" | "week";
    setPeriodType: (p: "month" | "week") => void;
    anchor: string;
    setAnchor: (iso: string) => void;
    baseCurrency: string;
    add: (categoryName?: string) => void;
    remove: (id: string) => void;
    update: (id: string, limitAmount: number) => void;
    createFrom: (budget: BudgetItem, limitAmount: number) => void;
    rolloverEnabled: boolean;
}) {
    const { periodStart, periodEnd } = budgetPeriodBounds(periodType, anchor);
    const isCurrent = new Date() >= periodStart && new Date() < periodEnd;
    const currentMonthKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

    type DisplayBudget = BudgetItem & { sourceIds: string[]; baseLimit?: number };
    const [editing, setEditing] = useState<DisplayBudget | null>(null);
    const [draft, setDraft] = useState("");

    // Ліміт діє з місяця створення і далі, доки для категорії не задано новий
    const monthBudgetsFor = (monthKey: string): BudgetItem[] => {
        const latest: Record<string, BudgetItem> = {};
        budgets
            .filter((b) => b.period === "month" && b.month <= monthKey)
            .forEach((b) => {
                const key = b.categoryId || b.name;
                if (!latest[key] || b.month > latest[key].month) latest[key] = b;
            });
        return Object.values(latest).map((b) =>
            b.month === monthKey ? b : { ...b, id: `inh-${b.id}`, month: monthKey },
        );
    };

    const periodTransactions = transactions.filter((t) => {
        if (!t.bookedAt) return isCurrent;
        const date = new Date(t.bookedAt);
        return date >= periodStart && date < periodEnd;
    });

    const periodBudgets = budgets.filter((b) => {
        if (periodType === "week") {
            if (b.period !== "week") return false;
            const budgetDate = new Date(`${b.month}T00:00:00`);
            return budgetDate >= periodStart && budgetDate < periodEnd;
        }
        const budgetDate = new Date(`${b.month}T00:00:00`);
        return (
            (b.period === "month" && b.month === `${currentMonthKey}-01`) ||
            (b.period === "week" && budgetDate >= periodStart && budgetDate < periodEnd)
        );
    });

    const activeBudgets: DisplayBudget[] = (() => {
        if (periodType !== "month") {
            const weekOnes: DisplayBudget[] = periodBudgets.map((budget) => ({ ...budget, sourceIds: [budget.id] }));
            const covered = new Set(weekOnes.map((b) => b.categoryId || b.name));
            // Місячні ліміти без окремого тижневого — ділимо пропорційно дням тижня
            const derived: Record<string, DisplayBudget> = {};
            for (let d = new Date(periodStart); d < periodEnd; d.setDate(d.getDate() + 1)) {
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
                const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                monthBudgetsFor(monthKey)
                    .filter((b) => !covered.has(b.categoryId || b.name))
                    .forEach((b) => {
                        const key = b.categoryId || b.name;
                        if (!derived[key])
                            derived[key] = { ...b, id: `wk-${key}`, period: "week", limit: 0, sourceIds: [] };
                        derived[key].limit += b.limit / daysInMonth;
                    });
            }
            Object.values(derived).forEach((b) => (b.limit = Math.round(b.limit)));
            return [...weekOnes, ...Object.values(derived)];
        }
        const realMonthBudgets = monthBudgetsFor(`${currentMonthKey}-01`);
        const coveredCategories = new Set(realMonthBudgets.map((b) => b.categoryId || b.name));
        const weekBudgetsToAggregate = periodBudgets.filter(
            (b) => b.period === "week" && !coveredCategories.has(b.categoryId || b.name),
        );
        const aggregated = Object.values(
            weekBudgetsToAggregate.reduce<Record<string, DisplayBudget>>((map, budget) => {
                const key = budget.categoryId || budget.name;
                if (!map[key]) {
                    map[key] = {
                        ...budget,
                        id: `agg-${currentMonthKey}-${key}`,
                        period: "month",
                        sourceIds: [budget.id],
                    };
                    map[key].limit = 0;
                } else {
                    map[key].sourceIds.push(budget.id);
                }
                map[key].limit += budget.limit;
                return map;
            }, {}),
        );
        return [...realMonthBudgets.map((b) => ({ ...b, sourceIds: [b.id] })), ...aggregated];
    })();
    activeBudgets.forEach((b) => (b.baseLimit = b.limit));
    if (periodType === "month" && rolloverEnabled) {
        const prevMonthDate = new Date(periodStart.getFullYear(), periodStart.getMonth() - 1, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
        const prevPeriodStart = prevMonthDate;
        const prevPeriodEnd = periodStart;
        activeBudgets.forEach((budget) => {
            const prevBudget = budgets.find(
                (b) => b.categoryId === budget.categoryId && b.period === "month" && b.month === `${prevMonthKey}-01`,
            );
            if (!prevBudget) return;
            const prevSpent = transactions
                .filter((t) => {
                    if (t.category !== budget.name || t.amount >= 0 || t.kind === "transfer" || t.kind === "exchange")
                        return false;
                    if (!t.bookedAt) return false;
                    const date = new Date(t.bookedAt);
                    return date >= prevPeriodStart && date < prevPeriodEnd;
                })
                .reduce((sum, t) => sum + Math.abs(t.baseAmount ?? t.amount), 0);
            const leftover = prevBudget.limit - prevSpent;
            budget.limit = Math.max(0, budget.limit + leftover);
        });
    }
    const spentBy = periodTransactions
        .filter((t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange")
        .reduce<Record<string, number>>((sum, t) => {
            sum[t.category] = (sum[t.category] || 0) + Math.abs(t.baseAmount ?? t.amount);
            return sum;
        }, {});

    const plan = activeBudgets.reduce((sum, b) => sum + b.limit, 0);
    const spent = Object.values(spentBy).reduce((sum, v) => sum + v, 0);
    const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000);
    const elapsedDays = isCurrent
        ? Math.min(totalDays, Math.floor((Date.now() - periodStart.getTime()) / 86400000) + 1)
        : totalDays;
    const forecast = Math.round((spent / Math.max(1, elapsedDays)) * totalDays);
    const periodLabel = periodType === "week" ? "тиждень" : "місяць";
    const planLabel = periodType === "week" ? "Тижневий план" : "Місячний план";
    const symbol = currencySymbol(baseCurrency);
    const periodEndInclusive = new Date(periodEnd.getTime() - 86400000);
    const rangeLabel =
        periodType === "week"
            ? `${periodStart.getDate()} – ${periodEndInclusive.getDate()} ${new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(periodStart)} ${periodStart.getFullYear()}`
            : new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(periodStart);

    const goNext = () => setAnchor(toDateKey(periodEnd));
    const goPrev = () => {
        const d = new Date(periodStart);
        d.setDate(d.getDate() - 1);
        setAnchor(toDateKey(d));
    };
    const goToday = () => setAnchor(toDateKey(new Date()));

    const remaining = plan - spent;
    const daysLeft = isCurrent ? Math.max(1, totalDays - elapsedDays + 1) : 0;
    const perDay = isCurrent && remaining > 0 ? Math.floor(remaining / daysLeft) : 0;
    const ratio = plan ? Math.min(1, spent / plan) : 0;
    const R = 74,
        C = 2 * Math.PI * R;
    const ringColor = !plan ? "var(--line)" : spent > plan ? "#e05252" : forecast > plan ? "#f4b740" : "var(--purple)";
    const budgetNames = new Set(activeBudgets.map((b) => b.name));
    const unbudgeted = Object.entries(spentBy)
        .filter(([name]) => !budgetNames.has(name))
        .sort((a, b) => b[1] - a[1]);

    const openEdit = (b: DisplayBudget) => {
        setEditing(b);
        setDraft(String(b.baseLimit));
    };
    const saveEdit = () => {
        const value = Number(draft);
        if (!editing || !(value > 0)) return;
        if (editing.id.startsWith("inh-")) createFrom(editing, value);
        else update(editing.id, value);
        setEditing(null);
    };

    return (
        <div className="lim">
            <div className="lim-head">
                <button type="button" className="lim-arrow" onClick={goPrev} aria-label="Попередній період">
                    <ChevronLeft size={18} />
                </button>
                <button type="button" className="lim-period" onClick={goToday} title="До поточного періоду">
                    <b>{rangeLabel}</b>
                    <small>{isCurrent ? "поточний" : "повернутись до поточного"}</small>
                </button>
                <button type="button" className="lim-arrow" onClick={goNext} aria-label="Наступний період">
                    <ChevronRight size={18} />
                </button>
            </div>
            <div className="lim-seg">
                {(["month", "week"] as const).map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={periodType === p ? "on" : ""}
                        onClick={() => {
                            setPeriodType(p);
                            goToday();
                        }}
                    >
                        {p === "month" ? "Місяць" : "Тиждень"}
                    </button>
                ))}
            </div>

            <section className="lim-card lim-hero">
                <div className="lim-ring">
                    <svg width="170" height="170" viewBox="0 0 170 170">
                        <circle cx="85" cy="85" r={R} className="lim-track" />
                        <circle
                            cx="85"
                            cy="85"
                            r={R}
                            className="lim-fill"
                            style={{ stroke: ringColor, strokeDasharray: C, strokeDashoffset: C * (1 - ratio) }}
                        />
                    </svg>
                    <div className="lim-ring-c">
                        <small>{remaining >= 0 ? "Лишилось" : "Перевищено"}</small>
                        <strong className={remaining < 0 ? "bad" : ""}>
                            {formatMoney(Math.abs(remaining))} {symbol}
                        </strong>
                        {perDay > 0 && (
                            <em>
                                ~{formatMoney(perDay)} {symbol} / день
                            </em>
                        )}
                    </div>
                </div>
                <p className="lim-sub">
                    {plan ? (
                        <>
                            Витрачено {formatMoney(spent)} з {formatMoney(plan)} {symbol}
                            {isCurrent && (
                                <>
                                    {" · "}
                                    <span className={forecast > plan ? "bad" : "ok"}>
                                        прогноз {formatMoney(forecast)} {symbol} {forecast > plan ? "⚠" : "✓"}
                                    </span>
                                </>
                            )}
                        </>
                    ) : (
                        "Додай перший ліміт, щоб бачити залишок"
                    )}
                </p>
            </section>

            {activeBudgets.length > 0 && (
                <section className="lim-card lim-list">
                    {activeBudgets
                        .map((b) => ({ b, used: spentBy[b.name] || 0 }))
                        .sort((x, y) => y.used / y.b.limit - x.used / x.b.limit)
                        .map(({ b, used }) => {
                            const percent = Math.round((used / b.limit) * 100);
                            const left = b.limit - used;
                            const barColor = percent >= 100 ? "#e05252" : percent >= 80 ? "#f4b740" : b.color;
                            const aggregated = b.sourceIds.length > 1 || b.id.startsWith("agg-");
                            return (
                                <button
                                    type="button"
                                    key={b.id}
                                    className="lim-row"
                                    onClick={() => openEdit(b)}
                                >
                                    <span className="lim-ic" style={{ color: b.color, background: `${b.color}1f` }}>
                                        <BudgetIcon name={b.icon} size={17} />
                                    </span>
                                    <b>{b.name}</b>
                                    <span className={left < 0 ? "lim-left bad" : "lim-left"}>
                                        {left < 0
                                            ? `+${formatMoney(-left)} ${symbol} понад`
                                            : `лишилось ${formatMoney(left)} ${symbol}`}
                                    </span>
                                    <span className="lim-bar">
                                        <i style={{ width: `${Math.min(100, percent)}%`, background: barColor }} />
                                    </span>
                                    <span className="lim-meta">
                                        <span>
                                            {formatMoney(used)} з {formatMoney(b.limit)}
                                            {aggregated ? ` · ${b.sourceIds.length} тиж.` : ""}
                                            {b.id.startsWith("wk-") ? " · з місячного" : ""}
                                        </span>
                                        <span>{percent}%</span>
                                    </span>
                                </button>
                            );
                        })}
                </section>
            )}

            <button type="button" className="lim-add" onClick={() => add()}>
                <Plus size={16} /> Додати ліміт
            </button>

            {unbudgeted.length > 0 && (
                <div className="lim-nolim">
                    <small>Без ліміту за цей {periodLabel}:</small>
                    <div>
                        {unbudgeted.map(([name, value]) => (
                            <button type="button" key={name} onClick={() => add(name)}>
                                {name} <b>{formatMoney(value)} {symbol}</b> <Plus size={12} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {editing && (
                <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
                    <form
                        className="expense-modal lim-edit"
                        onMouseDown={(e) => e.stopPropagation()}
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveEdit();
                        }}
                    >
                        <div className="lim-edit-head">
                            <span className="lim-ic" style={{ color: editing.color, background: `${editing.color}1f` }}>
                                <BudgetIcon name={editing.icon} size={17} />
                            </span>
                            <b>{editing.name}</b>
                            <button type="button" className="lim-x" onClick={() => setEditing(null)} aria-label="Закрити">
                                <X size={18} />
                            </button>
                        </div>
                        {editing.id.startsWith("wk-") ? (
                            <p className="lim-note">
                                Це частина місячного ліміту, поділеного на тижні. Щоб змінити суму, перейди на
                                вкладку «Місяць».
                            </p>
                        ) : editing.sourceIds.length > 1 || editing.id.startsWith("agg-") ? (
                            <p className="lim-note">
                                Це сума тижневих лімітів. Щоб змінити суму, перейди на вкладку «Тиждень».
                            </p>
                        ) : (
                            <label>
                                Ліміт на {periodLabel}, {symbol}
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    autoFocus
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                />
                                {editing.id.startsWith("inh-") && (
                                    <small className="lim-note">
                                        Ліміт повторено з попереднього місяця. Нова сума діятиме з цього місяця і далі.
                                    </small>
                                )}
                                {rolloverEnabled && editing.limit !== editing.baseLimit && (
                                    <small className="lim-note">
                                        З перенесенням залишку: {formatMoney(editing.limit)} {symbol}
                                    </small>
                                )}
                            </label>
                        )}
                        {!editing.id.startsWith("wk-") && (
                        <div className="lim-edit-actions">
                            {editing.id.startsWith("inh-") ? <span /> : <button
                                type="button"
                                className="lim-del"
                                onClick={() => {
                                    if (window.confirm("Видалити цей ліміт?")) {
                                        editing.sourceIds.forEach((id) => remove(id));
                                        setEditing(null);
                                    }
                                }}
                            >
                                <Trash2 size={15} /> Видалити
                            </button>}
                            {!(editing.sourceIds.length > 1 || editing.id.startsWith("agg-")) && (
                                <button type="submit" className="small-primary">
                                    Зберегти
                                </button>
                            )}
                        </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
