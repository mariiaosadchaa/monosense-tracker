"use client";
import { useMemo, useState } from "react";
import type { Transaction, RecurringItem, CategoryItem, Account } from "../types";
import { formatMoney, currencySymbol, conversionRate } from "../lib/format";
import {ArrowDownLeft, Sparkles} from "lucide-react";
import { CashflowCalendar, AnomalyAlerts } from "./Analytics";

const NativeMap = globalThis.Map;

export function AnalyticsView({
                           transactions,
                           baseCurrency,
                           recurring,
                           balance,
                           rates,
                           customRates,
                           categories,
                           accounts = [],
                       }: {
    transactions: Transaction[];
    baseCurrency: string;
    recurring: RecurringItem[];
    balance: number;
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    categories: CategoryItem[];
    accounts?: Account[];
}) {
    const plannedIncomeItems = recurring.filter((r) => r.kind === "income");
    const [openIncome, setOpenIncome] = useState<string | null>(null);
    const FREQ: Record<string, string> = { monthly: "щомісяця", weekly: "щотижня", yearly: "щороку" };
    // Скільки вже надійшло цього місяця: доходи на рахунок правила (і в його категорію, якщо задана)
    // Чи належить надходження саме цьому правилу (а не іншій зарплаті)
    const norm = (v: string) => v.trim().toLowerCase();
    const incomeRuleNames = new Set(plannedIncomeItems.map((x) => norm(x.name)));
    const matchesRule = (t: Transaction, r: RecurringItem) => {
        if (r.categoryId) return t.categoryId === r.categoryId;
        const cat = norm(t.category || "");
        // Є категорія з такою ж назвою, як правило → лише вона
        if (categories.some((c) => norm(c.name) === norm(r.name))) return cat === norm(r.name);
        // Категорія названа на честь ІНШОГО правила → не наше
        if (incomeRuleNames.has(cat) && cat !== norm(r.name)) return false;
        return (
            /зарплат|з\/п|\bзп\b|salary|payroll|аванс|payoneer/i.test(`${t.category} ${t.title}`) ||
            norm(t.title) === norm(r.name)
        );
    };
    const receivedThisMonth = (r: RecurringItem) => {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const accountName = accounts.find((a) => String(a.id) === r.accountId)?.name;
        const toRule = (t: Transaction) => {
            const cur = t.currency || "UAH";
            if (cur === r.currency) return t.amount;
            const inUah = t.amount * conversionRate(cur, rates, customRates);
            return inUah / conversionRate(r.currency, rates, customRates);
        };
        const items = transactions.filter(
            (t) =>
                t.amount > 0 &&
                t.kind !== "transfer" &&
                t.kind !== "exchange" &&
                t.kind !== "credit_limit_change" &&
                !!t.bookedAt &&
                new Date(t.bookedAt) >= monthStart &&
                (!accountName || (t.account || "").trim() === accountName.trim()) &&
                // Лише зарплатні надходження: категорія правила, або категорія/назва схожа на зарплату
                matchesRule(t, r),
        );
        return { sum: items.reduce((acc, t) => acc + toRule(t), 0), count: items.length, items, toRule };
    };
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
    // Якщо категорії не призначено групу — вгадуємо за назвою/іконкою
    const guessGroup = (name: string, icon = ""): "needs" | "wants" | "savings" | null => {
        const n = `${name} ${icon}`.toLowerCase();
        if (/заощадж|депозит|інвест|борг|кредит|розстроч|ціл|скарбн|savings|piggy/.test(n)) return "savings";
        if (/продукт|комунал|дім|житл|оренд|квартир|транспорт|пальн|бензин|здоров|аптек|медиц|лікар|зв.язок|інтернет|мобіл|дит|освіт|страх|тварин|пес|собак|кіт|вет|paw|dog|cat|utilit|home|house|pill|stethoscope|fuel|car|bus/.test(n)) return "needs";
        if (/кафе|ресторан|доставк|розваг|одяг|краса|подарун|хобі|подорож|підписк|спорт|кіно|шопінг|гра|coffee|gift|party|shirt|sparkle|plane|gamepad|film|shopping/.test(n)) return "wants";
        return null;
    };
    const groupByCategoryName = new NativeMap(
        categories.map((c) => [c.name, c.budgetGroup || guessGroup(c.name, c.icon)]),
    );
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
                        plannedIncomeItems.map((r) => {
                            const { sum, count, items, toRule } = receivedThisMonth(r);
                            const isOpen = openIncome === r.id;
                            const pct = r.amount ? Math.min(100, Math.round((sum / r.amount) * 100)) : 0;
                            const sym = currencySymbol(r.currency);
                            return (
                                <div
                                    key={r.id}
                                    className="income-plan"
                                    onClick={() => setOpenIncome(isOpen ? null : r.id)}
                                    title="Показати, що враховано"
                                >
                                    <span className="recurring-icon">
                                        <ArrowDownLeft />
                                    </span>
                                    <div className="income-plan-main">
                                        <div className="income-plan-top">
                                            <strong>{r.name}</strong>
                                            <span className={pct >= 100 ? "income-plan-sum done" : "income-plan-sum"}>
                                                {formatMoney(sum)} / {formatMoney(r.amount)} {sym}
                                            </span>
                                        </div>
                                        <span className="income-plan-bar">
                                            <i style={{ width: `${pct}%` }} />
                                        </span>
                                        <small>
                                            {pct >= 100
                                                ? "✓ Цього місяця отримано"
                                                : sum > 0
                                                    ? `Отримано ${pct}% · ще ${formatMoney(r.amount - sum)} ${sym}`
                                                    : "Цього місяця ще не надходило"}
                                            {count > 1 ? ` · ${count} надходж.` : ""}
                                            {" · "}
                                            {FREQ[r.frequency] || r.frequency}, наступний{" "}
                                            {new Date(r.next).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                                            {count > 0 && (isOpen ? " · сховати ▲" : " · що враховано ▼")}
                                        </small>
                                        {isOpen && count > 0 && (
                                            <div className="income-plan-items">
                                                {items.map((t) => (
                                                    <div key={t.id}>
                                                        <span>{t.bookedAt ? new Date(t.bookedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" }) : ""}</span>
                                                        <span>{t.title}</span>
                                                        <span>{t.category}</span>
                                                        <b>+{formatMoney(toRule(t))} {sym}</b>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
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
                        <p>
                            Від доходу цього місяця{income ? ` (${symbol} ${formatMoney(income)})` : ""}: 50% — потреби,
                            30% — бажання, 20% — відкласти
                        </p>
                    </div>
                </div>
                <div className="budget-rule-grid">
                    {[
                        { key: "needs" as const, label: "Базові потреби", target: 50, color: "#159b70" },
                        { key: "wants" as const, label: "Бажання / Розваги", target: 30, color: "#f4b740" },
                        { key: "savings" as const, label: "Заощадження / Борги", target: 20, color: "#6558e8" },
                    ].map((row) => {
                        // База — дохід; заощадження = те, що лишилось від доходу (+ явні внески в групу «Заощадження»)
                        const base = income || total;
                        const value =
                            row.key === "savings" && income
                                ? Math.max(0, income - groupTotals.needs - groupTotals.wants - groupTotals.unassigned)
                                : groupTotals[row.key];
                        const actualPercent = base ? Math.round((value / base) * 100) : 0;
                        const diff = actualPercent - row.target;
                        const bad = row.key === "savings" ? diff < 0 : diff > 0;
                        const note =
                            diff === 0
                                ? "рівно як треба"
                                : row.key === "savings"
                                    ? diff > 0
                                        ? `на ${diff}% більше за ціль 👍`
                                        : `на ${-diff}% менше за ціль`
                                    : diff > 0
                                        ? `перевищено на ${diff}%`
                                        : `у межах, запас ${-diff}%`;
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
                                <small className={bad ? "negative" : "positive"}>
                                    {symbol} {formatMoney(value)} · {note}
                                </small>
                            </div>
                        );
                    })}
                </div>
                {groupTotals.unassigned > 0 && (
                    <p className="empty-inline">
                        {symbol} {formatMoney(groupTotals.unassigned)} витрат не вдалося віднести до групи (
                        {Array.from(
                            new Set(expenses.filter((t) => !groupByCategoryName.get(t.category)).map((t) => t.category)),
                        )
                            .slice(0, 5)
                            .join(", ")}
                        ) — признач їм групу в Налаштуваннях → Категорії.
                    </p>
                )}
            </section>
            <AnomalyAlerts transactions={transactions} baseCurrency={baseCurrency} />
        </>
    );
}
