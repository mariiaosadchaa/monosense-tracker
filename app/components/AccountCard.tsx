"use client";
import { useState } from "react";
import type { Account, Transaction } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";

function GracePeriodAlert({ accounts }: { accounts: Account[] }) {
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
import { GracePeriodAlert, AccountCard, TransactionList } from "../rivna-app";
export { Dashboard } from "./components/Dashboard";
export { TransactionsView } from "./components/TransactionsView";
export { BudgetView, LiveBudgetView } from "./components/BudgetViews";
export { AccountsView } from "./components/AccountsView";
export { GoalsView } from "./components/GoalsView";
export { AnalyticsView } from "./components/AnalyticsView";
function AnomalyAlerts({
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
function CashflowCalendar({
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
    const [monthOffset, setMonthOffset] = useState(0);
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = viewDate.getFullYear(),
        month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const symbol = currencySymbol(baseCurrency);

    const events = useMemo(() => {
        const map: Record<string, { name: string; amount: number; kind: "income" | "expense" }[]> =
            Object.create(null);
        recurring.forEach((r) => {
            const anchor = new Date(r.next);
            const converted =
                (r.amount * conversionRate(r.currency, rates, customRates)) /
                conversionRate(baseCurrency, rates, customRates);
            const addEvent = (date: Date) => {
                const key = date.toISOString().slice(0, 10);
                if (!map[key]) map[key] = [];
                map[key].push({ name: r.name, amount: converted, kind: r.kind });
            };
            if (r.frequency === "monthly") {
                addEvent(new Date(year, month, Math.min(anchor.getDate(), daysInMonth)));
            } else if (r.frequency === "weekly") {
                const weekday = anchor.getDay();
                for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(year, month, d);
                    if (date.getDay() === weekday) addEvent(date);
                }
            } else if (r.frequency === "yearly" && anchor.getMonth() === month) {
                addEvent(new Date(year, month, Math.min(anchor.getDate(), daysInMonth)));
            }
        });
        return map;
    }, [recurring, rates, customRates, baseCurrency, year, month, daysInMonth]);

    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++)
        cells.push({ date: new Date(year, month, d), key: `d-${d}` });

    let running = balance;
    const runningByDay: Record<string, number> = {};
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const key = date.toISOString().slice(0, 10);
        if (!isCurrentMonth || d >= today.getDate()) {
            const dayEvents = events[key] || [];
            dayEvents.forEach((e) => {
                running += e.kind === "income" ? e.amount : -e.amount;
            });
            running -= avgDailySpend;
            runningByDay[key] = running;
        }
    }

    return (
        <section className="panel full-view">
            <div className="section-title">
                <div>
                    <h2>Календар прогнозу</h2>
                    <p>
                        Регулярні платежі + середні щоденні витрати (₴{formatMoney(avgDailySpend)}/день за
                        останні 30 днів)
                    </p>
                </div>
                <div
                    className="period-nav-row"
                    style={{ gridTemplateColumns: "auto auto auto", width: "auto", display: "flex", gap: 8 }}
                >
                    <button
                        type="button"
                        className="period-nav-btn"
                        onClick={() => setMonthOffset((v) => v - 1)}
                    >
                        ←{" "}
                    </button>
                    <strong style={{ alignSelf: "center", fontSize: 13, textTransform: "capitalize" }}>
                        {new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(viewDate)}
                    </strong>
                    <button
                        type="button"
                        className="period-nav-btn"
                        onClick={() => setMonthOffset((v) => v + 1)}
                    >
                        →
                    </button>
                </div>
            </div>
            <div className="cashflow-grid">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
                    <div key={d} className="cashflow-weekday">
                        {d}
                    </div>
                ))}
                {cells.map((cell) => {
                    if (!cell.date) return <div key={cell.key} className="cashflow-cell empty" />;
                    const key = cell.date.toISOString().slice(0, 10);
                    const dayEvents = events[key] || [];
                    const dayBalance = runningByDay[key];
                    const isPast = isCurrentMonth && cell.date.getDate() < today.getDate();
                    const isDanger = dayBalance !== undefined && dayBalance < 0;
                    return (
                        <div
                            key={cell.key}
                            className={`cashflow-cell${isPast ? " past" : ""}${isDanger ? " danger" : ""}`}
                        >
                            <span className="cashflow-day">{cell.date.getDate()}</span>
                            {dayEvents.map((e, i) => (
                                <div
                                    key={i}
                                    className={e.kind === "income" ? "cashflow-event income" : "cashflow-event"}
                                >
                                    {e.kind === "income" ? "+" : "−"}
                                    {symbol}
                                    {formatMoney(e.amount)}
                                </div>
                            ))}
                            {dayBalance !== undefined && (
                                <div className="cashflow-balance">
                                    {symbol}
                                    {formatMoney(dayBalance)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {Object.values(runningByDay).some((v) => v < 0) && (
                <div className="alert-card">
                    <Bell />
                    <div>
                        <strong>Можливий касовий розрив</strong>
                        <p>В окремі дні цього місяця прогнозований баланс іде в мінус.</p>
                    </div>
                </div>
            )}
        </section>
    );
}
export { DebtsView } from "./components/DebtsView";
export { SettingsView } from "./components/SettingsView";
type SettingsProfile = {
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
type AchievementContext = {
    goals: GoalItem[];
    budgets: BudgetItem[];
    debts: DebtItem[];
    transactions: Transaction[];
    spentByCategory: Record<string, number>;
    oldestTransactionDays: number;
};
function AchievementsPanel({
                               goals,
                               budgets,
                               debts,
                               transactions,
                           }: {
    goals: GoalItem[];
    budgets: BudgetItem[];
    debts: DebtItem[];
    transactions: Transaction[];
}) {
    const ctx = useMemo<AchievementContext>(() => {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const spentByCategory: Record<string, number> = transactions
            .filter(
                (t) =>
                    t.amount < 0 &&
                    t.kind !== "transfer" &&
                    t.kind !== "exchange" &&
                    t.bookedAt?.startsWith(monthKey),
            )
            .reduce(
                (sum, t) => {
                    sum[t.category] = (sum[t.category] || 0) + Math.abs(t.amount);
                    return sum;
                },
                {} as Record<string, number>,
            );
        const monthBudgets = budgets.filter((b) => b.month.startsWith(monthKey));
        const oldest = transactions.reduce((min, t) => {
            if (!t.bookedAt) return min;
            const d = new Date(t.bookedAt).getTime();
            return d < min ? d : min;
        }, Date.now());
        const oldestTransactionDays = Math.floor((Date.now() - oldest) / 86400000);
        return {
            goals,
            budgets: monthBudgets,
            debts,
            transactions,
            spentByCategory,
            oldestTransactionDays,
        };
    }, [goals, budgets, debts, transactions]);
    return (
        <section className="panel">
            <div className="section-title">
                <div>
                    <h2>Досягнення</h2>
                    <p>Твій прогрес у фінансовій дисципліні</p>
                </div>
            </div>
            <div className="achievements-grid">
                {ACHIEVEMENTS.map((a) => {
                    const unlocked = a.check(ctx);
                    const Icon = a.icon;
                    return (
                        <div
                            key={a.id}
                            className={unlocked ? "achievement-badge unlocked" : "achievement-badge"}
                        >
              <span className="achievement-icon">
                <Icon size={20} />
              </span>
                            <strong>{a.label}</strong>
                            <small>{a.desc}</small>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
function RulesPanel({
                        rules,
                        addRule,
                        removeRule,
                    }: {
    rules: RuleItem[];
    addRule: () => void;
    removeRule: (id: string) => void;
}) {
    const conditionLabels: Record<string, string> = {
        amount_gt: "Сума більше",
        amount_lt: "Сума менше",
        no_category: "Без категорії",
        currency_is: "Валюта дорівнює",
        note_contains: "Назва містить",
    };
    const actionLabels: Record<string, string> = {
        set_category: "Встановити категорію",
        contribute_goal_percent: "% доходу в банку",
    };
    return (
        <section className="panel">
            <div className="section-title">
                <div>
                    <h2>Автоматичні правила</h2>
                    <p>Обробка транзакцій за умовами</p>
                </div>
                <button className="small-primary" onClick={addRule}>
                    <Plus /> Правило
                </button>
            </div>
            <div className="category-manager">
                {rules.map((r) => (
                    <div key={r.id}>
                        <span style={{ background: "var(--purple)" }} />
                        <strong>{r.name}</strong>
                        <small>
                            {conditionLabels[r.conditionType] || r.conditionType}
                            {r.conditionValue ? ` ${r.conditionValue}` : ""} →{" "}
                            {actionLabels[r.actionType] || r.actionType}
                        </small>
                        <button onClick={() => removeRule(r.id)}>
                            <Trash2 />
                        </button>
                    </div>
                ))}
                {!rules.length && <p className="empty-inline">Правил ще немає</p>}
            </div>
        </section>
    );
}
function InvestmentSimulator({ goals, baseCurrency }: { goals: GoalItem[]; baseCurrency: string }) {
    const [initial, setInitial] = useState("10000");
    const [monthly, setMonthly] = useState("2000");
    const [rate, setRate] = useState("12");
    const [years, setYears] = useState("5");
    const [linkedGoal, setLinkedGoal] = useState("");
    const symbol = currencySymbol(baseCurrency);
    const points = useMemo(() => {
        const monthlyRate = Number(rate) / 100 / 12;
        const totalMonths = Number(years) * 12;
        let capital = Number(initial) || 0;
        const contributed = Number(initial) || 0;
        let totalContributed = contributed;
        const result: { month: number; capital: number; contributed: number }[] = [
            { month: 0, capital, contributed: totalContributed },
        ];
        for (let m = 1; m <= totalMonths; m++) {
            capital = capital * (1 + monthlyRate) + (Number(monthly) || 0);
            totalContributed += Number(monthly) || 0;
            if (m % Math.max(1, Math.round(totalMonths / 24)) === 0 || m === totalMonths)
                result.push({ month: m, capital, contributed: totalContributed });
        }
        return result;
    }, [initial, monthly, rate, years]);
    const final = points[points.length - 1];
    const profit = final ? final.capital - final.contributed : 0;
    const maxCapital = Math.max(...points.map((p) => p.capital), 1);
    const selectedGoal = goals.find((g) => g.id === linkedGoal);

    return (
        <section className="panel full-view">
            <div className="section-title">
                <div>
                    <h2>Симулятор накопичень</h2>
                    <p>Розрахунок складеного відсотка</p>
                </div>
            </div>
            <div className="wizard-grid sim-fields" style={{ marginBottom: 16 }}>
                <label>
                    Початковий внесок
                    <input
                        type="number"
                        min="0"
                        value={initial}
                        onChange={(e) => setInitial(e.target.value)}
                    />
                </label>
                <label>
                    Щомісячне поповнення
                    <input
                        type="number"
                        min="0"
                        value={monthly}
                        onChange={(e) => setMonthly(e.target.value)}
                    />
                </label>
                <label>
                    % річних
                    <input
                        type="number"
                        min="0"
                        step=".1"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                    />
                </label>
                <label>
                    Термін, роки
                    <input
                        type="number"
                        min="1"
                        max="40"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                    />
                </label>
            </div>
            {goals.length > 0 && (
                <label>
                    Прив'язати до цілі (необов'язково)
                    <select value={linkedGoal} onChange={(e) => setLinkedGoal(e.target.value)}>
                        <option value="">Не прив'язано</option>
                        {goals.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <div className="metric-grid" style={{ marginTop: 16 }}>
                <article className="metric">
                    <small>Підсумковий капітал</small>
                    <strong>
                        {symbol} {formatMoney(final?.capital || 0)}
                    </strong>
                    <span>За {years} р.</span>
                </article>
                <article className="metric">
                    <small>Всього внесено</small>
                    <strong>
                        {symbol} {formatMoney(final?.contributed || 0)}
                    </strong>
                    <span>Твої гроші</span>
                </article>
                <article className="metric">
                    <small>Прибуток від відсотків</small>
                    <strong className="income-amount">
                        {symbol} {formatMoney(profit)}
                    </strong>
                    <span className="positive">Заробили відсотки</span>
                </article>
            </div>
            <div className="monthly-chart" style={{ marginTop: 20 }}>
                {points.map((p, i) => (
                    <div key={i}>
                        <strong>{i === points.length - 1 ? `${symbol}${formatMoney(p.capital)}` : ""}</strong>
                        <span>
              <i style={{ height: `${Math.max(3, (p.capital / maxCapital) * 100)}%` }} />
            </span>
                        <small>{i % 2 === 0 ? `${Math.round((p.month / 12) * 10) / 10}р` : ""}</small>
                    </div>
                ))}
            </div>
            {selectedGoal && (
                <div className="form-message success">
                    При такому темпі ти досягнеш цілі "{selectedGoal.name}" ({symbol}{" "}
                    {formatMoney(selectedGoal.target)}) приблизно за{" "}
                    {(() => {
                        const target = selectedGoal.target;
                        const found = points.find((p) => p.capital >= target);
                        return found
                            ? `${Math.round((found.month / 12) * 10) / 10} років`
                            : `понад ${years} років`;
                    })()}
                    .
                </div>
            )}
        </section>
    );
}
function BigPurchaseSimulator({
                                  balance,
                                  recurring,
                                  rates,
                                  customRates,
                                  baseCurrency,
                                  close,
                              }: {
    balance: number;
    recurring: RecurringItem[];
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    baseCurrency: string;
    close: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const symbol = currencySymbol(baseCurrency);
    const purchaseDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.max(0, Math.round((purchaseDate.getTime() - today.getTime()) / 86400000));
    const monthlyObligations = recurring
        .filter((r) => r.kind === "expense")
        .reduce(
            (sum, r) =>
                sum +
                (r.amount * conversionRate(r.currency, rates, customRates)) /
                conversionRate(baseCurrency, rates, customRates),
            0,
        );
    const monthsUntil = Math.max(0, daysUntil / 30);
    const projectedObligations = monthlyObligations * monthsUntil;
    const balanceAfterPurchase = balance - projectedObligations - (Number(amount) || 0);
    const canAfford = balanceAfterPurchase >= 0;
    const bufferMonths = monthlyObligations > 0 ? balanceAfterPurchase / monthlyObligations : 0;

    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="expense-modal tall-modal" onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Планування" title="Симулятор великої покупки" close={close} />
                <div className="form-two">
                    <label>
                        Сума покупки
                        <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </label>
                    <label>
                        Дата
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                </div>
                <div className="metric-grid" style={{ marginTop: 16 }}>
                    <article className="metric">
                        <small>Баланс станом на дату</small>
                        <strong>
                            {symbol} {formatMoney(balance - projectedObligations)}
                        </strong>
                        <span>До покупки, з урахуванням платежів</span>
                    </article>
                    <article className="metric">
                        <small>Залишок після покупки</small>
                        <strong className={canAfford ? "" : "negative"}>
                            {symbol} {formatMoney(balanceAfterPurchase)}
                        </strong>
                        <span className={canAfford ? "positive" : "negative"}>
              {canAfford ? "Вистачає" : "Може не вистачити"}
            </span>
                    </article>
                    <article className="metric">
                        <small>Запас на обов'язкові платежі</small>
                        <strong>
                            {bufferMonths >= 0 ? `${Math.round(bufferMonths * 10) / 10} міс.` : "—"}
                        </strong>
                        <span>Після покупки</span>
                    </article>
                </div>
                <div className={canAfford ? "form-message success" : "form-message error"}>
                    {canAfford
                        ? `Після покупки на ${symbol}${formatMoney(Number(amount) || 0)} у тебе залишиться ${symbol}${formatMoney(balanceAfterPurchase)} — цього вистачить приблизно на ${Math.max(0, Math.round(bufferMonths * 10) / 10)} місяців обов'язкових платежів.`
                        : `Цієї покупки зараз може не вистачити коштів: бракує ${symbol}${formatMoney(Math.abs(balanceAfterPurchase))} з урахуванням запланованих платежів до ${new Date(date).toLocaleDateString("uk-UA")}.`}
                </div>
            </div>
        </div>
    );
}
function WrappedModal({
                          transactions,
                          goals,
                          baseCurrency,
                          close,
                      }: {
    transactions: Transaction[];
    goals: GoalItem[];
    baseCurrency: string;
    close: () => void;
}) {
    const [cardIndex, setCardIndex] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
    const symbol = currencySymbol(baseCurrency);
    const now = new Date();
    const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(
        now,
    );

    const stats = useMemo(() => {
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthExpenses = transactions.filter(
            (t) =>
                t.amount < 0 &&
                t.kind !== "transfer" &&
                t.kind !== "exchange" &&
                t.bookedAt?.startsWith(monthKey),
        );
        const byCategory: Record<string, number> = {};
        monthExpenses.forEach((t) => {
            byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.baseAmount ?? t.amount);
        });
        const favoriteCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
        const biggestPurchase = monthExpenses.sort(
            (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
        )[0];
        const totalSpent = monthExpenses.reduce(
            (sum, t) => sum + Math.abs(t.baseAmount ?? t.amount),
            0,
        );
        const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
        const transactionCount = monthExpenses.length;
        return { favoriteCategory, biggestPurchase, totalSpent, totalSaved, transactionCount };
    }, [transactions, goals, now]);

    const cards = [
        {
            title: "Твій місяць у rivna",
            subtitle: monthLabel,
            big: `${symbol} ${formatMoney(stats.totalSpent)}`,
            label: "Витрачено загалом",
            color: "#6B2D42",
        },
        {
            title: "Категорія-фаворит",
            subtitle: "Найбільше пішло сюди",
            big: stats.favoriteCategory?.[0] || "—",
            label: stats.favoriteCategory
                ? `${symbol} ${formatMoney(stats.favoriteCategory[1])}`
                : "Ще немає даних",
            color: "#8A6A4A",
        },
        {
            title: "Найбільша покупка",
            subtitle: stats.biggestPurchase?.date || "",
            big: stats.biggestPurchase
                ? `${symbol} ${formatMoney(Math.abs(stats.biggestPurchase.amount))}`
                : "—",
            label: stats.biggestPurchase?.title || "Ще немає даних",
            color: "#3B6D11",
        },
        {
            title: "Відкладено в банки",
            subtitle: "Загальні накопичення",
            big: `${symbol} ${formatMoney(stats.totalSaved)}`,
            label: `${goals.length} ${goals.length === 1 ? "ціль" : "цілей"}`,
            color: "#4C91E8",
        },
        {
            title: "Операцій за місяць",
            subtitle: "Твоя активність",
            big: String(stats.transactionCount),
            label: "записів у rivna",
            color: "#D85A30",
        },
    ];
    const card = cards[cardIndex];

    async function saveAsImage() {
        if (!cardRef.current) return;
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
        const link = document.createElement("a");
        link.download = `rivna-wrapped-${cardIndex + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="wrapped-wrap" onMouseDown={(e) => e.stopPropagation()}>
                <button
                    className="icon-button"
                    style={{ position: "absolute", top: 16, right: 16, color: "#fff", zIndex: 5 }}
                    onClick={close}
                >
                    <X />
                </button>
                <div
                    ref={cardRef}
                    className="wrapped-card"
                    style={{ background: `linear-gradient(150deg,${card.color} 0%,#1a1a1a 100%)` }}
                >
                    <span className="wrapped-brand">rivna</span>
                    <small>{card.subtitle}</small>
                    <h2>{card.title}</h2>
                    <strong>{card.big}</strong>
                    <p>{card.label}</p>
                    <div className="wrapped-dots">
                        {cards.map((_, i) => (
                            <i key={i} className={i === cardIndex ? "active" : ""} />
                        ))}
                    </div>
                </div>
                <div className="wrapped-actions">
                    <button
                        className="period-nav-btn"
                        onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
                        disabled={cardIndex === 0}
                    >
                        ← Назад
                    </button>
                    <button className="secondary" onClick={saveAsImage}>
                        <Download /> Зберегти
                    </button>
                    <button
                        className="period-nav-btn"
                        onClick={() => setCardIndex((i) => Math.min(cards.length - 1, i + 1))}
                        disabled={cardIndex === cards.length - 1}
                    >
                        Вперед →
                    </button>
                </div>
            </div>
        </div>
    );
}
function SettlementPanel({
                             baseCurrency,
                             createDebt,
                         }: {
    baseCurrency: string;
    createDebt: (person: string, amount: number) => void;
}) {
    const [balances, setBalances] = useState<{ person: string; amount: number }[]>([]);
    useEffect(() => {
        fetch("/api/finance/splits")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setBalances(data?.balances || []))
            .catch(() => {});
    }, []);
    const symbol = currencySymbol(baseCurrency);
    if (!balances.length) return null;
    return (
        <section className="panel">
            <div className="section-title">
                <div>
                    <h2>Спільний бюджет цього місяця</h2>
                    <p>Хто скільки має доплатити за розділені чеки</p>
                </div>
            </div>
            <div className="recurring-list">
                {balances.map((b) => (
                    <div key={b.person}>
            <span className="recurring-icon">
              <HandCoins />
            </span>
                        <strong>{b.person}</strong>
                        <small>Спільні витрати цього місяця</small>
                        <b>
                            {symbol} {formatMoney(b.amount)}
                        </b>
                        <button className="small-primary" onClick={() => createDebt(b.person, b.amount)}>
                            Створити борг
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
export { ProfileSettings, MembersPanel, RecategorizePanel, GuideFeedback, AchievementsPanel, RulesPanel } from "./components/SettingsPanels";
function AccountCard({ account }: { account: Account }) {
    const [renderedAt] = useState(() => Date.now()),
        days = account.graceEnd
            ? Math.ceil((new Date(account.graceEnd).getTime() - renderedAt) / 86400000)
            : null;
    const available = (account.balance || 0) + (account.creditLimit || 0);
    const light = isLight(account.color);
    const ink = account.color ? (light ? "#000" : "#fff") : "#fff";
    const muted = account.color ? (light ? "rgba(0,0,0,.6)" : "rgba(255,255,255,.6)") : undefined;
    return (
        <article
            className={`account ${bankStyle(account.bank)}`}
            style={
                account.cardImage
                    ? {
                        backgroundImage: `url(${account.cardImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "#fff",
                    }
                    : account.color
                        ? { background: account.color, color: ink }
                        : undefined
            }
        >
            <div className="card-top">
                <BankMark bank={account.bank} />
                <div className="card-top-right">
                    {days !== null && (
                        <em className={days <= 7 ? "grace urgent" : "grace"}>
                            {days >= 0 ? `${days} дн. грейсу` : "Грейс минув"}
                        </em>
                    )}
                    <span className="card-contactless">
            <Wifi />
          </span>
                </div>
            </div>
            <div className="card-footer" style={{ marginTop: "22px" }}>
                <div>
                    <small style={muted ? { color: muted } : undefined}>Власник</small>
                    <strong>{account.owner || "—"}</strong>
                </div>
                <div className="card-balance">
                    <small style={muted ? { color: muted } : undefined}>Доступно</small>
                    <strong className="card-amount">
                        {currencySymbol(account.currency)} {formatMoney(available)}
                    </strong>
                </div>
            </div>
            {(account.creditLimit || 0) > 0 && (
                <div className="card-credit" style={muted ? { color: muted } : undefined}>
                    Використано: {formatMoney(Math.min(0, account.balance))} з{" "}
                    {formatMoney(account.creditLimit ?? 0)}
                </div>
            )}
            <div className="card-nickname" style={muted ? { color: muted } : undefined}>
                {account.name} · {account.bank}
            </div>
        </article>
    );
}
function BankMark({ bank }: { bank: string }) {
    const value = bank.toLowerCase();
    if (value.includes("mono")) return <span className="bank-logo mono-logo">mono</span>;
    if (value.includes("приват") || value.includes("privat"))
        return <span className="bank-logo privat-logo">П</span>;
    if (value.includes("пумб") || value.includes("pumb"))
        return <span className="bank-logo pumb-logo">ПУМБ</span>;
    if (value.includes("ощад")) return <span className="bank-logo oschad-logo">О</span>;
    if (value.includes("райффайзен") || value.includes("raiffeisen"))
        return <span className="bank-logo raif-logo">RAIFF</span>;
    if (value.includes("а-банк") || value.includes("abank"))
        return <span className="bank-logo abank-logo">А-Банк</span>;
    if (value.includes("сенс") || value.includes("sense"))
        return <span className="bank-logo sense-logo">Sense</span>;
    if (value.includes("укрсиб") || value.includes("ukrsib"))
        return <span className="bank-logo ukrsib-logo">УСБ</span>;
    if (value.includes("отп") || value.includes("otp"))
        return <span className="bank-logo otp-logo">OTP</span>;
    if (value.includes("кредо") || value.includes("kredo"))
        return <span className="bank-logo kredo-logo">Kredo</span>;
    if (value.includes("пайонер") || value.includes("піонер") || value.includes("payoneer"))
        return <span className="bank-logo pioneer-logo">Payoneer</span>;
    if (value.includes("готів"))
        return (
            <span className="bank-icon">
        <Landmark />
      </span>
        );
    return <span className="bank-icon">{bank.slice(0, 1).toUpperCase() || <CreditCard />}</span>;
}
function bankStyle(bank: string, index = 2) {
    const value = bank.toLowerCase();
    if (value.includes("mono")) return "mono";
    if (value.includes("приват") || value.includes("privat")) return "privat";
    if (value.includes("пумб") || value.includes("pumb")) return "pumb";
    if (value.includes("ощад")) return "oschad";
    if (value.includes("райффайзен") || value.includes("raiffeisen")) return "raif";
    if (value.includes("а-банк") || value.includes("abank")) return "abank";
    if (value.includes("сенс") || value.includes("sense")) return "sense";
    if (value.includes("укрсиб") || value.includes("ukrsib")) return "ukrsib";
    if (value.includes("отп") || value.includes("otp")) return "otp";
    if (value.includes("кредо") || value.includes("kredo")) return "kredo";
    if (value.includes("пайонер") || value.includes("піонер") || value.includes("pioneer"))
        return "pioneer";
    return index % 3 === 0 ? "mono" : index % 3 === 1 ? "privat" : "stash";
}
function TransactionList({ transactions }: { transactions: Transaction[] }) {
    return (
        <div className="tx-list">
            {transactions.map((t) => {
                return (
                    <div className="tx" key={t.id}>
          <span
              className={`tx-icon ${t.kind === "credit_limit_change" ? "limit" : t.amount > 0 ? "income" : "shop"}`}
          >
            <MerchantIcon
                title={t.title}
                imgStyle={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain" }}
                fallback={
                    t.kind === "credit_limit_change" ? (
                        <CreditCard />
                    ) : t.amount > 0 ? (
                        <ArrowDownLeft />
                    ) : (
                        <ShoppingBag />
                    )
                }
            />
          </span>
                        <div className="tx-info">
                            <strong>
                                {t.title}
                                {t.impulse && <em>Імпульсивна</em>}
                            </strong>
                            <small>
                                {t.category} · {t.date}
                            </small>
                        </div>
                        <strong className={t.amount > 0 ? "income-amount" : ""}>
                            {t.amount > 0 ? "+" : "−"} {currencySymbol(t.currency || "UAH")} {formatMoney(t.amount)}
                        </strong>
                    </div>
                );
            })}
        </div>
    );
}