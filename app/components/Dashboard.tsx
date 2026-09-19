
"use client";
import { useMemo, useState } from "react";
import type { Page, Account, Transaction, GoalItem, RecurringItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";

import type {Account, GoalItem, Page, RecurringItem, Transaction} from "@/app/types";
import {useMemo, useState} from "react";
import {
    ArrowDownLeft,
    ArrowRight,
    ArrowUpRight,
    ChevronDown,
    MoreHorizontal,
    PiggyBank,
    Plus, Repeat2,
    Sparkles, Trash2
} from "lucide-react";

function Dashboard({
                       balance,
                       baseCurrency,
                       accounts,
                       transactions,
                       goals,
                       authenticated,
                       openPage,
                       addAccount,
                       changeCurrency,
                       monthlyFees,
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
    monthlyFees: number;
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
        projectedBalance = balance - Math.max(0, forecast - expense),
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
    const goalReserve = goals.reduce((sum, g) => sum + (g.current > 0 ? 0 : 0), 0);
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
    const safeToSpend = Math.max(0, (balance - upcomingObligations - expense) / daysLeft);
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
    return (
        <>
            <GracePeriodAlert accounts={accounts} />
            {savingsBalance > 0 && (
                <div className="safe-to-spend-row">
                    <div
                        className={
                            runwayMonths < 3 ? "safe-to-spend runway-widget low" : "safe-to-spend runway-widget"
                        }
                    >
                        <small>Подушка безпеки</small>
                        <strong>{Math.round(runwayMonths * 10) / 10} міс.</strong>
                    </div>
                </div>
            )}
            <div className="summary-grid">
                <article className="balance-card">
                    <div className="card-top">
                        <span>Загальний баланс</span>
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
                                            (
                                                e.currentTarget.closest("details") as HTMLDetailsElement | null
                                            )?.removeAttribute("open");
                                        }}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </details>
                    </div>
                    <h2>
                        {symbol} {formatMoney(balance)}
                        <small>.00</small>
                    </h2>
                    <div className="balance-meta">
            <span>
              <ArrowUpRight /> +{symbol} {formatMoney(income)} <small>доходи</small>
            </span>
                        <span>
              <ArrowDownLeft /> −{symbol} {formatMoney(expense)} <small>витрати</small>
            </span>
                    </div>
                    <div className="balance-footer">
                        <span>За {monthLabel}</span>
                        <span className={difference > 0 ? "negative" : "positive"}>
              {previousExpense
                  ? `${difference > 0 ? "+" : ""}${difference}% до минулого місяця`
                  : "Перший період"}
            </span>
                    </div>
                </article>
                <article className="forecast-card">
                    <div className="card-heading">
                        <div>
                            <span>Прогноз на кінець місяця</span>
                            <h3>
                                {symbol} {formatMoney(projectedBalance)}
                            </h3>
                        </div>
                        <span className="forecast-icon">
              <Sparkles />
            </span>
                    </div>
                    <div className="forecast-line">
                        <i style={{ width: `${Math.min(100, (now.getDate() / daysInMonth) * 100)}%` }} />
                        <b />
                    </div>
                    <p>
                        За поточного темпу витрат · прогноз витрат {symbol} {formatMoney(forecast)}
                    </p>
                    {plannedIncome > 0 && (
                        <p className="fee-note">
                            Запланований дохід цього місяця: {symbol} {formatMoney(plannedIncome)}
                        </p>
                    )}
                    {monthlyFees > 0 && (
                        <p className="fee-note">
                            Комісії за перекази цього місяця: {symbol} {formatMoney(monthlyFees)}
                        </p>
                    )}
                    <div className="insight">
                        <Sparkles />{" "}
                        {previousExpense
                            ? `Темп витрат ${Math.abs(difference)}% ${difference <= 0 ? "нижчий" : "вищий"} за минулий місяць`
                            : "Прогноз уточнюється з кожною операцією"}
                    </div>
                </article>
            </div>
            <section className="accounts">
                <div className="section-title">
                    <div>
                        <h2>Мої рахунки</h2>
                        <p>Баланс усіх активів</p>
                    </div>
                    <button onClick={() => openPage("Рахунки")}>
                        Усі рахунки <ArrowRight />
                    </button>
                </div>
                <div className="account-row">
                    {accounts.slice(0, 4).map((a) => (
                        <div
                            key={a.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                reorderAccounts(e.dataTransfer.getData("text/plain"), String(a.id));
                            }}
                        >
                            <AccountCard account={a} />
                        </div>
                    ))}
                    <button className="new-account" onClick={addAccount}>
            <span className="new-account-icon">
              <Plus />
            </span>
                        <span>{accounts.length ? "Додати рахунок" : "Додай свій перший рахунок"}</span>
                    </button>
                </div>
            </section>{" "}
            <div className="dashboard-grid">
                <section className="panel transactions">
                    <div className="section-title">
                        <div>
                            <h2>Останні операції</h2>
                            <p>Найновіші записи</p>
                        </div>
                        <button onClick={() => openPage("Операції")}>
                            Усі операції <ArrowRight />
                        </button>
                    </div>
                    <TransactionList transactions={transactions.slice(0, 4)} />
                </section>
                <section className="panel budget-panel">
                    <div className="section-title">
                        <div>
                            <h2>Бюджет: {monthLabel}</h2>
                            <p>{daysInMonth - now.getDate()} днів до кінця місяця</p>
                        </div>
                        <div className="safe-to-spend-mini">
                            <small>Можна сьогодні</small>
                            <strong>
                                {symbol} {formatMoney(safeToSpend)}
                            </strong>
                        </div>
                        <button onClick={() => openPage("Бюджет")}>
                            <MoreHorizontal />
                        </button>
                    </div>
                    <div className="budget-total">
                        <div>
                            <small>Витрачено цього місяця</small>
                            <strong>
                                {symbol} {formatMoney(expense)}
                            </strong>
                        </div>
                        <b>{forecast ? Math.round((expense / forecast) * 100) : 0}% часу</b>
                    </div>
                    <div className="main-progress">
                        <i style={{ width: `${Math.min(100, (now.getDate() / daysInMonth) * 100)}%` }} />
                    </div>
                    <button className="budget-open" onClick={() => openPage("Бюджет")}>
                        Переглянути ліміти категорій <ArrowRight />
                    </button>
                </section>
            </div>
            {primaryGoal && (
                <button className="panel dashboard-goal" onClick={() => openPage("Накопичення")}>
          <span className="goal-icon">
            <PiggyBank />
          </span>
                    <div>
                        <small>Головна фінансова ціль</small>
                        <strong>{primaryGoal.name}</strong>
                        <span>
              <i style={{ width: `${goalProgress}%`, background: primaryGoal.color }} />
            </span>
                        <p>
                            {goalProgress}% · {primaryGoal.currency} {formatMoney(primaryGoal.current)} з{" "}
                            {formatMoney(primaryGoal.target)}
                        </p>
                    </div>
                    <ArrowRight />
                </button>
            )}
            <section className="panel recurring-panel">
                <div className="section-title">
                    <div>
                        <h2>Регулярні платежі</h2>
                        <p>Підписки, оренда та комунальні</p>
                    </div>
                    <button className="small-primary" onClick={addRecurring}>
                        <Plus /> Додати
                    </button>
                </div>
                <div className="recurring-list">
                    {recurring.filter((r) => r.kind === "expense").length ? (
                        recurring
                            .filter((r) => r.kind === "expense")
                            .map((r) => (
                                <div key={r.id}>
                  <span className="recurring-icon">
                    <Repeat2 />
                  </span>
                                    <strong>{r.name}</strong>
                                    <small>
                                        {r.frequency} · наступний {new Date(r.next).toLocaleDateString("uk-UA")}
                                    </small>
                                    <b>
                                        {r.currency} {formatMoney(r.amount)}
                                    </b>
                                    <em>{r.auto ? "Автоматично" : "Нагадування"}</em>
                                    <button
                                        className="icon-button danger"
                                        onClick={() => removeRecurring(r.id)}
                                        aria-label="Видалити"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                    ) : (
                        <p className="empty-inline">Регулярних платежів поки немає</p>
                    )}
                </div>
            </section>
        </>
    );
}
