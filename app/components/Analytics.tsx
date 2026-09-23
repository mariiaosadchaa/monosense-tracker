"use client";
import { useState, useMemo } from "react";
import type { Account, Transaction, RecurringItem, GoalItem, BudgetItem, DebtItem } from "../types";
import { formatMoney, currencySymbol, conversionRate } from "../lib/format";
import { PiggyBank, Check, BarChart3, HandCoins, Sparkles, Target, Bell } from "lucide-react";


export function GracePeriodAlert({ accounts }: { accounts: Account[] }) {
    const now = Date.now();
    const upcoming = accounts.filter((a) => {
        if (!a.graceEnd) return false;
        const days = Math.ceil((new Date(a.graceEnd).getTime() - now) / 86400000);
        return days >= 0 && days <= 7;
    });
    if (!upcoming.length) return null;
    return (
        <div className="grace-alert-row">
            {upcoming.map((a) => {
                const days = Math.ceil((new Date(a.graceEnd!).getTime() - now) / 86400000);
                return (
                    <div key={a.id} className={days <= 2 ? "grace-alert urgent" : "grace-alert"}>
                        <span className="grace-alert-icon">⏳</span>
                        <div>
                            <strong>{a.name}: до погашення пільгового періоду {days} дн.</strong>
                            {a.graceBalance ? (
                                <small>
                                    Сума: {currencySymbol(a.currency)} {formatMoney(a.graceBalance)}
                                </small>
                            ) : (
                                <small>Вкажи пільговий баланс у рахунку, щоб бачити суму</small>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
export  function AnomalyAlerts({
                           transactions,
                           baseCurrency,
                       }: {
    transactions: Transaction[];
    baseCurrency: string;
}) {
    const symbol = currencySymbol(baseCurrency);
    const anomalies = useMemo(() => {
        const now = new Date();
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - 7);
        const historyStart = new Date(now);
        historyStart.setDate(now.getDate() - 56);
        const expenses = transactions.filter(
            (t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange" && t.bookedAt,
        );
        const byCategory: Record<string, { recent: number; history: number[] }> = {};
        expenses.forEach((t) => {
            const date = new Date(t.bookedAt!);
            const amount = Math.abs(t.baseAmount ?? t.amount);
            if (!byCategory[t.category]) byCategory[t.category] = { recent: 0, history: [] };
            if (date >= thisWeekStart) byCategory[t.category].recent += amount;
            else if (date >= historyStart) byCategory[t.category].history.push(amount);
        });
        const results: { category: string; recent: number; avg: number; percent: number }[] = [];
        Object.entries(byCategory).forEach(([category, data]) => {
            if (data.recent <= 0) return;
            const weeksOfHistory = 7;
            const avgWeekly = data.history.reduce((s, v) => s + v, 0) / weeksOfHistory;
            if (avgWeekly <= 0) return;
            const percent = Math.round(((data.recent - avgWeekly) / avgWeekly) * 100);
            if (percent >= 30) results.push({ category, recent: data.recent, avg: avgWeekly, percent });
        });
        return results.sort((a, b) => b.percent - a.percent);
    }, [transactions]);
    if (!anomalies.length) return null;
    return (
        <section className="panel">
            <div className="section-title">
                <div>
                    <h2>Незвичні витрати</h2>
                    <p>Порівняно зі звичним темпом за останні 8 тижнів</p>
                </div>
            </div>
            <div className="anomaly-list">
                {anomalies.map((a) => (
                    <div key={a.category} className="anomaly-item">
            <span className="anomaly-icon">
              <Sparkles size={14} />
            </span>
                        <div>
                            <strong>{a.category}</strong>
                            <small>
                                Зазвичай {symbol}
                                {formatMoney(a.avg)}/тиждень
                            </small>
                        </div>
                        <b className="negative">+{a.percent}%</b>
                    </div>
                ))}
            </div>
        </section>
    );
}
export function CashflowCalendar({
                              balance,
                              recurring,
                              transactions,
                              rates,
                              customRates,
                              baseCurrency,
                          }: {
    balance: number;
    recurring: RecurringItem[];
    transactions: Transaction[];
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    baseCurrency: string;
}) {
    const avgDailySpend = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const recent = transactions.filter(
            (t) =>
                t.amount < 0 &&
                t.kind !== "transfer" &&
                t.kind !== "exchange" &&
                t.bookedAt &&
                new Date(t.bookedAt) >= cutoff,
        );
        const total = recent.reduce((sum, t) => sum + Math.abs(t.baseAmount ?? t.amount), 0);
        return total / 30;
    }, [transactions]);
    // Прогноз до кінця поточного місяця або до кінця наступного
    const [range, setRange] = useState<"month" | "next">("month");
    const horizon = (() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        const end = new Date(t.getFullYear(), t.getMonth() + (range === "month" ? 1 : 2), 1);
        return Math.round((end.getTime() - t.getTime()) / 86400000);
    })();
    const endLabel = (() => {
        const t = new Date();
        const last = new Date(t.getFullYear(), t.getMonth() + (range === "month" ? 1 : 2), 0);
        return last.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
    })();
    const symbol = currencySymbol(baseCurrency);
    const toBase = (amount: number, currency: string) =>
        (amount * conversionRate(currency, rates, customRates)) / conversionRate(baseCurrency, rates, customRates);

    const { events, days, endBalance, minPoint, incomeSum, expenseSum } = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + horizon);
        const list: { date: Date; name: string; amount: number; kind: "income" | "expense" }[] = [];
        recurring.forEach((r) => {
            const anchor = new Date(r.next);
            const amount = toBase(r.amount, r.currency);
            const push = (d: Date) => {
                if (d >= start && d < end) list.push({ date: d, name: r.name, amount, kind: r.kind });
            };
            if (r.frequency === "weekly") {
                const d = new Date(start);
                d.setDate(d.getDate() + ((anchor.getDay() - d.getDay() + 7) % 7));
                for (; d < end; d.setDate(d.getDate() + 7)) push(new Date(d));
            } else if (r.frequency === "yearly") {
                for (const y of [start.getFullYear(), start.getFullYear() + 1])
                    push(new Date(y, anchor.getMonth(), anchor.getDate()));
            } else {
                for (let m = 0; m <= Math.ceil(horizon / 28); m++) {
                    const y = start.getFullYear(),
                        mo = start.getMonth() + m;
                    const dim = new Date(y, mo + 1, 0).getDate();
                    push(new Date(y, mo, Math.min(anchor.getDate(), dim)));
                }
            }
        });
        list.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Баланс по днях: події дня + середні щоденні витрати
        let running = balance;
        let min = { value: balance, date: start };
        const dayList: { date: Date; balance: number }[] = [];
        for (let i = 0; i < horizon; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            list.filter((e) => e.date.getTime() === d.getTime()).forEach((e) => {
                running += e.kind === "income" ? e.amount : -e.amount;
            });
            running -= avgDailySpend;
            dayList.push({ date: d, balance: running });
            if (running < min.value) min = { value: running, date: d };
        }
        const withBalance = list.map((e) => ({
            ...e,
            after: dayList.find((x) => x.date.getTime() === e.date.getTime())?.balance ?? running,
        }));
        return {
            events: withBalance,
            days: dayList,
            endBalance: running,
            minPoint: min,
            incomeSum: list.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0),
            expenseSum: list.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recurring, rates, customRates, baseCurrency, balance, avgDailySpend, horizon]);

    const money = (v: number) => `${v < 0 ? "−" : ""}${formatMoney(v)} ${symbol}`;
    const fmtDay = (d: Date) => d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
    const dailyTotal = avgDailySpend * horizon;

    // Мініграфік балансу
    const W = 600,
        H = 70;
    const values = [balance, ...days.map((d) => d.balance)];
    const maxV = Math.max(...values, 0),
        minV = Math.min(...values, 0);
    const y = (v: number) => H - ((v - minV) / (maxV - minV || 1)) * H;
    const path = values.map((v, i) => `${i ? "L" : "M"}${(i / (values.length - 1)) * W},${y(v)}`).join(" ");

    return (
        <section className="panel full-view cf">
            <div className="section-title">
                <div>
                    <h2>Прогноз балансу</h2>
                    <p>Скільки грошей буде, якщо витрачати як зазвичай</p>
                </div>
                <div className="cf-seg">
                    {([
                        ["month", "Цей місяць"],
                        ["next", "+ наступний"],
                    ] as const).map(([key, label]) => (
                        <button key={key} type="button" className={range === key ? "on" : ""} onClick={() => setRange(key)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="cf-summary">
                <div>
                    <small>Зараз</small>
                    <strong className={balance < 0 ? "neg" : ""}>{money(balance)}</strong>
                </div>
                <div className="cf-ops">
                    <span className="pos">+ {formatMoney(incomeSum)} доходи</span>
                    <span>− {formatMoney(expenseSum)} платежі</span>
                    <span>− {formatMoney(dailyTotal)} щоденні витрати</span>
                    <em>~{formatMoney(avgDailySpend)} {symbol}/день, як за останні 30 днів</em>
                </div>
                <div>
                    <small>На {endLabel}</small>
                    <strong className={endBalance < 0 ? "neg" : "pos"}>{money(endBalance)}</strong>
                </div>
            </div>

            <svg className="cf-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
                {minV < 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="cf-zero" />}
                <path d={path} className={minPoint.value < 0 ? "cf-line neg" : "cf-line"} />
            </svg>

            {minPoint.value < 0 && (
                <div className="cf-alert">
                    <Bell size={16} />
                    <span>
                        {balance < 0 ? "Баланс уже в мінусі" : `Гроші можуть закінчитись ~${fmtDay(days.find((d) => d.balance < 0)!.date)}`}
                        . Найнижча точка — <b>{money(minPoint.value)}</b> ({fmtDay(minPoint.date)}).
                    </span>
                </div>
            )}

            <div className="cf-list">
                <small className="cf-list-title">Заплановані події</small>
                {events.length ? (
                    events.map((e, i) => (
                        <div key={i} className="cf-row">
                            <span className="cf-date">{fmtDay(e.date)}</span>
                            <span className="cf-name">{e.name}</span>
                            <span className={e.kind === "income" ? "cf-amt pos" : "cf-amt"}>
                                {e.kind === "income" ? "+" : "−"}
                                {formatMoney(e.amount)} {symbol}
                            </span>
                            <span className={e.after < 0 ? "cf-after neg" : "cf-after"}>після: {money(e.after)}</span>
                        </div>
                    ))
                ) : (
                    <p className="empty-inline">Регулярних платежів чи доходів у цей період немає</p>
                )}
            </div>
        </section>
    );
}
export type SettingsProfile = {
    name: string;
    email: string;
    baseCurrency: string;
    planningPeriod: "month" | "week";
    householdName: string;
    telegramChatId: string;
    recurringReminders: boolean;
    budget80: boolean;
    budget100: boolean;
    role: string;
    digestEnabled?: boolean;
    digestFrequency?: "weekly" | "monthly";
    digestEmailEnabled?: boolean;
};
const ACHIEVEMENTS = [
    {
        id: "first-goal",
        label: "Перша банка",
        desc: "Створи фінансову ціль",
        icon: PiggyBank,
        check: (ctx: AchievementContext) => ctx.goals.length > 0,
    },
    {
        id: "goal-closed",
        label: "Ціль досягнута",
        desc: "Накопич повну суму хоча б однієї цілі",
        icon: Check,
        check: (ctx: AchievementContext) => ctx.goals.some((g) => g.current >= g.target),
    },
    {
        id: "budget-master",
        label: "Місяць без перевищень",
        desc: "Не перевищуй жоден ліміт бюджету за місяць",
        icon: BarChart3,
        check: (ctx: AchievementContext) =>
            ctx.budgets.length > 0 &&
            ctx.budgets.every((b) => {
                const spent = ctx.spentByCategory[b.name] || 0;
                return spent <= b.limit;
            }),
    },
    {
        id: "debt-free",
        label: "Без боргів",
        desc: "Закрий усі свої борги",
        icon: HandCoins,
        check: (ctx: AchievementContext) =>
            ctx.debts.length > 0 && ctx.debts.every((d) => d.direction === "owed_to_me"),
    },
    {
        id: "streak-10",
        label: "10 операцій",
        desc: "Додай 10 операцій в застосунку",
        icon: Sparkles,
        check: (ctx: AchievementContext) => ctx.transactions.length >= 10,
    },
    {
        id: "tracker",
        label: "Місяць з rivna",
        desc: "Користуйся застосунком місяць поспіль",
        icon: Target,
        check: (ctx: AchievementContext) => ctx.oldestTransactionDays >= 30,
    },
];
export type AchievementContext = {
    goals: GoalItem[];
    budgets: BudgetItem[];
    debts: DebtItem[];
    transactions: Transaction[];
    spentByCategory: Record<string, number>;
    oldestTransactionDays: number;
};
