import React from "react";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ShoppingBag, Utensils, Car, GraduationCap, CreditCard } from "lucide-react";
import { extractMerchant } from "./AccountCard";

// Словник доменів компаній для автоматичного завантаження логотипів
const MERCHANT_DOMAINS: Record<string, string> = {
    hillel: "ithillel.ua",
    silpo: "silpo.ua",
    сільпо: "silpo.ua",
    atb: "atbmarket.com",
    атб: "atbmarket.com",
    uber: "uber.com",
    bolt: "bolt.eu",
    uklon: "uklon.com.ua",
    mcdonalds: "mcdonalds.ua",
    макдональдз: "mcdonalds.ua",
    okko: "okko.ua",
    окко: "okko.ua",
    wog: "wog.ua",
    вог: "wog.ua",
    eva: "eva.ua",
    єва: "eva.ua",
    rozetka: "rozetka.com.ua",
    розетка: "rozetka.com.ua",
};

interface TransactionIconProps {
    title: string;
    amount: number;
}

export function TransactionIcon({ title, amount }: TransactionIconProps) {
    const isExpense = amount < 0; // true = списання, false = нарахування
    const lowerTitle = title.toLowerCase();
    const cleanTitle = extractMerchant(title);

    // 1. Перевіряємо, чи це переказ (з карти на карту, P2P, між рахунками)
    const isTransfer = /переказ|перевод|p2p|з карти|на карту|с карты|перерахування/i.test(lowerTitle);

    if (isTransfer) {
        return (
            <div className={`tx-icon-badge ${isExpense ? "bg-red-100 text-red-500" : "bg-green-100 text-green-500"}`}>
                {isExpense ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
        );
    }

    // 2. Перевіряємо, чи є логотип відомої компанії
    const matchedKey = Object.keys(MERCHANT_DOMAINS).find((key) =>
        cleanTitle.toLowerCase().includes(key)
    );

    if (matchedKey) {
        const domain = MERCHANT_DOMAINS[matchedKey];
        return (
            <div className="tx-icon-badge logo-badge">
                <img
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={cleanTitle}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => {
                        // Якщо логотип не завантажився — показуємо стандартну стрілку
                        (e.target as HTMLElement).style.display = "none";
                    }}
                />
            </div>
        );
    }

    // 3. Якщо це звичайна покупка або нарахування без логотипа — показуємо кольорову стрілку
    return (
        <div className={`tx-icon-badge ${isExpense ? "bg-red-100 text-red-500" : "bg-green-100 text-green-500"}`}>
            {isExpense ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
        </div>
    );
}