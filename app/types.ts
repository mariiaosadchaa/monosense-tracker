export type Page =
    | "Головна"
    | "Операції"
    | "Бюджет"
    | "Рахунки"
    | "Накопичення"
    | "Аналітика"
    | "Борги"
    | "Налаштування";

export type Transaction = {
    id: number | string;
    title: string;
    category: string;
    categoryIcon?: string;
    date: string;
    bookedAt?: string;
    account?: string;
    owner?: string;
    tags?: string[];
    amount: number;
    currency?: string;
    baseAmount?: number;
    impulse?: boolean;
    kind?: string;
    categoryId?: string;
    transferToAccount?: string;
};

export type Account = {
    id: number | string;
    name: string;
    bank: string;
    owner: string;
    currency: string;
    balance: number;
    style: string;
    color?: string;
    creditLimit?: number;
    graceEnd?: string;
    graceBalance?: number;
    cardImage?: string;
};

export type GoalItem = {
    id: string;
    name: string;
    target: number;
    current: number;
    currency: string;
    date?: string;
    color: string;
    assetType?: string;
    annualRate?: number;
    compoundInterest?: boolean;
    roundBalanceTo?: number;
    roundExpenseTo?: number;
    expensePercent?: number;
    sourceAccountId?: string;
};

export type DebtItem = {
    id: string;
    person: string;
    direction: "owed_to_me" | "i_owe";
    amount: number;
    currency: string;
    due?: string;
    note?: string;
    isVirtual?: boolean;
    accountId?: string;
    isInstallment?: boolean;
    installmentMonths?: number;
};

export type RecurringItem = {
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    next: string;
    auto: boolean;
    kind: "expense" | "income";
};

export type CategoryItem = {
    id: string;
    name: string;
    kind: string;
    color: string;
    icon: string;
    isDefault?: boolean;
    budgetGroup?: "needs" | "wants" | "savings" | null;
};

export type BudgetItem = {
    id: string;
    categoryId: string;
    name: string;
    icon: string;
    limit: number;
    currency: string;
    month: string;
    period: "month" | "week";
    color: string;
};

export type RuleItem = {
    id: string;
    name: string;
    conditionType: string;
    conditionValue: string;
    actionType: string;
    actionCategoryId?: string;
    actionGoalId?: string;
    actionValue?: number;
};

export type AuditItem = { id: string; entity: string; action: string; created: string; actor?: string };