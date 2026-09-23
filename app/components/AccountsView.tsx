"use client";
import { useRef, useState } from "react";
import { useClickOutside } from "../lib/useClickOutside";
import type { Account } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { GracePeriodAlert } from "./Analytics";
import { AccountCard } from "./AccountCard";
import { WheelField } from "./modals";
import { ArrowRight, BarChart3, HandCoins, Landmark, PiggyBank, Plus, RefreshCw, SearchCheck, Trash2 } from "lucide-react";


export function AccountsView({
                          accounts,
                          rates,
                          customRates,
                          add,
                          edit,
                          addRate,
                          transfer,
                          remove,
                          reorderAccounts,
                          monoToken,
                          setMonoToken,
                          monoAccounts,
                          setMonoAccounts,
                          monoConnecting,
                          connectMonobank,
                          linkMonobankAccount,
                          unlinkMonobankAccount,
                          createAndLinkMonobankAccount,
                          resyncMonobank,
                          monoLinks,
                          monoResyncing,
                          monoLastSyncedAt,
                          monoResyncingCard,
                      }: {
    accounts: Account[];
    rates: { currency: string; rate: number; date: string }[];
    customRates: { currency: string; rate: number; date: string }[];
    add: () => void;
    edit: (account: Account) => void;
    addRate: () => void;
    transfer: () => void;
    remove: (id: number | string) => void;
    reorderAccounts: (draggedId: string, targetId: string) => void;
    monoToken: string;
    setMonoToken: (v: string) => void;
    monoAccounts: {
        id: string;
        type: string;
        currency: string;
        balance: number;
        creditLimit: number;
        maskedPan: string;
    }[];
    setMonoAccounts: (v: []) => void;
    monoConnecting: boolean;
    connectMonobank: () => void;
    linkMonobankAccount: (monoAccountId: string, appAccountId: string) => void;
    createAndLinkMonobankAccount: (ma: {
        id: string;
        type: string;
        currency: string;
        balance: number;
        creditLimit: number;
        maskedPan: string;
    }) => void;
    resyncMonobank: (force?: boolean, days?: number, monoAccountId?: string, noDedupe?: boolean) => void;
    monoLinks: Record<string, string>;
    monoResyncing: boolean;
    unlinkMonobankAccount: (monoAccountId: string) => void;
    monoLastSyncedAt?: string | null;
    monoResyncingCard?: string | null;
}) {
    const visible = rates.filter((r) => ["USD", "EUR"].includes(r.currency));
    const [monoOpen, setMonoOpen] = useState(monoAccounts.length > 0);
    const [monoMenuOpen, setMonoMenuOpen] = useState(false);
    const monoMenuRef = useRef<HTMLDivElement>(null);
    useClickOutside(monoMenuRef, () => setMonoMenuOpen(false), monoMenuOpen);
    type ReconcileItem = { id: string; time: string; description: string; amount: number; status: string; appNote: string | null };
    const [reconcile, setReconcile] = useState<{
        cardId: string; loading: boolean; error?: string;
        data?: { account: string; currency: string; monoBalance: number | null; appBalance: number | null; total: number; okCount: number; items: ReconcileItem[]; repaired: number };
    } | null>(null);
    async function runReconcile(cardId: string, repair = false) {
        setReconcile({ cardId, loading: true });
        try {
            const res = await fetch("/api/monobank/reconcile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monoAccountId: cardId, days: Math.min(31, monoResyncDays), repair }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return setReconcile({ cardId, loading: false, error: json.error || "Не вдалося звірити" });
            setReconcile({ cardId, loading: false, data: json });
            if (repair && json.repaired > 0) resyncMonobank(false, Math.min(31, monoResyncDays), cardId, true);
        } catch {
            setReconcile({ cardId, loading: false, error: "Немає з'єднання" });
        }
    }
    const STATUS_LABEL: Record<string, string> = {
        missing: "немає в застосунку",
        shared: "склеєно з іншою операцією",
        wrong_account: "записано на інший рахунок",
        amount_mismatch: "інша сума в застосунку",
    };
    const syncedAgo = (() => {
        if (!monoLastSyncedAt) return null;
        const mins = Math.round((Date.now() - new Date(monoLastSyncedAt).getTime()) / 60000);
        if (!Number.isFinite(mins)) return null;
        if (mins < 1) return "щойно";
        if (mins < 60) return `${mins} хв тому`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours} год тому`;
        return `${Math.round(hours / 24)} дн. тому`;
    })();
    const [monoResyncDays, setMonoResyncDays] = useState(31);
    return (
        <section className="panel full-view">
            <GracePeriodAlert accounts={accounts} />
            <div className="section-title">
                <div>
                    <h2>Усі рахунки</h2>
                    <p>UAH, USD та інші валюти</p>
                </div>
                <div className="title-actions">
                    <button className="secondary" onClick={transfer}>
                        <ArrowRight /> Переказ / обмін
                    </button>
                    <button className="small-primary" onClick={add}>
                        <Plus /> Новий рахунок
                    </button>
                </div>
            </div>
            {!accounts.length && (
                <button
                    className="new-account"
                    style={{ width: "100%", minHeight: "140px", marginBottom: "20px" }}
                    onClick={add}
                >
          <span className="new-account-icon">
            <Plus />
          </span>
                    <span>Додай свій перший рахунок, щоб почати</span>
                </button>
            )}
            <div className="accounts-grid">
                {accounts.map((a) => (
                    <div
                        className="account-wrap"
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            reorderAccounts(e.dataTransfer.getData("text/plain"), String(a.id));
                        }}
                    >
                        <div onClick={() => edit(a)}>
                            <AccountCard account={a} />
                        </div>
                        <div className="account-actions">
                            <button className="remove-account" onClick={() => remove(a.id)}>
                                <Trash2 /> Видалити
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="rate-card">
                <Landmark />
                <div>
                    <strong>Офіційний курс НБУ</strong>
                    <p>
                        {visible.length
                            ? visible.map((r) => `${r.currency} ${r.rate.toFixed(4)}`).join(" · ")
                            : "Оновлення курсів…"}
                        {customRates.length
                            ? ` · Власний: ${customRates
                                .slice(0, 3)
                                .map((r) => `${r.currency} ${r.rate}`)
                                .join(", ")}`
                            : ""}
                    </p>
                </div>
                <button className="secondary" onClick={addRate}>
                    Власний курс
                </button>
            </div>
            <section className="panel mono-panel">
                {/* Стилі панелі тут, щоб точно підхоплювались разом з компонентом */}
                <style>{MONO_PANEL_CSS}</style>
                <div className="section-title">
                    <div>
                        <h2>Monobank</h2>
                        <p>Автоматичне вивантаження виписки в реальному часі</p>
                    </div>
                    <div className="title-actions">
                        {monoAccounts.length > 0 ? (
                            <>
                                {syncedAgo && (
                                    <span className="mono-sync"><span className="mono-sync-dot" />синхронізовано {syncedAgo}</span>
                                )}
                                <select
                                    className="mono-period"
                                    value={monoResyncDays}
                                    onChange={(e) => {
                                        const days = Number(e.target.value);
                                        if (days > 93) {
                                            window.alert(
                                                `Через обмеження Monobank API (1 запит на хвилину) завантаження за такий період може тривати ${Math.ceil(days / 31 * 4 / 60)}+ годин. Рекомендуємо обирати менший період для швидшого оновлення.`,
                                            );
                                        }
                                        setMonoResyncDays(days);
                                    }}
                                    disabled={monoResyncing}
                                >
                                    <option value={31}>За 31 день</option>
                                    <option value={62}>За 2 місяці</option>
                                    <option value={93}>За 3 місяці</option>
                                    <option value={186}>За 6 місяців (довго)</option>
                                    <option value={365}>За рік (дуже довго)</option>
                                </select>
                                <button
                                    className="small-primary"
                                    onClick={() => resyncMonobank(false, monoResyncDays)}
                                    disabled={monoResyncing}
                                >
                                    {monoResyncing && !monoResyncingCard ? "Оновлюю…" : "Оновити всі"}
                                </button>
                                <div className="mono-menu-wrap" ref={monoMenuRef}>
                                    <button type="button" className="secondary mono-menu-btn" onClick={() => setMonoMenuOpen((v) => !v)} aria-label="Ще">
                                        ⋯
                                    </button>
                                    {monoMenuOpen && (
                                        <div className="mono-menu" onMouseLeave={() => setMonoMenuOpen(false)}>
                                            <button type="button" onClick={() => { setMonoMenuOpen(false); setMonoOpen((v) => !v); }}>
                                                {monoOpen ? "Згорнути картки" : "Показати картки"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMonoMenuOpen(false);
                                                    if (window.confirm("Змінити токен Monobank? Поточне підключення буде замінено."))
                                                        setMonoAccounts([]);
                                                }}
                                            >
                                                Змінити токен
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <button onClick={() => setMonoOpen((v) => !v)}>
                                {monoOpen ? "Згорнути" : "Підключити"}
                            </button>
                        )}
                    </div>
                </div>
                {monoOpen && (
                    <>
                        {monoAccounts.length === 0 && (
                            <div className="mc-connect">
                                <ol className="mc-steps">
                                    <li>
                                        <span>1</span>
                                        <div>
                                            Відкрий{" "}
                                            <a href="https://api.monobank.ua/" target="_blank" rel="noreferrer">
                                                api.monobank.ua ↗
                                            </a>{" "}
                                            і натисни <b>«Отримати токен»</b>
                                        </div>
                                    </li>
                                    <li>
                                        <span>2</span>
                                        <div>
                                            Відскануй QR-код у застосунку Monobank:{" "}
                                            <b>Ще → Розробникам API</b>
                                        </div>
                                    </li>
                                    <li>
                                        <span>3</span>
                                        <div>Скопіюй токен (довгий рядок літер і цифр) і встав нижче</div>
                                    </li>
                                </ol>
                                <form
                                    className="mc-form"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (monoToken.trim() && !monoConnecting) connectMonobank();
                                    }}
                                >
                                    <label htmlFor="mono-token">Особистий токен</label>
                                    <div className="mc-row">
                                        <input
                                            id="mono-token"
                                            type="password"
                                            autoComplete="off"
                                            value={monoToken}
                                            onChange={(e) => setMonoToken(e.target.value)}
                                            placeholder="Встав токен сюди"
                                        />
                                        <button
                                            type="submit"
                                            className="small-primary"
                                            disabled={monoConnecting || !monoToken.trim()}
                                        >
                                            {monoConnecting ? "Підключаю…" : "Підключити"}
                                        </button>
                                    </div>
                                    <small>🔒 Токен дає доступ лише на читання виписки. Нікому його не показуй.</small>
                                </form>
                            </div>
                        )}
                        {monoAccounts.length > 0 && (
                            <div className="mono-card-grid">
                                {[...monoAccounts]
                                    .sort((a, b) => Number(Boolean(monoLinks[b.id])) - Number(Boolean(monoLinks[a.id])))
                                    .map((ma) => {
                                    const linkedAccountId = monoLinks[ma.id];
                                    const linkedAccount = accounts.find((a) => String(a.id) === linkedAccountId);
                                    const last4 = String(ma.maskedPan || "").replace(/\D/g, "").slice(-4);
                                    const kindLabel = ma.type === "fop" ? "ФОП" : ma.type === "jar" ? "Банка" : "";
                                    return (
                                        <div key={ma.id} className="mono-card-cell">
                                            <div className={`mono-mini-card ${linkedAccount ? `cur-${ma.currency}` : "unlinked"}`}>
                                                <div className="mono-mini-top">
                                                    <span>{ma.currency}{kindLabel ? ` · ${kindLabel}` : ""}</span>
                                                    <span>•{last4}</span>
                                                </div>
                                                {linkedAccount ? (
                                                    <div className="mono-mini-amount">
                                                        {currencySymbol(ma.currency)}{formatMoney(ma.balance)}
                                                    </div>
                                                ) : (
                                                    <WheelField
                                                        name={`mono-link-${ma.id}`}
                                                        label="Прив'язати"
                                                        options={[
                                                            { value: "__new__", label: "+ Створити новий рахунок" },
                                                            ...[...accounts]
                                                                .filter((a) => a.bank?.toLowerCase().includes("mono"))
                                                                .sort((a, b) => (a.currency === ma.currency ? -1 : 0) - (b.currency === ma.currency ? -1 : 0))
                                                                .map((a) => ({ value: String(a.id), label: `${a.name} · ${a.currency}` })),
                                                            ...accounts
                                                                .filter((a) => !a.bank?.toLowerCase().includes("mono"))
                                                                .map((a) => ({ value: String(a.id), label: `${a.name} · ${a.currency}` })),
                                                        ]}
                                                        defaultValue=""
                                                        onChange={(value) => {
                                                            if (value === "__new__") createAndLinkMonobankAccount(ma);
                                                            else linkMonobankAccount(ma.id, value);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            {linkedAccount && (
                                                <div className="mono-mini-under">
                                                    <span>✓ {linkedAccount.name}</span>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => runReconcile(ma.id)}
                                                        disabled={monoResyncing || reconcile?.loading}
                                                        title="Звірити з випискою Монобанку (останні 31 день)"
                                                    >
                                                        {reconcile?.loading && reconcile.cardId === ma.id ? "…" : <SearchCheck size={12} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => resyncMonobank(false, monoResyncDays, ma.id)}
                                                        disabled={monoResyncing}
                                                        title={`Оновити виписку лише цієї картки (${monoResyncDays} дн.). Перекази з іншими картками зв'яжуться при оновленні всіх.`}
                                                    >
                                                        {monoResyncingCard === ma.id ? "…" : <RefreshCw size={12} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button danger"
                                                        onClick={() => unlinkMonobankAccount(ma.id)}
                                                        title="Відв'язати"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {reconcile && !reconcile.loading && (
                            <div className="mono-reconcile">
                                <div className="mono-reconcile-head">
                                    <b>Звірка з Монобанком</b>
                                    <button type="button" className="icon-button" onClick={() => setReconcile(null)} title="Закрити">✕</button>
                                </div>
                                {reconcile.error ? (
                                    <p className="mono-reconcile-error">{reconcile.error}</p>
                                ) : reconcile.data && (
                                    <>
                                        <p>
                                            {reconcile.data.account}: у виписці за 31 день <b>{reconcile.data.total}</b> операцій,
                                            збігається <b>{reconcile.data.okCount}</b>.
                                            {reconcile.data.monoBalance != null && reconcile.data.appBalance != null && (
                                                <> Баланс у Монобанку {currencySymbol(reconcile.data.currency)}{formatMoney(reconcile.data.monoBalance)},
                                                    у застосунку {currencySymbol(reconcile.data.currency)}{formatMoney(reconcile.data.appBalance)}
                                                    {Math.abs(reconcile.data.monoBalance - reconcile.data.appBalance) >= 0.01 ? " — не збігається." : " ✓"}</>
                                            )}
                                        </p>
                                        {reconcile.data.repaired > 0 && <p className="mono-reconcile-ok">Довантажую {reconcile.data.repaired} операцій…</p>}
                                        {reconcile.data.items.length === 0 ? (
                                            <p className="mono-reconcile-ok">✓ Усі операції на місці</p>
                                        ) : (
                                            <>
                                                <ul>
                                                    {reconcile.data.items.map((it) => (
                                                        <li key={it.id}>
                                                            <span>{new Date(it.time).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" })}</span>
                                                            <span className="mono-reconcile-desc">{it.description}</span>
                                                            <b>{it.amount > 0 ? "+" : "−"}{currencySymbol(reconcile.data!.currency)}{formatMoney(Math.abs(it.amount))}</b>
                                                            <small>{STATUS_LABEL[it.status] || it.status}{it.appNote && it.status !== "missing" ? ` («${it.appNote}»)` : ""}</small>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {reconcile.data.items.some((it) => it.status === "missing" || it.status === "shared") && (
                                                    <button
                                                        type="button"
                                                        className="small-primary"
                                                        disabled={monoResyncing}
                                                        onClick={() => runReconcile(reconcile.cardId, true)}
                                                    >
                                                        Довантажити відсутні
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
        </section>
    );
}
export const ASSET_TYPE_LABELS: Record<string, string> = {
    savings: "Накопичення",
    deposit: "Депозит",
    bond: "Облігація",
    security: "Цінний папір",
};
export const ASSET_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    savings: PiggyBank,
    deposit: Landmark,
    bond: HandCoins,
    security: BarChart3,
};

const MONO_PANEL_CSS = `
/* Monobank: сітка міні-карток (варіант B) */
.mono-sync { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.mono-sync-dot { width: 8px; height: 8px; border-radius: 50%; background: #1f9d62; }
.mono-period { border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; background: var(--panel); color: var(--text); font: inherit; font-size: 13px; }
.mono-menu-wrap { position: relative; }
.mono-menu-btn { min-width: 40px; font-weight: 700; }
.mono-menu {
    position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; min-width: 190px;
    background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 6px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, .12); display: flex; flex-direction: column;
}
.mono-menu button { text-align: left; background: transparent; border: 0; border-radius: 10px; padding: 9px 10px; font: inherit; color: var(--text); cursor: pointer; }
.mono-menu button:hover { background: var(--bg-secondary); }
.mono-card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.mono-card-cell { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mono-mini-card { border-radius: 16px; padding: 14px; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; }
.mono-mini-card.cur-UAH { background: linear-gradient(135deg, #e9eefc, #d9e1fb); color: #1f2a5c; }
.mono-mini-card.cur-USD { background: linear-gradient(135deg, #e6f6ee, #cfeedd); color: #134a31; }
.mono-mini-card.cur-EUR { background: linear-gradient(135deg, #fdf1e3, #f8e0c4); color: #5c3708; }
.mono-mini-card.unlinked { background: var(--panel); border: 1.5px dashed var(--line); color: var(--text); }
.mono-mini-top { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; opacity: .75; }
.mono-mini-amount { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
.mono-mini-under { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 600; color: #1f9d62; }
:root[data-theme="dark"] .mono-mini-card.cur-UAH { background: linear-gradient(135deg, #1e2542, #252f57); color: #dfe5ff; }
:root[data-theme="dark"] .mono-mini-card.cur-USD { background: linear-gradient(135deg, #16301f, #1c3d29); color: #d6f5e3; }
:root[data-theme="dark"] .mono-mini-card.cur-EUR { background: linear-gradient(135deg, #362614, #45301a); color: #fbe7cf; }
@media (max-width: 720px) {
    .mono-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.mono-panel .section-title { flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.mono-panel .title-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mono-sync { white-space: nowrap; }
.mono-reconcile { margin-top: 16px; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; font-size: 13px; }
.mono-reconcile-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.mono-reconcile p { margin: 4px 0; }
.mono-reconcile ul { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; }
.mono-reconcile li { display: grid; grid-template-columns: 110px 1fr auto; gap: 4px 10px; align-items: baseline; border-top: 1px solid var(--line); padding-top: 6px; }
.mono-reconcile li small { grid-column: 1 / -1; color: #d14b50; }
.mono-reconcile-desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono-reconcile-ok { color: #1f9d62; font-weight: 600; }
.mono-reconcile-error { color: #d14b50; }
`;
