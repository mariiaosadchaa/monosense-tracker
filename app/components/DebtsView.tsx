"use client";
import type { DebtItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import {ArrowDownLeft, ArrowUpRight, HandCoins, Plus, Trash2} from "lucide-react";

function DebtsView({
                       debts,
                       add,
                       settle,
                       payOff,
                       openPay,
                       splitBill,
                   }: {
    debts: DebtItem[];
    add: () => void;
    settle: (debt: DebtItem) => void;
    payOff: (accountId: string) => void;
    openPay: (debt: DebtItem) => void;
    splitBill: () => void;
}) {
    const mine = debts.filter((d) => d.direction === "owed_to_me");
    const owe = debts.filter((d) => d.direction === "i_owe");
    return (
        <section className="panel full-view">
            <div className="section-title">
                <div>
                    <h2>Борги та кредити</h2>
                    <p>Хто винен мені та кому винна я</p>
                </div>
                <div className="title-actions">
                    <button className="secondary" onClick={splitBill}>
                        <HandCoins /> Розділити чек
                    </button>
                    <button className="small-primary" onClick={add}>
                        <Plus /> Додати борг
                    </button>
                </div>
            </div>
            <div className="debt-summary">
                <article>
                    <ArrowDownLeft />
                    <div>
                        <small>Мені винні</small>
                        <strong>
                            {currencySymbol("UAH")} {formatMoney(mine.reduce((s, d) => s + d.amount, 0))}
                        </strong>
                    </div>
                </article>
                <article>
                    <ArrowUpRight />
                    <div>
                        <small>Я винна</small>
                        <strong>
                            {currencySymbol("UAH")} {formatMoney(owe.reduce((s, d) => s + d.amount, 0))}
                        </strong>
                    </div>
                </article>
            </div>
            <div className="debt-list">
                {debts.map((d) => (
                    <div key={d.id}>
            <span className={d.direction === "owed_to_me" ? "debt-in" : "debt-out"}>
              {d.direction === "owed_to_me" ? <ArrowDownLeft /> : <ArrowUpRight />}
            </span>
                        <div>
                            <strong>{d.person}</strong>
                            <small>
                                {d.note || "Без нотатки"}
                                {d.due ? ` · до ${new Date(d.due).toLocaleDateString("uk-UA")}` : ""}
                            </small>
                        </div>
                        <b>
                            {d.currency} {formatMoney(d.amount)}
                        </b>
                        {d.isVirtual ? (
                            <button className="small-primary" onClick={() => d.accountId && payOff(d.accountId)}>
                                Погасити
                            </button>
                        ) : d.isInstallment && d.direction === "i_owe" ? (
                            <>
                                <button className="small-primary" onClick={() => openPay(d)}>
                                    Погасити
                                </button>
                                <button className="icon-button danger" onClick={() => settle(d)}>
                                    <Trash2 size={14} />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => settle(d)}>Закрити</button>
                        )}
                    </div>
                ))}
                {!debts.length && <p className="empty">Активних боргів немає</p>}
            </div>
        </section>
    );
}