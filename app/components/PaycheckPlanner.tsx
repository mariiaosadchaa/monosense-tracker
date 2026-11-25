"use client";
import { useMemo, useState } from "react";
import type { RecurringItem } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { ChevronLeft, ChevronRight, Plus, Wallet, AlertTriangle } from "lucide-react";

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const fmtDay = (d: Date) => new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(d);

type Occ = { key: string; item: RecurringItem; date: Date; amount: number };
type Income = Occ & { free: number; until: Date; bills: { bill: Occ; part: number }[] };
type Bill = Occ & { from: { income: Income; part: number }[]; uncovered: number };

// Усі дати регулярного платежу у вікні [from, to)
function occurrences(item: RecurringItem, from: Date, to: Date): Date[] {
    const base = startOfDay(new Date(item.next));
    if (Number.isNaN(base.getTime())) return [];
    const at = (n: number) => {
        if (item.frequency === "weekly") return addDays(base, 7 * n);
        const months = item.frequency === "yearly" ? 12 * n : n;
        const y = base.getFullYear(), m = base.getMonth() + months;
        const last = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(base.getDate(), last));
    };
    const out: Date[] = [];
    for (let n = -120; n <= 120; n++) {
        const d = at(n);
        if (d >= to) break;
        if (d >= from) out.push(d);
    }
    return out;
}

export function PaycheckPlanner({
    recurring,
    toBase,
    baseCurrency,
    addRecurring,
}: {
    recurring: RecurringItem[];
    toBase: (amount: number, currency: string) => number;
    baseCurrency: string;
    addRecurring: () => void;
}) {
    const symbol = currencySymbol(baseCurrency);
    const [anchor, setAnchor] = useState(() => mondayOf(new Date()));
    const [reserve, setReserve] = useState<number>(() => {
        try { return Number(localStorage.getItem("rivna-plan-reserve")) || 0; } catch { return 0; }
    });
    const saveReserve = (v: number) => {
        setReserve(v);
        try { localStorage.setItem("rivna-plan-reserve", String(v)); } catch { /* ignore */ }
    };

    const weekStart = anchor;
    const weekEnd = addDays(anchor, 7);
    const thisMonday = mondayOf(new Date());

    const plan = useMemo(() => {
        // Беремо запас по краях, щоб рахунки на початку тижня покривались попередньою ЗП
        const from = addDays(weekStart, -70);
        const to = addDays(weekStart, 70);
        const occ = (kind: "income" | "expense") =>
            recurring
                .filter((r) => r.kind === kind)
                .flatMap((item) =>
                    occurrences(item, from, to).map((date) => ({
                        key: `${item.id}-${toDateKey(date)}`,
                        item,
                        date,
                        amount: Math.abs(toBase(item.amount, item.currency)),
                    })),
                )
                .sort((a, b) => a.date.getTime() - b.date.getTime());

        const incomes: Income[] = occ("income").map((o) => ({ ...o, free: o.amount * (1 - reserve / 100), until: to, bills: [] }));
        incomes.forEach((inc, i) => {
            const next = incomes.slice(i + 1).find((n) => n.date > inc.date);
            inc.until = next ? next.date : addDays(inc.date, 31);
        });

        const bills: Bill[] = occ("expense").map((o) => ({ ...o, from: [], uncovered: 0 }));
        bills.forEach((bill) => {
            let need = bill.amount;
            // Спершу — найсвіжіша ЗП до дати платежу, далі — старші
            const prior = incomes.filter((inc) => inc.date <= bill.date).reverse();
            for (const inc of prior) {
                if (need <= 0) break;
                const part = Math.min(inc.free, need);
                if (part <= 0) continue;
                inc.free -= part;
                need -= part;
                inc.bills.push({ bill, part });
                bill.from.push({ income: inc, part });
            }
            bill.uncovered = need;
        });

        // Вільний залишок кожної ЗП рівномірно розкладаємо по днях до наступної ЗП
        let freeThisWeek = 0;
        const freeBy: { income: Income; part: number }[] = [];
        incomes.forEach((inc) => {
            const days = Math.max(1, Math.round((inc.until.getTime() - inc.date.getTime()) / DAY));
            const s = Math.max(inc.date.getTime(), weekStart.getTime());
            const e = Math.min(inc.until.getTime(), weekEnd.getTime());
            if (e <= s || inc.free <= 0) return;
            const part = (inc.free / days) * Math.round((e - s) / DAY);
            freeThisWeek += part;
            freeBy.push({ income: inc, part });
        });

        const inWeek = <T extends Occ>(list: T[]) => list.filter((o) => o.date >= weekStart && o.date < weekEnd);
        return {
            weekIncomes: inWeek(incomes),
            weekBills: inWeek(bills),
            freeThisWeek,
            freeBy,
        };
    }, [recurring, toBase, reserve, weekStart, weekEnd]);

    const { weekIncomes, weekBills, freeThisWeek, freeBy } = plan;
    const billsTotal = weekBills.reduce((s, b) => s + b.amount, 0);
    const uncovered = weekBills.reduce((s, b) => s + b.uncovered, 0);
    const hasIncome = recurring.some((r) => r.kind === "income");
    const isCurrent = weekStart.getTime() === thisMonday.getTime();
    const incLabel = (inc: Income) => `${inc.item.name} · ${fmtDay(inc.date)}`;

    return (
        <div className="lim pp">
            <div className="lim-head">
                <button type="button" className="lim-arrow" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Попередній тиждень">
                    <ChevronLeft size={18} />
                </button>
                <button type="button" className="lim-period" onClick={() => setAnchor(thisMonday)} title="До поточного тижня">
                    <b>{fmtDay(weekStart)} – {fmtDay(addDays(weekEnd, -1))}</b>
                    <small>{isCurrent ? "поточний тиждень" : "повернутись до поточного"}</small>
                </button>
                <button type="button" className="lim-arrow" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Наступний тиждень">
                    <ChevronRight size={18} />
                </button>
            </div>

            {!hasIncome ? (
                <section className="lim-card pp-empty">
                    <Wallet size={28} />
                    <p>Додай зарплати як регулярний дохід (сума, дата, «щомісяця»), а обов’язкові платежі — як регулярні витрати. Тоді тут з’явиться розподіл по тижнях.</p>
                    <button type="button" className="lim-add" onClick={addRecurring}><Plus size={16} /> Додати регулярний платіж</button>
                </section>
            ) : (
                <>
                    <section className="lim-card pp-hero">
                        <small>Можна витратити цього тижня</small>
                        <strong className={freeThisWeek <= 0 ? "bad" : ""}>{formatMoney(freeThisWeek)} {symbol}</strong>
                        <em>~{formatMoney(freeThisWeek / 7)} {symbol} / день</em>
                        {freeBy.length > 0 && (
                            <div className="pp-chips">
                                {freeBy.map(({ income, part }) => (
                                    <span key={income.key}>з «{incLabel(income)}» — {formatMoney(part)} {symbol}</span>
                                ))}
                            </div>
                        )}
                        {uncovered > 0 && (
                            <p className="pp-warn"><AlertTriangle size={14} /> Не вистачає {formatMoney(uncovered)} {symbol} на обов’язкові платежі</p>
                        )}
                    </section>

                    {weekIncomes.length > 0 && (
                        <section className="lim-card">
                            <h4 className="pp-h">Надходження</h4>
                            {weekIncomes.map((inc) => {
                                const covered = inc.bills.reduce((s, b) => s + b.part, 0);
                                const reserved = inc.amount * reserve / 100;
                                const weeks = Math.max(1, Math.round((inc.until.getTime() - inc.date.getTime()) / DAY) / 7);
                                return (
                                    <div key={inc.key} className="pp-inc">
                                        <div className="pp-row">
                                            <b>{inc.item.name}</b>
                                            <span className="ok">+{formatMoney(inc.amount)} {symbol}</span>
                                        </div>
                                        <small>{fmtDay(inc.date)} · до наступної ЗП {fmtDay(inc.until)}</small>
                                        <div className="pp-split">
                                            <i className="bills" style={{ flex: covered }} />
                                            {reserved > 0 && <i className="save" style={{ flex: reserved }} />}
                                            <i className="free" style={{ flex: Math.max(0, inc.free) }} />
                                        </div>
                                        <ul className="pp-legend">
                                            <li><span className="dot bills" />Обов’язкові {formatMoney(covered)} {symbol}</li>
                                            {reserved > 0 && <li><span className="dot save" />Відкласти {formatMoney(reserved)} {symbol}</li>}
                                            <li><span className="dot free" />Вільно {formatMoney(inc.free)} {symbol} (~{formatMoney(inc.free / weeks)} / тиж.)</li>
                                        </ul>
                                        {inc.bills.length > 0 && (
                                            <div className="pp-covers">
                                                Покриває: {inc.bills.map(({ bill, part }) => `${bill.item.name} (${fmtDay(bill.date)}) ${formatMoney(part)}`).join(" · ")}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    <section className="lim-card">
                        <h4 className="pp-h">
                            Обов’язкові платежі <span>{formatMoney(billsTotal)} {symbol}</span>
                        </h4>
                        {weekBills.length === 0 ? (
                            <p className="lim-note">Цього тижня обов’язкових платежів немає</p>
                        ) : (
                            weekBills.map((bill) => (
                                <div key={bill.key} className="pp-bill">
                                    <div className="pp-row">
                                        <b>{bill.item.name}</b>
                                        <span>−{formatMoney(bill.amount)} {symbol}</span>
                                    </div>
                                    <small>
                                        {fmtDay(bill.date)} ·{" "}
                                        {bill.from.map(({ income, part }) =>
                                            bill.from.length > 1 ? `${formatMoney(part)} з «${incLabel(income)}»` : `з «${incLabel(income)}»`,
                                        ).join(", ")}
                                        {bill.uncovered > 0 && <span className="bad"> · не покрито {formatMoney(bill.uncovered)} {symbol}</span>}
                                    </small>
                                </div>
                            ))
                        )}
                    </section>

                    <label className="lim-card pp-reserve">
                        <span>Відкладати з кожної ЗП</span>
                        <input type="range" min={0} max={50} step={5} value={reserve} onChange={(e) => saveReserve(Number(e.target.value))} />
                        <b>{reserve}%</b>
                    </label>

                    <button type="button" className="lim-add" onClick={addRecurring}>
                        <Plus size={16} /> Додати ЗП або обов’язковий платіж
                    </button>
                </>
            )}
        </div>
    );
}
