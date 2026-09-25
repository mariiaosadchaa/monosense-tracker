"use client";
import { useState, useEffect, useRef } from "react";
import { useClickOutside } from "../lib/useClickOutside";
import { extractMerchant } from "./AccountCard";
import type { Transaction, CategoryItem, Account } from "../types";
import { formatMoney, currencySymbol, toDateKey } from "../lib/format";
import { mergeTransferPairs } from "../lib/transfers";
import {
    ArrowDownLeft,
    ArrowLeftRight,
    ArrowUpRight,
    Camera,
    ChevronDown,
    Download,
    Pencil,
    Search,
    SlidersHorizontal,
    Trash2,
    User,
    X
} from "lucide-react";

/**
 * Без фільтра по рахунку переказ між своїми рахунками показуємо ОДНИМ рядком «A → B»
 * (лишаємо ногу списання, ногу зарахування ховаємо). З фільтром по рахунку — видно ногу цього рахунку.
 */
function collapsePairs(
    list: Transaction[],
    transfers: { fromTransactionId: string | null; toTransactionId: string | null }[],
): Transaction[] {
    const ids = new Set(list.map((t) => String(t.id)));
    const outPairs = new Set(list.filter((t) => t.pairRole === "out" && t.pairId).map((t) => t.pairId!));
    const inToOut = new Map(
        transfers
            .filter((tr) => tr.fromTransactionId && tr.toTransactionId)
            .map((tr) => [String(tr.toTransactionId), String(tr.fromTransactionId)]),
    );
    const byId = new Map(list.map((t) => [String(t.id), t]));
    const outToIn = new Map([...inToOut.entries()].map(([i, o]) => [o, i]));
    const hidden = new Set<string>();
    for (const t of list) {
        if (t.pairRole === "in" && t.pairId && outPairs.has(t.pairId)) hidden.add(String(t.id));
        const outId = inToOut.get(String(t.id));
        if (outId && ids.has(outId)) hidden.add(String(t.id));
    }
    return list
        .filter((t) => !hidden.has(String(t.id)))
        .map((t) => {
            const inId = outToIn.get(String(t.id));
            const inLeg = inId ? byId.get(inId) : undefined;
            if (t.pairRole === "out" || (inLeg && hidden.has(String(inLeg.id)))) {
                const title = inLeg ? `${t.account} → ${inLeg.account}` : t.title;
                return { ...t, title, pairRole: "out", kind: "transfer", collapsedPair: true };
            }
            return t;
        });
}

const PRESETS = [
    ["all", "Весь час"],
    ["today", "Сьогодні"],
    ["yesterday", "Учора"],
    ["weekend", "Ці вихідні"],
    ["thisMonth", "Цей місяць"],
    ["lastMonth", "Минулий місяць"],
] as const;
import { CalendarPickerInput } from "./modals";
import { BudgetIcon, guessIconFromTitle, MerchantIcon, isPersonName, findMerchantDomain, isJarTitle } from "../lib/icons";

export function TransactionsView({
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
                                     accounts,
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
    accounts: Account[];
}) {
    const [account, setAccount] = useState("");
    const [category, setCategory] = useState("");
    const [owner, setOwner] = useState("");
    const [tag, setTag] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [preset, setPreset] = useState<string>("all");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const filtersRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);
    // Пошук: поле оновлюється миттєво, а фільтрація — з невеликою затримкою
    const [query, setQuery] = useState(search);
    useEffect(() => {
        if (query === search) return;
        const id = setTimeout(() => setSearch(query), 200);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);
    useEffect(() => {
        if (!search) setQuery("");
    }, [search]);
    // Рендеримо операції порціями, щоб довгий список не гальмував
    const PAGE = 60;
    const [visible, setVisible] = useState(PAGE);
    const sentinelRef = useRef<HTMLDivElement>(null);
    useClickOutside(filtersRef, () => setFiltersOpen(false), filtersOpen);
    useClickOutside(exportRef, () => setExportOpen(false), exportOpen);
    const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [details, setDetails] = useState<Transaction | null>(null);
    const [manualOrder, setManualOrder] = useState<(string | number)[]>([]);

    function toISO(d: Date) {
        return d.toISOString().slice(0, 10);
    }

    function applyPreset(preset: string) {
        const now = new Date();
        setPreset(preset);
        if (preset === "all") {
            setFrom("");
            setTo("");
        } else if (preset === "today") {
            setFrom(toISO(now));
            setTo(toISO(now));
        } else if (preset === "yesterday") {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            setFrom(toISO(d));
            setTo(toISO(d));
        } else if (preset === "weekend") {
            const day = now.getDay();
            const saturday = new Date(now);
            saturday.setDate(now.getDate() - ((day + 1) % 7) + (day === 0 ? -1 : 6 - day));
            const sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1);
            setFrom(toISO(saturday));
            setTo(toISO(sunday));
        } else if (preset === "thisMonth") {
            setFrom(toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
            setTo(toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
        } else if (preset === "lastMonth") {
            setFrom(toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
            setTo(toISO(new Date(now.getFullYear(), now.getMonth(), 0)));
        }
    }

    function reorderTx(
        draggedId: string | number,
        targetId: string | number,
        currentIds: (string | number)[],
    ) {
        const base = manualOrder.length ? manualOrder : currentIds;
        const ids = [...base];
        if (!ids.includes(draggedId)) ids.unshift(draggedId);
        const fromIndex = ids.indexOf(draggedId);
        const toIndex = ids.indexOf(targetId);
        if (fromIndex < 0 || toIndex < 0) return;
        ids.splice(fromIndex, 1);
        ids.splice(toIndex, 0, draggedId);
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

    const base: Transaction[] = account
        ? (() => {
            const txById = new Map(transactions.map((t) => [String(t.id), t]));
            const fromIdToTr = new Map(
                transfers.filter((tr) => tr.fromTransactionId).map((tr) => [String(tr.fromTransactionId), tr])
            );
            const toIdToTr = new Map(
                transfers.filter((tr) => tr.toTransactionId).map((tr) => [String(tr.toTransactionId), tr])
            );
            return transactions
                .filter((t) => (t.account || "").trim() === account.trim())
                .map((t) => {
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
        : collapsePairs(transactions, transfers);

    const filtered = base.filter(
        (t) =>
            (!category || t.category === category) &&
            (!owner || t.owner === owner) &&
            (!tag || t.tags?.includes(tag)) &&
            (!from || !t.bookedAt || t.bookedAt >= `${from}T00:00:00`) &&
            (!to || !t.bookedAt || t.bookedAt <= `${to}T23:59:59`) &&
            (!minAmount || Math.abs(t.amount) >= Number(minAmount)) &&
            (!maxAmount || Math.abs(t.amount) <= Number(maxAmount))
    );

    const shown = sortField
        ? [...filtered].sort((a, b) => {
            const dir = sortDir === "asc" ? 1 : -1;
            if (sortField === "amount") return (Math.abs(a.amount) - Math.abs(b.amount)) * dir;
            return (a.bookedAt || "").localeCompare(b.bookedAt || "") * dir;
        })
        : editMode && manualOrder.length
            ? [...filtered].sort((a, b) => {
                const ia = manualOrder.indexOf(a.id);
                const ib = manualOrder.indexOf(b.id);
                if (ia === -1 && ib === -1) return (b.bookedAt || "").localeCompare(a.bookedAt || "");
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            })
            : [...filtered].sort((a, b) => {
                const dateCompare = (b.bookedAt || "").localeCompare(a.bookedAt || "");
                if (dateCompare !== 0) return dateCompare;
                if (a.kind === "transfer" && b.kind === "transfer") {
                    // спершу списання (звідки), потім зарахування (куди)
                    return a.amount < 0 ? -1 : b.amount < 0 ? 1 : 0;
                }
                return 0;
            });
    // Дві ноги одного переказу — поруч: спершу «звідки» (−), одразу під ним «куди» (+)
    if (!sortField && !(editMode && manualOrder.length)) {
        const inByPair = new Map(shown.filter((t) => t.pairRole === "in" && t.pairId).map((t) => [t.pairId!, t]));
        const outPairs = new Set(shown.filter((t) => t.pairRole === "out" && t.pairId).map((t) => t.pairId!));
        const ordered: Transaction[] = [];
        for (const t of shown) {
            if (t.pairRole === "in" && t.pairId && outPairs.has(t.pairId)) continue;
            ordered.push(t);
            if (t.pairRole === "out" && t.pairId && inByPair.has(t.pairId)) ordered.push(inByPair.get(t.pairId)!);
        }
        shown.splice(0, shown.length, ...ordered);
    }

    const filterKey = [search, account, category, owner, tag, from, to, minAmount, maxAmount, sortField, sortDir].join("|");
    useEffect(() => {
        setVisible(PAGE);
    }, [filterKey]);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) setVisible((v) => v + PAGE);
            },
            { rootMargin: "400px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [visible, shown.length]);

    const txIcon = (t: Transaction, size = 20) => {
        const cat = categories.find((c) => c.name === t.category);
        const rawIcon = t.categoryIcon || cat?.icon;
        const iconName = isJarTitle(t.title) ? "PiggyBank" : (rawIcon && rawIcon !== "CircleDollarSign") ? rawIcon : guessIconFromTitle(t.title);
        const catColor = cat?.color || "#6558e8";
        const isTransferDisplay = t.kind === "transfer" || t.title.includes("→");
                            const merchantTitle = extractMerchant(t.title);
                            const hasKnownLogo = !isTransferDisplay && !!findMerchantDomain(merchantTitle.toLowerCase());
                            const isPerson = !isTransferDisplay && !hasKnownLogo && isPersonName(merchantTitle);
                            return (
                                <span
                                    className="tx-category-icon"
                                    style={
                                        isTransferDisplay
                                            ? (t.collapsedPair
                                                ? { background: "#6558e822", color: "#6558e8" }
                                                : t.amount > 0
                                                ? { background: "#28a87922", color: "#28a879" }
                                                : { background: "#e0527d22", color: "#e0527d" })
                                            : { background: `${catColor}22`, color: catColor }
                                    }
                                >
            {isTransferDisplay ? (
                t.collapsedPair ? <ArrowLeftRight size={size} /> :
                t.amount > 0 ? <ArrowDownLeft size={size} /> : <ArrowUpRight size={size} />
            ) : isPerson ? (
                <User size={size} />
            ) : (
                <MerchantIcon
                    title={merchantTitle}
                    bankName={accounts.find((a) => a.name === t.account)?.bank}
                    imgStyle={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                    fallback={<BudgetIcon name={iconName} size={size} />}
                />
            )}
        </span>
                            );
                            };

    const accountOptions = unique(transactions.map((t) => t.account));
    const categoryOptions = unique(transactions.map((t) => t.category));
    const tagOptions = unique(transactions.flatMap((t) => t.tags || []));
    const ownerOptions = unique(transactions.map((t) => t.owner));
    const fmtDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("uk-UA") : "");
    const presetLabel = PRESETS.find(([k]) => k === preset)?.[1];
    const activeFilters = [
        account && { key: "account", label: account, clear: () => setAccount("") },
        category && { key: "category", label: category, clear: () => setCategory("") },
        tag && { key: "tag", label: `#${tag}`, clear: () => setTag("") },
        owner && { key: "owner", label: owner, clear: () => setOwner("") },
        (from || to) && {
            key: "date",
            label: preset && preset !== "all" && presetLabel ? presetLabel : `${fmtDate(from) || "…"} – ${fmtDate(to) || "…"}`,
            clear: () => applyPreset("all"),
        },
        (minAmount || maxAmount) && {
            key: "amount",
            label: `${minAmount || "0"} – ${maxAmount || "∞"} ₴`,
            clear: () => {
                setMinAmount("");
                setMaxAmount("");
            },
        },
    ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

    const clear = () => {
        setAccount("");
        setCategory("");
        setOwner("");
        setTag("");
        setFrom("");
        setTo("");
        setMinAmount("");
        setMaxAmount("");
        setPreset("all");
        setSearch("");
    };

    return (
        <section className="panel full-view">
            <div ref={filtersRef}>
            <div className="tx-toolbar">
                <label className="tx-search">
                    <Search size={17} />
                    <input
                        placeholder="Пошук операцій"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("");
                                setSearch("");
                            }}
                            aria-label="Очистити пошук"
                        >
                            <X size={15} />
                        </button>
                    )}
                </label>
                <button
                    type="button"
                    className={filtersOpen || activeFilters.length ? "tx-btn on" : "tx-btn"}
                    onClick={() => setFiltersOpen((v) => !v)}
                >
                    <SlidersHorizontal size={16} />
                    <span>Фільтри</span>
                    {activeFilters.length > 0 && <em>{activeFilters.length}</em>}
                </button>
                <div className="tx-menu-wrap" ref={exportRef}>
                    <button type="button" className="tx-btn" onClick={() => setExportOpen((v) => !v)}>
                        <Download size={16} />
                        <span>Експорт</span>
                        <ChevronDown size={14} />
                    </button>
                    {exportOpen && (
                            <div className="tx-menu">
                                {([
                                    ["CSV", exportCsv],
                                    ["Excel", exportExcel],
                                    ["JSON", exportJson],
                                ] as const).map(([label, fn]) => (
                                    <button
                                        type="button"
                                        key={label}
                                        onClick={() => {
                                            fn();
                                            setExportOpen(false);
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                    )}
                </div>
                <label className="tx-btn" title="Сканувати чек">
                    <Camera size={16} />
                    <span>{scanning ? "Розпізнаю…" : "Скан чека"}</span>
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
                <button
                    type="button"
                    className={editMode ? "tx-btn icon on" : "tx-btn icon"}
                    onClick={() => setEditMode((v) => !v)}
                    title={editMode ? "Завершити редагування" : "Редагувати операції"}
                    aria-label="Редагувати операції"
                >
                    <Pencil size={16} />
                </button>
            </div>

            <div className="tx-presets">
                {PRESETS.map(([key, label]) => (
                    <button
                        type="button"
                        key={key}
                        className={preset === key ? "on" : ""}
                        onClick={() => applyPreset(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className={filtersOpen ? "tx-filters-wrap open" : "tx-filters-wrap"} inert={!filtersOpen}>
                <div className="tx-filters-inner">
                <div className="tx-filters">
                    <label>
                        <span>Рахунок</span>
                        <select value={account} onChange={(e) => setAccount(e.target.value)}>
                            <option value="">Усі рахунки</option>
                            {accountOptions.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Категорія</span>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">Усі категорії</option>
                            {categoryOptions.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </label>
                    {tagOptions.length > 0 && (
                        <label>
                            <span>Тег</span>
                            <select value={tag} onChange={(e) => setTag(e.target.value)}>
                                <option value="">Усі теги</option>
                                {tagOptions.map((v) => (
                                    <option key={v} value={v}>#{v}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    {ownerOptions.length > 1 && (
                        <label>
                            <span>Хто витратив</span>
                            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                                <option value="">Усі</option>
                                {ownerOptions.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="tx-range">
                        <span>Період</span>
                        <div>
                            <CalendarPickerInput
                                value={from}
                                onChange={(v: string) => {
                                    setFrom(v);
                                    setPreset("");
                                }}
                                placeholder="з"
                            />
                            <i>—</i>
                            <CalendarPickerInput
                                value={to}
                                onChange={(v: string) => {
                                    setTo(v);
                                    setPreset("");
                                }}
                                placeholder="по"
                            />
                        </div>
                    </div>
                    <div className="tx-range">
                        <span>Сума, ₴</span>
                        <div>
                            <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                placeholder="від"
                            />
                            <i>—</i>
                            <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                placeholder="до"
                            />
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {(activeFilters.length > 0 || search) && (
                <div className="tx-active">
                    <span className="tx-count">
                        Знайдено: <b>{filtered.length}</b>
                    </span>
                    {activeFilters.map((f) => (
                        <button type="button" key={f.key} onClick={f.clear}>
                            {f.label} <X size={12} />
                        </button>
                    ))}
                    <button type="button" className="tx-reset" onClick={clear}>
                        Скинути все
                    </button>
                </div>
            )}
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
            {shown.slice(0, visible).map((t) => {
                const canEdit = t.kind !== "credit_limit_change";
                const cat = categories.find((c) => c.name === t.category);
                const rawIcon = t.categoryIcon || cat?.icon;
                const iconName = isJarTitle(t.title) ? "PiggyBank" : (rawIcon && rawIcon !== "CircleDollarSign") ? rawIcon : guessIconFromTitle(t.title);
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
                            if (editMode) {
                                if (canEdit) onEdit(t);
                            } else setDetails(t);
                        }}
                    >
                        {txIcon(t)}
                        <strong>
                            {extractMerchant(t.title)}
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
                        <b className={t.collapsedPair ? "transfer-amount" : t.amount > 0 ? "income-amount" : ""}>
                            {t.collapsedPair ? "" : t.amount > 0 ? "+" : "−"} {currencySymbol(t.currency || "UAH")}{" "}
                            {formatMoney(Math.abs(t.amount))}
                            {(t.originalAmount && t.originalCurrency && t.originalCurrency !== (t.currency || "UAH")) || (t.feeAmount && t.feeAmount > 0) ? (
                                <small style={{ display: "block", fontWeight: 400, fontSize: 11, color: "var(--text-secondary)" }}>
                                    {t.originalAmount && t.originalCurrency && t.originalCurrency !== (t.currency || "UAH")
                                        ? `${t.kind === "transfer" || t.kind === "exchange" ? "надійшло" : "чек"} ${currencySymbol(t.originalCurrency)} ${formatMoney(t.originalAmount)}`
                                        : ""}
                                    {t.feeAmount && t.feeAmount > 0
                                        ? `${t.originalAmount && t.originalCurrency && t.originalCurrency !== (t.currency || "UAH") ? " · " : ""}комісія ₴ ${formatMoney(t.feeAmount)}`
                                        : ""}
                                </small>
                            ) : null}
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
            {shown.length > visible && (
                <div ref={sentinelRef} className="tx-more">
                    <button type="button" onClick={() => setVisible((v) => v + PAGE)}>
                        Показати ще ({shown.length - visible})
                    </button>
                </div>
            )}
            {shown.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mb-2 opacity-50" />
                    <p>
                        {transactions.length === 0
                            ? "Немає операцій"
                            : "Нічого не знайдено за вашим запитом"}
                    </p>
                </div>
            )}
            {details && (
                <TxDetails
                    t={details}
                    icon={txIcon(details, 26)}
                    similar={transactions.filter(
                        (x) =>
                            x.id !== details.id &&
                            extractMerchant(x.title) === extractMerchant(details.title) &&
                            x.kind !== "transfer",
                    )}
                    close={() => setDetails(null)}
                    edit={
                        details.kind !== "credit_limit_change"
                            ? () => {
                                  const t = details;
                                  setDetails(null);
                                  onEdit(t);
                              }
                            : undefined
                    }
                    remove={() => {
                        if (window.confirm("Видалити цю операцію?")) {
                            remove(details.id);
                            setDetails(null);
                        }
                    }}
                    filterSimilar={() => {
                        setQuery(extractMerchant(details.title));
                        setSearch(extractMerchant(details.title));
                        setDetails(null);
                    }}
                />
            )}
        </section>
    );
}
function TxDetails({
    t,
    icon,
    similar,
    close,
    edit,
    remove,
    filterSimilar,
}: {
    t: Transaction;
    icon: React.ReactNode;
    similar: Transaction[];
    close: () => void;
    edit?: () => void;
    remove: () => void;
    filterSimilar: () => void;
}) {
    const sym = currencySymbol(t.currency || "UAH");
    const when = t.bookedAt
        ? new Date(t.bookedAt).toLocaleString("uk-UA", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : t.date;
    const kindLabel =
        t.kind === "transfer"
            ? t.category === "Між своїми рахунками"
                ? "Переказ між своїми рахунками — не враховується в статистиці"
                : "Переказ"
            : t.kind === "exchange"
                ? "Обмін валют"
                : t.kind === "credit_limit_change"
                    ? "Зміна кредитного ліміту"
                    : t.amount > 0
                        ? "Дохід"
                        : "Витрата";
    const similarSum = similar.reduce((acc, x) => acc + Math.abs(x.baseAmount ?? x.amount), 0);
    const rows: [string, React.ReactNode][] = [
        ["Тип", kindLabel],
        ["Категорія", t.category || "—"],
        ["Дата", when],
        ["Рахунок", `${t.account || "—"}${t.owner ? ` · ${t.owner}` : ""}`],
    ];
    if (t.originalAmount && t.originalCurrency && t.originalCurrency !== (t.currency || "UAH"))
        rows.push(["Сума в оригіналі", `${currencySymbol(t.originalCurrency)} ${formatMoney(t.originalAmount)}`]);
    if (t.feeAmount && t.feeAmount > 0) rows.push(["Комісія", `₴ ${formatMoney(t.feeAmount)}`]);
    if (t.tags?.length) rows.push(["Теги", t.tags.map((x) => `#${x}`).join(" ")]);
    if (t.impulse) rows.push(["Позначка", "Імпульсивна покупка"]);
    if (t.title !== extractMerchant(t.title)) rows.push(["Опис", t.title]);
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="expense-modal txd" onMouseDown={(e) => e.stopPropagation()}>
                <button type="button" className="txd-x" onClick={close} aria-label="Закрити">
                    <X size={18} />
                </button>
                <div className="txd-head">
                    <span className="txd-icon">{icon}</span>
                    <h3>{extractMerchant(t.title)}</h3>
                    <strong className={t.amount > 0 ? "txd-amt pos" : "txd-amt"}>
                        {t.amount > 0 ? "+" : "−"} {sym} {formatMoney(Math.abs(t.amount))}
                    </strong>
                </div>
                <dl className="txd-rows">
                    {rows.map(([k, v]) => (
                        <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
                </dl>
                {similar.length > 0 && (
                    <button type="button" className="txd-similar" onClick={filterSimilar}>
                        <span>
                            Ще {similar.length} {similar.length === 1 ? "операція" : similar.length < 5 ? "операції" : "операцій"} тут
                            <small>разом ₴ {formatMoney(similarSum)}</small>
                        </span>
                        <Search size={15} />
                    </button>
                )}
                <div className="txd-actions">
                    <button type="button" className="txd-del" onClick={remove}>
                        <Trash2 size={15} /> Видалити
                    </button>
                    {edit && (
                        <button type="button" className="primary" onClick={edit}>
                            <Pencil size={15} /> Редагувати
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
