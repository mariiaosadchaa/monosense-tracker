"use client";
import type { CategoryItem, AuditItem, GoalItem, BudgetItem, DebtItem, Transaction, RuleItem } from "../types";
import { ProfileSettings, AchievementsPanel, RulesPanel } from "../rivna-app";
import {ArrowRight, Bell, Download, Goal, Plus, Settings, Trash2, Upload} from "lucide-react";

function SettingsView({
                          dark,
                          setDark,
                          skin,
                          setSkin,
                          cardStyle,
                          setCardStyle,
                          budgetRollover,
                          setBudgetRollover,
                          logout,
                          notify,
                          importCsv,
                          categories,
                          audit,
                          addCategory,
                          editCategory,
                          deleteCategory,
                          pushEnabled,
                          enablePush,
                          installApp,
                          goals,
                          budgets,
                          debts,
                          transactions,
                          rules,
                          openAddRule,
                          removeRule,
                      }: {
    dark: boolean;
    setDark: (v: boolean) => void;
    skin: string;
    setSkin: (v: string) => void;
    cardStyle: string;
    setCardStyle: (v: string) => void;
    budgetRollover: boolean;
    setBudgetRollover: (v: boolean) => void;
    logout: () => void;
    notify: (s: string) => void;
    importCsv: (file: File) => void;
    categories: CategoryItem[];
    audit: AuditItem[];
    addCategory: () => void;
    editCategory: (category: CategoryItem) => void;
    deleteCategory: (id: string) => void;
    pushEnabled: boolean;
    enablePush: () => void;
    installApp: () => void;
    goals: GoalItem[];
    budgets: BudgetItem[];
    debts: DebtItem[];
    transactions: Transaction[];
    rules: RuleItem[];
    openAddRule: () => void;
    removeRule: (id: string) => void;
}) {
    return (
        <>
            <div className="settings-grid">
                <ProfileSettings
                    dark={dark}
                    setDark={setDark}
                    skin={skin}
                    setSkin={setSkin}
                    cardStyle={cardStyle}
                    setCardStyle={setCardStyle}
                    budgetRollover={budgetRollover}
                    setBudgetRollover={setBudgetRollover}
                    notify={notify}
                />
                <section className="panel settings-card">
                    <h2>Застосунок та інтеграції</h2>
                    <button className="integration" onClick={installApp}>
                        <Download />
                        <span>
              <strong>Встановити Rivna</strong>
              <small>На домашній екран iOS, Android або ПК</small>
            </span>
                        <ArrowRight />
                    </button>
                    <button className="integration" onClick={enablePush}>
                        <Bell />
                        <span>
              <strong>{pushEnabled ? "Сповіщення увімкнено" : "Увімкнути сповіщення"}</strong>
              <small>Алерти 80% і 100% бюджету</small>
            </span>
                        <ArrowRight />
                    </button>
                    <label className="integration file-integration">
                        <Upload />
                        <span>
              <strong>Імпорт даних</strong>
              <small>CSV до 5 МБ</small>
            </span>
                        <ArrowRight />
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) importCsv(file);
                                event.target.value = "";
                            }}
                        />
                    </label>
                    <button
                        className="integration"
                        onClick={() => notify("Telegram chat ID зберігається у блоці «Загальні»")}
                    >
                        <Goal />
                        <span>
              <strong>Telegram-бот</strong>
              <small>Команда: 300 кава #робота</small>
            </span>
                        <ArrowRight />
                    </button>
                    <button className="logout" onClick={logout}>
                        Вийти з акаунта
                    </button>
                </section>
            </div>
            <div className="settings-lower">
                <AchievementsPanel
                    goals={goals}
                    budgets={budgets}
                    debts={debts}
                    transactions={transactions}
                />
                <RulesPanel rules={rules} addRule={openAddRule} removeRule={removeRule} />
                <section className="panel">
                    <div className="section-title">
                        <div>
                            <h2>Категорії</h2>
                            <button
                                type="button"
                                className="secondary"
                                onClick={async () => {
                                    const response = await fetch("/api/settings/seed-income-categories", { method: "POST" });
                                    const result = await response.json();
                                    if (!response.ok) return notify(result.error || "Не вдалося додати категорії");
                                    notify(`Додано категорій доходу: ${result.created}`);
                                    window.location.reload();
                                }}
                            >
                                Додати категорії доходу
                            </button>
                            <p>Власні назви, кольори та Lucide-іконки</p>
                        </div>
                        <button className="small-primary" onClick={addCategory}>
                            <Plus /> Категорія
                        </button>
                    </div>
                    <div className="category-manager">
                        {categories.map((category) => (
                            <div key={category.id}>
                                <span style={{ background: category.color }} />
                                <strong>{category.name}</strong>
                                <small>
                                    {category.kind === "income" ? "Дохід" : "Витрата"}
                                    {category.budgetGroup === "needs" && " · Потреби"}
                                    {category.budgetGroup === "wants" && " · Бажання"}
                                    {category.budgetGroup === "savings" && " · Заощадження"}
                                </small>
                                <button onClick={() => editCategory(category)}>
                                    <Settings size={14} />
                                </button>
                                <button onClick={() => deleteCategory(category.id)}>
                                    <Trash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="panel">
                    <div className="section-title">
                        <div>
                            <h2>Історія змін</h2>
                            <p>Останні ключові дії</p>
                        </div>
                    </div>
                    <div className="audit-list">
                        {audit.slice(0, 12).map((item) => (
                            <div key={item.id}>
                                <span>{item.action === "insert" ? "+" : item.action === "delete" ? "−" : "↻"}</span>
                                <div>
                                    <strong>{translateEntity(item.entity)}</strong>
                                    <small>
                                        {translateAction(item.action)} ·{" "}
                                        {new Date(item.created).toLocaleString("uk-UA")}
                                    </small>
                                </div>
                            </div>
                        ))}
                        {!audit.length && (
                            <p className="empty-inline">Історія з’явиться після змін у Supabase</p>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}
