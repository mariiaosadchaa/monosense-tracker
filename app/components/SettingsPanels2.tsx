import type { Transaction, GoalItem, BudgetItem, DebtItem, RuleItem } from "@/app/types";
import type { AchievementContext } from "./Analytics";
import { useMemo } from "react";

import { Award, Target, Wallet, PiggyBank, Flame, Zap, Plus, Trash2 } from "lucide-react";
const ACHIEVEMENTS = [
    {
        id: "first_step",
        title: "Перший крок",
        description: "Додано хоча б одну операцію",
        icon: Wallet,
        check: (ctx: AchievementContext) => ctx.transactions.length > 0,
    },
    {
        id: "saver",
        title: "Заощадник",
        description: "Створено принаймні одну ціль для накопичень",
        icon: PiggyBank,
        check: (ctx: AchievementContext) => ctx.goals.length > 0,
    },
    {
        id: "budget_pro",
        title: "Контроль витрат",
        description: "Встановлено хоча б один бюджет",
        icon: Target,
        check: (ctx: AchievementContext) => ctx.budgets.length > 0,
    },
    {
        id: "active_user",
        title: "Фінансова дисципліна",
        description: "Записано більше 10 операцій",
        icon: Flame,
        check: (ctx: AchievementContext) => ctx.transactions.length >= 10,
    },
];
export function AchievementsPanel({
                               goals,
                               budgets,
                               debts,
                               transactions,
                           }: {
    goals: GoalItem[];
    budgets: BudgetItem[];
    debts: DebtItem[];
    transactions: Transaction[];
}) {
    const ctx = useMemo<AchievementContext>(() => {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const spentByCategory: Record<string, number> = transactions
            .filter(
                (t) =>
                    t.amount < 0 &&
                    t.kind !== "transfer" &&
                    t.kind !== "exchange" &&
                    t.bookedAt?.startsWith(monthKey),
            )
            .reduce(
                (sum, t) => {
                    sum[t.category] = (sum[t.category] || 0) + Math.abs(t.amount);
                    return sum;
                },
                {} as Record<string, number>,
            );
        const monthBudgets = budgets.filter((b) => b.month.startsWith(monthKey));
        const oldest = transactions.reduce((min, t) => {
            if (!t.bookedAt) return min;
            const d = new Date(t.bookedAt).getTime();
            return d < min ? d : min;
        }, Date.now());
        const oldestTransactionDays = Math.floor((Date.now() - oldest) / 86400000);
        return {
            goals,
            budgets: monthBudgets,
            debts,
            transactions,
            spentByCategory,
            oldestTransactionDays,
        };
    }, [goals, budgets, debts, transactions]);
    return (
        <section className="panel">
            <div className="section-title">
                <div>
                    <h2>Досягнення</h2>
                    <p>Твій прогрес у фінансовій дисципліні</p>
                </div>
            </div>
            <div className="achievements-grid" style={{ marginTop: 14 }}>
                {ACHIEVEMENTS.map((a) => {
                    const unlocked = a.check(ctx);
                    const Icon = a.icon;
                    return (
                        <div
                            key={a.id}
                            className={unlocked ? "achievement-badge unlocked" : "achievement-badge"}
                        >
              <span className="achievement-icon">
                <Icon size={20} />
              </span>
                            <strong>{a.title}</strong>
                            <small>{a.description}</small>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
export function RulesPanel({
                        rules,
                        addRule,
                        removeRule,
                    }: {
    rules: RuleItem[];
    addRule: () => void;
    removeRule: (id: string) => void;
}) {
    const conditionLabels: Record<string, string> = {
        amount_gt: "Сума більше",
        amount_lt: "Сума менше",
        no_category: "Без категорії",
        currency_is: "Валюта дорівнює",
        note_contains: "Назва містить",
    };
    const actionLabels: Record<string, string> = {
        set_category: "Встановити категорію",
        contribute_goal_percent: "% доходу в банку",
    };
    return (
        <section className="panel">
            <div className="section-title" style={{ gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                    <h2>Автоматичні правила</h2>
                    <p>Обробка транзакцій за умовами</p>
                </div>
                <button className="small-primary" onClick={addRule} style={{ flexShrink: 0 }}>
                    <Plus /> Правило
                </button>
            </div>
            <div className="category-manager">
                {rules.map((r) => (
                    <div key={r.id}>
                        <span style={{ background: "var(--purple)" }} />
                        <strong>{r.name}</strong>
                        <small>
                            {conditionLabels[r.conditionType] || r.conditionType}
                            {r.conditionValue ? ` ${r.conditionValue}` : ""} →{" "}
                            {actionLabels[r.actionType] || r.actionType}
                        </small>
                        <button onClick={() => removeRule(r.id)}>
                            <Trash2 />
                        </button>
                    </div>
                ))}
                {!rules.length && <p className="empty-inline">Правил ще немає</p>}
            </div>
        </section>
    );
}
