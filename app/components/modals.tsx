"use client";
import {useState, useRef, useEffect} from "react";
import type { Transaction, Account, GoalItem, DebtItem, RecurringItem, CategoryItem, BudgetItem, RuleItem } from "../types";
import { formatMoney, currencySymbol, crossRate, toDateKey } from "../lib/format";
import { BudgetIcon, BUDGET_ICON_NAMES, BUDGET_COLORS, MerchantIcon, guessIconFromTitle } from "../lib/icons";
import { EmptyState } from "./ScanReceipt";
import { evaluateExpression } from "../lib/transfers";
import { ModalHead } from "./modal-head";
import {
    ArrowDownLeft,
    ArrowLeftRight,
    ArrowUpRight,
    BarChart3,
    Check,
    CircleDollarSign,
    Sparkles,
    Trash2
} from "lucide-react";

export function ExpenseModal({
                          amount,
                          setAmount,
                          note,
                          setNote,
                          accounts,
                          categories,
                          debts,
                          goals,
                          budgets,
                          transactions,
                          submit,
                          submitTransfer,
                          close,
                      }: {
    amount: string;
    setAmount: (s: string) => void;
    note: string;
    setNote: (s: string) => void;
    accounts: Account[];
    categories: CategoryItem[];
    debts: DebtItem[];
    goals: GoalItem[];
    budgets: BudgetItem[];
    transactions: Transaction[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    submitTransfer?: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [debtId, setDebtId] = useState("");
    const [customDebtName, setCustomDebtName] = useState("");
    const [tab, setTab] = useState<"expense" | "income" | "transfer">("expense");
    const [transferToAccountId, setTransferToAccountId] = useState(String(accounts[1]?.id || accounts[0]?.id || ""));
    const [reduceCreditLimit, setReduceCreditLimit] = useState(false);
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    const [categoryId, setCategoryId] = useState("");
    const [repeat, setRepeat] = useState(false);
    const type = tab === "transfer" ? "expense" : tab;
    const account = accounts.find((item) => String(item.id) === accountId) || accounts[0];
    const transferToAccount = accounts.find((a) => String(a.id) === transferToAccountId);
    const accountOptions = accounts.map((item) => ({
        value: String(item.id),
        label: `${item.name} · ${item.currency}`,
    }));
    const sameCurrency = !account || !transferToAccount || account.currency === transferToAccount.currency;
    const showCreditToggle = tab === "transfer" && (transferToAccount?.creditLimit || 0) > 0;
    function changeType(next: "expense" | "income") {
        setTab(next);
        // Залишаємо категорію якщо вона підходить для нового типу
        const currentCat = categories.find((c) => c.id === categoryId);
        if (currentCat && currentCat.kind !== next) setCategoryId("");
    }
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal tall-modal"
                onSubmit={(e) => tab === "transfer" && submitTransfer ? submitTransfer(e) : submit(e)}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <ModalHead
                    label="Деталізація операції"
                    title={tab === "transfer" ? "Переказ між рахунками" : tab === "income" ? "Новий дохід" : "Нова витрата"}
                    close={close}
                />
                <div className="operation-type">
                    <button
                        type="button"
                        className={tab === "expense" ? "active" : ""}
                        onClick={() => changeType("expense")}
                    >
                        <ArrowUpRight /> Витрата
                    </button>
                    <button
                        type="button"
                        className={tab === "income" ? "active" : ""}
                        onClick={() => changeType("income")}
                    >
                        <ArrowDownLeft /> Дохід
                    </button>
                    {submitTransfer && (
                        <button
                            type="button"
                            className={tab === "transfer" ? "active" : ""}
                            onClick={() => setTab("transfer")}
                        >
                            <ArrowLeftRight size={15} /> Переказ
                        </button>
                    )}
                </div>
                <input type="hidden" name="type" value={type} />
                <label className="amount-field">
                    <span>{currencySymbol(account?.currency || "UAH")}</span>
                    <input
                        autoFocus
                        required
                        inputMode="decimal"
                        placeholder="0"
                        value={amount}
                        onChange={(event) => {
                            const v = event.target.value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
                            setAmount(v);
                        }}
                    />
                </label>
                {tab !== "transfer" && account && account.currency !== "UAH" && (
                    <label>
                        Сума з чека, ₴ <small style={{ color: "var(--text-secondary)" }}>(необов'язково — різниця за курсом НБУ піде в комісію)</small>
                        <input name="receiptAmount" inputMode="decimal" placeholder="напр. 1000" />
                    </label>
                )}
                <WheelField
                    name={tab === "transfer" ? "from" : "account"}
                    label={tab === "transfer" ? "З рахунку" : "Рахунок"}
                    options={accountOptions}
                    value={accountId}
                    onChange={setAccountId}
                />
                {tab === "transfer" && (
                    <div style={{ position: "relative" }}>
                        <WheelField
                            name="to"
                            label="На рахунок"
                            options={accountOptions}
                            value={transferToAccountId}
                            onChange={setTransferToAccountId}
                        />
                        <button
                            type="button"
                            onClick={() => { const tmp = accountId; setAccountId(transferToAccountId); setTransferToAccountId(tmp); }}
                            style={{
                                position: "absolute", top: -18, right: 0,
                                background: "none", border: "none",
                                color: "var(--purple)", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4,
                                fontSize: 12, fontWeight: 600, padding: "2px 4px",
                            }}
                            title="Поміняти місцями"
                        >
                            <ArrowLeftRight size={12} /> Змінити
                        </button>
                    </div>
                )}
                {tab === "transfer" && (
                    <>
                        <input type="hidden" name="sent" value={amount} />
                        <input type="hidden" name="received" value={amount} />
                        <input type="hidden" name="rate" value="1" />
                        <input type="hidden" name="fee" value="0" />
                        <input type="hidden" name="feeCurrency" value={account?.currency || "UAH"} />
                        <DateWheelField name="bookedAt" />
                        {!sameCurrency && (
                            <div className="form-message" style={{ background: "var(--orange, #f4b740)22", color: "var(--orange, #b87a00)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                                Для переказу між різними валютами скористайся окремою формою переказу
                            </div>
                        )}
                        {sameCurrency && Number(amount) > 0 && (
                            <div className="form-message success">
                                Надійде: {account?.currency || "UAH"} {formatMoney(Number(amount))}
                            </div>
                        )}
                        {showCreditToggle && (
                            <label className="check impulse">
                                <input
                                    name="reduceCreditLimit"
                                    type="checkbox"
                                    checked={reduceCreditLimit}
                                    onChange={(e) => setReduceCreditLimit(e.target.checked)}
                                /> Врахувати як погашення кредитного ліміту
                            </label>
                        )}
                    </>
                )}
                {tab !== "transfer" && <CategoryGridField
                    categories={categories}
                    type={type}
                    value={categoryId}
                    onChange={setCategoryId}
                />}
                {tab !== "transfer" && type === "expense" && categoryId && (() => {
                    const now = new Date();
                    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    const selectedCategory = categories.find((c) => c.id === categoryId);
                    const activeBudget = budgets.find(
                        (b) => b.categoryId === categoryId && b.period === "month" && b.month.startsWith(monthKey),
                    );
                    if (!activeBudget || !selectedCategory) return null;
                    const spent = transactions
                        .filter(
                            (t) =>
                                t.category === selectedCategory.name &&
                                t.amount < 0 &&
                                t.kind !== "transfer" &&
                                t.kind !== "exchange" &&
                                t.bookedAt?.startsWith(monthKey),
                        )
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                    const evaluated = evaluateExpression(amount);
                    const entered = evaluated !== null ? evaluated : Number(amount.replace(",", ".")) || 0;
                    const projected = spent + entered;
                    const remaining = Math.max(0, activeBudget.limit - spent);
                    const overLimit = projected > activeBudget.limit;
                    return (
                        <div className={overLimit ? "category-budget-mini over" : "category-budget-mini"}>
                            <div className="category-budget-mini-head">
                                <span>{selectedCategory.name}</span>
                                <span>
                  Залишилось {currencySymbol(activeBudget.currency)} {formatMoney(remaining)} з{" "}
                                    {formatMoney(activeBudget.limit)}
                </span>
                            </div>
                            <div className="category-budget-mini-bar">
                                <i style={{ width: `${Math.min(100, (projected / activeBudget.limit) * 100)}%` }} />
                            </div>
                        </div>
                    );
                })()}
                {tab !== "transfer" && <label>
                    Валюта
                    <input name="currency" value={account?.currency || "UAH"} readOnly />
                </label>}
                {tab !== "transfer" && <DateWheelField name="date" />}
                {tab !== "transfer" && <details className="split-details" open={repeat}>
                    <summary>{type === "income" ? "Плановий дохід" : "Повторювати витрату"}</summary>
                    <label className="check impulse">
                        <input
                            name="repeat"
                            type="checkbox"
                            checked={repeat}
                            onChange={(e) => setRepeat(e.target.checked)}
                        />{" "}
                        {type === "income" ? "Позначити як регулярний дохід" : "Створити регулярне нагадування"}
                    </label>
                    <div className="form-two">
                        <label>
                            Період
                            <select name="repeatFrequency">
                                <option value="weekly">Щотижня</option>
                                <option value="monthly">Щомісяця</option>
                                <option value="yearly">Щороку</option>
                            </select>
                        </label>
                        <label>
                            Число місяця
                            <input name="repeatDay" type="number" min="1" max="28" placeholder="Наприклад, 5" />
                        </label>
                    </div>
                </details>}
                <label>
                    Нотатка
                    <input
                        placeholder={tab === "transfer" ? "Наприклад, поповнення з основної" : type === "income" ? "Наприклад, зарплата" : "Наприклад, кава"}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                    />
                </label>
                {tab !== "transfer" && <label>
                    Теги
                    <input name="tags" placeholder="#відпустка #робота" />
                </label>}
                {tab !== "transfer" && type === "expense" && goals.length > 0 && (
                    <label>
                        Покласти в банку (необов'язково)
                        <select name="contributeGoalId" defaultValue="">
                            <option value="">Не класти в банку</option>
                            {goals.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                {tab !== "transfer" && type === "expense" && (
                    <>
                        <details className="split-details">
                            <summary>Погашення боргу</summary>
                            <WheelField
                                name="_debtIdPicker"
                                label="Борг"
                                options={[
                                    { value: "", label: "Не пов'язано з боргом" },
                                    ...debts.map((d) => ({
                                        value: d.id,
                                        label: `${d.person} · ${d.currency} ${formatMoney(d.amount)}`,
                                    })),
                                    { value: "__other__", label: "Інший борг (не в списку)" },
                                ]}
                                value={debtId}
                                onChange={(v) => { setDebtId(v); if (v !== "__other__") setCustomDebtName(""); }}
                            />
                            {debtId === "__other__" && (
                                <label style={{ marginTop: 8 }}>
                                    Кому повертаєте
                                    <input
                                        name="customDebtName"
                                        placeholder="Ім'я або назва боргу"
                                        value={customDebtName}
                                        onChange={(e) => setCustomDebtName(e.target.value)}
                                        style={{ marginTop: 6 }}
                                    />
                                </label>
                            )}
                            <input type="hidden" name="debtId" value={debtId === "__other__" ? "" : debtId} />
                            <small className="field-help">
                                {debtId && debtId !== "__other__"
                                    ? "Сума цієї витрати спишеться з залишку обраного боргу."
                                    : debtId === "__other__"
                                        ? "Буде збережено як повернення боргу без прив'язки до списку боргів."
                                        : "Оберіть борг, якщо ця витрата є поверненням."}
                            </small>
                        </details>
                        <details className="split-details">
                            <summary>Розділити чек</summary>
                            <div className="form-two">
                                <label>
                                    Загальна сума
                                    <input name="splitTotal" type="number" min="0" step=".01" />
                                </label>
                                <label>
                                    Моя частка
                                    <input name="personalShare" type="number" min="0" step=".01" />
                                </label>
                            </div>
                            <label>
                                Учасники
                                <input name="splitParticipants" placeholder="Діма, Оля, Андрій" />
                            </label>
                            <small className="field-help">
                                Залишок буде порівну розподілений між учасниками, а з балансу спишеться лише ваша
                                частка.
                            </small>
                        </details>
                        <label className="check impulse">
                            <input name="impulse" type="checkbox" /> Імпульсивна витрата
                        </label>
                    </>
                )}
                <button className="primary">
                    {tab === "transfer" ? "Виконати переказ" : tab === "income" ? "Додати дохід" : "Додати витрату"}
                </button>
            </form>
        </div>
    );
}
export function WheelField({
                               name,
                               label,
                               options,
                               value: controlled,
                               onChange,
                               defaultValue,
                           }: {
    name: string;
    label: string;
    options: { value: string; label: string }[];
    value?: string;
    onChange?: (value: string) => void;
    defaultValue?: string;
}) {
    const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? ""),
        value = controlled === undefined ? internal : controlled,
        selected = options.find((option) => option.value === value);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    function select(next: string) {
        if (controlled === undefined) setInternal(next);
        onChange?.(next);
    }
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
                detailsRef.current.removeAttribute("open");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (
        <label className="picker-label">
            {label}
            <details className="compact-picker" ref={detailsRef}>
                <summary>{selected?.label || "Оберіть"}</summary>
                <div className="picker-wheel">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={`${name}-${option.value}`}
                            className={option.value === value ? "selected" : ""}
                            onClick={(event) => {
                                select(option.value);
                                event.currentTarget.closest("details")?.removeAttribute("open");
                            }}
                        >
                            {option.label}
                            {option.value === value && <Check />}
                        </button>
                    ))}
                </div>
            </details>
            <input type="hidden" name={name} value={value} />
        </label>
    );
}
export function CategoryGridField({
                               categories,
                               type,
                               value,
                               onChange,
                           }: {
    categories: CategoryItem[];
    type: "expense" | "income";
    value: string;
    onChange: (v: string) => void;
}) {
    const seen = new Set<string>();
    const normalize = (name: string) =>
        name
            .trim()
            .toLowerCase()
            .replace(/['’ʼ`]/g, "");
    const filtered = categories
        .filter((c) => c.kind === type)
        .filter((c) => {
            const key = normalize(c.name);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    return (
        <div className="category-grid-field">
            <label>Категорія</label>
            <div className="category-grid">
                <button
                    type="button"
                    className={value === "" ? "selected" : ""}
                    onClick={() => onChange("")}
                >
          <span
              className="category-grid-icon"
              style={{ background: "var(--line)", color: "var(--muted)" }}
          >
            <CircleDollarSign size={14} />
          </span>
                    <small>Без категорії</small>
                </button>
                {filtered.map((c) => (
                    <button
                        type="button"
                        key={c.id}
                        className={value === c.id ? "selected" : ""}
                        onClick={() => onChange(c.id)}
                    >
            <span
                className="category-grid-icon"
                style={{ background: `${c.color}22`, color: c.color }}
            >
              <BudgetIcon name={c.icon} size={14} />
            </span>
                        <small>{c.name}</small>
                    </button>
                ))}
            </div>
            <input type="hidden" name="category" value={value} />
        </div>
    );
}
export function DateWheelField({ name }: { name: string }) {
    const today = new Date();
    const todayKey = toDateKey(today);
    const [selectedDate, setSelectedDate] = useState<string>(todayKey);
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const selectedLabel = new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(selectedDate + "T12:00:00"));

    function prevMonth() {
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else setViewMonth((m) => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else setViewMonth((m) => m + 1);
    }

    const startDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [
        ...Array(startDow).fill(null) as null[],
        ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(viewYear, viewMonth, i + 1))),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(
        new Date(viewYear, viewMonth, 1),
    );
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

    return (
        <label className="picker-label">
            Дата
            <details className="compact-picker">
                <summary>{selectedLabel}</summary>
                <div style={{
                    position: "absolute", zIndex: 40, left: 0, right: 0, top: "calc(100% + 5px)",
                    background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16,
                    padding: 12, boxShadow: "0 22px 55px rgba(26,30,27,.2)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <button type="button" onClick={prevMonth} style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                        }}>‹</button>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: "var(--text)" }}>{monthLabel}</span>
                        <button type="button" onClick={nextMonth} style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                        }}>›</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                        {dayNames.map((d) => (
                            <span key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{d}</span>
                        ))}
                        {cells.map((dateKey, idx) =>
                            dateKey === null ? (
                                <span key={`empty-${idx}`} />
                            ) : (
                                <button
                                    key={dateKey}
                                    type="button"
                                    style={{
                                        aspectRatio: "1", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                        background: dateKey === selectedDate ? "var(--purple)" : "transparent",
                                        color: dateKey === selectedDate ? "#fff" : dateKey === todayKey ? "var(--purple)" : "var(--text)",
                                        fontWeight: dateKey === selectedDate || dateKey === todayKey ? 700 : 400,
                                    }}
                                    onClick={(e) => {
                                        setSelectedDate(dateKey);
                                        (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                    }}
                                >
                                    {new Date(dateKey + "T12:00:00").getDate()}
                                </button>
                            ),
                        )}
                    </div>
                </div>
            </details>
            <input type="hidden" name={name} value={selectedDate} />
        </label>
    );
}
export function DateTimeField({
                           label,
                           name,
                           date,
                           time,
                           onDateChange,
                           onTimeChange,
                       }: {
    label: string;
    name: string;
    date: string;
    time: string;
    onDateChange: (d: string) => void;
    onTimeChange: (t: string) => void;
}) {
    const todayKey = toDateKey(new Date());
    const [viewYear, setViewYear] = useState(() => Number(date.split("-")[0]));
    const [viewMonth, setViewMonth] = useState(() => Number(date.split("-")[1]) - 1);

    function prevMonth() {
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else setViewMonth((m) => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else setViewMonth((m) => m + 1);
    }

    const startDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [
        ...Array(startDow).fill(null) as null[],
        ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(viewYear, viewMonth, i + 1))),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(
        new Date(viewYear, viewMonth, 1),
    );
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    const summaryLabel = date
        ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(date + "T12:00:00"),
    ) + (time ? ` ${time}` : "")
        : "Оберіть дату";

    return (
        <div>
            <div className="picker-label">
                {label}
                <details className="compact-picker">
                    <summary>
                        {date
                            ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(
                                new Date(date + "T12:00:00"),
                            )
                            : "Оберіть дату"}
                    </summary>
                    <div style={{
                        position: "absolute", zIndex: 40, left: 0, right: 0, top: "calc(100% + 5px)",
                        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16,
                        padding: 12, boxShadow: "0 22px 55px rgba(26,30,27,.2)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <button type="button" onClick={prevMonth} style={{
                                background: "transparent", border: "none", cursor: "pointer",
                                fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                            }}>‹</button>
                            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: "var(--text)" }}>{monthLabel}</span>
                            <button type="button" onClick={nextMonth} style={{
                                background: "transparent", border: "none", cursor: "pointer",
                                fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                            }}>›</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                            {dayNames.map((d) => (
                                <span key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{d}</span>
                            ))}
                            {cells.map((dateKey, idx) =>
                                dateKey === null ? (
                                    <span key={`empty-${idx}`} />
                                ) : (
                                    <button
                                        key={dateKey}
                                        type="button"
                                        style={{
                                            aspectRatio: "1", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                            background: dateKey === date ? "var(--purple)" : "transparent",
                                            color: dateKey === date ? "#fff" : dateKey === todayKey ? "var(--purple)" : "var(--text)",
                                            fontWeight: dateKey === date || dateKey === todayKey ? 700 : 400,
                                        }}
                                        onClick={(e) => {
                                            onDateChange(dateKey);
                                            (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                        }}
                                    >
                                        {new Date(dateKey + "T12:00:00").getDate()}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </details>
            </div>
            <div className="picker-label" style={{ marginTop: 8 }}>
                Час
                <TimeField value={time} onChange={onTimeChange} />
            </div>
            <input type="hidden" name={name} value={`${date}T${time}`} />
        </div>
    );
}
export function CalendarPickerInput({
                                 value,
                                 onChange,
                                 placeholder,
                             }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const todayKey = toDateKey(new Date());
    const [viewYear, setViewYear] = useState(() =>
        value ? Number(value.split("-")[0]) : new Date().getFullYear(),
    );
    const [viewMonth, setViewMonth] = useState(() =>
        value ? Number(value.split("-")[1]) - 1 : new Date().getMonth(),
    );
    function prevMonth() {
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else setViewMonth((m) => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else setViewMonth((m) => m + 1);
    }
    const startDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [
        ...Array(startDow).fill(null) as null[],
        ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(viewYear, viewMonth, i + 1))),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const monthLabel = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(
        new Date(viewYear, viewMonth, 1),
    );
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    const summaryLabel = value
        ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric" }).format(
            new Date(value + "T12:00:00"),
        )
        : (placeholder || "Будь-яка");
    return (
        <details className="compact-picker">
            <summary>{summaryLabel}</summary>
            <div style={{
                position: "absolute", zIndex: 50, left: 0, top: "calc(100% + 5px)", width: 260,
                background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16,
                padding: 12, boxShadow: "0 22px 55px rgba(26,30,27,.2)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <button type="button" onClick={prevMonth} style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                    }}>‹</button>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: "var(--text)" }}>{monthLabel}</span>
                    <button type="button" onClick={nextMonth} style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        fontSize: 20, lineHeight: 1, color: "var(--text)", padding: "2px 8px", borderRadius: 8,
                    }}>›</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
                    {dayNames.map((d) => (
                        <span key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--muted)", fontWeight: 600, padding: "3px 0" }}>{d}</span>
                    ))}
                    {cells.map((dateKey, idx) =>
                        dateKey === null ? <span key={`e-${idx}`} /> : (
                            <button
                                key={dateKey}
                                type="button"
                                style={{
                                    aspectRatio: "1", border: "none", borderRadius: 6, fontSize: 10, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                                    background: dateKey === value ? "var(--purple)" : "transparent",
                                    color: dateKey === value ? "#fff" : dateKey === todayKey ? "var(--purple)" : "var(--text)",
                                    fontWeight: dateKey === value || dateKey === todayKey ? 700 : 400,
                                }}
                                onClick={(e) => {
                                    onChange(dateKey);
                                    (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                }}
                            >
                                {new Date(dateKey + "T12:00:00").getDate()}
                            </button>
                        ),
                    )}
                </div>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            onChange("");
                            (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                        }}
                        style={{
                            marginTop: 8, width: "100%", border: "none", background: "transparent",
                            color: "var(--muted)", fontSize: 10, cursor: "pointer", padding: "4px 0",
                        }}
                    >
                        Очистити
                    </button>
                )}
            </div>
        </details>
    );
}
export function AccountModal({
                          account,
                          submit,
                          close,
                          openTransactions,
                      }: {
    account: Account | null;
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
    openTransactions: (name: string) => void;
}) {
    const banks = [
            "monobank",
            "ПриватБанк",
            "ПУМБ",
            "Ощадбанк",
            "Райффайзен Банк",
            "А-Банк",
            "Сенс Банк",
            "Укрсиббанк",
            "ОТП Банк",
            "Кредобанк",
            "Пайонер",
            "Готівка",
            "Інший",
        ],
        selected = banks.includes(account?.bank || "") ? account?.bank : "Інший";
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead
                    label={account ? "Редагування активу" : "Новий актив"}
                    title={account ? "Змінити рахунок" : "Додати рахунок"}
                    close={close}
                />
                <label>
                    Назва
                    <input
                        name="name"
                        defaultValue={account?.name}
                        placeholder="Наприклад, Зарплатна картка"
                        required
                    />
                </label>
                <div className="form-two">
                    <label>
                        Банк
                        <select name="bank" defaultValue={selected}>
                            {banks.map((bank) => (
                                <option key={bank}>{bank}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Власник
                        <input name="owner" defaultValue={account?.owner} placeholder="Мій" />
                    </label>
                </div>
                <div className="form-two">
                    <label>
                        Валюта
                        <select name="currency" defaultValue={account?.currency || "UAH"}>
                            <option>UAH</option>
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                            <option>PLN</option>
                        </select>
                    </label>
                    <label>
                        Баланс
                        <input
                            name="balance"
                            type="number"
                            step=".01"
                            defaultValue={account?.balance}
                            placeholder="0"
                        />
                    </label>
                </div>
                <label>
                    Колір картки
                    <input name="cardColor" type="color" defaultValue={account?.color || "#252629"} />
                </label>
                <label>
                    Останні 4 цифри картки (для автопідв'язки Monobank)
                    <input
                        name="cardLast4"
                        type="text"
                        maxLength={4}
                        pattern="[0-9]{4}"
                        placeholder="Наприклад, 4521"
                        defaultValue={account?.cardLast4}
                    />
                </label>
                <label>
                    Власний скін картки (фото)
                    <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const supabase = (await import("@/lib/supabase/client")).createClient();
                            const path = `${Date.now()}-${file.name}`;
                            const { error } = await supabase.storage.from("card-skins").upload(path, file);
                            if (error) return alert(error.message);
                            const { data } = supabase.storage.from("card-skins").getPublicUrl(path);
                            const input = document.querySelector(
                                'input[name="cardImageUrl"]',
                            ) as HTMLInputElement;
                            if (input) input.value = data.publicUrl;
                        }}
                    />
                </label>
                <input type="hidden" name="cardImageUrl" defaultValue={account?.cardImage} />
                <details
                    className="split-details"
                    open={Boolean(account?.creditLimit || account?.graceEnd)}
                >
                    <summary>Кредитна картка</summary>
                    <div className="form-two">
                        <label>
                            Кредитний ліміт
                            <input
                                name="creditLimit"
                                type="number"
                                min="0"
                                defaultValue={account?.creditLimit}
                                placeholder="0"
                            />
                        </label>
                        <label>
                            Кінець грейс-періоду
                            <input name="graceEnd" type="date" defaultValue={account?.graceEnd?.slice(0, 10)} />
                        </label>
                        <label>
                            Пільговий баланс (до сплати)
                            <input
                                name="graceBalance"
                                type="number"
                                min="0"
                                step=".01"
                                defaultValue={account?.graceBalance}
                                placeholder="Наприклад, 4500"
                            />
                        </label>
                    </div>
                </details>
                <div className="form-two">
                    <button className="primary">{account ? "Зберегти зміни" : "Створити рахунок"}</button>
                    {account && (
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => openTransactions(account.name)}
                        >
                            Переглянути операції
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
export function GoalModal({
                       goal,
                       accounts,
                       submit,
                       close,
                   }: {
    goal: GoalItem | null;
    accounts: Account[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [assetType, setAssetType] = useState(goal?.assetType || "savings");
    const [autoTopup, setAutoTopup] = useState(Boolean(goal?.sourceAccountId));
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal tall-modal"
                onSubmit={submit}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead
                    label="Накопичення"
                    title={goal ? "Редагувати банку" : "Нова банка"}
                    close={close}
                />
                <label>
                    Назва
                    <input name="name" required defaultValue={goal?.name} placeholder="Резервний фонд" />
                </label>
                <div className="form-two">
                    <label>
                        Цільова сума
                        <input name="target" type="number" min="1" required defaultValue={goal?.target} />
                    </label>
                    <label>
                        Вже накопичено
                        <input
                            name="current"
                            type="number"
                            min="0"
                            defaultValue={goal?.current ?? 0}
                            disabled={Boolean(goal)}
                        />
                    </label>
                </div>
                <div className="form-two">
                    <label>
                        Валюта
                        <select name="currency" defaultValue={goal?.currency || "UAH"}>
                            <option>UAH</option>
                            <option>USD</option>
                            <option>EUR</option>
                        </select>
                    </label>
                    <label>
                        Дата (необов'язково)
                        <input name="date" type="date" defaultValue={goal?.date?.slice(0, 10)} />
                    </label>
                </div>
                <label>
                    Тип активу
                    <select name="assetType" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                        <option value="savings">Накопичення (готівка/банка)</option>
                        <option value="deposit">Депозит</option>
                        <option value="bond">Облігація</option>
                        <option value="security">Цінний папір</option>
                    </select>
                </label>
                {assetType !== "savings" && (
                    <div className="form-two">
                        <label>
                            Відсоток прибутку на рік, %
                            <input
                                name="annualRate"
                                type="number"
                                min="0"
                                step=".01"
                                defaultValue={goal?.annualRate}
                            />
                        </label>
                        <label className="check impulse" style={{ alignSelf: "end" }}>
                            <input
                                name="compoundInterest"
                                type="checkbox"
                                defaultChecked={goal?.compoundInterest}
                            />{" "}
                            Капіталізація відсотків
                        </label>
                    </div>
                )}
                <label>
                    Колір
                    <input name="color" type="color" defaultValue={goal?.color || "#6558e8"} />
                </label>
                <label className="check impulse">
                    <input
                        type="checkbox"
                        checked={autoTopup}
                        onChange={(e) => setAutoTopup(e.target.checked)}
                    />{" "}
                    Підключити автопоповнення
                </label>
                {autoTopup && (
                    <>
                        <label>
                            З якого рахунку
                            <select
                                name="sourceAccountId"
                                defaultValue={goal?.sourceAccountId}
                                required={autoTopup}
                            >
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} · {a.currency}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="form-two">
                            <label>
                                Округлення залишку до
                                <input
                                    name="roundBalanceTo"
                                    type="number"
                                    min="0"
                                    step=".01"
                                    placeholder="Наприклад, 100"
                                    defaultValue={goal?.roundBalanceTo}
                                />
                            </label>
                            <label>
                                Округляти витрати до
                                <input
                                    name="roundExpenseTo"
                                    type="number"
                                    min="0"
                                    step=".01"
                                    placeholder="Наприклад, 10"
                                    defaultValue={goal?.roundExpenseTo}
                                />
                            </label>
                        </div>
                        <label>
                            Відсоток від кожної витрати, %
                            <input
                                name="expensePercent"
                                type="number"
                                min="0"
                                max="100"
                                step=".1"
                                placeholder="Наприклад, 1"
                                defaultValue={goal?.expensePercent}
                            />
                        </label>
                        <small className="field-help">
                            Округлення залишку рахується раз на добу. Округлення витрат і відсоток від витрат —
                            одразу при кожній новій витраті з обраного рахунку.
                        </small>
                    </>
                )}
                <button className="primary">{goal ? "Зберегти зміни" : "Створити банку"}</button>
            </form>
        </div>
    );
}
export function GoalActionModal({
                             action,
                             accounts,
                             withdraw,
                             contribute,
                             breakGoal,
                             close,
                         }: {
    action: { goal: GoalItem; mode: "withdraw" | "break" | "history" | "contribute" };
    accounts: Account[];
    withdraw: (id: string, amount: number, targetAccountId: string) => void;
    contribute: (id: string, amount: number, accountId: string) => void;
    breakGoal: (id: string, targetAccountId: string) => void;
    close: () => void;
}) {
    const { goal, mode } = action;
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    const [history, setHistory] = useState<
        { id: string; amount: number; kind: string; note: string; created_at: string }[]
    >([]);
    const [loadingHistory, setLoadingHistory] = useState(mode === "history");
    useEffect(() => {
        if (mode !== "history") return;
        fetch(`/api/finance/goal-history?goalId=${goal.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setHistory(data?.transactions || []))
            .finally(() => setLoadingHistory(false));
    }, [mode, goal.id]);
    const symbol = currencySymbol(goal.currency);
    if (mode === "history")
    { // @ts-ignore
        return (
            <div className="modal-backdrop" onMouseDown={close}>
                <div className="expense-modal tall-modal" onMouseDown={(e) => e.stopPropagation()}>
                    <ModalHead label={goal.name} title="Історія операцій" close={close} />
                    {loadingHistory ? (
                        <p className="empty-inline">Завантаження…</p>
                    ) : history.length ? (
                        <div className="goal-history-list">
                            {history.map((h) => (
                                <div key={h.id} className="goal-history-row">
                        <span>
                          {h.kind === "withdrawal" ? (
                              <ArrowUpRight size={14} />
                          ) : h.kind === "interest" ? (
                              <Sparkles size={14} />
                          ) : (
                              <ArrowDownLeft size={14} />
                          )}
                        </span>
                                    <div>
                                        <strong>{h.note || h.kind}</strong>
                                        <small>{new Date(h.created_at).toLocaleString("uk-UA")}</small>
                                    </div>
                                    <b className={h.amount < 0 ? "" : "income-amount"}>
                                        {h.amount < 0 ? "−" : "+"} {symbol} {formatMoney(h.amount)}
                                    </b>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={<BarChart3 />} text="Операцій по цій цілі ще немає" />
                    )}
                </div>
            </div>
        );
    }
    if (mode === "break")
    { // @ts-ignore
        return (
            <div className="modal-backdrop" onMouseDown={close}>
                <form
                    className="expense-modal"
                    onSubmit={(e) => {
                        e.preventDefault();
                        breakGoal(goal.id, accountId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ModalHead label={goal.name} title="Розбити банку" close={close} />
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                        Уся сума {symbol} {formatMoney(goal.current)} перейде на обраний рахунок. Ціль буде
                        видалено назавжди.
                    </p>
                    <label>
                        Куди зарахувати
                        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} · {a.currency}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button className="primary" style={{ background: "#d94b4b" }}>
                        Розбити та закрити ціль
                    </button>
                </form>
            </div>
        );
    }
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (Number(amount) <= 0) return;
                    if (mode === "contribute") contribute(goal.id, Number(amount), accountId);
                    else withdraw(goal.id, Number(amount), accountId);
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead label={goal.name} title={mode === "contribute" ? "Поповнити банку" : "Зняти кошти"} close={close} />
                {mode === "contribute" && (
                    <label>
                        З рахунку
                        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} · {a.currency}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <label className="amount-field">
                    <span>{symbol}</span>
                    <input
                        autoFocus
                        required
                        inputMode="decimal"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </label>
                {mode !== "contribute" && (
                    <>
                        <small className="field-help">
                            Доступно: {symbol} {formatMoney(goal.current)}
                        </small>
                        <label>
                            Куди зарахувати
                            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} · {a.currency}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                )}
                <button className="primary">{mode === "contribute" ? "Покласти" : "Зняти кошти"}</button>
            </form>
        </div>
    );
}
export function DebtModal({
                       accounts,
                       categories,
                       submit,
                       close,
                   }: {
    accounts: Account[];
    categories: CategoryItem[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [isInstallment, setIsInstallment] = useState(false);
    const [autoDebit, setAutoDebit] = useState(false);
    const [totalAmount, setTotalAmount] = useState("");
    const [months, setMonths] = useState("");
    const perMonth =
        isInstallment && Number(totalAmount) > 0 && Number(months) > 0
            ? Number(totalAmount) / Number(months)
            : 0;
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Облік зобов’язань" title="Новий борг" close={close} />
                <label>
                    Людина або організація
                    <input name="person" required placeholder="Олексій" />
                </label>
                <div className="form-two">
                    <label>
                        Напрям
                        <select name="direction">
                            <option value="owed_to_me">Мені винні</option>
                            <option value="i_owe">Я винна</option>
                        </select>
                    </label>
                    <label>
                        Загальна сума
                        <input
                            name="amount"
                            type="number"
                            min="1"
                            required
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                        />
                    </label>
                </div>
                <div className="form-two">
                    <label>
                        Валюта
                        <select name="currency">
                            <option>UAH</option>
                            <option>USD</option>
                            <option>EUR</option>
                        </select>
                    </label>
                    <label>
                        Повернути до
                        <input name="date" type="date" />
                    </label>
                </div>
                <label>
                    Нотатка
                    <input name="note" placeholder="За квитки" />
                </label>
                <label className="check impulse">
                    <input
                        type="checkbox"
                        checked={isInstallment}
                        onChange={(e) => {
                            setIsInstallment(e.target.checked);
                            if (!e.target.checked) setAutoDebit(false);
                        }}
                    />{" "}
                    Розстрочка (безвідсоткова, оплата частинами)
                </label>
                <input type="hidden" name="isInstallment" value={isInstallment ? "on" : ""} />
                {isInstallment && (
                    <>
                        <label>
                            Кількість місяців
                            <input
                                name="installmentMonths"
                                type="number"
                                min="1"
                                max="60"
                                placeholder="Наприклад, 6"
                                value={months}
                                onChange={(e) => setMonths(e.target.value)}
                            />
                        </label>
                        {perMonth > 0 && (
                            <div className="form-message success">
                                Щомісяця приблизно: {formatMoney(perMonth)} грн
                            </div>
                        )}
                        <label className="check impulse">
                            <input
                                type="checkbox"
                                checked={autoDebit}
                                onChange={(e) => setAutoDebit(e.target.checked)}
                            />{" "}
                            Додати автосписання щомісяця
                        </label>
                        <input type="hidden" name="autoDebit" value={autoDebit ? "on" : ""} />
                        {autoDebit && (
                            <div className="form-two">
                                <label>
                                    Списувати з рахунку
                                    <select name="autoAccount" required={autoDebit}>
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name} · {a.currency}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Категорія
                                    <select name="autoCategory">
                                        <option value="">Без категорії</option>
                                        {categories
                                            .filter((c) => c.kind === "expense")
                                            .map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                            </div>
                        )}
                        {autoDebit && (
                            <label>
                                Дата першого списання
                                <input name="autoFirstDate" type="datetime-local" required={autoDebit} />
                            </label>
                        )}
                    </>
                )}
                <button className="primary">Додати борг</button>
            </form>
        </div>
    );
}
export function SplitBillModal({
                            submit,
                            close,
                        }: {
    submit: (participants: { person: string; amount: number }[], totalNote: string) => void;
    close: () => void;
}) {
    const [total, setTotal] = useState("");
    const [note, setNote] = useState("");
    const [people, setPeople] = useState<string[]>(["", ""]);
    const perPerson =
        people.filter((p) => p.trim()).length && Number(total) > 0
            ? Number(total) / people.filter((p) => p.trim()).length
            : 0;
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={(e) => {
                    e.preventDefault();
                    const valid = people.map((p) => p.trim()).filter(Boolean);
                    if (!valid.length || !Number(total)) return;
                    submit(
                        valid.map((person) => ({ person, amount: Math.round(perPerson * 100) / 100 })),
                        note,
                    );
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead label="Спільні витрати" title="Розділити чек" close={close} />
                <label>
                    Загальна сума
                    <input
                        type="number"
                        min="1"
                        required
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                    />
                </label>
                <label>
                    За що
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Вечеря в ресторані"
                    />
                </label>
                <label>Учасники (крім тебе)</label>
                {people.map((p, i) => (
                    <div key={i} className="form-two">
                        <input
                            value={p}
                            onChange={(e) =>
                                setPeople((v) => v.map((x, idx) => (idx === i ? e.target.value : x)))
                            }
                            placeholder={`Ім'я ${i + 1}`}
                        />
                        {people.length > 2 && (
                            <button
                                type="button"
                                className="icon-button danger"
                                onClick={() => setPeople((v) => v.filter((_, idx) => idx !== i))}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" className="secondary" onClick={() => setPeople((v) => [...v, ""])}>
                    + Додати учасника
                </button>
                {perPerson > 0 && (
                    <div className="form-message success">Кожен винен: {formatMoney(perPerson)} грн</div>
                )}
                <button className="primary">Створити борги</button>
            </form>
        </div>
    );
}
export function SettleDebtModal({
                             debt,
                             accounts,
                             submit,
                             close,
                         }: {
    debt: DebtItem;
    accounts: Account[];
    submit: (accountId: string) => void;
    close: () => void;
}) {
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(accountId);
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead label={debt.person} title="Зарахувати повернення коштів?" close={close} />
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    {debt.currency} {formatMoney(debt.amount)} буде зараховано на обраний рахунок і борг
                    закрито.
                </p>
                <label>
                    Рахунок
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} · {a.currency}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="primary">Зарахувати та закрити</button>
            </form>
        </div>
    );
}
export function EditTransactionModal({
                                  transaction,
                                  categories,
                                  accounts,
                                  goals,
                                  close,
                                  submit,
                              }: {
    transaction: Transaction;
    categories: CategoryItem[];
    accounts: Account[];
    goals: GoalItem[];
    close: () => void;
    submit: (payload: Record<string, unknown>) => void;
}) {
    const isIncome =
        transaction.amount > 0 && transaction.kind !== "transfer" && transaction.kind !== "exchange";
    const [type, setType] = useState<"expense" | "income">(isIncome ? "income" : "expense");
    const currentAccountId = accounts.find((a) => a.name === transaction.account)?.id;
    const [accountId, setAccountId] = useState(String(currentAccountId || accounts[0]?.id || ""));
    const [isTransfer, setIsTransfer] = useState(transaction.kind === "transfer");
    const [transferToAccountId, setTransferToAccountId] = useState(() => {
        if (transaction.transferToAccount) {
            return String(accounts.find((a) => a.name === transaction.transferToAccount)?.id || "");
        }
        return "";
    });
    const [reduceCreditLimit, setReduceCreditLimit] = useState(false);
    const [editCategoryId, setEditCategoryId] = useState(transaction.categoryId || "");
    const [editDate, setEditDate] = useState(() => {
        if (transaction.bookedAt) return toDateKey(new Date(transaction.bookedAt));
        return toDateKey(new Date());
    });
    const [editTime, setEditTime] = useState(() => {
        if (transaction.bookedAt) {
            const d = new Date(transaction.bookedAt);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
        return "00:00";
    });

    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    submit({
                        id: transaction.id,
                        accountId,
                        amount: Number(f.get("amount")),
                        type,
                        categoryId: isTransfer ? null : (f.get("category") || null),
                        note: f.get("note"),
                        bookedAt: f.get("date") ? new Date(String(f.get("date"))).toISOString() : undefined,
                        tags: String(f.get("tags") || "")
                            .split(/\s+/)
                            .filter(Boolean),
                        contributeGoalId: type === "expense" && !isTransfer ? f.get("contributeGoalId") || null : null,
                        isTransfer: type === "expense" && isTransfer,
                        transferToAccountId: type === "expense" && isTransfer ? transferToAccountId : null,
                        reduceCreditLimit: type === "expense" && isTransfer ? reduceCreditLimit : false,
                        ...(f.has("receiptAmount") ? { receiptAmount: f.get("receiptAmount") || null, receiptCurrency: "UAH" } : {}),
                    });
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead label="Редагування" title="Змінити операцію" close={close} />
                <div className="operation-type">
                    <button
                        type="button"
                        className={type === "expense" ? "active" : ""}
                        onClick={() => setType("expense")}
                    >
                        <ArrowUpRight /> Витрата
                    </button>
                    <button
                        type="button"
                        className={type === "income" ? "active" : ""}
                        onClick={() => setType("income")}
                    >
                        <ArrowDownLeft /> Дохід
                    </button>
                </div>
                <label>
                    Рахунок
                    <select name="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} · {a.currency}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Сума
                    <input
                        name="amount"
                        type="number"
                        min=".01"
                        step=".01"
                        required
                        defaultValue={Math.abs(transaction.amount)}
                    />
                </label>
                {!isTransfer && (accounts.find((a) => String(a.id) === accountId)?.currency || "UAH") !== "UAH" && (
                    <label>
                        Сума з чека, ₴ <small style={{ color: "var(--text-secondary)" }}>(різниця за курсом НБУ піде в комісію)</small>
                        <input
                            name="receiptAmount"
                            inputMode="decimal"
                            placeholder="напр. 1000"
                            defaultValue={transaction.originalCurrency === "UAH" && transaction.originalAmount ? transaction.originalAmount : ""}
                        />
                        {transaction.feeAmount ? (
                            <small style={{ color: "var(--text-secondary)" }}>Поточна комісія: ₴ {transaction.feeAmount.toFixed(2)}</small>
                        ) : null}
                    </label>
                )}
                {!isTransfer && (
                    <label>
                        Категорія
                        <select
                            name="category"
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                        >
                            <option value="">Без категорії</option>
                            {categories
                                .filter((c) => c.kind === type)
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                )}
                {type === "expense" && (
                    <label className="check impulse">
                        <input
                            type="checkbox"
                            checked={isTransfer}
                            onChange={(e) => setIsTransfer(e.target.checked)}
                        />{" "}
                        Це переказ на іншу мою картку (не витрата)
                    </label>
                )}
                {type === "expense" && isTransfer && (
                    <>
                        <label>
                            На яку картку
                            <select
                                value={transferToAccountId}
                                onChange={(e) => setTransferToAccountId(e.target.value)}
                                required
                            >
                                <option value="">Оберіть картку…</option>
                                {accounts
                                    .filter((a) => String(a.id) !== accountId)
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} · {a.currency}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        {(() => {
                            const destAccount = accounts.find((a) => String(a.id) === transferToAccountId);
                            if (!destAccount || !(destAccount.creditLimit && destAccount.creditLimit > 0)) return null;
                            return (
                                <label className="check impulse">
                                    <input
                                        type="checkbox"
                                        checked={reduceCreditLimit}
                                        onChange={(e) => setReduceCreditLimit(e.target.checked)}
                                    />{" "}
                                    Це погашення / пониження кредитного ліміту
                                </label>
                            );
                        })()}
                    </>
                )}
                {type === "expense" && !isTransfer && goals.length > 0 && (
                    <label>
                        Покласти в банку (необов'язково)
                        <select name="contributeGoalId" defaultValue="">
                            <option value="">Не класти в банку</option>
                            {goals.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <DateTimeField
                    label="Дата"
                    name="date"
                    date={editDate}
                    time={editTime}
                    onDateChange={setEditDate}
                    onTimeChange={setEditTime}
                />
                <label>
                    Нотатка
                    <input name="note" defaultValue={transaction.title} />
                </label>
                <label>
                    Теги
                    <input
                        name="tags"
                        defaultValue={transaction.tags?.map((t) => `#${t}`).join(" ")}
                        placeholder="#відпустка #робота"
                    />
                </label>
                <button className="primary">Зберегти зміни</button>
            </form>
        </div>
    );
}
export function PayInstallmentModal({
                                 debt,
                                 accounts,
                                 submit,
                                 close,
                             }: {
    debt: DebtItem;
    accounts: Account[];
    submit: (accountId: string, amount: number) => void;
    close: () => void;
}) {
    const suggested = debt.installmentMonths
        ? Math.round((debt.amount / debt.installmentMonths) * 100) / 100
        : debt.amount;
    const [amount, setAmount] = useState(String(suggested));
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (Number(amount) > 0) submit(accountId, Number(amount));
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ModalHead label={debt.person} title="Погасити розстрочку" close={close} />
                <label className="amount-field">
                    <span>{currencySymbol(debt.currency)}</span>
                    <input
                        autoFocus
                        required
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </label>
                <small className="field-help">
                    Залишок боргу: {currencySymbol(debt.currency)} {formatMoney(debt.amount)}
                </small>
                <label>
                    Списати з рахунку
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} · {a.currency}
                            </option>
                        ))}
                    </select>
                </label>
                <button className="primary">Погасити</button>
            </form>
        </div>
    );
}
export function RecurringModal({
                            accounts,
                            categories,
                            rates,
                            customRates,
                            submit,
                            close,
                        }: {
    accounts: Account[];
    categories: CategoryItem[];
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [kind, setKind] = useState<"expense" | "income">("expense");
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    const [sourceCurrency, setSourceCurrency] = useState("USD");
    const [sourceAmount, setSourceAmount] = useState("");
    const [finalAmount, setFinalAmount] = useState("");
    const account = accounts.find((a) => String(a.id) === accountId) || accounts[0];
    const converted =
        sourceCurrency === account?.currency
            ? Number(sourceAmount) || 0
            : crossRate(sourceCurrency, account?.currency || "UAH", rates, customRates) *
            (Number(sourceAmount) || 0);
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead
                    label="Автоматизація"
                    title={kind === "income" ? "Плановий дохід" : "Регулярний платіж"}
                    close={close}
                />
                <div className="operation-type">
                    <button
                        type="button"
                        className={kind === "expense" ? "active" : ""}
                        onClick={() => setKind("expense")}
                    >
                        <ArrowUpRight /> Витрата
                    </button>
                    <button
                        type="button"
                        className={kind === "income" ? "active" : ""}
                        onClick={() => setKind("income")}
                    >
                        <ArrowDownLeft /> Дохід
                    </button>
                </div>
                <input type="hidden" name="kind" value={kind} />
                <label>
                    Назва
                    <input name="name" required placeholder={kind === "income" ? "Зарплата" : "Netflix"} />
                </label>
                <div className="form-two">
                    <label>
                        Рахунок
                        <select
                            name="account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            required
                        >
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} · {a.currency}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Категорія
                        <select name="category">
                            <option value="">Без категорії</option>
                            {categories
                                .filter((c) => c.kind === kind)
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                </div>
                <div className="form-two">
                    <label>
                        Сума в
                        <select value={sourceCurrency} onChange={(e) => setSourceCurrency(e.target.value)}>
                            <option>UAH</option>
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                            <option>PLN</option>
                        </select>
                    </label>
                    <label>
                        Значення
                        <input
                            type="number"
                            min="0"
                            step=".01"
                            value={sourceAmount}
                            onChange={(e) => setSourceAmount(e.target.value)}
                        />
                    </label>
                </div>
                {sourceCurrency !== account?.currency && sourceAmount && (
                    <div className="form-message success">
                        ≈ {formatMoney(converted)} {account?.currency} за поточним курсом
                    </div>
                )}
                <label>
                    Сума до збереження, {account?.currency}
                    <input
                        name="amount"
                        type="number"
                        min=".01"
                        step=".01"
                        required
                        value={finalAmount || (converted ? converted.toFixed(2) : "")}
                        onChange={(e) => setFinalAmount(e.target.value)}
                    />
                </label>
                <label>
                    Період
                    <select name="frequency">
                        <option value="monthly">Щомісяця</option>
                        <option value="weekly">Щотижня</option>
                        <option value="yearly">Щороку</option>
                    </select>
                </label>
                <label>
                    Наступна дата
                    <input name="date" type="datetime-local" required />
                </label>
                <label className="check impulse">
                    <input name="auto" type="checkbox" /> Створювати операцію автоматично
                </label>
                <button className="primary">
                    {kind === "income" ? "Зберегти плановий дохід" : "Зберегти платіж"}
                </button>
            </form>
        </div>
    );
}
type ImportPreviewRowExternal = {
    id: string; title: string; amount: number; date: string; categoryName: string;
    isDuplicate: boolean; selected: boolean;
    currency?: string; isPayoneerTransfer?: boolean;
    matchedTxId?: string | number; matchedTxAmount?: number; matchedTxAccount?: string;
    expectedUah?: number; fee?: number; existingFromTxId?: string; matchHint?: string;
};

export function ImportPreviewModal({
                                preview,
                                accounts,
                                onConfirm,
                                onClose,
                            }: {
    preview: { rows: ImportPreviewRowExternal[]; accountId: string };
    accounts: Account[];
    onConfirm: (rows: ImportPreviewRowExternal[], accountId: string) => void;
    onClose: () => void;
}) {
    const [rows, setRows] = useState(preview.rows);
    const [accountId, setAccountId] = useState(preview.accountId);
    const toggle = (id: string) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, selected: !r.selected } : r));
    const toggleAll = () => {
        const allSelected = rows.filter((r) => !r.isDuplicate).every((r) => r.selected);
        setRows((prev) => prev.map((r) => r.isDuplicate ? r : { ...r, selected: !allSelected }));
    };
    const selectedCount = rows.filter((r) => r.selected).length;
    const dupCount = rows.filter((r) => r.isDuplicate).length;
    const newCount = rows.filter((r) => !r.isDuplicate).length;
    const fmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "short" });
    const isPayoneer = rows.some((r) => r.currency === "USD" || r.isPayoneerTransfer);
    // Fee rows are separate rows with id ending in "-fee"; find them via matchedTxId on the parent transfer row
    const transfersWithFee = rows.filter((r) => r.isPayoneerTransfer && r.matchedTxId != null);
    const withdrawalCount = rows.filter((r) => r.isPayoneerTransfer && r.amount < 0).length;
    const totalFee = transfersWithFee.reduce((sum, r) => sum + (r.fee || 0), 0);
    const fmtAmt = (n: number, currency?: string) =>
        (n >= 0 ? "+" : "") + n.toFixed(2) + (currency ? " " + currency : "");

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="expense-modal import-preview-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 660, width: "95vw" }}>
                <ModalHead
                    label="Імпорт"
                    title={isPayoneer ? "Payoneer — перевірка виписки" : "Перевірка виписки"}
                    close={onClose}
                />
                <p style={{ color: "var(--text-secondary)", marginBottom: 12, fontSize: 14 }}>
                    Знайдено <b>{rows.length}</b> операцій: <span style={{ color: "var(--green)" }}>{newCount} нових</span>
                    {dupCount > 0 && <span style={{ color: "var(--text-secondary)" }}>, {dupCount} вже є (знято позначку)</span>}.
                </p>
                {isPayoneer && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                        <span className="import-stat">Виводів: <b>{withdrawalCount}</b></span>
                        <span className="import-stat">Зв'язано з зарахуванням: <b>{transfersWithFee.length}</b>{withdrawalCount > transfersWithFee.length ? ` (без пари: ${withdrawalCount - transfersWithFee.length})` : ""}</span>
                        <span className="import-stat">Комісія разом: <b style={{ color: "var(--red)" }}>₴ {totalFee.toFixed(2)}</b></span>
                    </div>
                )}
                {transfersWithFee.length > 0 && (
                    <details style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                        <summary style={{ cursor: "pointer" }}><b>💡 Виведення коштів ({transfersWithFee.length}) — деталі</b></summary>
                        {transfersWithFee.map((r) => (
                            <div key={r.id} style={{ marginTop: 4, color: "var(--text-secondary)" }}>
                                {fmt.format(new Date(r.date))}: Payoneer — {r.title} — ${Math.abs(r.amount).toFixed(2)} →
                                отримано <span style={{ color: "var(--green)" }}>{r.matchedTxAmount?.toFixed(2)}</span>
                                {r.matchedTxAccount ? ` на ${r.matchedTxAccount}` : ""}
                                {r.expectedUah != null ? ` (за курсом мало бути ${r.expectedUah.toFixed(2)} ₴)` : ""}.{" "}
                                <span style={{ color: "var(--red)" }}>Комісія: {r.fee?.toFixed(2)} ₴</span>
                            </div>
                        ))}
                        <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                            Ці пари збережуться як перекази, комісія — в окремому полі операції (курс НБУ на дату).
                        </div>
                    </details>
                )}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Рахунок для імпорту</label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text)", width: "100%" }}>
                        {accounts.map((a) => <option key={String(a.id)} value={String(a.id)}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <button type="button" onClick={toggleAll}
                            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text)" }}>
                        {rows.filter((r) => !r.isDuplicate).every((r) => r.selected) ? "Зняти всі нові" : "Позначити всі нові"}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Обрано: {selectedCount}</span>
                </div>
                <div className="import-table-wrap" style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--panel)", boxShadow: "0 1px 0 var(--line)" }}>
                        <tr>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>✓</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Дата</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Опис</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Сума</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Статус</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} onClick={() => toggle(r.id)}
                                style={{ cursor: "pointer", background: r.isDuplicate ? "var(--bg-secondary)" : r.isPayoneerTransfer ? "color-mix(in srgb, var(--purple) 6%, transparent)" : "transparent", opacity: r.isDuplicate ? 0.55 : 1 }}>
                                <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)" }}>
                                    <input type="checkbox" checked={r.selected} readOnly style={{ pointerEvents: "none", accentColor: "var(--purple)" }} />
                                </td>
                                <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                                    {fmt.format(new Date(r.date))}
                                </td>
                                <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <MerchantIcon
                                        title={r.title}
                                        imgStyle={{ display: "inline-block", width: 16, height: 16, borderRadius: 4, verticalAlign: "middle", marginRight: 6, objectFit: "cover" }}
                                        fallback={
                                            <span style={{ marginRight: 6, display: "inline-flex", verticalAlign: "middle", color: "var(--text-secondary)" }}>
                          <BudgetIcon name={guessIconFromTitle(r.title)} size={14} />
                        </span>
                                        }
                                    />
                                    {r.isPayoneerTransfer ? "🏦 " : ""}{r.title}
                                    {r.fee != null && r.fee > 0 && (
                                        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--red)" }}>комісія {r.fee.toFixed(2)}</span>
                                    )}
                                    {r.matchHint && (
                                        <small style={{ display: "block", whiteSpace: "normal", fontSize: 11, color: "var(--red)" }}>Без пари: {r.matchHint}</small>
                                    )}
                                </td>
                                <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 600, color: r.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                                    {fmtAmt(r.amount, r.currency)}
                                </td>
                                <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", fontSize: 11, color: r.isDuplicate ? "var(--text-secondary)" : r.isPayoneerTransfer ? "var(--purple)" : "var(--green)" }}>
                                    {r.isDuplicate
                                        ? (r.existingFromTxId ? "вже є переказ" : "вже є")
                                        : r.existingFromTxId ? "оновити комісію" : r.isPayoneerTransfer ? "вивід" : "нова"}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                    <button type="button" onClick={onClose}
                            style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text)" }}>
                        Скасувати
                    </button>
                    <button type="button" disabled={selectedCount === 0}
                            onClick={() => onConfirm(rows.filter((r) => r.selected), accountId)}
                            style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: selectedCount === 0 ? "var(--border)" : "var(--purple)", color: "#fff", cursor: selectedCount === 0 ? "default" : "pointer", fontWeight: 600 }}>
                        Імпортувати обрані ({selectedCount})
                    </button>
                </div>
            </div>
        </div>
    );
}

export function TransferModal({
                           accounts,
                           rates,
                           customRates,
                           presetToAccountId,
                           submit,
                           close,
                       }: {
    accounts: Account[];
    rates: { currency: string; rate: number }[];
    customRates: { currency: string; rate: number }[];
    presetToAccountId?: string;
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [fromId, setFromId] = useState(
        String(accounts.find((a) => String(a.id) !== presetToAccountId)?.id || accounts[0]?.id || ""),
    );
    const [toId, setToId] = useState(
        String(presetToAccountId || accounts[1]?.id || accounts[0]?.id || ""),
    );
    const [sent, setSent] = useState("");
    const [fee, setFee] = useState("0");
    const [bookedAtDate, setBookedAtDate] = useState(() => toDateKey(new Date()));
    const [bookedAtTime, setBookedAtTime] = useState(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    });
    const from = accounts.find((a) => String(a.id) === fromId),
        to = accounts.find((a) => String(a.id) === toId);
    const showCreditToggle = (to?.creditLimit || 0) > 0;
    const sameCurrency = !from || !to || from.currency === to.currency;
    const rate = sameCurrency ? 1 : crossRate(from!.currency, to!.currency, rates, customRates);
    const sentValue = Number(sent.replace(",", ".")) || 0;
    const feeValue = Number(fee.replace(",", ".")) || 0;
    const [receivedInput, setReceivedInput] = useState("");
    const nbuReceived = Math.max(0, sentValue * rate);
    const received = sameCurrency
        ? Math.max(0, sentValue - feeValue)
        : (Number(receivedInput.replace(",", ".")) || nbuReceived);
    // Різниця з курсом НБУ — у валюті відправлення
    const fxLoss = !sameCurrency && rate > 0 ? Math.max(0, sentValue - received / rate) : 0;
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead
                    label="Між власними рахунками"
                    title={presetToAccountId ? "Погашення кредиту" : "Переказ або обмін"}
                    close={close}
                />
                <div style={{ position: "relative" }}>
                    <div className="form-two">
                        <WheelField
                            name="from"
                            label="З рахунку"
                            options={accounts.map((a) => ({ value: String(a.id), label: `${a.name} · ${a.currency}` }))}
                            value={fromId}
                            onChange={setFromId}
                        />
                        <WheelField
                            name="to"
                            label="На рахунок"
                            options={accounts.map((a) => ({ value: String(a.id), label: `${a.name} · ${a.currency}` }))}
                            value={toId}
                            onChange={presetToAccountId ? undefined : setToId}
                        />
                    </div>
                    {!presetToAccountId && (
                        <button
                            type="button"
                            onClick={() => { const tmp = fromId; setFromId(toId); setToId(tmp); }}
                            style={{
                                position: "absolute", top: "50%", left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 30, height: 30, borderRadius: "50%",
                                background: "var(--bg)", border: "2px solid var(--purple)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", zIndex: 2, color: "var(--purple)", padding: 0,
                            }}
                            title="Поміняти місцями"
                        >
                            <ArrowLeftRight size={13} />
                        </button>
                    )}
                </div>
                <label className="amount-field">
                    <span>{currencySymbol(from?.currency || "UAH")}</span>
                    <input
                        autoFocus
                        required
                        inputMode="decimal"
                        placeholder="0"
                        value={sent}
                        onChange={(e) => setSent(e.target.value)}
                    />
                </label>
                <input type="hidden" name="sent" value={sent} />
                {!sameCurrency && (
                    <>
                        <label>
                            Фактично надійшло, {to?.currency}
                            <input
                                inputMode="decimal"
                                placeholder={nbuReceived ? nbuReceived.toFixed(2) : "0"}
                                value={receivedInput}
                                onChange={(e) => setReceivedInput(e.target.value)}
                            />
                        </label>
                        <input type="hidden" name="rate" value={sentValue > 0 ? (received / sentValue).toFixed(6) : String(rate)} />
                        <input type="hidden" name="fee" value="0" />
                    </>
                )}
                {sameCurrency && (
                    <>
                        <input type="hidden" name="rate" value="1" />
                        <label>
                            Комісія, {from?.currency}
                            <input
                                name="fee"
                                type="number"
                                min="0"
                                step=".01"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                            />
                        </label>
                    </>
                )}
                <input type="hidden" name="feeCurrency" value={from?.currency || "UAH"} />
                <input type="hidden" name="received" value={received.toFixed(2)} />
                <div className="form-message success">
                    Надійде: {currencySymbol(to?.currency || "UAH")} {formatMoney(received)}
                    {!sameCurrency ? ` · курс НБУ ${rate.toFixed(4)}` : ""}
                    {!sameCurrency && fxLoss > 0.004 ? ` · комісія ${currencySymbol(from?.currency || "UAH")} ${formatMoney(fxLoss)}` : ""}
                </div>
                <label>
                    Нотатка
                    <input
                        name="note"
                        placeholder={presetToAccountId ? "Погашення кредитного ліміту" : "Обмін на відпустку"}
                    />
                </label>
                <DateTimeField
                    label="Дата операції"
                    name="bookedAt"
                    date={bookedAtDate}
                    time={bookedAtTime}
                    onDateChange={setBookedAtDate}
                    onTimeChange={setBookedAtTime}
                />
                {showCreditToggle && (
                    <label className="check impulse">
                        <input name="reduceCreditLimit" type="checkbox" defaultChecked /> Врахувати як погашення
                        кредитного ліміту
                    </label>
                )}
                <button className="primary">
                    {presetToAccountId ? "Погасити кредит" : "Виконати переказ"}
                </button>
            </form>
        </div>
    );
}
export function BudgetModal({
                         categories,
                         period,
                         initialDate,
                         baseCurrency,
                         initialCategoryId,
                         submit,
                         close,
                     }: {
    categories: CategoryItem[];
    period: "month" | "week";
    initialDate?: string;
    baseCurrency: string;
    initialCategoryId?: string;
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const now = new Date(),
        weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7));
    const value =
        initialDate ||
        (period === "week"
            ? weekStart.toISOString().slice(0, 10)
            : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    const [icon, setIcon] = useState(BUDGET_ICON_NAMES[0]);
    const [color, setColor] = useState(BUDGET_COLORS[0]);
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Планування" title="Ліміт категорії" close={close} />
                <label>
                    Категорія
                    <select name="category" required defaultValue={initialCategoryId}>
                        {categories
                            .filter((c) => c.kind === "expense")
                            .map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </label>
                <div className="form-two">
                    <label>
                        {period === "week" ? "Перший день тижня" : "Місяць"}
                        <input
                            name="period"
                            type={period === "week" ? "date" : "month"}
                            defaultValue={value}
                            required
                        />
                    </label>
                    <label>
                        Ліміт, {baseCurrency}
                        <input name="limit" type="number" min="1" required />
                    </label>
                </div>
                <input type="hidden" name="icon" value={icon} />
                <input type="hidden" name="color" value={color} />
                <label>Іконка ліміту</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {BUDGET_ICON_NAMES.map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setIcon(name)}
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                border: icon === name ? "2px solid var(--purple)" : "1px solid var(--line)",
                                background:
                                    icon === name
                                        ? "color-mix(in srgb,var(--purple) 10%,var(--panel))"
                                        : "var(--panel)",
                                display: "grid",
                                placeItems: "center",
                                color: icon === name ? "var(--purple)" : "var(--muted)",
                                cursor: "pointer",
                            }}
                        >
                            <BudgetIcon name={name} size={15} />
                        </button>
                    ))}
                </div>
                <label>Колір ліміту</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {BUDGET_COLORS.map((hex) => (
                        <button
                            key={hex}
                            type="button"
                            onClick={() => setColor(hex)}
                            style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: hex,
                                border: color === hex ? "2px solid var(--text)" : "2px solid transparent",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            {color === hex && <Check size={14} color="#fff" />}
                        </button>
                    ))}
                </div>
                {period === "week" && (
                    <label className="check impulse">
                        <input name="cloneWeeks" type="checkbox" /> Застосувати цю суму на кожен тиждень цього
                        місяця
                    </label>
                )}
                <button className="primary">Зберегти ліміт</button>
            </form>
        </div>
    );
}
export function CategoryModal({
                           category,
                           payerSources = [],
                           submit,
                           close,
                       }: {
    category?: CategoryItem | null;
    payerSources?: string[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [icon, setIcon] = useState(category?.icon || BUDGET_ICON_NAMES[0]);
    const [color, setColor] = useState(category?.color || BUDGET_COLORS[0]);
    const [kind, setKind] = useState<"expense" | "income">(category?.kind === "income" ? "income" : "expense");
    const [budgetGroup, setBudgetGroup] = useState(category?.budgetGroup || "");
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Персоналізація" title={category ? "Редагувати категорію" : "Нова категорія"} close={close} />
                {category && <input type="hidden" name="id" value={category.id} />}
                <label>
                    Назва
                    <input name="name" required placeholder="Домашні улюбленці" defaultValue={category?.name} />
                </label>
                <label>
                    Тип
                    <select name="kind" value={kind} onChange={(e) => setKind(e.target.value === "income" ? "income" : "expense")} disabled={Boolean(category)}>
                        <option value="expense">Витрата</option>
                        <option value="income">Дохід</option>
                    </select>
                </label>
                {kind === "income" && (
                    <label>
                        Звідки приходить платіж
                        <input
                            name="payerSources"
                            placeholder="Quality Unit LLC, SoftServe"
                            defaultValue={payerSources.join(", ")}
                        />
                        <small style={{ color: "var(--text-secondary)" }}>
                            Через кому. Надходження, в описі яких є ця назва, завжди отримуватимуть цю категорію — і вже наявні, і нові.
                        </small>
                    </label>
                )}
                {kind === "expense" && (
                    <label>
                        Група правила 50/30/20
                        <select name="budgetGroup" value={budgetGroup} onChange={(e) => setBudgetGroup(e.target.value)}>
                            <option value="">Не вказано</option>
                            <option value="needs">Базові потреби (50%)</option>
                            <option value="wants">Бажання / Розваги (30%)</option>
                            <option value="savings">Заощадження / Борги (20%)</option>
                        </select>
                    </label>
                )}
                <input type="hidden" name="icon" value={icon} />
                <input type="hidden" name="color" value={color} />
                <label>Іконка</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {BUDGET_ICON_NAMES.map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setIcon(name)}
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                border: icon === name ? "2px solid var(--purple)" : "1px solid var(--line)",
                                background:
                                    icon === name
                                        ? "color-mix(in srgb,var(--purple) 10%,var(--panel))"
                                        : "var(--panel)",
                                display: "grid",
                                placeItems: "center",
                                color: icon === name ? "var(--purple)" : "var(--muted)",
                                cursor: "pointer",
                            }}
                        >
                            <BudgetIcon name={name} size={15} />
                        </button>
                    ))}
                </div>
                <label>Колір</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {BUDGET_COLORS.map((hex) => (
                        <button
                            key={hex}
                            type="button"
                            onClick={() => setColor(hex)}
                            style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: hex,
                                border: color === hex ? "2px solid var(--text)" : "2px solid transparent",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            {color === hex && <Check size={14} color="#fff" />}
                        </button>
                    ))}
                </div>
                <button className="primary">{category ? "Зберегти зміни" : "Створити категорію"}</button>
            </form>
        </div>
    );
}
export function RuleModal({
                       categories,
                       goals,
                       submit,
                       close,
                   }: {
    categories: CategoryItem[];
    goals: GoalItem[];
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    const [conditionType, setConditionType] = useState("amount_gt");
    const [actionType, setActionType] = useState("set_category");
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Автоматизація" title="Нове правило" close={close} />
                <label>
                    Назва
                    <input name="name" required placeholder="Велика покупка" />
                </label>
                <label>
                    Умова
                    <select
                        name="conditionType"
                        value={conditionType}
                        onChange={(e) => setConditionType(e.target.value)}
                    >
                        <option value="amount_gt">Сума більше</option>
                        <option value="amount_lt">Сума менше</option>
                        <option value="no_category">Без категорії</option>
                        <option value="currency_is">Валюта дорівнює</option>
                        <option value="note_contains">Назва містить</option>
                    </select>
                </label>
                {(conditionType === "amount_gt" || conditionType === "amount_lt") && (
                    <label>
                        Значення суми
                        <input name="conditionValue" type="number" min="0" required />
                    </label>
                )}
                {conditionType === "currency_is" && (
                    <label>
                        Валюта
                        <select name="conditionValue">
                            <option>UAH</option>
                            <option>USD</option>
                            <option>EUR</option>
                        </select>
                    </label>
                )}
                {conditionType === "note_contains" && (
                    <label>
                        Текст назви
                        <input name="conditionValue" type="text" required placeholder="Vodafone" />
                    </label>
                )}
                <label>
                    Дія
                    <select
                        name="actionType"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                    >
                        <option value="set_category">Встановити категорію</option>
                        <option value="contribute_goal_percent">% доходу автоматично в банку</option>
                    </select>
                </label>
                {actionType === "set_category" && (
                    <label>
                        Категорія
                        <select name="actionCategoryId" required>
                            {categories
                                .filter((c) => c.kind === "expense")
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                )}
                {actionType === "contribute_goal_percent" && (
                    <>
                        <label>
                            Банка
                            <select name="actionGoalId" required>
                                {goals.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Відсоток, %<input name="actionValue" type="number" min="0" max="100" required />
                        </label>
                    </>
                )}
                <button className="primary">Створити правило</button>
            </form>
        </div>
    );
}
export function InviteModal({
                         submit,
                         close,
                         result,
                         again,
                     }: {
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
    result?: { url: string; emailed: boolean; copied: boolean; to: string; existing?: boolean } | null;
    again?: () => void;
}) {
    const [copied, setCopied] = useState(false);
    if (result)
        return (
            <div className="modal-backdrop" onMouseDown={close}>
                <div className="expense-modal invite-done" onMouseDown={(e) => e.stopPropagation()}>
                    <ModalHead label="Спільний бюджет" title="Запрошення готове" close={close} />
                    {result.existing ? (
                        <div className="invite-existing">
                            ✓ <b>{result.to}</b> вже має акаунт у Rivna. Запрошення з'явиться в нього одразу на
                            головній — достатньо натиснути <b>«Прийняти»</b>. Посилання нижче — запасний варіант.
                        </div>
                    ) : null}
                    <p className="invite-text">
                        {result.existing ? "Або надішли посилання:" : result.emailed
                            ? `Лист із запрошенням надіслано на ${result.to}. Або просто надішли посилання в месенджер:`
                            : "Надішли це посилання партнеру в Telegram чи Viber:"}
                    </p>
                    <div className="invite-link">
                        <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} />
                        <button
                            type="button"
                            className="small-primary"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(result.url);
                                    setCopied(true);
                                } catch {}
                            }}
                        >
                            {copied || result.copied ? "Скопійовано ✓" : "Копіювати"}
                        </button>
                    </div>
                    {!result.existing && <ol className="invite-steps">
                        <li>Партнер відкриває посилання і входить або реєструється.</li>
                        <li>Після входу він одразу потрапляє у ваш спільний бюджет.</li>
                        <li>Його картки Monobank він підключає сам у «Рахунках».</li>
                    </ol>}
                    <p className="invite-note">Посилання одноразове й діє 7 днів.</p>
                    <div className="invite-actions">
                        <button type="button" className="secondary" onClick={again}>
                            Запросити ще когось
                        </button>
                        <button type="button" className="primary" onClick={close}>
                            Готово
                        </button>
                    </div>
                </div>
            </div>
        );
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form className="expense-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Спільний бюджет" title="Запросити партнера" close={close} />
                <label>
                    Email або username
                    <input name="identifier" required autoFocus placeholder="dima@gmail.com або @dima" />
                </label>
                <fieldset className="invite-roles">
                    <legend>Що зможе робити</legend>
                    {[
                        ["member", "Учасник", "Додає операції, ліміти, цілі. Оптимально для партнера."],
                        ["viewer", "Лише перегляд", "Бачить усе, але нічого не змінює."],
                        ["admin", "Адміністратор", "Усе як учасник + може запрошувати інших."],
                    ].map(([value, label, hint], index) => (
                        <label key={value} className="invite-role">
                            <input type="radio" name="role" value={value} defaultChecked={index === 0} />
                            <span>
                                <b>{label}</b>
                                <small>{hint}</small>
                            </span>
                        </label>
                    ))}
                </fieldset>
                <button className="primary">Створити запрошення</button>
            </form>
        </div>
    );
}
export function MonoSyncDebugModal({
                                       debug,
                                       close,
                                   }: {
    debug: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[];
    close: () => void;
}) {
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="expense-modal tall-modal" onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Monobank" title="Результат синхронізації" close={close} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {debug.filter((d) => d.error).map((d, i) => (
                        <div
                            key={`err-${i}`}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                padding: 12,
                                borderRadius: 12,
                                background: "#fff0f0",
                                border: "1px solid #f0caca",
                            }}
                        >
                            <span style={{ fontSize: 16 }}>⚠️</span>
                            <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: 12, display: "block" }}>Проблема</strong>
                                <small style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>
                                    {d.error}
                                </small>
                            </div>
                        </div>
                    ))}
                    {debug.filter((d) => !d.error).length > 0 && (
                        <div
                            style={{
                                padding: 12,
                                borderRadius: 12,
                                background: "#eaf8f1",
                                border: "1px solid #c6ecd9",
                            }}
                        >
                            <strong style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                ✅ Успішно синхронізовано
                            </strong>
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                {debug.filter((d) => !d.error).map((d, i) => (
                                    <small key={i} style={{ fontSize: 11, color: "var(--muted)" }}>
                                        Картка {i + 1}: знайдено операцій — {d.itemsFound ?? 0}
                                    </small>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <button className="primary" onClick={close} style={{ marginTop: 16 }}>
                    Зрозуміло
                </button>
            </div>
        </div>
    );
}
export function CustomRateModal({
                             submit,
                             close,
                         }: {
    submit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
    close: () => void;
}) {
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <form
                className="expense-modal"
                onSubmit={submit}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <ModalHead label="Готівковий або власний курс" title="Додати курс валюти" close={close} />
                <div className="form-two">
                    <label>
                        Валюта
                        <select name="currency">
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                            <option>PLN</option>
                        </select>
                    </label>
                    <label>
                        Курс до UAH
                        <input name="rate" type="number" min=".000001" step=".000001" required />
                    </label>
                </div>
                <label>
                    Дата
                    <input
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        required
                    />
                </label>
                <button className="primary">Зберегти власний курс</button>
            </form>
        </div>
    );
}

/** Вибір часу: години й хвилини кнопками, без системного пікера браузера. */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [hh = "00", mm = "00"] = (value || "00:00").split(":");
    const h = Number(hh) || 0,
        m = Number(mm) || 0;
    const pad = (n: number) => String(n).padStart(2, "0");
    const set = (nh: number, nm: number) => onChange(`${pad((nh + 24) % 24)}:${pad((nm + 60) % 60)}`);
    const now = () => {
        const d = new Date();
        set(d.getHours(), d.getMinutes());
    };
    const Part = ({ v, max, onSet, step }: { v: number; max: number; onSet: (n: number) => void; step: number }) => (
        <div className="tf-part">
            <button type="button" aria-label="Більше" onClick={() => onSet(v + step)}>
                ▲
            </button>
            <input
                inputMode="numeric"
                value={pad(v)}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, "").slice(-2));
                    if (!Number.isNaN(n) && n <= max) onSet(n);
                }}
                onWheel={(e) => {
                    e.currentTarget.blur();
                    onSet(v + (e.deltaY < 0 ? step : -step));
                }}
                onKeyDown={(e) => {
                    if (e.key === "ArrowUp") (e.preventDefault(), onSet(v + step));
                    if (e.key === "ArrowDown") (e.preventDefault(), onSet(v - step));
                }}
            />
            <button type="button" aria-label="Менше" onClick={() => onSet(v - step)}>
                ▼
            </button>
        </div>
    );
    return (
        <div className="tf">
            <Part v={h} max={23} step={1} onSet={(n) => set(n, m)} />
            <span className="tf-colon">:</span>
            <Part v={m} max={59} step={1} onSet={(n) => set(h, n)} />
            <div className="tf-quick">
                <button type="button" onClick={now}>Зараз</button>
                {[9, 13, 19].map((q) => (
                    <button type="button" key={q} onClick={() => set(q, 0)}>
                        {pad(q)}:00
                    </button>
                ))}
            </div>
        </div>
    );
}
