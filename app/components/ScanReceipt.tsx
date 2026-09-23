"use client";
import { useState } from "react";
import type { Account, CategoryItem, GoalItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import { ModalHead } from "./modal-head";
import {PiggyBank} from "lucide-react";

export function MilestoneModal({
                            goalName,
                            percent,
                            close,
                        }: {
    goalName: string;
    percent: number;
    close: () => void;
}) {
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="milestone-card" onMouseDown={(e) => e.stopPropagation()}>
        <span className="milestone-icon">
          <PiggyBank />
        </span>
                <h2>{percent}% досягнуто!</h2>
                <p>
                    Ти вже накопичила {percent}% для цілі «{goalName}». Так тримати!
                </p>
                <button className="primary" onClick={close}>
                    Продовжити
                </button>
            </div>
        </div>
    );
}
export function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="empty-state">
            <span className="empty-state-icon">{icon}</span>
            <p>{text}</p>
        </div>
    );
}
export function ScanReceiptModal({
                              items,
                              accounts,
                              categories,
                              save,
                              removeItem,
                              close,
                          }: {
    items: {
        id: string;
        amount: number;
        title: string;
        date: string | null;
        category: string | null;
        type: "income" | "expense";
    }[];
    accounts: Account[];
    categories: CategoryItem[];
    save: (
        item: { amount: number; title: string; date: string | null; category: string | null },
        accountId: string,
        categoryId: string,
        type: "income" | "expense",
        transferToAccountId: string,
    ) => Promise<boolean>;
    removeItem: (id: string) => void;
    close: () => void;
}) {
    const [doneIds, setDoneIds] = useState<string[]>([]);
    const visible = items.filter((item) => !doneIds.includes(item.id));
    const guessCategoryId = (name: string | null, kind: "expense" | "income") => {
        if (!name) return "";
        const found = categories.find(
            (c) => c.kind === kind && c.name.toLowerCase() === name.toLowerCase(),
        );
        return found?.id || "";
    };
    return (
        <div className="modal-backdrop" onMouseDown={close}>
            <div className="expense-modal tall-modal" onMouseDown={(e) => e.stopPropagation()}>
                <ModalHead label="Розпізнано з фото" title="Перевір і збережи операції" close={close} />
                {visible.length > 0 && (
                    <div className="scan-review-head">
                        <span>Дата</span>
                        <span>Категорія</span>
                        <span>Назва</span>
                        <span>Сума</span>
                    </div>
                )}
                {visible.map((item) => (
                    <ScanReviewRow
                        key={item.id}
                        item={item}
                        accounts={accounts}
                        categories={categories}
                        guessCategoryId={guessCategoryId}
                        onSave={async (
                            accountId,
                            categoryId,
                            type,
                            transferToAccountId,
                            editedTitle,
                            editedAmount,
                            editedDate,
                        ) => {
                            const ok = await save(
                                { ...item, title: editedTitle, amount: editedAmount, date: editedDate },
                                accountId,
                                categoryId,
                                type,
                                transferToAccountId,
                            );
                            if (ok) setDoneIds((v) => [...v, item.id]);
                        }}
                        onSkip={() => {
                            removeItem(item.id);
                            setDoneIds((v) => [...v, item.id]);
                        }}
                    />
                ))}
                {!visible.length && <p className="empty-inline">Усі операції оброблено</p>}
                <button type="button" className="secondary" onClick={close}>
                    Готово
                </button>
            </div>
        </div>
    );
}
export function ScanReviewRow({
                           item,
                           accounts,
                           categories,
                           guessCategoryId,
                           onSave,
                           onSkip,
                       }: {
    item: {
        amount: number;
        title: string;
        date: string | null;
        category: string | null;
        type: "income" | "expense";
    };
    accounts: Account[];
    categories: CategoryItem[];
    guessCategoryId: (name: string | null, kind: "expense" | "income") => string;
    onSave: (
        accountId: string,
        categoryId: string,
        type: "income" | "expense",
        transferToAccountId: string,
        title: string,
        amount: number,
        date: string | null,
    ) => void;
    onSkip: () => void;
}) {
    const [type, setType] = useState<"income" | "expense">(item.type);
    const [title, setTitle] = useState(item.title);
    const [amount, setAmount] = useState(String(item.amount));
    const [date, setDate] = useState(item.date || "");
    const [accountId, setAccountId] = useState(String(accounts[0]?.id || ""));
    const [categoryId, setCategoryId] = useState(guessCategoryId(item.category, item.type));
    const [transferToAccountId, setTransferToAccountId] = useState("");
    const isTransfer = categoryId === "__transfer__";
    return (
        <div className="scan-review-line">
            <input
                className="scan-review-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
            <select
                className="scan-review-category"
                value={categoryId}
                onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (e.target.value !== "__transfer__") setTransferToAccountId("");
                }}
            >
                <option value="">Без категорії</option>
                <option value="__transfer__">Переказ на картку</option>
                {categories
                    .filter((c) => c.kind === type)
                    .map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
            </select>
            <input
                className="scan-review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Назва"
            />
            <input
                className="scan-review-amount"
                type="number"
                min="0"
                step=".01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            <div className="scan-review-meta">
                <div className="scan-review-type">
                    <button
                        type="button"
                        className={type === "expense" ? "selected" : ""}
                        onClick={() => {
                            setType("expense");
                            setCategoryId("");
                        }}
                    >
                        Витрата
                    </button>
                    <button
                        type="button"
                        className={type === "income" ? "selected" : ""}
                        onClick={() => {
                            setType("income");
                            setCategoryId("");
                        }}
                    >
                        Дохід
                    </button>
                </div>
                <select
                    className="scan-review-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                >
                    {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name} · {a.currency}
                        </option>
                    ))}
                </select>
                {isTransfer && (
                    <select
                        className="scan-review-transfer-to"
                        value={transferToAccountId}
                        onChange={(e) => setTransferToAccountId(e.target.value)}
                    >
                        <option value="">Стороннє (не вибирати)</option>
                        {accounts
                            .filter((a) => String(a.id) !== accountId)
                            .map((a) => (
                                <option key={a.id} value={a.id}>
                                    На: {a.name}
                                </option>
                            ))}
                    </select>
                )}
            </div>
            <div className="scan-review-actions">
                <button
                    type="button"
                    className="primary"
                    onClick={() =>
                        onSave(
                            accountId,
                            categoryId,
                            type,
                            transferToAccountId,
                            title,
                            Number(amount),
                            date || null,
                        )
                    }
                >
                    Зберегти
                </button>
                <button type="button" className="secondary" onClick={onSkip}>
                    Пропустити
                </button>
            </div>
        </div>
    );
}
