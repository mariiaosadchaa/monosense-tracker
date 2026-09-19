"use client";
import { useMemo, useState } from "react";
import type { Transaction, RecurringItem, CategoryItem } from "../types";
import { formatMoney, currencySymbol, conversionRate } from "../lib/format";
import {ArrowDownLeft, Sparkles} from "lucide-react";

function AnalyticsView({
                           transactions,
                           baseCurrency,
                           recurring,
                           balance,
                           rates,
                           customRates,
                           categories,
                       }: {
    transactions: Transaction[];
    baseCurrency: string;
    recurring: RecurringItem[];
    balance: number;
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    categories: CategoryItem[];
}) {
    const plannedIncomeItems = recurring.filter((r) => r.kind === "income");
    const [period, setPeriod] = useState<"month" | "week">("month"),
        [renderedAt] = useState(() => Date.now()),
        now = new Date(renderedAt);
    const weekStart = (date: Date) => {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
        return result;
    };
    const buckets =
        period === "month"
            ? Array.from({ length: 6 }, (_, index) => {
                const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1),
                    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
                return {
                    key: start.toISOString(),
                    start,
                    end,
                    label: new Intl.DateTimeFormat("uk-UA", { month: "short" })
                        .format(start)
                        .replace(".", ""),
                    value: 0,
                };
            })
            : Array.from({ length: 8 }, (_, index) => {
                const current = weekStart(now),
                    start = new Date(current);
                start.setDate(start.getDate() - 7 * (7 - index));
                const end = new Date(start);
                end.setDate(end.getDate() + 7);
                return {
                    key: start.toISOString(),
                    start,
                    end,
                    label: `${start.getDate()}.${start.getMonth() + 1}`,
                    value: 0,
                };
            });
    const bucketFor = (transaction: Transaction) => {
        if (!transaction.bookedAt) return buckets.at(-1);
        const date = new Date(transaction.bookedAt);
        return buckets.find((bucket) => date >= bucket.start && date < bucket.end);
    };
    transactions
        .filter(
            (transaction) =>
                transaction.amount < 0 &&
                transaction.kind !== "transfer" &&
                transaction.kind !== "exchange",
        )
        .forEach((transaction) => {
            const bucket = bucketFor(transaction);
            if (bucket) bucket.value += Math.abs(transaction.baseAmount ?? transaction.amount);
        });
    const currentTransactions = transactions.filter(
            (transaction) => bucketFor(transaction) === buckets.at(-1),
        ),
        expenses = currentTransactions.filter(
            (transaction) =>
                transaction.amount < 0 &&
                transaction.kind !== "transfer" &&
                transaction.kind !== "exchange",
        );
    const total = expenses.reduce(
            (sum, transaction) => sum + Math.abs(transaction.baseAmount ?? transaction.amount),
            0,
        ),
        income = currentTransactions
            .filter(
                (transaction) =>
                    transaction.amount > 0 &&
                    transaction.kind !== "transfer" &&
                    transaction.kind !== "exchange",
            )
            .reduce((sum, transaction) => sum + (transaction.baseAmount ?? transaction.amount), 0),
        impulsive = expenses
            .filter((transaction) => transaction.impulse)
            .reduce(
                (sum, transaction) => sum + Math.abs(transaction.baseAmount ?? transaction.amount),
                0,
            );
    const groupByCategoryName = new NativeMap(categories.map((c) => [c.name, c.budgetGroup]));
    const groupTotals = { needs: 0, wants: 0, savings: 0, unassigned: 0 };
    expenses.forEach((t) => {
        const group = groupByCategoryName.get(t.category);
        const value = Math.abs(t.baseAmount ?? t.amount);
        if (group === "needs") groupTotals.needs += value;
        else if (group === "wants") groupTotals.wants += value;
        else if (group === "savings") groupTotals.savings += value;
        else groupTotals.unassigned += value;
    });
    const grouped = Object.entries(
        expenses.reduce<Record<string, number>>((sum, transaction) => {
            sum[transaction.category] =
                (sum[transaction.category] || 0) + Math.abs(transaction.baseAmount ?? transaction.amount);
            return sum;
        }, {}),
    ).sort((a, b) => b[1] - a[1]);
    const current = buckets.at(-1)?.value || 0,
        previous = buckets.at(-2)?.value || 0,
        delta = previous ? Math.round(((current - previous) / previous) * 100) : 0,
        maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1),
        symbol = currencySymbol(baseCurrency);
    return (
        <>
            <div className="period-switch">
                <button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>
                    За місяцями
                </button>
                <button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>
                    За тижнями
                </button>
            </div>
            <div className="metric-grid">
                <article className="metric">
                    <small>Витрати за {period === "month" ? "місяць" : "тиждень"}</small>
                    <strong>
                        {symbol} {formatMoney(total)}
                    </strong>
                    <span>Поточний період</span>
                </article>
                <article className="metric">
                    <small>Доходи</small>
                    <strong>
                        {symbol} {formatMoney(income)}
                    </strong>
                    <span className="positive">
            Чистий потік {symbol} {formatMoney(income - total)}
          </span>
                </article>
                <article className="metric">
                    <small>Імпульсивні покупки</small>
                    <strong>
                        {symbol} {formatMoney(impulsive)}
                    </strong>
                    <span>{total ? Math.round((impulsive / total) * 100) : 0}% усіх витрат</span>
                </article>
            </div>
            <section className="panel monthly-panel">
                <div className="section-title">
                    <div>
                        <h2>Динаміка витрат</h2>
                        <p>{period === "month" ? "Останні шість місяців" : "Останні вісім тижнів"}</p>
                    </div>
                    <span className={delta > 0 ? "comparison negative" : "comparison positive"}>
            {previous
                ? `${delta > 0 ? "+" : ""}${delta}% до попереднього періоду`
                : "Ще немає порівняння"}
          </span>
                </div>
                <div className="monthly-chart">
                    {buckets.map((bucket) => (
                        <div key={bucket.key}>
                            <strong>{bucket.value ? `${symbol}${formatMoney(bucket.value)}` : "—"}</strong>
                            <span>
                <i
                    style={{
                        height: `${Math.max(bucket.value ? 8 : 2, (bucket.value / maxValue) * 100)}%`,
                    }}
                />
              </span>
                            <small>{bucket.label}</small>
                        </div>
                    ))}
                </div>
            </section>
            <div className="analytics-grid">
                <section className="panel">
                    <div className="section-title">
                        <div>
                            <h2>Витрати за категоріями</h2>
                            <p>Розподіл поточного періоду</p>
                        </div>
                    </div>
                    <div className="category-chart">
                        {grouped.length ? (
                            grouped.map(([name, value], index) => (
                                <div key={name}>
                                    <span style={{ background: `hsl(${250 - index * 34} 72% ${58 + index * 3}%)` }} />
                                    <strong>{name}</strong>
                                    <i>
                                        <b style={{ width: `${(value / (grouped[0]?.[1] || 1)) * 100}%` }} />
                                    </i>
                                    <em>{Math.round((value / total) * 100)}%</em>
                                </div>
                            ))
                        ) : (
                            <p className="empty-inline">Додайте операції для аналітики</p>
                        )}
                    </div>
                </section>
                <section className="panel impulse-report">
          <span className="wizard-icon">
            <Sparkles />
          </span>
                    <h2>Звіт про імпульсивні витрати</h2>
                    <strong>{expenses.filter((transaction) => transaction.impulse).length} покупок</strong>
                    <p>
                        Позначайте незаплановані покупки під час створення операції. Rivna покаже їхню частку та
                        вплив на план.
                    </p>
                    <div
                        className="donut"
                        style={
                            { "--percent": `${total ? (impulsive / total) * 100 : 0}%` } as React.CSSProperties
                        }
                    >
                        <span>{total ? Math.round((impulsive / total) * 100) : 0}%</span>
                    </div>
                </section>
            </div>
            <section className="panel recurring-panel">
                <div className="section-title">
                    <div>
                        <h2>Заплановані доходи</h2>
                        <p>Регулярні надходження</p>
                    </div>
                </div>
                <div className="recurring-list">
                    {plannedIncomeItems.length ? (
                        plannedIncomeItems.map((r) => (
                            <div key={r.id}>
                <span className="recurring-icon">
                  <ArrowDownLeft />
                </span>
                                <strong>{r.name}</strong>
                                <small>
                                    {r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}
                                </small>
                                <b className="income-amount">
                                    +{r.currency} {formatMoney(r.amount)}
                                </b>
                                <em>{r.auto ? "Автоматично" : "Нагадування"}</em>
                            </div>
                        ))
                    ) : (
                        <p className="empty-inline">
                            Планових доходів поки немає — додай через «Регулярний платіж», обравши «Дохід»
                        </p>
                    )}
                </div>
            </section>
            <CashflowCalendar
                balance={balance}
                recurring={recurring}
                transactions={transactions}
                rates={rates}
                customRates={customRates}
                baseCurrency={baseCurrency}
            />
            <section className="panel">
                <div className="section-title">
                    <div>
                        <h2>Правило 50/30/20</h2>
                        <p>Порівняння твоїх витрат з класичним фінансовим правилом</p>
                    </div>
                </div>
                <div className="budget-rule-grid">
                    {[
                        { key: "needs" as const, label: "Базові потреби", target: 50, color: "#159b70" },
                        { key: "wants" as const, label: "Бажання / Розваги", target: 30, color: "#f4b740" },
                        { key: "savings" as const, label: "Заощадження / Борги", target: 20, color: "#6558e8" },
                    ].map((row) => {
                        const value = groupTotals[row.key];
                        const actualPercent = total ? Math.round((value / total) * 100) : 0;
                        const diff = actualPercent - row.target;
                        return (
                            <div key={row.key} className="budget-rule-row">
                                <div className="budget-rule-head">
                                    <strong>{row.label}</strong>
                                    <span>
                    {actualPercent}% <small>(ціль: {row.target}%)</small>
                  </span>
                                </div>
                                <div className="budget-rule-bar">
                                    <i style={{ width: `${Math.min(100, actualPercent)}%`, background: row.color }} />
                                    <b style={{ left: `${row.target}%` }} />
                                </div>
                                <small className={diff > 0 ? "negative" : "positive"}>
                                    {symbol} {formatMoney(value)}
                                    {diff !== 0 && ` · ${diff > 0 ? "+" : ""}${diff}% від цілі`}
                                </small>
                            </div>
                        );
                    })}
                </div>
                {groupTotals.unassigned > 0 && (
                    <p className="empty-inline">
                        {symbol} {formatMoney(groupTotals.unassigned)} витрат без групи — признач групу категоріям у
                        Налаштуваннях, щоб врахувати їх тут.
                    </p>
                )}
            </section>
            <AnomalyAlerts transactions={transactions} baseCurrency={baseCurrency} />
        </>
    );
}