import { useState, useMemo, useRef, useEffect } from "react";
import { X, Download, HandCoins } from "lucide-react";
import type { Transaction, GoalItem, RecurringItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { conversionRate } from "../lib/format";
import { ModalHead } from "./modal-head";

export function InvestmentSimulator({ goals, baseCurrency }: { goals: GoalItem[]; baseCurrency: string }) {
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
export function BigPurchaseSimulator({
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
export function WrappedModal({
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
export function SettlementPanel({
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
