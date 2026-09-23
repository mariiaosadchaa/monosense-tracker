
"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// Анімація «набігання» числа від 0 до значення
function useCountUp(value: number, active: boolean, duration = 1100) {
    const [shown, setShown] = useState(value);
    const started = useRef(false);
    useEffect(() => {
        if (!active || started.current) {
            setShown(value);
            return;
        }
        started.current = true;
        let raf = 0;
        const t0 = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setShown(value * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, active, duration]);
    return shown;
}
import type { Page, Account, Transaction, GoalItem, RecurringItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { isLight } from "../lib/transfers";
import {
    ArrowDownLeft,
    ArrowRight,
    ChevronDown,
    PiggyBank,
    Plus, Repeat2,
    Trash2
} from "lucide-react";
import { GracePeriodAlert } from "./Analytics";
import { TransactionList } from "./AccountCard";

export function Dashboard({
                       balance,
                       baseCurrency,
                       accounts,
                       transactions,
                       goals,
                       authenticated,
                       openPage,
                       addAccount,
                       changeCurrency,
                       feesByMonth,
                       plannedIncome,
                       recurring,
                       addRecurring,
                       reorderAccounts,
                       removeRecurring,
                   }: {
    balance: number;
    baseCurrency: string;
    accounts: Account[];
    transactions: Transaction[];
    goals: GoalItem[];
    authenticated: boolean;
    openPage: (p: Page) => void;
    addAccount: () => void;
    changeCurrency: (c: string) => void;
    feesByMonth: Record<string, number>;
    plannedIncome: number;
    recurring: RecurringItem[];
    addRecurring: () => void;
    reorderAccounts: (draggedId: string, targetId: string) => void;
    removeRecurring: (id: string) => void;
}) {
    const [renderedAt] = useState(() => Date.now()),
        now = new Date(renderedAt),
        month = now.getMonth(),
        year = now.getFullYear();
    const realDates = transactions.some((transaction) => Boolean(transaction.bookedAt));
    const currentTransactions = realDates
        ? transactions.filter((transaction) => {
            const date = new Date(transaction.bookedAt!);
            return date.getMonth() === month && date.getFullYear() === year;
        })
        : transactions;
    const previousTransactions = transactions.filter((transaction) => {
        if (!transaction.bookedAt) return false;
        const date = new Date(transaction.bookedAt),
            previous = new Date(year, month - 1, 1);
        return date.getMonth() === previous.getMonth() && date.getFullYear() === previous.getFullYear();
    });
    const income = currentTransactions
            .filter(
                (transaction) =>
                    transaction.amount > 0 &&
                    transaction.kind !== "transfer" &&
                    transaction.kind !== "exchange",
            )
            .reduce((sum, transaction) => sum + (transaction.baseAmount ?? transaction.amount), 0),
        expense = currentTransactions
            .filter(
                (transaction) =>
                    transaction.amount < 0 &&
                    transaction.kind !== "transfer" &&
                    transaction.kind !== "exchange",
            )
            .reduce(
                (sum, transaction) => sum + Math.abs(transaction.baseAmount ?? transaction.amount),
                0,
            );
    const previousExpense = previousTransactions
            .filter(
                (transaction) =>
                    transaction.amount < 0 &&
                    transaction.kind !== "transfer" &&
                    transaction.kind !== "exchange",
            )
            .reduce(
                (sum, transaction) => sum + Math.abs(transaction.baseAmount ?? transaction.amount),
                0,
            ),
        difference = previousExpense
            ? Math.round(((expense - previousExpense) / previousExpense) * 100)
            : 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate(),
        forecast = Math.round((expense / Math.max(1, now.getDate())) * daysInMonth),
        remainingIncome = Math.max(0, plannedIncome - income),
        projectedBalance = balance - Math.max(0, forecast - expense) + remainingIncome,
        monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long" }).format(now);
    const avgMonthlyExpense = useMemo(() => {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 6);
        const monthsCovered: Set<string> = new Set();
        let total = 0;
        transactions
            .filter(
                (t) =>
                    t.amount < 0 &&
                    t.kind !== "transfer" &&
                    t.kind !== "exchange" &&
                    t.bookedAt &&
                    new Date(t.bookedAt) >= cutoff,
            )
            .forEach((t) => {
                total += Math.abs(t.baseAmount ?? t.amount);
                const key = t.bookedAt!.slice(0, 7);
                monthsCovered.add(key);
            });
        const divisor = Math.max(1, monthsCovered.size);
        return total / divisor;
    }, [transactions]);
    const savingsBalance = goals.reduce((sum, g) => sum + g.current, 0);
    const runwayMonths = avgMonthlyExpense > 0 ? savingsBalance / avgMonthlyExpense : 0;
    const upcomingObligations = recurring
        .filter(
            (r) =>
                r.kind === "expense" &&
                new Date(r.next).getMonth() === month &&
                new Date(r.next).getFullYear() === year &&
                new Date(r.next).getDate() >= now.getDate(),
        )
        .reduce((sum, r) => sum + r.amount, 0);
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
    const safeToSpend = Math.max(0, (balance - upcomingObligations) / daysLeft);
    const primaryGoal =
            goals[0] ||
            (authenticated
                ? null
                : {
                    id: "demo-goal",
                    name: "Резервний фонд",
                    target: 200000,
                    current: 120000,
                    currency: "UAH",
                    color: "#6558E8",
                }),
        goalProgress = primaryGoal
            ? Math.min(100, Math.round((primaryGoal.current / Math.max(1, primaryGoal.target)) * 100))
            : 0;
    const symbol = currencySymbol(baseCurrency);
    // Вступна анімація — один раз за сеанс (при відкритті застосунку)
    const [intro, setIntro] = useState(false);
    const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
    useIso(() => {
        try {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            if (sessionStorage.getItem("rivna-intro")) return;
            sessionStorage.setItem("rivna-intro", "1");
            setIntro(true);
        } catch {}
    }, []);
    const aBalance = useCountUp(balance, intro);
    const aIncome = useCountUp(income, intro);
    const aExpense = useCountUp(expense, intro);
    const aProjected = useCountUp(projectedBalance, intro);
    const money = (v: number) => `${v < 0 ? "−" : ""}${symbol} ${formatMoney(v)}`;
    const monthGen = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(now).replace(/^\d+\s*/, "");
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const topCategories = Object.entries(
        currentTransactions
            .filter((t) => t.amount < 0 && t.kind !== "transfer" && t.kind !== "exchange")
            .reduce<Record<string, number>>((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + Math.abs(t.baseAmount ?? t.amount);
                return acc;
            }, {}),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    // Рахунки: мої — першим рядком, спільні та партнера — другим; неактивні > 30 днів ховаємо
    const [showIdle, setShowIdle] = useState(false);
    const lastUsed = useMemo(() => {
        const map: Record<string, number> = {};
        transactions.forEach((t) => {
            if (!t.account || !t.bookedAt) return;
            const ts = Date.parse(t.bookedAt);
            const k = t.account.trim();
            if (!map[k] || ts > map[k]) map[k] = ts;
        });
        return map;
    }, [transactions]);
    const monthAgo = renderedAt - 31 * 86400000;
    // Ховаємо лише «порожні» неактивні картки: без операцій > місяць І без грошей/боргу на них
    const isIdle = (a: Account) =>
        (lastUsed[a.name.trim()] || 0) < monthAgo && Math.abs(a.balance || 0) < 1;
    const hiddenAccounts = accounts.filter(isIdle);
    const visibleAccounts = showIdle ? accounts : accounts.filter((a) => !isIdle(a));
    const ownerKey = (a: Account) => {
        const o = (a.owner || "").trim();
        return !o || /^(мій|моя|я)$/i.test(o) ? "__me__" : o;
    };
    // Рядки: «Мої» → окремий рядок для кожного іншого власника (Діма…) → «Спільні» останніми
    const owners = Array.from(new Set(visibleAccounts.map(ownerKey)));
    const isShared = (k: string) => /^спільн/i.test(k);
    owners.sort((a, b) => {
        const rank = (k: string) => (k === "__me__" ? 0 : isShared(k) ? 2 : 1);
        return rank(a) - rank(b) || a.localeCompare(b, "uk");
    });
    const accountGroups = (owners.length ? owners : ["__me__"]).map((k) => ({
        label: k === "__me__" ? "Мої" : isShared(k) ? "Спільні" : k,
        items: visibleAccounts.filter((a) => ownerKey(a) === k),
        add: false,
        owner: k,
    }));
    accountGroups[accountGroups.length - 1].add = true;
    const upcoming = [...recurring].sort((a, b) => new Date(a.next).getTime() - new Date(b.next).getTime());
    return (
        <>
            <div className={intro ? "dc-root dc-intro" : "dc-root"}>
            <GracePeriodAlert accounts={accounts} />
            <div className="dc-tiles">
                <article className="dc-tile dark" style={{ "--i": 0 } as React.CSSProperties}>
                    <div className="dc-tile-head">
                        <small>Баланс</small>
                        <details className="currency-select">
                            <summary>
                                {baseCurrency} <ChevronDown />
                            </summary>
                            <div className="currency-options">
                                {["UAH", "USD", "EUR", "GBP", "PLN"].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={c === baseCurrency ? "selected" : ""}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            changeCurrency(c);
                                            (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                        }}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </details>
                    </div>
                    <b>{money(aBalance)}</b>
                    <em>
                        {accounts.length} {accounts.length === 1 ? "рахунок" : accounts.length < 5 ? "рахунки" : "рахунків"}
                    </em>
                </article>
                <article className="dc-tile" style={{ "--i": 1 } as React.CSSProperties}>
                    <small>Доходи · {monthLabel}</small>
                    <b className="pos">+{symbol} {formatMoney(aIncome)}</b>
                    <em>{plannedIncome > 0 ? `з ${formatMoney(plannedIncome)} плану` : "за цей місяць"}</em>
                </article>
                <article className="dc-tile" style={{ "--i": 2 } as React.CSSProperties}>
                    <small>Витрати · {monthLabel}</small>
                    <b>−{symbol} {formatMoney(aExpense)}</b>
                    <em className={difference > 0 ? "neg" : "pos"}>
                        {previousExpense ? `${difference > 0 ? "+" : ""}${difference}% до минулого місяця` : "перший період"}
                    </em>
                </article>
                <article className="dc-tile" style={{ "--i": 3 } as React.CSSProperties}>
                    <small>Прогноз на {daysInMonth} {monthGen}</small>
                    <b className={projectedBalance < 0 ? "neg" : ""}>{money(aProjected)}</b>
                    <em>
                        {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дні" : "днів"} лишилось
                        {feesByMonth[currentMonthKey] ? ` · комісії ${symbol} ${formatMoney(feesByMonth[currentMonthKey])}` : ""}
                    </em>
                </article>
            </div>

            <div className="dc-accounts" style={{ "--i": 4 } as React.CSSProperties}>
                {accountGroups.map((group) =>
                    group.items.length ? (
                        <div key={group.label} className="dc-acc-row">
                            <span className="dc-acc-label">{group.label}</span>
                            <div className="dc-chips">
                                {group.items.map((a) => {
                    const available = (a.balance || 0) + (a.creditLimit || 0);
                    const logo = a.bank.toLowerCase().includes("mono")
                        ? "mono"
                        : a.bank.toLowerCase().includes("payoneer") || a.bank.toLowerCase().includes("пайонер")
                            ? "P"
                            : a.bank.slice(0, 2);
                    return (
                        <button
                            type="button"
                            key={a.id}
                            className="dc-chip"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                reorderAccounts(e.dataTransfer.getData("text/plain"), String(a.id));
                            }}
                            onClick={() => openPage("Рахунки")}
                            title={`${a.name} · ${a.owner || ""}`}
                        >
                            <i style={a.color ? { background: a.color, color: isLight(a.color) ? "#111" : "#fff" } : undefined}>{logo}</i>
                            <span>
                                {a.name}

                            </span>
                            <b className={available < 0 ? "neg" : ""}>
                                {available < 0 ? "−" : ""}
                                {currencySymbol(a.currency)} {formatMoney(available)}
                            </b>
                        </button>
                    );
                                })}
                                {group.add && (
                                    <button type="button" className="dc-chip add" onClick={addAccount}>
                                        <Plus size={14} /> {accounts.length ? "Рахунок" : "Додай перший рахунок"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : null,
                )}
                {hiddenAccounts.length > 0 && (
                    <button type="button" className="dc-acc-more" onClick={() => setShowIdle((v) => !v)}>
                        {showIdle
                            ? "Сховати неактивні"
                            : `+ ${hiddenAccounts.length} порожн${hiddenAccounts.length === 1 ? "ій" : "і"} без руху понад місяць`}
                    </button>
                )}
            </div>

            <div className="dc-grid">
                <section className="panel dc-panel" style={{ "--i": 5 } as React.CSSProperties}>
                    <div className="dc-title">
                        <h2>Останні операції</h2>
                        <button onClick={() => openPage("Операції")}>
                            Усі <ArrowRight size={14} />
                        </button>
                    </div>
                    <TransactionList transactions={transactions.slice(0, 5)} />
                </section>

                <section className="panel dc-panel" style={{ "--i": 6 } as React.CSSProperties}>
                    <div className="dc-title">
                        <h2>Бюджет · {monthLabel}</h2>
                        <button onClick={() => openPage("Бюджет")}>
                            Ліміти <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="dc-row">
                        <span>Витрачено</span>
                        <b>{symbol} {formatMoney(expense)}</b>
                    </div>
                    <div className="dc-bar">
                        <i style={{ width: `${Math.min(100, (now.getDate() / daysInMonth) * 100)}%` }} />
                    </div>
                    <p className="dc-note">
                        Минуло {Math.round((now.getDate() / daysInMonth) * 100)}% місяця · прогноз витрат {symbol} {formatMoney(forecast)}
                    </p>
                    <div className="dc-safe">
                        <small>Можна витрачати на день</small>
                        <b className={safeToSpend <= 0 ? "neg" : "pos"}>{symbol} {formatMoney(safeToSpend)}</b>
                    </div>
                    {topCategories.length > 0 && (
                        <div className="dc-cats">
                            {topCategories.map(([name, value]) => (
                                <div key={name} className="dc-cat">
                                    <span>{name}</span>
                                    <b>{symbol} {formatMoney(value)}</b>
                                    <i>
                                        <em style={{ width: `${(value / topCategories[0][1]) * 100}%` }} />
                                    </i>
                                </div>
                            ))}
                        </div>
                    )}
                    {primaryGoal && (
                        <button className="dc-goal" onClick={() => openPage("Накопичення")}>
                            <PiggyBank size={16} />
                            <span>
                                {primaryGoal.name}
                                <i><em style={{ width: `${goalProgress}%`, background: primaryGoal.color }} /></i>
                            </span>
                            <b>{goalProgress}%</b>
                        </button>
                    )}
                    {savingsBalance > 0 && (
                        <p className="dc-note">Подушка безпеки: {Math.round(runwayMonths * 10) / 10} міс. витрат</p>
                    )}
                </section>

                <section className="panel dc-panel dc-wide" style={{ "--i": 7 } as React.CSSProperties}>
                    <div className="dc-title">
                        <h2>Регулярні платежі та доходи</h2>
                        <button onClick={addRecurring}>
                            <Plus size={14} /> Додати
                        </button>
                    </div>
                    {upcoming.length ? (
                        <div className="dc-plans">
                        {upcoming.map((r) => (
                            <div key={r.id} className="dc-plan">
                                <span className={r.kind === "income" ? "dc-plan-ic in" : "dc-plan-ic"}>
                                    {r.kind === "income" ? <ArrowDownLeft size={14} /> : <Repeat2 size={14} />}
                                </span>
                                <span className="dc-plan-name">
                                    {r.name}
                                    <small>
                                        {new Date(r.next).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}
                                        {" · "}
                                        {({ monthly: "щомісяця", weekly: "щотижня", yearly: "щороку" } as Record<string, string>)[r.frequency] || r.frequency}
                                    </small>
                                </span>
                                <b className={r.kind === "income" ? "pos" : ""}>
                                    {r.kind === "income" ? "+" : "−"}
                                    {currencySymbol(r.currency)} {formatMoney(r.amount)}
                                </b>
                                <button
                                    className="dc-del"
                                    onClick={() => {
                                        if (window.confirm(`Видалити «${r.name}»?`)) removeRecurring(r.id);
                                    }}
                                    aria-label="Видалити"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="empty-inline">Регулярних платежів чи доходів поки немає</p>
                    )}
                </section>
            </div>
            </div>
        </>
    );
}
