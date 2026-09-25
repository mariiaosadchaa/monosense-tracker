"use client";
import { useState } from "react";
import { Wifi, Landmark, CreditCard, ArrowDownLeft, ArrowUpRight, User } from "lucide-react";
import type { Account, Transaction } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { isLight } from "../lib/transfers";
import { MerchantIcon, BudgetIcon, guessIconFromTitle, isPersonName, findMerchantDomain, isJarTitle } from "../lib/icons";

export function AccountCard({ account }: { account: Account }) {
    const [renderedAt] = useState(() => Date.now()),
        days = account.graceEnd
            ? Math.ceil((new Date(account.graceEnd).getTime() - renderedAt) / 86400000)
            : null;
    const available = (account.balance || 0) + (account.creditLimit || 0);
    const light = isLight(account.color);
    const ink = account.color ? (light ? "#000" : "#fff") : "#fff";
    const muted = account.color ? (light ? "rgba(0,0,0,.6)" : "rgba(255,255,255,.6)") : undefined;
    return (
        <article
            className={`account ${bankStyle(account.bank)}`}
            style={
                account.cardImage
                    ? {
                        backgroundImage: `url(${account.cardImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "#fff",
                    }
                    : account.color
                        ? { background: account.color, color: ink }
                        : undefined
            }
        >
            <div className="card-top">
                <BankMark bank={account.bank} />
                <div className="card-top-right">
                    {days !== null && (
                        <em className={days <= 7 ? "grace urgent" : "grace"}>
                            {days >= 0 ? `${days} дн. грейсу` : "Грейс минув"}
                        </em>
                    )}
                    <span className="card-contactless">
            <Wifi />
          </span>
                </div>
            </div>
            <div className="card-footer" style={{ marginTop: "22px" }}>
                <div>
                    <small style={muted ? { color: muted } : undefined}>Власник</small>
                    <strong>{account.owner || "—"}</strong>
                </div>
                <div className="card-balance">
                    <small style={muted ? { color: muted } : undefined}>Доступно</small>
                    <strong className="card-amount">
                        {available < 0 ? "−" : ""}
                        {currencySymbol(account.currency)} {formatMoney(available)}
                    </strong>
                </div>
            </div>
            {(account.creditLimit || 0) > 0 && (
                <div className="card-credit" style={muted ? { color: muted } : undefined}>
                    Використано: {formatMoney(Math.min(0, account.balance))} з{" "}
                    {formatMoney(account.creditLimit ?? 0)}
                </div>
            )}
            <div className="card-nickname" style={muted ? { color: muted } : undefined}>
                {account.name} · {account.bank}
            </div>
        </article>
    );
}
export function BankMark({ bank }: { bank: string }) {
    const value = bank.toLowerCase();
    if (value.includes("mono")) return <span className="bank-logo mono-logo">mono</span>;
    if (value.includes("приват") || value.includes("privat"))
        return <span className="bank-logo privat-logo">П</span>;
    if (value.includes("пумб") || value.includes("pumb"))
        return <span className="bank-logo pumb-logo">ПУМБ</span>;
    if (value.includes("ощад")) return <span className="bank-logo oschad-logo">О</span>;
    if (value.includes("райффайзен") || value.includes("raiffeisen"))
    if (value.includes("райффайзен") || value.includes("raiffeisen"))
        return <span className="bank-logo raif-logo">RAIFF</span>;
    if (value.includes("а-банк") || value.includes("abank"))
        return <span className="bank-logo abank-logo">А-Банк</span>;
    if (value.includes("сенс") || value.includes("sense"))
        return <span className="bank-logo sense-logo">Sense</span>;
    if (value.includes("укрсиб") || value.includes("ukrsib"))
        return <span className="bank-logo ukrsib-logo">УСБ</span>;
    if (value.includes("отп") || value.includes("otp"))
        return <span className="bank-logo otp-logo">OTP</span>;
    if (value.includes("кредо") || value.includes("kredo"))
        return <span className="bank-logo kredo-logo">Kredo</span>;
    if (value.includes("пайонер") || value.includes("піонер") || value.includes("payoneer"))
        return <span className="bank-logo pioneer-logo">Payoneer</span>;
    if (value.includes("готів"))
        return (
            <span className="bank-icon">
        <Landmark />
      </span>
        );
    return <span className="bank-icon">{bank.slice(0, 1).toUpperCase() || <CreditCard />}</span>;
}
export function extractMerchant(title: string): string {
    if (!title) return "";

    let cleaned = title
        .replace(/^(розстрочка|оплата частинами|купівля частинами|платіж|оплата послуг|оплата товарів|оплата в|оплата|переказ на|переказ|купівля|поповнення|сплата|списання|автосписання|комісія|зняття|видача|pos|p2p|tpp|qrc|nfc|apple pay|google pay|gpay)\s*:?\s*/gi, "")
        .trim();

    cleaned = cleaned.replace(/^(в|у)\s+/gi, "").trim();

    // "Переказ на картку" → лишаємо повну назву, а не просто "картку"
    if (/^(картку|карту|картки|рахунок|банку|card|account)$/i.test(cleaned)) return title;

    return cleaned || title;
}
export function bankStyle(bankName: string = "", index: number = 0): string {
    const name = bankName.toLowerCase();

    if (name.includes("mono") || name.includes("моно")) return "mono";
    if (name.includes("privat") || name.includes("приват")) return "privat";
    if (name.includes("pumb") || name.includes("пумб")) return "pumb";
    if (name.includes("oschad") || name.includes("ощад")) return "oschad";
    if (name.includes("sense") || name.includes("сенс")) return "sense";
    if (name.includes("ukrsib") || name.includes("укрсиб")) return "ukrsib";
    if (name.includes("a-bank") || name.includes("а-банк") || name.includes("abank") || name.includes("абанк")) return "abank";
    if (name.includes("raiff") || name.includes("райф")) return "raiffeisen";
    if (name.includes("cash") || name.includes("готівка") || name.includes("каса")) return "stash";

    const styles = [
        "mono",
        "privat",
        "pumb",
        "oschad",
        "sense",
        "ukrsib",
        "abank",
        "raiffeisen",
        "stash",
        "minimal"
    ];
    return styles[index % styles.length];
}
export function TransactionList({ transactions }: { transactions: Transaction[] }) {
    return (
        <div className="tx-list">
            {transactions.map((t) => {
                // Перевіряємо і знак суми, і поле типу (якщо воно є)
                const isIncome = t.amount > 0 || t.type === "income";

                return (
                    <div className="tx" key={t.id}>
                        {(() => {
                            // Та сама логіка іконок, що й у повному списку операцій
                            const isTransferDisplay = t.kind === "transfer" || t.kind === "exchange" || t.title.includes("→") || t.title.includes("←");
                            const merchantTitle = extractMerchant(t.title);
                            const hasKnownLogo = !isTransferDisplay && !!findMerchantDomain(merchantTitle);
                            const isPerson = !isTransferDisplay && !hasKnownLogo && isPersonName(merchantTitle);
                            const iconName = isJarTitle(t.title) ? "PiggyBank" : t.categoryIcon && t.categoryIcon !== "CircleDollarSign" ? t.categoryIcon : guessIconFromTitle(t.title);
                            return (
                                <span className={`tx-icon ${isIncome ? "income" : "shop"}`}>
                                    {t.kind === "credit_limit_change" ? (
                                        <CreditCard />
                                    ) : isTransferDisplay ? (
                                        isIncome ? <ArrowDownLeft /> : <ArrowUpRight />
                                    ) : isPerson ? (
                                        <User />
                                    ) : (
                                        <MerchantIcon
                                            title={merchantTitle}
                                            imgStyle={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain" }}
                                            fallback={<BudgetIcon name={iconName} size={20} />}
                                        />
                                    )}
                                </span>
                            );
                        })()}

                        <div className="tx-info">
                            <strong>
                                {extractMerchant(t.title)}
                                {t.impulse && <em>Імпульсивна</em>}
                            </strong>
                            <small>
                                {t.category} · {t.date}
                            </small>
                        </div>

                        {/* Вивід суми з правильним знаком */}
                        <strong className={isIncome ? "income-amount" : ""}>
                            {isIncome ? "+" : "−"} {currencySymbol(t.currency || "UAH")} {formatMoney(Math.abs(t.amount))}
                        </strong>
                    </div>
                );
            })}
        </div>
    );
}