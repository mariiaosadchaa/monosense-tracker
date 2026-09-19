"use client";
import type { GoalItem, RecurringItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import {ArrowUpRight, BarChart3, PiggyBank, Plus, Settings, Trash2} from "lucide-react";


function GoalsView({
                       goals,
                       authenticated,
                       add,
                       contribute,
                       recurring,
                       addRecurring,
                       edit,
                       openAction,
                   }: {
    goals: GoalItem[];
    authenticated: boolean;
    add: () => void;
    contribute: (id: string, amount: number, accountId: string) => void;
    recurring: RecurringItem[];
    addRecurring: () => void;
    edit: (goal: GoalItem) => void;
    openAction: (goal: GoalItem, mode: "withdraw" | "break" | "history" | "contribute") => void;
}) {
    const shown = goals.length
        ? goals
        : authenticated
            ? []
            : [
                {
                    id: "demo1",
                    name: "Резервний фонд",
                    target: 200000,
                    current: 120000,
                    currency: "UAH",
                    color: "#6558E8",
                },
                {
                    id: "demo2",
                    name: "Подорож до Японії",
                    target: 150000,
                    current: 38500,
                    currency: "UAH",
                    color: "#159B70",
                },
            ];
    const isEmpty = authenticated && !goals.length;
    return (
        <>
            <section className="panel full-view">
                <div className="section-title">
                    <div>
                        <h2>Фінансові цілі</h2>
                        <p>Накопичення, депозити та цінні папери</p>
                    </div>
                    {!isEmpty && (
                        <button className="small-primary" onClick={add}>
                            <Plus /> Нова ціль
                        </button>
                    )}
                </div>
                {isEmpty && (
                    <div className="goals-empty">
            <span className="empty-state-icon">
              <PiggyBank />
            </span>
                        <p>У тебе ще немає фінансових цілей — створи першу банку, щоб почати накопичувати</p>
                        <button className="round-add-btn" onClick={add} aria-label="Нова ціль">
                            <Plus />
                        </button>
                    </div>
                )}
                {!isEmpty && (
                    <div className="goals-grid">
                        {shown.map((g) => {
                            const percent = Math.min(100, Math.round((g.current / g.target) * 100)),
                                symbol = currencySymbol(g.currency);
                            const AssetIcon = ASSET_TYPE_ICONS[g.assetType || "savings"] || PiggyBank;
                            return (
                                <article className="goal-card" key={g.id}>
                                    <div className="goal-card-top">
                    <span className="goal-icon">
                      <AssetIcon size={18} />
                    </span>
                                        {g.assetType && g.assetType !== "savings" && (
                                            <em className="goal-asset-badge">{ASSET_TYPE_LABELS[g.assetType]}</em>
                                        )}
                                    </div>
                                    <small className="goal-card-label">
                                        {g.date
                                            ? `До ${new Date(g.date).toLocaleDateString("uk-UA")}`
                                            : "Фінансова ціль"}
                                        {g.annualRate
                                            ? ` · ${g.annualRate}% річних${g.compoundInterest ? " · капіталізація" : ""}`
                                            : ""}
                                    </small>
                                    <h3 className="goal-card-name">{g.name}</h3>
                                    <strong className="goal-card-amount">
                                        {symbol} {formatMoney(g.current)}
                                    </strong>
                                    <p className="goal-card-target">
                                        з {symbol} {formatMoney(g.target)}
                                    </p>
                                    <div className="goal-card-bar">
                                        <i style={{ width: `${percent}%`, background: g.color }} />
                                        <span className="goal-milestone-tick" style={{ left: "25%" }} />
                                        <span className="goal-milestone-tick" style={{ left: "50%" }} />
                                        <span className="goal-milestone-tick" style={{ left: "75%" }} />
                                    </div>
                                    <div className="goal-actions-row">
                                        <button
                                            className="goal-action-btn"
                                            onClick={() => openAction(g, "contribute")}
                                            aria-label="Поповнити"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            className="goal-action-btn"
                                            onClick={() => edit(g)}
                                            aria-label="Редагувати"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        <button
                                            className="goal-action-btn"
                                            onClick={() => openAction(g, "history")}
                                            aria-label="Історія"
                                        >
                                            <BarChart3 size={14} />
                                        </button>
                                        <button
                                            className="goal-action-btn"
                                            onClick={() => openAction(g, "withdraw")}
                                            aria-label="Зняти"
                                        >
                                            <ArrowUpRight size={14} />
                                        </button>
                                        <button
                                            className="goal-action-btn danger"
                                            onClick={() => openAction(g, "break")}
                                            aria-label="Розбити банку"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}