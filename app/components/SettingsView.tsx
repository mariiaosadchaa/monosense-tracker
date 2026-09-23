"use client";
import type { CategoryItem, AuditItem, GoalItem, BudgetItem, DebtItem, Transaction, RuleItem } from "../types";
import { ProfileSettings } from "./SettingsPanels";
import { AchievementsPanel, RulesPanel } from "./SettingsPanels2";
import { useEffect, useState, type ReactNode } from "react";
import {
    ArrowRight,
    Award,
    Bell,
    Database,
    Download,
    History,
    LogOut,
    Palette,
    Pencil,
    Plus,
    Tags,
    Trash2,
    Upload,
    User,
    Users,
} from "lucide-react";
import { translateEntity, translateAction } from "./translate";

export function SettingsView({
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
                          security,
                          members,
                          recategorize,
                          feedback,
                      }: {
    security?: ReactNode;
    members?: ReactNode;
    recategorize?: ReactNode;
    feedback?: ReactNode;
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
    const TABS = [
        { key: "profile", label: "Профіль", icon: User },
        { key: "look", label: "Вигляд", icon: Palette },
        { key: "budget", label: "Категорії й правила", icon: Tags },
        { key: "notify", label: "Сповіщення", icon: Bell },
        ...(members ? [{ key: "members", label: "Спільний бюджет", icon: Users }] : []),
        { key: "data", label: "Дані та пристрої", icon: Database },
        { key: "achievements", label: "Досягнення", icon: Award },
        { key: "history", label: "Історія змін", icon: History },
    ] as const;
    type TabKey = (typeof TABS)[number]["key"];
    const [tab, setTab] = useState<TabKey>("profile");
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem("rivna-settings-tab") as TabKey | null;
            if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const choose = (key: TabKey) => {
        setTab(key);
        try {
            sessionStorage.setItem("rivna-settings-tab", key);
        } catch {}
    };
    const profileProps = {
        dark,
        setDark,
        skin,
        setSkin,
        cardStyle,
        setCardStyle,
        budgetRollover,
        setBudgetRollover,
        notify,
    };
    const expenseCats = categories.filter((c) => c.kind !== "income");
    const incomeCats = categories.filter((c) => c.kind === "income");
    const catRow = (category: CategoryItem) => (
        <div key={category.id} className="st-cat">
            <span className="st-cat-dot" style={{ background: category.color }} />
            <strong>{category.name}</strong>
            <small>
                {category.budgetGroup === "needs"
                    ? "Потреби"
                    : category.budgetGroup === "wants"
                        ? "Бажання"
                        : category.budgetGroup === "savings"
                            ? "Заощадження"
                            : ""}
            </small>
            <button type="button" onClick={() => editCategory(category)} aria-label="Редагувати">
                <Pencil size={14} />
            </button>
            <button
                type="button"
                className="danger"
                onClick={() => {
                    if (window.confirm(`Видалити категорію «${category.name}»?`)) deleteCategory(category.id);
                }}
                aria-label="Видалити"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
    const current = TABS.find((t) => t.key === tab) || TABS[0];

    return (
        <div className="st">
            <nav className="st-nav">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        className={tab === key ? "on" : ""}
                        onClick={() => choose(key)}
                    >
                        <Icon size={17} />
                        <span>{label}</span>
                    </button>
                ))}
                <button type="button" className="st-logout" onClick={logout}>
                    <LogOut size={17} />
                    <span>Вийти</span>
                </button>
            </nav>

            <div className="st-body" key={tab}>
                <h2 className="st-title">{current.label}</h2>

                {(tab === "profile" || tab === "look" || tab === "notify") && (
                    <ProfileSettings {...profileProps} section={tab} />
                )}

                {tab === "notify" && (
                    <div className="st-card">
                        <h3>На цьому пристрої</h3>
                        <button className="st-link" onClick={enablePush}>
                            <Bell size={18} />
                            <span>
                                <strong>{pushEnabled ? "Push-сповіщення увімкнено ✓" : "Увімкнути push-сповіщення"}</strong>
                                <small>Сповіщення про 80% і 100% ліміту прямо в браузері чи на телефоні</small>
                            </span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {tab === "budget" && (
                    <>
                        <div className="st-card">
                            <div className="st-card-head">
                                <h3>Категорії витрат</h3>
                                <button className="small-primary" onClick={addCategory}>
                                    <Plus /> Категорія
                                </button>
                            </div>
                            <div className="st-cats">{expenseCats.map(catRow)}</div>
                            <div className="st-card-head st-sub">
                                <h3>Категорії доходів</h3>
                                {incomeCats.length === 0 && (
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
                                        Додати стандартні
                                    </button>
                                )}
                            </div>
                            <div className="st-cats">
                                {incomeCats.length ? incomeCats.map(catRow) : <p className="empty-inline">Поки немає</p>}
                            </div>
                        </div>
                        <ProfileSettings {...profileProps} section="budget" />
                        <RulesPanel rules={rules} addRule={openAddRule} removeRule={removeRule} />
                        {recategorize}
                    </>
                )}

                {tab === "members" && members}

                {tab === "data" && (
                    <>
                        <div className="st-card">
                            <h3>Дані</h3>
                            <label className="st-link">
                                <Upload size={18} />
                                <span>
                                    <strong>Імпорт з CSV</strong>
                                    <small>Виписка з банку, до 5 МБ</small>
                                </span>
                                <ArrowRight size={16} />
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    hidden
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) importCsv(file);
                                        event.target.value = "";
                                    }}
                                />
                            </label>
                            <p className="st-hint">Експорт операцій у CSV, Excel чи JSON — на вкладці «Операції» → «Експорт».</p>
                        </div>
                        <div className="st-card">
                            <h3>Пристрої</h3>
                            <button className="st-link" onClick={installApp}>
                                <Download size={18} />
                                <span>
                                    <strong>Встановити Rivna</strong>
                                    <small>Як застосунок на телефон або комп’ютер</small>
                                </span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                        {security}
                    </>
                )}

                {tab === "achievements" && (
                    <AchievementsPanel goals={goals} budgets={budgets} debts={debts} transactions={transactions} />
                )}

                {tab === "history" && (
                    <>
                        <div className="st-card">
                            <div className="audit-list">
                                {audit.slice(0, 30).map((item) => (
                                    <div key={item.id}>
                                        <span>{item.action === "insert" ? "+" : item.action === "delete" ? "−" : "↻"}</span>
                                        <div>
                                            <strong>{translateEntity(item.entity)}</strong>
                                            <small>
                                                {translateAction(item.action)} · {new Date(item.created).toLocaleString("uk-UA")}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                                {!audit.length && <p className="empty-inline">Тут з’являться зміни, які ви робите</p>}
                            </div>
                        </div>
                        {feedback}
                    </>
                )}
            </div>
        </div>
    );
}
