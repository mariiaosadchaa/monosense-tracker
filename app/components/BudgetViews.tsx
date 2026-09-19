"use client";
import { useState } from "react";
import type { Transaction, BudgetItem } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { budgetPeriodBounds } from "../lib/transfers";
import { BudgetIcon } from "../lib/icons";
import {BarChart3, Bell, Plus, Trash2} from "lucide-react";


function BudgetView({
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
function LiveBudgetView({
                            budgets,
                            transactions,
                            periodType,
                            setPeriodType,
                            anchor,
                            setAnchor,
                            baseCurrency,
                            add,
                            remove,
                            rolloverEnabled,
                        }: {
    budgets: BudgetItem[];
    transactions: Transaction[];
    periodType: "month" | "week";
    setPeriodType: (p: "month" | "week") => void;
    anchor: string;
    setAnchor: (iso: string) => void;
    baseCurrency: string;
    add: () => void;
    remove: (id: string) => void;
    rolloverEnabled: boolean;
}) {
    const { periodStart, periodEnd } = budgetPeriodBounds(periodType, anchor);
    const isCurrent = new Date() >= periodStart && new Date() < periodEnd;
    const currentMonthKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

    type DisplayBudget = BudgetItem & { sourceIds: string[] };

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
        if (periodType !== "month")
            return periodBudgets.map((budget) => ({ ...budget, sourceIds: [budget.id] }));
        const realMonthBudgets = periodBudgets.filter((b) => b.period === "month");
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

    return (
        <>
            <div className="period-note">
                <div className="period-toggle">
                    <button
                        type="button"
                        className={periodType === "month" ? "active" : ""}
                        onClick={() => {
                            setPeriodType("month");
                            goToday();
                        }}
                    >
                        Місяць
                    </button>
                    <button
                        type="button"
                        className={periodType === "week" ? "active" : ""}
                        onClick={() => {
                            setPeriodType("week");
                            goToday();
                        }}
                    >
                        Тиждень
                    </button>
                </div>
                <div className="period-label">
                    {rangeLabel}
                    {isCurrent && <em className="period-current">поточний</em>}
                </div>
                <div className="period-nav-row">
                    <button type="button" className="period-nav-btn" onClick={goPrev}>
                        ← Назад
                    </button>
                    {!isCurrent && (
                        <button type="button" className="period-nav-btn today" onClick={goToday}>
                            Сьогодні
                        </button>
                    )}
                    <button type="button" className="period-nav-btn" onClick={goNext}>
                        Вперед →
                    </button>
                </div>
            </div>
            <div className="metric-grid">
                <article className="metric">
                    <small>{planLabel}</small>
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
                    <span className={plan && forecast > plan ? "negative" : "positive"}>
            {!plan
                ? "Додайте перший ліміт"
                : forecast > plan
                    ? "Можливий перерозхід"
                    : "У межах плану"}
          </span>
                </article>
                <article className="metric">
                    <small>Очікувана економія</small>
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
                        <p>{isCurrent ? `Поточний ${periodLabel}` : rangeLabel}</p>
                    </div>
                    <button className="small-primary" onClick={add}>
                        <Plus /> Додати ліміт
                    </button>
                </div>
                {activeBudgets.length ? (
                    <div className="large-budget">
                        <div className="budget-list">
                            {activeBudgets.map((budget) => {
                                const used = spentBy[budget.name] || 0;
                                const percent = Math.round((used / budget.limit) * 100);
                                const isOver = percent >= 100;
                                return (
                                    <div
                                        className={isOver ? "budget-item over-budget" : "budget-item"}
                                        key={budget.id}
                                    >
                                        <button
                                            className="icon-button danger"
                                            onClick={() => {
                                                if (window.confirm("Видалити цей ліміт?"))
                                                    budget.sourceIds.forEach((id) => remove(id));
                                            }}
                                            aria-label="Видалити ліміт"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <span
                                            className="budget-icon"
                                            style={{ color: budget.color, background: `${budget.color}15` }}
                                        >
                      <BudgetIcon name={budget.icon} size={17} />
                    </span>
                                        <strong>{budget.name}</strong>
                                        <span className={isOver ? "budget-amount over" : "budget-amount"}>
                      {symbol} {formatMoney(used)}
                    </span>
                                        <small>
                                            з {formatMoney(budget.limit)}₴ · {percent}%
                                            {budget.sourceIds.length > 1 ? ` · ${budget.sourceIds.length} тиж.` : ""}
                                        </small>
                                        <span>
                      <i
                          style={{
                              width: `${Math.min(100, percent)}%`,
                              background:
                                  percent >= 100 ? "#e05252" : percent >= 80 ? "#f4b740" : budget.color,
                          }}
                      />
                    </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        icon={<BarChart3 />}
                        text={`Лімітів на цей ${periodLabel} ще немає — додай перший через кнопку вище`}
                    />
                )}
                {activeBudgets.some((budget) => (spentBy[budget.name] || 0) / budget.limit >= 0.8) && (
                    <div className="alert-card">
                        <Bell />
                        <div>
                            <strong>Наближення до ліміту</strong>
                            <p>Одна або кілька категорій використані більш ніж на 80%.</p>
                        </div>
                    </div>
                )}
            </section>
            <section className="panel">
                <div className="section-title">
                    <div>
                        <h2>Витрати за категоріями</h2>
                        <p>Розподіл за {periodType === "week" ? "тиждень" : "місяць"}</p>
                    </div>
                </div>
                <div className="category-chart">
                    {Object.entries(spentBy)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, value], index) => (
                            <div key={name}>
                                <span style={{ background: `hsl(${250 - index * 34} 72% ${58 + index * 3}%)` }} />
                                <strong>{name}</strong>
                                <i>
                                    <b style={{ width: `${(value / (Object.values(spentBy)[0] || 1)) * 100}%` }} />
                                </i>
                                <em>{spent ? Math.round((value / spent) * 100) : 0}%</em>
                            </div>
                        ))}
                    {!Object.keys(spentBy).length && (
                        <p className="empty-inline">Додай операції для розподілу за категоріями</p>
                    )}
                </div>
            </section>
        </>
    );
}
