"use client";
import { useState } from "react";
import type { Account } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { GracePeriodAlert, AccountCard } from "../rivna-app";

import type {Account} from "@/app/types";
import {useState} from "react";
import {ArrowRight, BarChart3, HandCoins, Landmark, PiggyBank, Plus, Trash2} from "lucide-react";

function AccountsView({
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
                          monoConnecting,
                          connectMonobank,
                          linkMonobankAccount,
                          unlinkMonobankAccount,
                          createAndLinkMonobankAccount,
                          resyncMonobank,
                          monoLinks,
                          monoResyncing,
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
    resyncMonobank: (force?: boolean, days?: number) => void;
    monoLinks: Record<string, string>;
    monoResyncing: boolean;
    unlinkMonobankAccount: (monoAccountId: string) => void;
}) {
    const visible = rates.filter((r) => ["USD", "EUR"].includes(r.currency));
    const [monoOpen, setMonoOpen] = useState(monoAccounts.length > 0);
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
                <div className="section-title">
                    <div>
                        <h2>Monobank</h2>
                        <p>Автоматичне вивантаження виписки в реальному часі</p>
                    </div>
                    <div className="title-actions">
                        {monoAccounts.length > 0 && (
                            <>
                                <select
                                    value={monoResyncDays}
                                    onChange={(e) => setMonoResyncDays(Number(e.target.value))}
                                    disabled={monoResyncing}
                                >
                                    <option value={31}>За 31 день</option>
                                    <option value={62}>За 2 місяці</option>
                                    <option value={93}>За 3 місяці</option>
                                    <option value={186}>За 6 місяців</option>
                                    <option value={365}>За рік</option>
                                </select>
                                <button
                                    className="secondary"
                                    onClick={() => resyncMonobank(true, monoResyncDays)}
                                    disabled={monoResyncing}
                                >
                                    {monoResyncing ? "Оновлюю…" : "Оновити"}
                                </button>
                            </>
                        )}
                        <button onClick={() => setMonoOpen((v) => !v)}>
                            {monoOpen ? "Згорнути" : "Підключити"}
                        </button>
                    </div>
                </div>
                {monoAccounts.length === 0 && (
                    <p className="mono-note" style={{ padding: "0 0 12px" }}>
                        Спочатку підключи токен нижче — після цього зʼявиться кнопка оновлення виписки.
                    </p>
                )}
                {monoOpen && (
                    <>
                        {monoAccounts.length === 0 && (
                            <>
                                <ol className="mono-instructions">
                                    <li>
                                        Відкрий{" "}
                                        <a href="https://api.monobank.ua/" target="_blank" rel="noreferrer">
                                            api.monobank.ua
                                        </a>{" "}
                                        у браузері
                                    </li>
                                    <li>
                                        Натисни <b>«Отримати токен»</b>
                                    </li>
                                    <li>
                                        Відскануй QR-код у застосунку Monobank: <b>Ще → Розробникам API</b>
                                    </li>
                                    <li>Скопіюй токен (довгий рядок літер і цифр) і встав нижче</li>
                                </ol>
                                <div className="form-two">
                                    <label>
                                        Особистий токен
                                        <input
                                            type="password"
                                            value={monoToken}
                                            onChange={(e) => setMonoToken(e.target.value)}
                                            placeholder="Встав токен сюди"
                                        />
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    className="small-primary"
                                    onClick={connectMonobank}
                                    disabled={monoConnecting}
                                >
                                    {monoConnecting ? "Підключаю…" : "Підключити"}
                                </button>
                                <p className="mono-note">
                                    Токен дає доступ лише на читання виписки. Нікому його не показуй.
                                </p>
                            </>
                        )}
                        {monoAccounts.length > 0 && (
                            <div className="mono-accounts-list">
                                {monoAccounts.map((ma) => {
                                    const linkedAccountId = monoLinks[ma.id];
                                    const linkedAccount = accounts.find((a) => String(a.id) === linkedAccountId);
                                    return (
                                        <div key={ma.id} className="mono-account-row">
                                            <div>
                                                <strong>
                                                    {ma.type === "fop" ? "ФОП" : ma.type === "jar" ? "Банка" : "Картка"}{" "}
                                                    {ma.maskedPan}
                                                </strong>
                                                <small>
                                                    {ma.currency} · {ma.balance.toFixed(0)}
                                                </small>
                                            </div>
                                            {linkedAccount ? (
                                                <span className="mono-linked-row">
                          <span className="mono-linked-badge">
                            ✓ Прив'язано: {linkedAccount.name}
                          </span>
                          <button
                              type="button"
                              className="icon-button danger"
                              onClick={() => unlinkMonobankAccount(ma.id)}
                              title="Відв'язати"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                                            ) : (
                                                <select
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        if (e.target.value === "__new__") createAndLinkMonobankAccount(ma);
                                                        else linkMonobankAccount(ma.id, e.target.value);
                                                    }}
                                                >
                                                    <option value="" disabled>
                                                        Прив'язати до рахунку…
                                                    </option>
                                                    <option value="__new__">+ Створити новий рахунок</option>
                                                    {accounts.map((a) => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.name} · {a.currency}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </section>
        </section>
    );
}
const ASSET_TYPE_LABELS: Record<string, string> = {
    savings: "Накопичення",
    deposit: "Депозит",
    bond: "Облігація",
    security: "Цінний папір",
};
const ASSET_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    savings: PiggyBank,
    deposit: Landmark,
    bond: HandCoins,
    security: BarChart3,
};