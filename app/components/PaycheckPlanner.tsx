"use client";
import { useMemo, useState } from "react";
import type { RecurringItem, Account } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { ChevronLeft, ChevronRight, Plus, Wallet, AlertTriangle, Pencil, Trash2, X } from "lucide-react";

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const fmtDay = (d: Date) => new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(d);

export type IncomeDraft = { name: string; amount: number; accountId: string; frequency: "monthly" | "weekly"; nextRunAt: string };

// Найближча дата з цим числом місяця (сьогодні або пізніше)
function nextMonthDay(day: number): Date {
    const today = startOfDay(new Date());
    const make = (y: number, m: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()), 9);
    const d = make(today.getFullYear(), today.getMonth());
    return d >= today ? d : make(today.getFullYear(), today.getMonth() + 1);
}

function IncomeForm({
    initial,
    accounts,
    onSave,
    onRemove,
    onClose,
}: {
    initial?: RecurringItem;
    accounts: Account[];
    onSave: (d: IncomeDraft) => Promise<void>;
    onRemove?: () => void;
    onClose: () => void;
}) {
    const initDate = initial ? new Date(initial.next) : null;
    const [name, setName] = useState(initial?.name || "Зарплата ");
    const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
    const [accountId, setAccountId] = useState(initial?.accountId || String(accounts[0]?.id ?? ""));
    const [frequency, setFrequency] = useState<"monthly" | "weekly">(initial?.frequency === "weekly" ? "weekly" : "monthly");
    const [day, setDay] = useState(initDate && !Number.isNaN(initDate.getTime()) ? initDate.getDate() : 10);
    const [weekDate, setWeekDate] = useState(initDate && !Number.isNaN(initDate.getTime()) ? toDateKey(initDate) : toDateKey(new Date()));
    const [busy, setBusy] = useState(false);
    const valid = name.trim() && Number(amount) > 0 && accountId;
    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <form
                className="expense-modal lim-edit pp-form"
                onMouseDown={(e) => e.stopPropagation()}
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!valid) return;
                    setBusy(true);
                    try {
                        const next = frequency === "monthly" ? nextMonthDay(day) : new Date(`${weekDate}T09:00:00`);
                        await onSave({ name: name.trim(), amount: Number(amount), accountId, frequency, nextRunAt: next.toISOString() });
                        onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="lim-edit-head">
                    <b>{initial ? "Редагувати ЗП" : "Нова зарплата"}</b>
                    <button type="button" className="lim-x" onClick={onClose} aria-label="Закрити"><X size={18} /></button>
                </div>
                <label>
                    Чия / назва
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Зарплата Діма" autoFocus />
                </label>
                <label>
                    Приблизна сума
                    <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30000" />
                </label>
                <label>
                    На яку картку приходить
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                        {accounts.map((a) => (
                            <option key={a.id} value={String(a.id)}>{a.name} · {a.currency}</option>
                        ))}
                    </select>
                </label>
                <div className="lim-seg pp-freq">
                    <button type="button" className={frequency === "monthly" ? "on" : ""} onClick={() => setFrequency("monthly")}>Щомісяця</button>
                    <button type="button" className={frequency === "weekly" ? "on" : ""} onClick={() => setFrequency("weekly")}>Щотижня</button>
                </div>
                {frequency === "monthly" ? (
                    <label>
                        Якого числа приходить
                        <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} />
                        <small className="lim-note">Аванс і основну частину додай двома окремими ЗП.</small>
                    </label>
                ) : (
                    <label>
                        Найближча дата
                        <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
                    </label>
                )}
                <div className="lim-edit-actions">
                    {onRemove ? (
                        <button type="button" className="lim-del" onClick={() => { if (window.confirm("Видалити цю ЗП?")) { onRemove(); onClose(); } }}>
                            <Trash2 size={15} /> Видалити
                        </button>
                    ) : <span />}
                    <button type="submit" className="small-primary" disabled={!valid || busy}>{busy ? "Зберігаю…" : "Зберегти"}</button>
                </div>
            </form>
        </div>
    );
}

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
    accounts = [],
    saveIncome,
    removeRecurring,
}: {
    recurring: RecurringItem[];
    toBase: (amount: number, currency: string) => number;
    baseCurrency: string;
    addRecurring: () => void;
    accounts?: Account[];
    saveIncome?: (d: IncomeDraft, id?: string) => Promise<void>;
    removeRecurring?: (id: string) => void;
}) {
    const [incomeForm, setIncomeForm] = useState<RecurringItem | "new" | null>(null);
    const incomeItems = recurring.filter((r) => r.kind === "income");
    const openIncome = (r: RecurringItem | "new") => (saveIncome ? setIncomeForm(r) : addRecurring());
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

    const salaries = (
        <section className="lim-card">
            <h4 className="pp-h">Наші зарплати</h4>
            {incomeItems.map((r) => {
                const d = new Date(r.next);
                const when = r.frequency === "weekly"
                    ? `щотижня, ${new Intl.DateTimeFormat("uk-UA", { weekday: "long" }).format(d)}`
                    : r.frequency === "yearly" ? `щороку, ${fmtDay(d)}` : `щомісяця, ${d.getDate()} числа`;
                return (
                    <button type="button" key={r.id} className="pp-sal" onClick={() => openIncome(r)}>
                        <span>
                            <b>{r.name}</b>
                            <small>{when}</small>
                        </span>
                        <span className="ok">~{formatMoney(r.amount)} {currencySymbol(r.currency)}</span>
                        <Pencil size={14} />
                    </button>
                );
            })}
            <button type="button" className="lim-add pp-sal-add" onClick={() => openIncome("new")}>
                <Plus size={16} /> Додати ЗП
            </button>
        </section>
    );
    const form = incomeForm && saveIncome && (
        <IncomeForm
            initial={incomeForm === "new" ? undefined : incomeForm}
            accounts={accounts}
            onSave={(d) => saveIncome(d, incomeForm === "new" ? undefined : incomeForm.id)}
            onRemove={incomeForm !== "new" && removeRecurring ? () => removeRecurring(incomeForm.id) : undefined}
            onClose={() => setIncomeForm(null)}
        />
    );

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
                <>
                    <section className="lim-card pp-empty">
                        <Wallet size={28} />
                        <p>Вкажи, коли і скільки приблизно ви отримуєте. Обов’язкові платежі додавай як регулярні витрати — план розподілить ЗП по тижнях.</p>
                    </section>
                    {salaries}
                </>
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

                    {salaries}

                    <label className="lim-card pp-reserve">
                        <span>Відкладати з кожної ЗП</span>
                        <input type="range" min={0} max={50} step={5} value={reserve} onChange={(e) => saveReserve(Number(e.target.value))} />
                        <b>{reserve}%</b>
                    </label>

                    <button type="button" className="lim-add" onClick={addRecurring}>
                        <Plus size={16} /> Додати обов’язковий платіж
                    </button>
                </>
            )}
            {form}
        </div>
    );
}
