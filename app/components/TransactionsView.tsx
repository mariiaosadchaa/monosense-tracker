"use client";
import { useState, useEffect } from "react";
import type { Transaction, CategoryItem } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { mergeTransferPairs } from "../lib/transfers";
import { BudgetIcon, guessIconFromTitle, MerchantIcon } from "../lib/icons";
import {Download, Search, Settings, Trash2, Upload, X} from "lucide-react";


function TransactionsView({
                              transactions,
                              search,
                              setSearch,
                              remove,
                              exportCsv,
                              exportExcel,
                              exportJson,
                              initialAccount,
                              onEdit,
                              scanReceipt,
                              scanning,
                              transfers,
                              categories,
                          }: {
    transactions: Transaction[];
    search: string;
    setSearch: (s: string) => void;
    remove: (id: number | string) => void;
    exportCsv: () => void;
    exportExcel: () => void;
    exportJson: () => void;
    initialAccount?: string;
    onEdit: (t: Transaction) => void;
    scanReceipt: (file: File) => void;
    scanning: boolean;
    transfers: { id: string; fromTransactionId: string | null; toTransactionId: string | null }[];
    categories: CategoryItem[];
}) {
    const [account,setAccount]=useState("");const [category,setCategory]=useState("");const [owner,setOwner]=useState("");const [tag,setTag]=useState("");const [from,setFrom]=useState("");const [to,setTo]=useState("");
    const [minAmount,setMinAmount]=useState("");const [maxAmount,setMaxAmount]=useState("");
    const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [manualOrder, setManualOrder] = useState<(string | number)[]>([]);
    function toISO(d:Date){return d.toISOString().slice(0,10)}
    function applyPreset(preset:string){
        const now=new Date();
        if(preset==="today"){setFrom(toISO(now));setTo(toISO(now))}
        else if(preset==="yesterday"){const d=new Date(now);d.setDate(d.getDate()-1);setFrom(toISO(d));setTo(toISO(d))}
        else if(preset==="weekend"){
            const day=now.getDay();
            const saturday=new Date(now);saturday.setDate(now.getDate()-((day+1)%7)+(day===0?-1:6-day));
            const sunday=new Date(saturday);sunday.setDate(saturday.getDate()+1);
            setFrom(toISO(saturday));setTo(toISO(sunday));
        }
        else if(preset==="thisMonth"){setFrom(toISO(new Date(now.getFullYear(),now.getMonth(),1)));setTo(toISO(new Date(now.getFullYear(),now.getMonth()+1,0)))}
        else if(preset==="lastMonth"){setFrom(toISO(new Date(now.getFullYear(),now.getMonth()-1,1)));setTo(toISO(new Date(now.getFullYear(),now.getMonth(),0)))}
    }
    function reorderTx(
        draggedId: string | number,
        targetId: string | number,
        currentIds: (string | number)[],
    ) {
        const base = manualOrder.length ? manualOrder : currentIds;
        const ids = [...base];
        if (!ids.includes(draggedId)) ids.unshift(draggedId);
        const from = ids.indexOf(draggedId),
            to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        ids.splice(from, 1);
        ids.splice(to, 0, draggedId);
        setManualOrder(ids);
        localStorage.removeItem("rivna-tx-order");
    }
    const [sortField, setSortField] = useState<"date" | "amount" | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    function toggleSort(field: "date" | "amount") {
        if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else {
            setSortField(field);
            setSortDir("desc");
        }
    }
    useEffect(() => {
        if (initialAccount) setAccount(initialAccount);
    }, [initialAccount]);
    const unique = (values: (string | undefined)[]) =>
        Array.from(new Set(values.filter(Boolean) as string[])).sort();
    // When account filter is active: show both transfer legs filtered by account.
    // When no account filter: merge transfer pairs into one row.
    const base: Transaction[] = account
        ? (() => {
            const txById = new NativeMap(transactions.map((t) => [String(t.id), t]));
            const fromIdToTr = new NativeMap(transfers.filter((tr) => tr.fromTransactionId).map((tr) => [String(tr.fromTransactionId), tr]));
            const toIdToTr = new NativeMap(transfers.filter((tr) => tr.toTransactionId).map((tr) => [String(tr.toTransactionId), tr]));
            return transactions
                .filter((t) => t.account === account)
                .map((t) => {
                    // Check by transfer table membership, not just kind
                    const fromTr = fromIdToTr.get(String(t.id));
                    if (fromTr) {
                        const toLeg = fromTr.toTransactionId ? txById.get(String(fromTr.toTransactionId)) : undefined;
                        const dest = toLeg?.account || "Рахунок";
                        return { ...t, title: `${t.account} → ${dest}`, transferToAccount: dest };
                    }
                    const toTr = toIdToTr.get(String(t.id));
                    if (toTr) {
                        const fromLeg = toTr.fromTransactionId ? txById.get(String(toTr.fromTransactionId)) : undefined;
                        const src = fromLeg?.account || "Рахунок";
                        return { ...t, title: `${src} → ${t.account}`, transferToAccount: src };
                    }
                    return t;
                });
        })()
        : mergeTransferPairs(transactions, transfers);
    const filtered=base.filter(t=>(!category||t.category===category)&&(!owner||t.owner===owner)&&(!tag||t.tags?.includes(tag))&&(!from||!t.bookedAt||t.bookedAt>=`${from}T00:00:00`)&&(!to||!t.bookedAt||t.bookedAt<=`${to}T23:59:59`)&&(!minAmount||Math.abs(t.amount)>=Number(minAmount))&&(!maxAmount||Math.abs(t.amount)<=Number(maxAmount)));
    const shown = sortField
        ? [...filtered].sort((a, b) => {
            const dir = sortDir === "asc" ? 1 : -1;
            if (sortField === "amount") return (Math.abs(a.amount) - Math.abs(b.amount)) * dir;
            return (a.bookedAt || "").localeCompare(b.bookedAt || "") * dir;
        })
        : editMode && manualOrder.length
            ? [...filtered].sort((a, b) => {
                const ia = manualOrder.indexOf(a.id),
                    ib = manualOrder.indexOf(b.id);
                if (ia === -1 && ib === -1) return (b.bookedAt || "").localeCompare(a.bookedAt || "");
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            })
            : [...filtered].sort((a, b) => (b.bookedAt || "").localeCompare(a.bookedAt || ""));
    const clear=()=>{setAccount("");setCategory("");setOwner("");setTag("");setFrom("");setTo("");setMinAmount("");setMaxAmount("")};
    return (
        <section className="panel full-view">
            <div className="view-toolbar">
                <label className="search-box">
                    <Search />
                    <input
                        placeholder="Пошук за назвою або категорією"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>
                <button className="secondary" onClick={clear}>
                    <X /> Очистити
                </button>
                <button className="secondary" onClick={exportCsv}>
                    <Download /> CSV
                </button>
                <button className="secondary" onClick={exportExcel}>
                    <Download /> Excel
                </button>
                <button className="secondary" onClick={exportJson}>
                    <Download /> JSON
                </button>
                <label className="secondary file-button">
                    {scanning ? (
                        "Розпізнаю…"
                    ) : (
                        <>
                            <Upload /> Скан чека
                        </>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) scanReceipt(f);
                            e.target.value = "";
                        }}
                    />
                </label>
            </div>
            <div className="date-presets">
                <button type="button" onClick={()=>applyPreset("today")}>Сьогодні</button>
                <button type="button" onClick={()=>applyPreset("yesterday")}>Учора</button>
                <button type="button" onClick={()=>applyPreset("weekend")}>Ці вихідні</button>
                <button type="button" onClick={()=>applyPreset("thisMonth")}>Поточний місяць</button>
                <button type="button" onClick={()=>applyPreset("lastMonth")}>Минулий місяць</button>
            </div>
            <div className="filter-grid"><label>Рахунок<select value={account} onChange={e=>setAccount(e.target.value)}>
                <option value="">Усі</option>
                {unique(transactions.map((t) => t.account)).map((v) => (
                    <option key={v}>{v}</option>
                ))}
            </select>
            </label>
                <label>
                    Категорія
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Усі</option>
                        {unique(transactions.map((t) => t.category)).map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Тег
                    <select value={tag} onChange={(e) => setTag(e.target.value)}>
                        <option value="">Усі</option>
                        {unique(transactions.flatMap((t) => t.tags || [])).map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Власник
                    <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                        <option value="">Усі</option>
                        {unique(transactions.map((t) => t.owner)).map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>
                </label>
                <label style={{ position: "relative" }}>
                    Від
                    <CalendarPickerInput value={from} onChange={setFrom} placeholder="Будь-яка" />
                </label>
                <label style={{ position: "relative" }}>
                    До
                    <CalendarPickerInput value={to} onChange={setTo} placeholder="Будь-яка" />
                </label>
                <label>
                    Сума від
                    <input
                        type="number"
                        min="0"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        placeholder="1000"
                    />
                </label>
                <label>
                    Сума до
                    <input
                        type="number"
                        min="0"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="5000"
                    />
                </label>
                <button
                    type="button"
                    className={
                        editMode ? "icon-button settings-toggle active" : "icon-button settings-toggle"
                    }
                    onClick={() => setEditMode((v) => !v)}
                    title="Редагувати операції"
                >
                    <Settings size={16} />
                </button>
            </div>
            <div className="data-head">
                <span />
                <span>Операція</span>
                <span>Категорія</span>
                <span className="sortable" onClick={() => toggleSort("date")}>
          Дата {sortField === "date" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
                <span className="sortable" onClick={() => toggleSort("amount")}>
          Сума {sortField === "amount" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
                <span />
            </div>
            {shown.map((t) => {
                const canEdit = t.kind !== "credit_limit_change";
                const cat = categories.find((c) => c.name === t.category);
                const rawIcon = t.categoryIcon || cat?.icon;
                const iconName = (rawIcon && rawIcon !== "CircleDollarSign") ? rawIcon : guessIconFromTitle(t.title);
                const catColor = cat?.color || "#6558e8";
                return (
                    <div
                        className={editMode && canEdit ? "data-row editable" : "data-row"}
                        key={t.id}
                        draggable={editMode && !sortField}
                        onDragStart={(e) => {
                            if (!editMode) return;
                            e.dataTransfer.setData("text/plain", String(t.id));
                        }}
                        onDragOver={(e) => {
                            if (editMode && !sortField) e.preventDefault();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (!editMode || sortField) return;
                            const draggedRaw = e.dataTransfer.getData("text/plain");
                            const dragged = shown.find((x) => String(x.id) === draggedRaw)?.id;
                            if (dragged !== undefined)
                                reorderTx(
                                    dragged,
                                    t.id,
                                    shown.map((x) => x.id),
                                );
                        }}
                        onClick={() => {
                            if (editMode && canEdit) onEdit(t);
                        }}
                    >
                                             <span
                                                 className="tx-category-icon"
                                                 style={{ background: `${catColor}22`, color: catColor }}
                                             >
                                                    <MerchantIcon
                                                        title={t.title}
                                                        imgStyle={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                                                        fallback={<BudgetIcon name={iconName} size={20} />}
                                                    />
                </span>
                        <strong>
                            {t.title}
                            {t.impulse && <em>Імпульсивна</em>}
                            <small className="row-tags">{t.tags?.map((x) => `#${x}`).join(" ")}</small>
                        </strong>
                        <span>
              {t.category}
                            <small>
                {t.account}
                                {t.owner ? ` · ${t.owner}` : ""}
              </small>
            </span>
                        <span>{t.date}</span>
                        <b className={t.amount > 0 ? "income-amount" : ""}>
                            {t.amount > 0 ? "+" : "−"} {currencySymbol(t.currency || "UAH")}{" "}
                            {formatMoney(t.amount)}
                        </b>
                        <div className="row-menu-wrap">
                            {editMode && (
                                <button
                                    className="icon-button danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        remove(t.id);
                                    }}
                                    title="Видалити"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
            {shown.length === 0 && (
                <EmptyState
                    icon={<Search />}
                    text={
                        transactions.length
                            ? "Нічого не знайдено за цим фільтром"
                            : "Тут з'являться твої операції — додай першу через кнопку «Додати витрату»"
                    }
                />
            )}
        </section>
    );
}