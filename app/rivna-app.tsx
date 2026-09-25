"use client";
// @ts-ignore
// @ts-ignore
import { bankStyle, extractMerchant } from "./components/AccountCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { useClickOutside } from "./lib/useClickOutside";
import { markInternalTransfers } from "./lib/internalTransfers";
import confetti from "canvas-confetti";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  Goal,
  Home,
  Landmark,
  Moon,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  Utensils,
  WalletCards,
  X,
  PieChart,
  HandCoins,
  Repeat2,
  ShoppingCart,
  Coffee,
  Bus,
  House,
  HeartPulse,
  Gamepad2,
  Car,
  Fuel,
  Shirt,
  Plane,
  Dumbbell,
  Wifi,
  GraduationCap,
  Gift,
  PawPrint,
  Smartphone,
  Wallet,
  Music,
  BookOpen,
  Baby,
  Palette,
  Bike,
  Train,
  Stethoscope,
  Cat,
  Scissors,
  Wrench,
  Phone,
  Laptop,
  Film,
  Pizza,
  Hotel,
  Umbrella,
  PartyPopper,
  Cake,
  Percent,
  Banknote,
  CreditCard as CreditCardIcon,
  ArrowLeftRight,
  Repeat,
  Zap,
  Droplets,
  Tv,
  Beer,
  ShieldCheck,
  Globe,
  Camera,
  TrendingUp,
  Coins,
  Leaf,
  Star,
  Flame,
  Package,
  Map as LucideMap,
  Mountain,
  Glasses,
  Dog,
  Trophy,
  Amphora,
  Sofa,
  Sandwich,
  IceCream2,
  Wine,
  Syringe,
  HeartHandshake,
  Flower2,
  Dice5,
  Volleyball,
  Brush,
  Lamp,
  Bed,
  ShowerHead,
  Ham,
  Candy,
  Apple,
  Fish,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { PasskeyButton } from "./components/passkey-button";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { AccountCard, BankMark, TransactionList } from "./components/AccountCard";
import { GracePeriodAlert, AnomalyAlerts, CashflowCalendar } from "./components/Analytics";
import { InvestmentSimulator, BigPurchaseSimulator, WrappedModal, SettlementPanel } from "./components/Simulators";
import type { Page, Transaction, Account, GoalItem, DebtItem, RecurringItem, CategoryItem, BudgetItem, RuleItem, AuditItem } from "./types";
import { formatMoney, currencySymbol, conversionRate, crossRate, toDateKey } from "./lib/format";
import { exportCsv, exportExcel, exportJson } from "./lib/export";
import { BUDGET_COLORS, merchantSkeleton } from "./lib/icons";
import { DebtsView } from "./components/DebtsView";
import { TransactionsView } from "./components/TransactionsView";
import { BudgetView, LiveBudgetView } from "./components/BudgetViews";
import { AccountsView } from "./components/AccountsView";
import { GoalsView } from "./components/GoalsView";
import { AnalyticsView } from "./components/AnalyticsView";

import { SettingsView, settingsTabs, type SettingsTabKey } from "./components/SettingsView";
import { MembersPanel, RecategorizePanel, GuideFeedback } from "./components/SettingsPanels";
import { ModalHead } from "./components/modal-head";
import { MilestoneModal, EmptyState, ScanReceiptModal, ScanReviewRow } from "./components/ScanReceipt";
import {
  ExpenseModal, WheelField, CategoryGridField, DateWheelField, DateTimeField, CalendarPickerInput,
  AccountModal, GoalModal, GoalActionModal, DebtModal, SplitBillModal, SettleDebtModal,
  EditTransactionModal, PayInstallmentModal, RecurringModal, ImportPreviewModal, TransferModal,
  BudgetModal, CategoryModal, RuleModal, InviteModal, CustomRateModal, MonoSyncDebugModal,
} from "./components/modals";
// Explicit alias for the built-in Map to avoid Turbopack shadowing it with the Lucide "Map" icon
const NativeMap = globalThis.Map;
const APP_VERSION = "2026.08.06-2";

// Фиксированный набор иконок для лимитов — вынесен в конфиг, чтобы можно было
// расширять без правки логики компонентов.
export {
  BUDGET_ICONS,
  BUDGET_ICON_NAMES,
  guessIconFromTitle,
  MERCHANT_LOGO_DOMAINS,
  findMerchantDomain,
  BudgetIcon,
  MerchantIcon,
  BUDGET_COLORS,
} from "./lib/icons";

const seedTransactions: Transaction[] = [
  { id: 1, title: "Сільпо", category: "Продукти", date: "Сьогодні, 12:42", amount: -1248 },
  { id: 2, title: "Поповнення", category: "Дохід", date: "Сьогодні, 09:10", amount: 24500 },
  { id: 3, title: "Zara", category: "Покупки", date: "Учора, 18:30", amount: -2390, impulse: true },
  { id: 4, title: "Blur Coffee", category: "Кафе", date: "Учора, 10:15", amount: -185 },
];
const seedAccounts: Account[] = [
  {
    id: 1,
    name: "Чорна mono",
    bank: "monobank",
    owner: "Мій",
    currency: "UAH",
    balance: 48240,
    style: "mono",
  },
  {
    id: 2,
    name: "Біла Privat",
    bank: "ПриватБанк",
    owner: "Мій",
    currency: "UAH",
    balance: 32180,
    style: "privat",
  },
  {
    id: 3,
    name: "Заначка",
    bank: "Готівка",
    owner: "Спільний",
    currency: "USD",
    balance: 1080,
    style: "stash",
  },
];
const seedCategories: CategoryItem[] = [
  { id: "cat-food", name: "Продукти", kind: "expense", color: "#ff6b55", icon: "ShoppingCart" },
  { id: "cat-cafe", name: "Кафе та ресторани", kind: "expense", color: "#f4b740", icon: "Coffee" },
  { id: "cat-transport", name: "Транспорт", kind: "expense", color: "#6558e8", icon: "Bus" },
  { id: "cat-home", name: "Дім і затишок", kind: "expense", color: "#159b70", icon: "House" },
  { id: "cat-health", name: "Здоров’я", kind: "expense", color: "#e0527d", icon: "HeartPulse" },
  { id: "cat-fun", name: "Розваги", kind: "expense", color: "#8b72f6", icon: "Gamepad2" },
  { id: "cat-salary", name: "Зарплата", kind: "income", color: "#159b70", icon: "WalletCards" },
];
const seedGoals: GoalItem[] = [
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
import {
  getOfflineQueue,
  saveOfflineQueue,
  addToOfflineQueue,
  mergeTransferPairs,
  evaluateExpression,
  budgetPeriodBounds,
  isLight,
} from "./lib/transfers";
export {
  getOfflineQueue,
  saveOfflineQueue,
  addToOfflineQueue,
  mergeTransferPairs,
  evaluateExpression,
  budgetPeriodBounds,
  isLight,
} from "./lib/transfers";

export function RivnaApp({ initialLoggedIn = false }: { initialLoggedIn?: boolean }) {
  const [seenMilestones, setSeenMilestones] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("rivna-goal-milestones") || "{}");
    } catch {
      return {};
    }
  });
  const [milestoneCelebration, setMilestoneCelebration] = useState<{ goalName: string; percent: number } | null>(null);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [showPassword, setShowPassword] = useState(false);
  // Нове відкриття застосунку / вхід → завжди «Головна»; при оновленні сторінки лишаємось де були
  const [page, setPage] = useState<Page>(() => {
    if (typeof window === "undefined") return "Головна";
    try {
      localStorage.removeItem("rivna-last-page");
      return (sessionStorage.getItem("rivna-last-page") as Page) || "Головна";
    } catch {
      return "Головна";
    }
  });
  const [dark, setDark] = useState(
      () => typeof window !== "undefined" && localStorage.getItem("rivna-theme") === "dark",
  );
  const [skin, setSkin] = useState(() =>
      typeof window !== "undefined" ? localStorage.getItem("rivna-skin") || "default" : "default",
  );
  const [cardStyle, setCardStyle] = useState(() =>
      typeof window !== "undefined"
          ? localStorage.getItem("rivna-cardstyle") || "default"
          : "default",
  );
  const [budgetRollover, setBudgetRollover] = useState(false);
  const [modal, setModal] = useState<
      | "expense"
      | "account"
      | "goal"
      | "debt"
      | "recurring"
      | "transfer"
      | "budget"
      | "category"
      | "invite"
      | "rate"
      | "split"
      | "purchase-sim"
      | "wrapped"
      | "rule"
      | "edit-transaction"
      | "scan-review"
      | null
  >(null);
  const [transactions, setTransactions] = useState(initialLoggedIn ? [] : seedTransactions);
  const [accounts, setAccounts] = useState(initialLoggedIn ? [] : seedAccounts);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<{ currency: string; rate: number; date: string }[]>([]);
  const [customRates, setCustomRates] = useState<
      { currency: string; rate: number; date: string }[]
  >([]);
  const [syncing, setSyncing] = useState(initialLoggedIn);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(!initialLoggedIn);
  const [goals, setGoals] = useState<GoalItem[]>(initialLoggedIn ? [] : seedGoals);

  useEffect(() => {
    goals.forEach((goal) => {
      const percent = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
      const milestones = [25, 50, 75, 100];
      const reached = milestones.filter((m) => percent >= m);
      const lastSeen = seenMilestones[goal.id] || 0;
      const newest = reached[reached.length - 1];
      if (newest && newest > lastSeen) {
        setSeenMilestones((prev) => {
          const next = { ...prev, [goal.id]: newest };
          localStorage.setItem("rivna-goal-milestones", JSON.stringify(next));
          return next;
        });
        setMilestoneCelebration({ goalName: goal.name, percent: newest });
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    });
  }, [goals]);

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [transfers, setTransfers] = useState<
      {
        id: string;
        fromTransactionId: string | null;
        toTransactionId: string | null;
        fromAccountId: string | null;
        toAccountId: string | null;
        feeAmount: number;
        feeCurrency: string;
        bookedAt: string;
      }[]
  >([]);
  const [categories, setCategories] = useState<CategoryItem[]>(
      initialLoggedIn ? [] : seedCategories,
  );
  const [savedBudgets, setSavedBudgets] = useState<BudgetItem[]>([]);
  const [planningPeriod, setPlanningPeriod] = useState<"month" | "week">("month");
  const [budgetPeriodType, setBudgetPeriodType] = useState<"month" | "week">("month");
  const [budgetPresetCategory, setBudgetPresetCategory] = useState<string | undefined>();
  const [budgetAnchor, setBudgetAnchor] = useState<string>(() => toDateKey(new Date()));
  const [baseCurrency, setBaseCurrency] = useState("UAH");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [payTarget, setPayTarget] = useState<DebtItem | null>(null);
  const [settleTarget, setSettleTarget] = useState<DebtItem | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [accountOrder, setAccountOrder] = useState<string[]>(() =>
      typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("rivna-account-order") || "[]")
          : [],
  );
  const [goalAction, setGoalAction] = useState<{
    goal: GoalItem;
    mode: "withdraw" | "break" | "history" | "contribute";
  } | null>(null);
  const [transferPresetTo, setTransferPresetTo] = useState<string | undefined>(undefined);
  const [topProfile, setTopProfile] = useState<{ name: string; email: string } | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<{ userId: string; name: string; isMe: boolean }[]>([]);

  useEffect(() => {
    if (!initialLoggedIn) return;
    fetch("/api/settings", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then(
            (data) =>
                data?.profile && (
                    setTopProfile({ name: data.profile.name, email: data.profile.email || "" }),
                    setHouseholdMembers(data.members || [])
                ),
        )
        .catch(() => {});
  }, [initialLoggedIn]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setOfflineCount(getOfflineQueue().length);
    const goOnline = () => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (navigator.onLine) void syncOfflineQueue();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const pageParam = params.get("page");
      const validPages: Page[] = [
        "Головна",
        "Операції",
        "Бюджет",
        "Рахунки",
        "Накопичення",
        "Аналітика",
        "Борги",
        "Налаштування",
      ];
      if (pageParam && (validPages as string[]).includes(pageParam)) setPage(pageParam as Page);
      else if (params.get("section") === "budget") setPage("Бюджет");
      const modalParam =
          params.get("modal") || (params.get("action") === "expense" ? "expense" : null);
      const validModals = [
        "expense",
        "account",
        "goal",
        "debt",
        "recurring",
        "transfer",
        "budget",
        "category",
        "invite",
        "rate",
      ];
      if (modalParam && validModals.includes(modalParam)) setModal(modalParam as typeof modal);
      if ("Notification" in window) setPushEnabled(Notification.permission === "granted");
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function syncOfflineQueue() {
    const queue = getOfflineQueue();
    if (!queue.length) return;
    let remaining = [...queue];
    for (const item of queue) {
      try {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (response.ok) remaining = remaining.filter((q) => q.id !== item.id);
      } catch {
        break;
      }
    }
    saveOfflineQueue(remaining);
    setOfflineCount(remaining.length);
    if (remaining.length < queue.length) {
      notify(`Синхронізовано офлайн-операцій: ${queue.length - remaining.length}`);
      await refreshFinance();
    }
  }

  async function refreshFinance(light = false) {
    if (!initialLoggedIn) return;
    setSyncing(true);
    try {
      const response = await fetch(light ? "/api/finance?light=1" : "/api/finance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) return notify(data.error);
      setAccounts(
          (data.accounts || []).map((item: Record<string, unknown>, index: number) => ({
            id: String(item.id),
            name: String(item.name),
            bank: String(item.bank || "Інший"),
            owner: String(item.owner_label || "Мій"),
            createdBy: item.created_by ? String(item.created_by) : undefined,
            currency: String(item.currency),
            balance: Number(item.balance),
            style: bankStyle(String(item.bank || ""), index),
            color: item.card_color ? String(item.card_color) : undefined,
            cardImage: item.card_image_url ? String(item.card_image_url) : undefined,
            cardLast4: item.card_last4 ? String(item.card_last4) : undefined,
            creditLimit: Number(item.credit_limit) || 0,
            graceEnd: item.grace_period_end ? String(item.grace_period_end) : undefined,
            graceBalance: item.grace_balance ? Number(item.grace_balance) : undefined,
          })),
      );
      const transferDirection: Record<string, "in" | "out"> = {};
      const transferCounterpartId: Record<string, string> = {};
      (data.transfers || []).forEach((tr: Record<string, unknown>) => {
        if (tr.from_transaction_id) transferDirection[String(tr.from_transaction_id)] = "out";
        if (tr.to_transaction_id) transferDirection[String(tr.to_transaction_id)] = "in";
        if (tr.from_transaction_id && tr.to_transaction_id) {
          transferCounterpartId[String(tr.from_transaction_id)] = String(tr.to_transaction_id);
          transferCounterpartId[String(tr.to_transaction_id)] = String(tr.from_transaction_id);
        }
      });
      const accountNameById: Record<string, string> = {};
      (data.transactions || []).forEach((item: Record<string, unknown>) => {
        accountNameById[String(item.id)] = String((item.accounts as { name?: string } | null)?.name || "");
      });
      const limitEvents = (data.creditLimitChanges || []).map((item: Record<string, unknown>) => {
        const oldLimit = Number(item.old_limit),
            newLimit = Number(item.new_limit),
            diff = newLimit - oldLimit;
        return {
          id: `limit-${item.id}`,
          title: diff > 0 ? "Підвищення кредитного ліміту" : "Зниження кредитного ліміту",
          category: "Кредитний ліміт",
          date: new Intl.DateTimeFormat("uk-UA", {
            dateStyle: "medium",
          }).format(new Date(String(item.changed_at))),
          bookedAt: String(item.changed_at),
          account: String((item.accounts as { name?: string } | null)?.name || ""),
          amount: diff,
          currency: "UAH",
          kind: "credit_limit_change",
        };
      });

      setTransactions(
          (data.transactions || [])
              .map((item: Record<string, unknown>) => {
                const id = String(item.id);
                const isTransferLeg = item.type === "transfer" || item.type === "exchange" || transferDirection[id] !== undefined;
                const direction = transferDirection[id];
                const isIncomeLike = item.type === "income" || (isTransferLeg && direction === "in");
                return {
                  id, title: isTransferLeg
                      ? (() => {
                        const myAccount = accountNameById[id] || "";
                        const counterpartId = transferCounterpartId[id];
                        const otherAccount = counterpartId ? accountNameById[counterpartId] || "" : "";
                        // Немає другої ноги (переказ людині / на картку поза застосунком) —
                        // показуємо опис з банку замість обрізаного «Біла →»
                        if (!otherAccount) return String(item.note || (direction === "in" ? "Надходження" : "Переказ"));
                        return direction === "in" ? `${myAccount} ← ${otherAccount}` : `${myAccount} → ${otherAccount}`;
                      })()
                      : String(item.note || (item.type === "income" ? "Дохід" : "Витрата")),
                  category: isTransferLeg
                      ? "Переказ"
                      : String(
                          (item.categories as { name?: string } | null)?.name || "Без категорії",
                      ),
                  categoryId: isTransferLeg
                      ? ""
                      : String((item.categories as { id?: string } | null)?.id || item.category_id || ""),
                  date: new Intl.DateTimeFormat("uk-UA", {
                    dateStyle: "medium",
                  }).format(new Date(String(item.booked_at))),
                  bookedAt: String(item.booked_at),
                  account: String((item.accounts as { name?: string } | null)?.name || ""),
                  owner: String((item.accounts as { owner_label?: string } | null)?.owner_label || ""),
                  tags: ((item.transaction_tags as { tags?: { name?: string } | null }[] | null) || [])
                      .map((link) => String(link.tags?.name || ""))
                      .filter(Boolean),
                  amount: Number(item.amount) * (isIncomeLike ? 1 : -1),
                  currency: String(item.currency || "UAH"),
                  impulse: Boolean(item.is_impulsive),
                  feeAmount: item.fee_amount != null ? Number(item.fee_amount) : undefined,
                  originalAmount: item.original_amount != null ? Number(item.original_amount) : undefined,
                  originalCurrency: item.original_currency ? String(item.original_currency) : undefined,
                  kind: isTransferLeg ? (direction === "in" ? "transfer" : "transfer") : String(item.type || "expense"),
                };
              })
              .concat(limitEvents),
      );
      setGoals(
          (data.goals || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name),
            target: Number(item.target_amount),
            current: Number(item.current_amount),
            currency: String(item.currency),
            date: item.target_date ? String(item.target_date) : undefined,
            color: String(item.color || "#6558E8"),
            assetType: String(item.asset_type || "savings"),
            annualRate: item.annual_rate ? Number(item.annual_rate) : undefined,
            compoundInterest: Boolean(item.compound_interest),
            roundBalanceTo: item.round_balance_to ? Number(item.round_balance_to) : undefined,
            roundExpenseTo: item.round_expense_to ? Number(item.round_expense_to) : undefined,
            expensePercent: item.expense_percent ? Number(item.expense_percent) : undefined,
            sourceAccountId: item.source_account_id ? String(item.source_account_id) : undefined,
          })),
      );
      setDebts(
          (data.debts || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            person: String(item.person),
            direction: item.direction === "i_owe" ? "i_owe" : "owed_to_me",
            amount: Number(item.amount),
            currency: String(item.currency),
            due: item.due_date ? String(item.due_date) : undefined,
            note: String(item.note || ""),
            isInstallment: Boolean(item.is_installment),
            installmentMonths: item.installment_months ? Number(item.installment_months) : undefined,
          })),
      );
      setRecurring(
          (data.recurring || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name),
            amount: Number(item.amount),
            currency: String(item.currency),
            frequency: String(item.frequency),
            next: String(item.next_run_at),
            auto: Boolean(item.auto_create),
            kind: item.kind === "income" ? "income" : "expense",
            accountId: item.account_id ? String(item.account_id) : undefined,
            categoryId: item.category_id ? String(item.category_id) : undefined,
          })),
      );
      setTransfers(
          (data.transfers || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            fromTransactionId: item.from_transaction_id ? String(item.from_transaction_id) : null,
            toTransactionId: item.to_transaction_id ? String(item.to_transaction_id) : null,
            fromAccountId: item.from_account_id ? String(item.from_account_id) : null,
            toAccountId: item.to_account_id ? String(item.to_account_id) : null,
            feeAmount: Number(item.fee_amount) || 0,
            feeCurrency: String(item.fee_currency || ""),
            bookedAt: String(item.booked_at || ""),
          })),
      );
      if (data.categories)
        setCategories(
            (data.categories || []).map((item: Record<string, unknown>, idx: number) => ({
              id: String(item.id),
              name: String(item.name),
              kind: String(item.kind),
              color: String(item.color && item.color !== "#6558E8" ? item.color : BUDGET_COLORS[idx % BUDGET_COLORS.length]),
              icon: String(item.icon || "CircleDollarSign"),
              isDefault: Boolean(item.is_default),
              budgetGroup: (item.budget_group as "needs" | "wants" | "savings" | null) || null,
            })),
        );
      setSavedBudgets(
          (data.budgets || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            categoryId: String(item.category_id),
            name: String((item.categories as { name?: string } | null)?.name || "Категорія"),
            icon: String(
                item.icon || (item.categories as { icon?: string } | null)?.icon || "CircleDollarSign",
            ),
            limit: Number(item.limit_amount),
            currency: String(item.currency),
            month: String(item.month),
            period: item.period_type === "week" ? "week" : "month",
            color: String(
                item.color || (item.categories as { color?: string } | null)?.color || "#6558E8",
            ),
          })),
      );
      if (data.planningPeriod) {
        setPlanningPeriod(data.planningPeriod === "week" ? "week" : "month");
        setBudgetRollover(Boolean(data.budgetRollover));
        setBudgetPeriodType(data.planningPeriod === "week" ? "week" : "month");
      }
      if (data.baseCurrency) setBaseCurrency(String(data.baseCurrency));
      if (data.audit)
        setAudit(
            (data.audit || []).map((item: Record<string, unknown>) => ({
              id: String(item.id),
              entity: String(item.entity_type),
              action: String(item.action),
              created: String(item.created_at),
              actor: item.actor_id ? String(item.actor_id) : undefined,
            })),
        );
      if (data.rules) setRules(
          (data.rules || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name),
            conditionType: String(item.condition_type),
            conditionValue: String(item.condition_value || ""),
            actionType: String(item.action_type),
            actionCategoryId: item.action_category_id ? String(item.action_category_id) : undefined,
            actionGoalId: item.action_goal_id ? String(item.action_goal_id) : undefined,
            actionValue: item.action_value ? Number(item.action_value) : undefined,
          })),
      );
      if (data.exchangeRates)
        setCustomRates(
            (data.exchangeRates || []).map((item: Record<string, unknown>) => ({
              currency: String(item.quote_currency),
              rate: Number(item.custom_rate || item.official_rate),
              date: String(item.rate_date),
            })),
        );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Помилка синхронізації");
    } finally {
      setSyncing(false);
      setHasLoadedOnce(true);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshFinance(), 0);
    return () => window.clearTimeout(timer);
  }, [initialLoggedIn]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("rivna-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    try {
      sessionStorage.setItem("rivna-last-page", page);
    } catch {}
  }, [page]);

  useEffect(() => {
    // Скіни вимкнено після редизайну (iOS): завжди базова палітра
    delete document.documentElement.dataset.skin;
    localStorage.removeItem("rivna-skin");
  }, [skin]);

  useEffect(() => {
    if (cardStyle === "default") delete document.documentElement.dataset.cardstyle;
    else document.documentElement.dataset.cardstyle = cardStyle;
    localStorage.setItem("rivna-cardstyle", cardStyle);
  }, [cardStyle]);

  useEffect(() => {
    fetch("/api/exchange-rates")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.rates) setRates(data.rates);
        })
        .catch(() => {});
  }, []);

  // Власник картки — відносно того, хто дивиться: «Мій» для своїх, ім'я партнера для його, «Спільний» для спільних
  const viewAccounts = useMemo(() => {
    const me = householdMembers.find((m) => m.isMe);
    const myName = (topProfile?.name || me?.name || "").trim().toLowerCase();
    const nameOf = (id?: string) => householdMembers.find((m) => m.userId === id)?.name;
    return accounts.map((a) => {
      const raw = (a.owner || "").trim();
      let owner = raw;
      if (/^спільн/i.test(raw)) owner = "Спільний";
      else if (!raw || /^(мій|моя|я)$/i.test(raw))
        owner = !a.createdBy || !me || a.createdBy === me.userId ? "Мій" : nameOf(a.createdBy) || "Партнер";
      else if (myName && raw.toLowerCase() === myName) owner = "Мій";
      return owner === a.owner ? a : { ...a, owner };
    });
  }, [accounts, householdMembers, topProfile]);
  const orderedAccounts = useMemo(() => {
    if (!accountOrder.length) return viewAccounts;
    const byId = new NativeMap(viewAccounts.map((a) => [String(a.id), a]));
    const ordered = accountOrder.map((id) => byId.get(id)).filter(Boolean) as Account[];
    const rest = viewAccounts.filter((a) => !accountOrder.includes(String(a.id)));
    return [...ordered, ...rest];
  }, [viewAccounts, accountOrder]);

  function reorderAccounts(draggedId: string, targetId: string) {
    const ids = orderedAccounts.map((a) => String(a.id));
    const from = ids.indexOf(draggedId),
        to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setAccountOrder(next);
    localStorage.setItem("rivna-account-order", JSON.stringify(next));
  }

  const balance = useMemo(
      () =>
          accounts.reduce(
              (sum, account) =>
                  sum +
                  (((account.balance || 0) + (account.creditLimit || 0)) *
                      conversionRate(account.currency, rates, customRates)) /
                  conversionRate(baseCurrency, rates, customRates),
              0,
          ),
      [accounts, rates, customRates, baseCurrency],
  );

  // Комісії помісячно (ключ "YYYY-MM"), у базовій валюті:
  // явні комісії переказів + поле fee_amount операцій (завжди в UAH).
  const feesByMonth = useMemo(() => {
    const toBase = (amount: number, currency: string) =>
        (amount * conversionRate(currency || baseCurrency, rates, customRates)) /
        conversionRate(baseCurrency, rates, customRates);
    const monthKey = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const result: Record<string, number> = {};
    for (const transfer of transfers) {
      if (!transfer.bookedAt || !transfer.feeAmount) continue;
      const key = monthKey(transfer.bookedAt);
      result[key] = (result[key] || 0) + toBase(transfer.feeAmount, transfer.feeCurrency || baseCurrency);
    }
    for (const t of transactions) {
      if (!t.bookedAt || !t.feeAmount) continue;
      const key = monthKey(t.bookedAt);
      result[key] = (result[key] || 0) + toBase(t.feeAmount, "UAH");
    }
    return result;
  }, [transfers, transactions, rates, customRates, baseCurrency]);


  const plannedMonthlyIncome = useMemo(
      () =>
          recurring
              .filter((item) => item.kind === "income")
              .reduce(
                  (sum, item) =>
                      sum +
                      (item.amount *
                          (item.frequency === "weekly" ? 4.33 : item.frequency === "yearly" ? 1 / 12 : 1) *
                          conversionRate(item.currency, rates, customRates)) /
                      conversionRate(baseCurrency, rates, customRates),
                  0,
              ),
      [recurring, rates, customRates, baseCurrency],
  );
  const budgetModalDefaultDate = useMemo(() => {
    const { periodStart } = budgetPeriodBounds(budgetPeriodType, budgetAnchor);
    return budgetPeriodType === "week"
        ? toDateKey(periodStart)
        : `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;
  }, [budgetPeriodType, budgetAnchor]);
  const normalizedTransactions = useMemo(() => {
    const withBase = transactions.map((transaction) => ({
      ...transaction,
      baseAmount:
          (transaction.amount * conversionRate(transaction.currency || "UAH", rates, customRates)) /
          conversionRate(baseCurrency, rates, customRates),
    }));
    const ownerByAccount = new NativeMap(viewAccounts.map((a) => [a.name.trim(), a.owner]));
    const relabeled = withBase.map((t) => {
      const o = t.account ? ownerByAccount.get(t.account.trim()) : undefined;
      return o && o !== t.owner ? { ...t, owner: o } : t;
    });
    return markInternalTransfers(relabeled, viewAccounts);
  }, [transactions, rates, customRates, baseCurrency, viewAccounts]);
  const filteredTransactions = useMemo(() => {
    // Always return raw (both transfer legs present).
    // TransactionsView handles merging when no account filter is active.
    let list = normalizedTransactions; // з позначеними переказами між своїми рахунками
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
          (t) =>
              t.title.toLowerCase().includes(q) ||
              t.category.toLowerCase().includes(q) ||
              (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))),
      );
    }
    return list;
  }, [normalizedTransactions, search]);
  const [seenAlerts, setSeenAlerts] = useState<string[]>(() =>
      typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("rivna-seen-alerts") || "[]")
          : [],
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen);
  // Випадайки на <details> (календар, колесо, валюта) закриваються кліком поза ними
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      document
          .querySelectorAll<HTMLDetailsElement>("details.compact-picker[open], details.currency-select[open]")
          .forEach((d) => {
            if (!d.contains(e.target as Node)) d.open = false;
          });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const [welcomeAlert, setWelcomeAlert] = useState<{
    key: string;
    name: string;
    percent: -1;
  } | null>(null);
  useEffect(() => {
    if (localStorage.getItem("rivna-just-onboarded") === "1") {
      localStorage.removeItem("rivna-just-onboarded");
      setWelcomeAlert({
        key: "welcome",
        name: "Вітаємо в rivna! Все готово — починай керувати фінансами",
        percent: -1,
      });
    }
  }, []);
  const activeAlerts = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthSpent: Record<string, number> = transactions
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
    const budgetAlerts = savedBudgets
        .filter((b) => b.month.startsWith(monthKey))
        .map((b) => {
          const used = monthSpent[b.name] || 0,
              percent = Math.round((used / b.limit) * 100);
          return {
            key: `${b.name}-${monthKey}-${percent >= 100 ? "100" : "80"}`,
            name: b.name,
            percent,
          };
        })
        .filter((a) => a.percent >= 80);
    return welcomeAlert ? [welcomeAlert, ...budgetAlerts] : budgetAlerts;
  }, [savedBudgets, transactions, welcomeAlert]);
  const hasNewAlerts = activeAlerts.some((a) => !seenAlerts.includes(a.key));
  function openNotifications() {
    setNotifOpen((v) => !v);
    if (!notifOpen && activeAlerts.length) {
      const merged = Array.from(new Set([...seenAlerts, ...activeAlerts.map((a) => a.key)]));
      setSeenAlerts(merged);
      localStorage.setItem("rivna-seen-alerts", JSON.stringify(merged));
    }
  }
  const allDebts = useMemo(() => {
    const creditDebts = accounts
        .filter((a) => (a.creditLimit || 0) > 0 && a.balance < 0)
        .map((a) => ({
          id: `credit-${a.id}`,
          person: a.bank,
          direction: "i_owe" as const,
          amount: Math.abs(a.balance),
          currency: a.currency,
          note: "Кредитні кошти",
          isVirtual: true,
          accountId: String(a.id),
        }));
    return [...debts, ...creditDebts];
  }, [accounts, debts]);

  async function addExpense(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(e.currentTarget);
      const evaluated = evaluateExpression(amount);
      const value = evaluated !== null ? evaluated : Number(amount.replace(",", "."));
      if (!value) return;
      const operationType = form.get("type") === "income" ? "income" : "expense",
          isIncome = operationType === "income";
      const isTransferSubmit = form.get("isTransfer") === "on" && operationType === "expense";
      const transferToAccountId = String(form.get("transferToAccountId") || "");
      if (isTransferSubmit && transferToAccountId) {
        const fromAccount = accounts.find((a) => String(a.id) === String(form.get("account"))) || accounts[0];
        if (!fromAccount) return notify("Спочатку створіть рахунок");
        const reduceCreditLimit = form.get("reduceCreditLimit") === "on";
        const ok = await financeAction(
            {
              action: "createTransfer",
              fromAccountId: fromAccount.id,
              toAccountId: transferToAccountId,
              sentAmount: value,
              receivedAmount: value,
              exchangeRate: 1,
              feeAmount: 0,
              feeCurrency: fromAccount.currency,
              note: note || "Переказ",
              creditLimitDelta: reduceCreditLimit ? value : 0,
              bookedAt: form.get("date") ? new Date(String(form.get("date"))).toISOString() : undefined,
            },
            "Переказ виконано",
        );
        if (ok) {
          setAmount("");
          setNote("");
          setModal(null);
        }
        return;
      }
      if (initialLoggedIn) {
        const account =
            accounts.find((a) => String(a.id) === String(form.get("account"))) || accounts[0];
        if (!account) return notify("Спочатку створіть рахунок");
        const payload = {
          action: "createTransaction",
          accountId: account.id,
          categoryId: form.get("category") || null,
          amount: value,
          currency: account.currency,
          note,
          type: operationType,
          isImpulsive: !isIncome && form.get("impulse") === "on",
          splitTotal: isIncome ? null : form.get("splitTotal") || null,
          personalShare: isIncome ? null : form.get("personalShare") || null,
          bookedAt: form.get("date") ? new Date(String(form.get("date"))).toISOString() : undefined,
          tags: String(form.get("tags") || "")
              .split(/\s+/)
              .filter(Boolean),
          splitParticipants: String(form.get("splitParticipants") || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          repeat: form.get("repeat") === "on",
          repeatFrequency: form.get("repeatFrequency"),
          repeatDay: form.get("repeatDay"),
          debtId: !isIncome ? form.get("debtId") || null : null,
          receiptAmount: form.get("receiptAmount") || null,
        };
        if (!navigator.onLine) {
          addToOfflineQueue(payload);
          setOfflineCount(getOfflineQueue().length);
          setAmount("");
          setNote("");
          setModal(null);
          notify("Немає інтернету — операцію збережено локально, синхронізується автоматично");
          return;
        }
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) return notify(result.error || "Не вдалося додати операцію");
        setAmount("");
        setNote("");
        setModal(null);
        notify(isIncome ? "Дохід збережено" : "Витрату збережено");
        const contributeGoalId = !isIncome ? String(form.get("contributeGoalId") || "") : "";
        if (contributeGoalId) {
          await financeAction(
              { action: "contributeGoal", id: contributeGoalId, amount: value },
              "Покладено в банку",
          );
        } else {
          await refreshFinance();
        }
        return;
      }
      const account =
          accounts.find((item) => String(item.id) === String(form.get("account"))) || accounts[0];
      setTransactions([
        {
          id: Date.now(),
          title: note || (isIncome ? "Новий дохід" : "Нова витрата"),
          category: categories.find((c) => c.id === form.get("category"))?.name || "Інше",
          date: "Щойно",
          amount: isIncome ? value : -value,
          currency: account?.currency || "UAH",
          impulse: !isIncome && form.get("impulse") === "on",
        },
        ...transactions,
      ]);
      setAmount("");
      setNote("");
      setModal(null);
      notify(isIncome ? "Дохід додано" : "Витрату додано");
      const contributeGoalId = !isIncome ? String(form.get("contributeGoalId") || "") : "";
      if (contributeGoalId) {
        setGoals((items) =>
            items.map((item) =>
                item.id === contributeGoalId ? { ...item, current: item.current + value } : item,
            ),
        );
      }
    } finally {
      setBusy(false);
    }
  }
  async function addAccount(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(e.currentTarget);
      if (initialLoggedIn) {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: editingAccount ? "updateAccount" : "createAccount",
            id: editingAccount?.id,
            name: form.get("name"),
            bank: form.get("bank"),
            owner: form.get("owner"),
            cardImageUrl: form.get("cardImageUrl"),
            currency: form.get("currency"),
            balance: form.get("balance"),
            creditLimit: form.get("creditLimit"),
            graceEnd: form.get("graceEnd"),
            graceBalance: form.get("graceBalance"),
            cardColor: form.get("cardColor"),
            cardLast4: form.get("cardLast4"),
          }),
        });
        const result = await response.json();
        if (!response.ok) return notify(result.error || "Не вдалося створити рахунок");
        setModal(null);
        setEditingAccount(null);
        notify("Рахунок збережено");
        await refreshFinance();
        return;
      }
      setAccounts([
        ...accounts,
        {
          id: Date.now(),
          name: String(form.get("name") || "Новий рахунок"),
          bank: String(form.get("bank") || "Інший"),
          owner: String(form.get("owner") || "Мій"),
          currency: String(form.get("currency") || "UAH"),
          balance: Number(form.get("balance")) || 0,
          style: "stash",
          color: String(form.get("cardColor") || "#6558e8"),
        },
      ]);
      setModal(null);
      setEditingAccount(null);
      notify("Рахунок створено");
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount(id: number | string) {
    if (initialLoggedIn) {
      if (!window.confirm("Ви впевнені, що хочете видалити рахунок?")) return;
      setBusy(true);
      try {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteAccount", id }),
        });
        const result = await response.json();
        if (!response.ok) return notify(result.error || "Помилка видалення");
        await refreshFinance();
        notify("Рахунок видалено");
      } finally {
        setBusy(false);
      }
    } else {
      setAccounts((accounts) => accounts.filter((a) => a.id !== id));
      notify("Рахунок видалено");
    }
  }

  async function removeTransaction(id: number | string) {
    if (initialLoggedIn) {
      setBusy(true);
      try {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteTransaction", id }),
        });
        const result = await response.json();
        if (!response.ok) return notify(result.error || "Помилка видалення");
        await refreshFinance();
        notify("Операцію видалено");
        return;
      } finally {
        setBusy(false);
      }
    }

    setTransactions((transactions) => transactions.filter((t) => t.id !== id));
    notify("Операцію видалено");
  }

  async function updateTransaction(payload: Record<string, unknown>) {
    const contributeGoalId = payload.contributeGoalId as string | null;
    const goalAmount = Number(payload.amount) || 0;
    const editedTx = transactions.find((t) => String(t.id) === String(payload.id));

    // Конвертація витрати → переказ: видалити витрату та створити новий переказ
    if (payload.isTransfer && payload.transferToAccountId && editedTx?.kind !== "transfer" && editedTx?.kind !== "exchange") {
      const deleted = await financeAction({ action: "deleteTransaction", id: payload.id }, "");
      if (!deleted) return;
      const fromAccount = accounts.find((a) => String(a.id) === String(payload.accountId));
      const sent = Math.abs(Number(payload.amount));
      const ok = await financeAction({
        action: "createTransfer",
        fromAccountId: payload.accountId,
        toAccountId: payload.transferToAccountId,
        sentAmount: sent,
        receivedAmount: sent,
        exchangeRate: 1,
        feeAmount: 0,
        feeCurrency: fromAccount?.currency || "UAH",
        note: String(payload.note || ""),
        bookedAt: payload.bookedAt,
        creditLimitDelta: payload.reduceCreditLimit ? sent : 0,
      }, "Операцію перетворено на переказ");
      if (ok) setEditingTransaction(null);
      return;
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.contributeGoalId;

    const ok = await financeAction({ action: "updateTransaction", ...cleanPayload }, "Операцію оновлено");
    if (ok) {
      setEditingTransaction(null);
      if (contributeGoalId && goalAmount > 0) {
        await financeAction(
            { action: "contributeGoal", id: contributeGoalId, amount: goalAmount },
            "Банку поповнено"
        );
      }
    }
  }

  async function financeAction(
      payload: Record<string, unknown>,
      success: string
  ) {
    setBusy(true);
    try {
      if (!initialLoggedIn) {
        const action = String(payload.action || ""),
            id = String(payload.id || "");

        if (action === "createGoal")
          setGoals((items) => [
            ...items,
            {
              id: `goal-${Date.now()}`,
              name: String(payload.name || "Нова ціль"),
              target: Number(payload.targetAmount),
              current: Number(payload.currentAmount) || 0,
              currency: String(payload.currency || "UAH"),
              date: payload.targetDate ? String(payload.targetDate) : undefined,
              color: "#6558E8",
            },
          ]);
        else if (action === "updateGoal")
          setGoals((items) =>
              items.map((item) =>
                  item.id === id
                      ? {
                        ...item,
                        name: String(payload.name || item.name),
                        target: Number(payload.targetAmount) || item.target,
                        date: payload.targetDate ? String(payload.targetDate) : item.date,
                      }
                      : item,
              ),
          );
        else if (action === "withdrawGoal")
          setGoals((items) =>
              items.map((item) =>
                  item.id === id
                      ? { ...item, current: Math.max(0, item.current - Number(payload.amount || 0)) }
                      : item,
              ),
          );
        else if (action === "breakGoal")
          setGoals((items) => items.filter((item) => item.id !== id));
        else if (action === "contributeGoal")
          setGoals((items) =>
              items.map((item) =>
                  item.id === id
                      ? {
                        ...item,
                        current: Math.min(item.target, item.current + Number(payload.amount || 0)),
                      }
                      : item,
              ),
          );
        else if (action === "createDebt")
          setDebts((items) => [
            ...items,
            {
              id: `debt-${Date.now()}`,
              person: String(payload.person || "Контакт"),
              direction: payload.direction === "i_owe" ? "i_owe" : "owed_to_me",
              amount: Number(payload.amount),
              currency: String(payload.currency || "UAH"),
              due: payload.dueDate ? String(payload.dueDate) : undefined,
              note: String(payload.note || ""),
            },
          ]);
        else if (action === "settleDebt")
          setDebts((items) => items.filter((item) => item.id !== id));
        else if (action === "createRecurring")
          setRecurring((items) => [
            ...items,
            {
              id: `rec-${Date.now()}`,
              name: String(payload.name || "Платіж"),
              amount: Number(payload.amount),
              currency: String(payload.currency || "UAH"),
              frequency: String(payload.frequency || "monthly"),
              next: String(payload.nextRunAt),
              auto: Boolean(payload.autoCreate),
              kind: payload.kind === "income" ? "income" : "expense",
            },
          ]);
        else if (action === "deleteRecurring")
          setRecurring((items) => items.filter((item) => item.id !== id));
        else if (action === "createBudget") {
          const category = categories.find((item) => item.id === String(payload.categoryId));
          if (!category) return false;
          const next: BudgetItem = {
            id: `budget-${Date.now()}`,
            categoryId: category.id,
            name: category.name,
            icon: String(payload.icon || "CircleDollarSign"),
            limit: Number(payload.limitAmount),
            currency: String(payload.currency || "UAH"),
            month: String(payload.month),
            period: payload.periodType === "week" ? "week" : "month",
            color: String(payload.color || "#6558e8"),
          };
          setSavedBudgets((items) => [
            ...items.filter(
                (item) =>
                    !(
                        item.categoryId === next.categoryId &&
                        item.month === next.month &&
                        item.period === next.period
                    ),
            ),
            next,
          ]);
        } else if (action === "createCategory")
          setCategories((items) => [
            ...items,
            {
              id: `cat-${Date.now()}`,
              name: String(payload.name || "Категорія"),
              kind: String(payload.kind || "expense"),
              color: String(payload.color || "#6558E8"),
              icon: String(payload.icon || "CircleDollarSign"),
              budgetGroup: (payload.budgetGroup as "needs" | "wants" | "savings") || null,
            },
          ]);
        else if (action === "updateCategory")
          setCategories((items) =>
              items.map((item) =>
                  item.id === id
                      ? {
                        ...item,
                        name: String(payload.name || item.name),
                        color: String(payload.color || item.color),
                        icon: String(payload.icon || item.icon),
                        budgetGroup: (payload.budgetGroup as "needs" | "wants" | "savings") || null,
                      }
                      : item,
              ),
          );
        else if (action === "deleteCategory")
          setCategories((items) => items.filter((item) => item.id !== id));
        else if (action === "deleteBudget")
          setSavedBudgets((items) => items.filter((item) => item.id !== id));
        else if (action === "updateBudget")
          setSavedBudgets((items) =>
              items.map((item) => (item.id === id ? { ...item, limit: Number(payload.limitAmount) } : item)),
          );
        else if (action === "createCustomRate")
          setCustomRates((items) => [
            {
              currency: String(payload.quoteCurrency || "USD"),
              rate: Number(payload.rate),
              date: String(payload.date || new Date().toISOString().slice(0, 10)),
            },
            ...items.filter((item) => item.currency !== String(payload.quoteCurrency)),
          ]);
        else if (action === "createTransfer") {
          const from = String(payload.fromAccountId),
              to = String(payload.toAccountId),
              sent = Number(payload.sentAmount),
              received = Number(payload.receivedAmount),
              fee = Number(payload.feeAmount) || 0;
          if (from === to) {
            notify("Оберіть різні рахунки");
            return false;
          }
          setAccounts((items) =>
              items.map((item) =>
                  String(item.id) === from
                      ? {
                        ...item,
                        balance:
                            item.balance -
                            sent -
                            (String(payload.feeCurrency) === item.currency ? fee : 0),
                      }
                      : String(item.id) === to
                          ? {
                            ...item,
                            balance:
                                item.balance +
                                received -
                                (String(payload.feeCurrency) === item.currency ? fee : 0),
                          }
                          : item,
              ),
          );
        } else if (action === "updateAccount")
          setAccounts((items) =>
              items.map((item) =>
                  String(item.id) === id
                      ? {
                        ...item,
                        name: String(payload.name || item.name),
                        bank: String(payload.bank || item.bank),
                        owner: String(payload.owner || item.owner),
                        currency: String(payload.currency || item.currency),
                        balance: Number(payload.balance) || 0,
                        creditLimit: Number(payload.creditLimit) || 0,
                        graceEnd: payload.graceEnd ? String(payload.graceEnd) : undefined,
                        graceBalance: payload.graceBalance ? Number(payload.graceBalance) : undefined,
                        color: payload.cardColor ? String(payload.cardColor) : item.color,
                      }
                      : item,
              ),
          );
        else return false;

        notify(success);
        return true;
      }

      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        notify(result.error || "Помилка збереження");
        return false;
      }
      notify(success);
      await refreshFinance();
      return true;
    } finally {
      setBusy(false);
    }
  }
  async function addGoal(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      action: editingGoal ? "updateGoal" : "createGoal",
      id: editingGoal?.id,
      name: f.get("name"),
      targetAmount: Number(f.get("target")),
      currentAmount: Number(f.get("current")),
      currency: String(f.get("currency") || "UAH"),
      targetDate: f.get("date") ? String(f.get("date")) : undefined,
      color: String(f.get("color") || "#6558E8"),
      assetType: String(f.get("assetType") || "savings"),
      annualRate: f.get("annualRate") || undefined,
      compoundInterest: f.get("compoundInterest") === "on",
      sourceAccountId: f.get("sourceAccountId") || undefined,
      roundBalanceTo: f.get("roundBalanceTo") || undefined,
      roundExpenseTo: f.get("roundExpenseTo") || undefined,
      expensePercent: f.get("expensePercent") || undefined,
    };
    if (await financeAction(payload, editingGoal ? "Ціль оновлено" : "Ціль створено")) {
      setModal(null);
      setEditingGoal(null);
    }
  }
  async function withdrawGoal(id: string, amount: number, targetAccountId: string) {
    if (await financeAction({ action: "withdrawGoal", id, amount, targetAccountId }, "Кошти знято"))
      setGoalAction(null);
  }
  async function breakGoal(id: string, targetAccountId: string) {
    if (!window.confirm("Розбити банку? Уся сума перейде на обраний рахунок, ціль буде видалено."))
      return;
    if (await financeAction({ action: "breakGoal", id, targetAccountId }, "Банку розбито"))
      setGoalAction(null);
  }
  async function addRecurring(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const account = accounts.find((item) => String(item.id) === String(f.get("account")));
    if (!account) return notify("Оберіть рахунок");
    if (
        await financeAction(
            {
              action: "createRecurring",
              accountId: account.id,
              categoryId: f.get("category") || null,
              name: f.get("name"),
              amount: Number(f.get("amount")),
              currency: account.currency,
              frequency: String(f.get("frequency")),
              nextRunAt: f.get("date") ? String(f.get("date")) : undefined,
              autoCreate: f.get("auto") === "on",
              kind: String(f.get("kind") || "expense"),
            },
            f.get("kind") === "income" ? "Плановий дохід додано" : "Регулярний платіж створено",
        )
    )
      setModal(null);
  }
  async function splitBill(participants: { person: string; amount: number }[], note: string) {
    setBusy(true);
    try {
      let failed = false;
      for (const p of participants) {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createDebt",
            person: p.person,
            direction: "owed_to_me",
            amount: p.amount,
            currency: baseCurrency,
            note: note || "Спільний чек",
          }),
        });
        if (!response.ok) failed = true;
      }
      const text =
          `Рахунок${note ? ` за "${note}"` : ""} розділено на ${participants.length}. Кожен винен: ${formatMoney(participants[0]?.amount || 0)} ${baseCurrency}.\n` +
          participants.map((p) => `${p.person}: ${formatMoney(p.amount)} ${baseCurrency}`).join("\n");
      await navigator.clipboard.writeText(text).catch(() => {});
      notify(
          failed
              ? "Частину боргів не вдалося створити, текст скопійовано"
              : "Борги створено, текст для месенджера скопійовано",
      );
      await refreshFinance();
      setModal(null);
    } finally {
      setBusy(false);
    }
  }
  async function addDebt(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      const totalAmount = Number(f.get("amount"));
      const months = Number(f.get("installmentMonths")) || 0;
      const autoDebit = f.get("autoDebit") === "on" && months > 0;
      const debtResponse = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createDebt",
          person: f.get("person"),
          direction: f.get("direction"),
          amount: totalAmount,
          currency: String(f.get("currency") || "UAH"),
          dueDate: f.get("date") ? String(f.get("date")) : undefined,
          note: String(f.get("note") || ""),
          isInstallment: f.get("isInstallment") === "on",
          installmentMonths: months || undefined,
        }),
      });
      const debtResult = await debtResponse.json();
      if (!debtResponse.ok) return notify(debtResult.error || "Не вдалося додати борг");
      if (autoDebit && debtResult.data?.id) {
        const account = accounts.find((a) => String(a.id) === String(f.get("autoAccount")));
        const perMonth = Math.round((totalAmount / months) * 100) / 100;
        const recurringResponse = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createRecurring",
            accountId: f.get("autoAccount"),
            categoryId: f.get("autoCategory") || null,
            name: `Розстрочка: ${f.get("person")}`,
            amount: perMonth,
            currency: account?.currency || String(f.get("currency") || "UAH"),
            frequency: "monthly",
            nextRunAt: f.get("autoFirstDate")
                ? new Date(String(f.get("autoFirstDate"))).toISOString()
                : undefined,
            autoCreate: true,
            debtId: debtResult.data.id,
          }),
        });
        if (!recurringResponse.ok) {
          const recurringResult = await recurringResponse.json();
          notify(recurringResult.error || "Борг додано, але не вдалося налаштувати автосписання");
        } else notify("Борг і автосписання налаштовано");
      } else notify("Борг додано");
      await refreshFinance();
      setModal(null);
    } finally {
      setBusy(false);
    }
  }
  async function addTransfer(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const toAccountId = String(f.get("to") || "");
    const receivedAmount = Number(f.get("received")) || 0;
    const targetAccount = accounts.find((a) => String(a.id) === toAccountId);
    const creditLimitDelta =
        targetAccount && (targetAccount.creditLimit || 0) > 0 && f.get("reduceCreditLimit") === "on"
            ? receivedAmount
            : 0;
    const success = await financeAction(
        {
          action: "createTransfer",
          fromAccountId: f.get("from"),
          toAccountId,
          sentAmount: Number(f.get("sent")),
          receivedAmount,
          exchangeRate: Number(f.get("rate")),
          feeAmount: Number(f.get("fee")),
          feeCurrency: String(f.get("feeCurrency")),
          note: String(f.get("note") || ""),
          creditLimitDelta,
          bookedAt: f.get("bookedAt") ? new Date(String(f.get("bookedAt"))).toISOString() : undefined,
        },
        "Переказ виконано",
    );
    if (!success) return;
    setModal(null);
  }
  async function addBudget(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const raw = String(f.get("period"));
    if (budgetPeriodType === "week" && f.get("cloneWeeks") === "on" && initialLoggedIn) {
      const base = new Date(`${raw}T00:00:00`);
      const year = base.getFullYear(),
          month = base.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dailyRate = Number(f.get("limit")) / 7;
      const weeks: { date: string; limit: number }[] = [];
      for (let day = 1; day <= daysInMonth; day += 7) {
        const weekDays = Math.min(7, daysInMonth - day + 1);
        const weekLimit = Math.round(dailyRate * weekDays * 100) / 100;
        weeks.push({ date: toDateKey(new Date(year, month, day)), limit: weekLimit });
      }
      let failed = false;
      for (const week of weeks) {
        const response = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createBudget",
            categoryId: f.get("category"),
            month: week.date,
            periodType: "week",
            limitAmount: week.limit,
            currency: baseCurrency,
            icon: String(f.get("icon") || "CircleDollarSign"),
            color: String(f.get("color") || "#6558e8"),
          }),
        });
        if (!response.ok) failed = true;
      }
      if (!failed) {
        const monthTotal = weeks.reduce((sum, week) => sum + week.limit, 0);
        const monthResponse = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createBudget",
            categoryId: f.get("category"),
            month: `${year}-${String(month + 1).padStart(2, "0")}-01`,
            periodType: "month",
            limitAmount: Math.round(monthTotal * 100) / 100,
            currency: baseCurrency,
            icon: String(f.get("icon") || "CircleDollarSign"),
            color: String(f.get("color") || "#6558e8"),
          }),
        });
        if (!monthResponse.ok) failed = true;
      }
      notify(
          failed
              ? "Частину лімітів не вдалося зберегти"
              : `Ліміт застосовано на ${weeks.length} тижнів, місячний ліміт розраховано автоматично`,
      );
      await refreshFinance();
      if (!failed) setModal(null);
      return;
    }
    if (
        await financeAction(
            {
              action: "createBudget",
              categoryId: f.get("category"),
              month: budgetPeriodType === "week" ? raw : `${raw}-01`,
              periodType: budgetPeriodType,
              limitAmount: Number(f.get("limit")),
              currency: baseCurrency,
              icon: String(f.get("icon") || "CircleDollarSign"),
              color: String(f.get("color") || "#6558e8"),
            },
            "Ліміт збережено",
        )
    )
      setModal(null);
  }
  async function addCategory(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = f.get("id");
    if (
        await financeAction(
            {
              action: id ? "updateCategory" : "createCategory",
              id: id || undefined,
              name: f.get("name"),
              kind: String(f.get("kind")),
              icon: String(f.get("icon")),
              color: String(f.get("color")),
              budgetGroup: f.get("budgetGroup") || null,
              ...(f.has("payerSources") ? { payerSources: String(f.get("payerSources") || "") } : {}),
            },
            id ? "Категорію оновлено" : "Категорію створено",
        )
    ) {
      setModal(null);
      setEditingCategory(null);
    }
  }
  async function addRule(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
        await financeAction(
            {
              action: "createRule",
              name: f.get("name"),
              conditionType: f.get("conditionType"),
              conditionValue: f.get("conditionValue"),
              actionType: f.get("actionType"),
              actionCategoryId: f.get("actionCategoryId") || undefined,
              actionGoalId: f.get("actionGoalId") || undefined,
              actionValue: f.get("actionValue") || undefined,
            },
            "Правило створено",
        )
    )
      setModal(null);
  }
  async function addCustomRate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
        await financeAction(
            {
              action: "createCustomRate",
              quoteCurrency: String(f.get("currency")),
              rate: Number(f.get("rate")),
              date: String(f.get("date") || new Date().toISOString().slice(0, 10)),
            },
            "Власний курс збережено",
        )
    )
      setModal(null);
  }
  const [inviteResult, setInviteResult] = useState<{ url: string; emailed: boolean; copied: boolean; to: string; existing?: boolean } | null>(null);
  // Вхідні запрошення (якщо мене запросили в чужий бюджет)
  const [incomingInvites, setIncomingInvites] = useState<{ id: string; household: string; from: string; role: string }[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  useEffect(() => {
    if (!initialLoggedIn) return;
    fetch("/api/household/incoming", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.invites && setIncomingInvites(d.invites))
        .catch(() => {});
  }, [initialLoggedIn]);
  async function answerInvite(id: string, action: "accept" | "decline") {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const r = await fetch("/api/household/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return notify(d.error || "Не вдалося");
      if (action === "accept") {
        notify("Ви приєдналися до спільного бюджету");
        window.location.reload();
      } else setIncomingInvites((list) => list.filter((i) => i.id !== id));
    } finally {
      setInviteBusy(false);
    }
  }
  const [membersVersion, setMembersVersion] = useState(0);
  const [prevPage, setPrevPage] = useState<Page>("Головна");
  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>("profile");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("rivna-settings-tab") as SettingsTabKey | null;
      if (saved) setSettingsTab(saved);
    } catch {}
  }, []);
  const chooseSettingsTab = (key: SettingsTabKey) => {
    setSettingsTab(key);
    try {
      sessionStorage.setItem("rivna-settings-tab", key);
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  async function createInvite(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      const response = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: f.get("identifier"), role: f.get("role") }),
      });
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося створити запрошення");
      let copied = false;
      try {
        await navigator.clipboard.writeText(result.url);
        copied = true;
      } catch {}
      setInviteResult({ url: result.url, emailed: Boolean(result.emailed), copied, to: String(f.get("identifier") || ""), existing: Boolean(result.existing) });
      setMembersVersion((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  async function enablePush() {
    if (!initialLoggedIn) return notify("Сповіщення активуються після підключення Supabase");
    if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
    )
      return notify("Цей браузер не підтримує push");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return notify("Дозвіл на сповіщення не надано");
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return notify("VAPID-ключ не налаштовано");
    const registration = await navigator.serviceWorker.ready;
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    const raw = atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));
    const applicationServerKey = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) return notify("Не вдалося зберегти push-подpиску");
    setPushEnabled(true);
    notify("Push-сповіщення увімкнено");
  }
  async function installApp() {
    if (!installPrompt)
      return notify("Відкрийте меню браузера та оберіть «Додати на головний екран»");
    await (installPrompt as Event & { prompt: () => Promise<void> }).prompt();
    setInstallPrompt(null);
  }
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { quoted = !quoted; }
      else if ((ch === "," || ch === ";") && !quoted) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  function parsePayoneerDate(raw: string): string {
    const s = raw.replace(/['"]/g, "").trim();
    // Handle European thousands separator: "1.030.000.000" or plain number
    // Strip all non-numeric except last decimal marker
    const cleaned = s.replace(/\s/g, "");
    // Try as Unix timestamp — Payoneer uses seconds since epoch
    const num = Number(cleaned.replace(/,(?=\d{3})/g, "").replace(",", "."));
    if (!isNaN(num) && num > 1_000_000_000 && num < 10_000_000_000) {
      return new Date(num * 1000).toISOString();
    }
    // Try standard date string formats
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
    return new Date().toISOString();
  }

  // Payment-gateway prefixes that show up before a real merchant name, e.g.
  // "LIQPAY*MAUDAU" or "EASYPAY*LIFECELL" — strip these so the merchant behind
  // них is what gets shown/recognized. If the text before "*" is NOT a known
  // gateway (e.g. "ANTHROPIC* CLAUDE SUB"), it's usually the merchant itself,
  // so keep that side instead.
  const PAYMENT_GATEWAY_PREFIXES = ["liqpay", "easypay", "prtmn", "portmone", "wayforpay", "fondy", "ipay"];
  function splitMerchantFromDescription(raw: string): string {
    let text = raw.trim();
    const starIdx = text.indexOf("*");
    if (starIdx !== -1) {
      const before = text.slice(0, starIdx).trim();
      const after = text.slice(starIdx + 1).trim();
      const isGateway = PAYMENT_GATEWAY_PREFIXES.includes(before.toLowerCase().replace(/[^a-z]/g, ""));
      text = (isGateway && after) ? after : (before || after || text);
    }
    // Drop a trailing " - note" style suffix some exports append
    text = text.split(/\s+-\s+/)[0].trim();
    return text || raw.trim();
  }
  function prettifyMerchantName(name: string): string {
    const isAllUpper = name === name.toUpperCase();
    const isAllLower = name === name.toLowerCase();
    if ((isAllUpper || isAllLower) && /[A-Za-zА-Яа-яЇїІіЄєҐґ]/.test(name)) {
      return name
          .toLowerCase()
          .split(/\s+/)
          .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
          .join(" ");
    }
    return name;
  }
  // Людські назви для латиниці/трансліту з іноземних карток (порівняння за «скелетом» назви)
  const MERCHANT_DISPLAY_NAMES: [string, string][] = [
    ["дімсадгород", "ДімСадГород"],
    ["anthropic", "Claude"], ["claude", "Claude"],
    ["avrora", "Аврора"],
    ["сімейна пекарня", "Сімейна пекарня"],
    ["фотопослуги kodak", "Фотопослуги Кодак"], ["kodak", "Кодак"],
    ["pethouse", "Pethouse"],
    ["goldi", "Goldi"], ["new yorker", "New Yorker"], ["кав'ярня", "Кав'ярня"],
    ["зоомагазин", "Зоомагазин"],
    ["softserve", "SoftServe"],
    ["ingo", "Інго"],
    ["сільпо", "Сільпо"], ["фора", "Фора"], ["новус", "Новус"], ["варус", "Варус"], ["ашан", "Ашан"],
    ["епіцентр", "Епіцентр"], ["нова пошта", "Нова пошта"], ["укрпошта", "Укрпошта"],
    ["аптека доброго дня", "Аптека Доброго Дня"], ["аптека оптових цін", "Аптека оптових цін"],
    ["подорожник", "Подорожник"], ["розетка", "Rozetka"], ["алло", "Алло"],
  ];
  function applyDisplayName(name: string): string {
    const sk = merchantSkeleton(name);
    const found = MERCHANT_DISPLAY_NAMES.find(([key]) => {
      const keySk = merchantSkeleton(key);
      return keySk.length >= 4 && sk.includes(keySk);
    });
    return found ? found[1] : name;
  }

  function guessPayoneerCategory(description: string, target: string): string {
    const t = (target + " " + description).toLowerCase();
    // Per project rules: Nova Poshta → Особисті
    if (/nova.*poshta|novapay|нова пошта|meest|пошта/.test(t)) return "Особисті";
    if (/silpo|сільпо|fora|форa|atb|атб|novus|варус|metro|auchan|avrora|авро|supermarket|продукт|grocery/.test(t)) return "Їжа";
    if (/lifecell|life:\)|kyivstar|vodafone|мтс|easypay.*life|prtmn.*life|телеком/.test(t)) return "Зв'язок";
    if (/anthropic|openai|claude|chatgpt|netflix|spotify|apple.*sub|google.*sub|digitalocean|paddle|github/.test(t)) return "Підписки";
    if (/liqpay|portmone|easypay/.test(t)) return "Послуги";
    if (/magazyn|mahasyn|магазин|maudau|маудау|multimarket|rozetka|розетка|market/.test(t)) return "Покупки";
    if (/mi market|xiaomi|apple store|samsung|electronics/.test(t)) return "Електроніка";
    if (/epitsentr|епіцентр|dimsadgorod|ikea|leroy/.test(t)) return "Покупки";
    if (/temu|albert|mehmet sincar|yaren angin|faturamati|pazarcimp|\bkolo\b/.test(t)) return "Покупки";
    if (/pethouse|zoomagazin|зоомаг/.test(t)) return "Особисті";
    if (/ingo|страхув|insurance/.test(t)) return "Послуги";
    if (/busfor|kleopatra/.test(t)) return "Послуги";
    if (/pekarnya|пекарн|bakery/.test(t)) return "Їжа";
    if (/softserve/.test(t)) return "Переказ";
    // Per project rules: Payoneer/Wise/SWIFT → Переказ
    if (/transfer.*bank|bank.*transfer|withdraw|payroll|payment.*service|marketplace|payout/.test(t)) return "Переказ";
    if (/fee|commission|комісі/.test(t)) return "Комісія";
    return "Інше";
  }

  async function importCsv(file: File) {
    const excel = /\.xlsx?$/i.test(file.name);
    const defaultAccountId = String(accounts[0]?.id || "");
    type RawRow = { title: string; amount: number; date: string; categoryName: string; currency?: string; isPayoneerTransfer?: boolean; rawNote?: string };
    let rawRows: RawRow[] = [];
    try {
      if (excel) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
        const header = (allRows[0] as string[]).map((h) => String(h).toLowerCase());
        const isMonoXlsx = header.some((h) => h.includes("mcc") || h.includes("валюта") || h.includes("виписка"));
        rawRows = (allRows.slice(1) as unknown[][]).map((row) => {
          if (isMonoXlsx) {
            const rawDate = row[0] instanceof Date ? row[0] : new Date(String(row[0]));
            const amt = Number(String(row[3] ?? row[4] ?? "0").replace(/\s/g, "").replace(",", "."));
            return { title: String(row[2] || row[1] || "Monobank"), amount: amt, date: rawDate.toISOString(), categoryName: String(row[1] || "") };
          }
          const amt = Number(String(row[3] ?? "0").replace(/\s/g, "").replace(",", "."));
          const rawDate = row[2] instanceof Date ? row[2] : new Date(String(row[2]));
          return { title: String(row[0] || "Імпорт"), amount: amt, date: Number.isNaN(rawDate.getTime()) ? new Date().toISOString() : rawDate.toISOString(), categoryName: String(row[1] || "") };
        }).filter((r) => Number.isFinite(r.amount) && r.amount !== 0);
      } else {
        const text = await file.text();
        const lines = text
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .filter(Boolean);
        const lines3 = lines;
        const hdr = lines3[0]?.toLowerCase() || "";
        const isMonoCsv = hdr.includes("mcc") || hdr.includes("сума в валюті картки") || hdr.includes("опис операції");
        // Column layout varies between Payoneer report types (e.g. "Activity Report by
        // Currency" vs an older "Transaction History" export), so resolve columns by
        // header name instead of a hardcoded position — this covers both automatically.
        const headerCells = parseCsvLine(lines3[0] || "").map((v) => v.replace(/^"+|"+$/g, "").trim().toLowerCase());
        const findCol = (name: string) => headerCells.indexOf(name);
        const iTxDate = findCol("transaction date");
        const iCreditAmt = findCol("credit amount");
        const iDebitAmt = findCol("debit amount");
        const iDescription = findCol("description");
        const iStatus = findCol("status");
        const iCurrency = findCol("currency");
        const isPayoneerCsv = iTxDate !== -1 && iCreditAmt !== -1 && iDebitAmt !== -1 && iDescription !== -1;
        if (isPayoneerCsv) {
          // Payoneer report CSV — columns resolved above by header name.
          rawRows = lines3.slice(1).flatMap((csvLine) => {
            const cells = parseCsvLine(csvLine).map((v) => v.replace(/^"+|"+$/g, "").trim());
            const status = (iStatus !== -1 ? cells[iStatus] || "" : "").toLowerCase();
            if (iStatus !== -1 && !status.includes("complet")) return []; // skip pending/failed
            const creditAmt = Number((cells[iCreditAmt] || "0").replace(/\s/g, "").replace(",", "."));
            const debitAmt  = Number((cells[iDebitAmt] || "0").replace(/\s/g, "").replace(",", "."));
            const amount = creditAmt !== 0 ? creditAmt : -Math.abs(debitAmt);
            if (!Number.isFinite(amount) || amount === 0) return [];
            const currency = ((iCurrency !== -1 ? cells[iCurrency] : "") || "USD").trim().toUpperCase();
            const date = parsePayoneerDate(cells[iTxDate] || "");
            const description = cells[iDescription] || "";
            // Extract merchant from "Card charge (MERCHANT NAME)" format
            const merchantMatch = description.match(/\(([^)]+)\)/);
            const merchantName = prettifyMerchantName(
                splitMerchantFromDescription(merchantMatch ? merchantMatch[1].trim() : description)
            );
            const categoryName = guessPayoneerCategory(description, merchantName);
            const isPayoneerTransfer = /monobank|transfer.*bank|bank.*transfer|withdraw|to debit card/i.test(description);
            return [{ title: applyDisplayName(merchantName), amount, date, categoryName, currency, isPayoneerTransfer, rawNote: description }];
          });
        } else {
          rawRows = lines3.slice(1).map((csvLine) => {
            const cells = parseCsvLine(csvLine).map((v) => v.replace(/^"+|"+$/g, "").trim());
            if (isMonoCsv) {
              const amt = Number((cells[3] || cells[4] || "0").replace(/\s/g, "").replace(",", "."));
              const d = new Date(cells[0] || "");
              return { title: cells[1] || cells[2] || "Monobank", amount: amt, date: Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(), categoryName: "" };
            }
            const amt = Number((cells[3] || "0").replace(/\s/g, "").replace(",", "."));
            const d = new Date(cells[2] || "");
            return { title: cells[0] || "Імпорт", amount: amt, date: Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(), categoryName: cells[1] || "" };
          }).filter((r) => Number.isFinite(r.amount) && r.amount !== 0);
        }
      }
    } catch (err) {
      return notify("Не вдалося прочитати файл: " + String(err));
    }
    if (!rawRows.length) return notify("Файл не містить операцій");

    const existingKeys = new Set(
        transactions.filter((t) => t.bookedAt).map((t) =>
            `${t.bookedAt!.slice(0, 10)}|${Math.abs(t.amount).toFixed(2)}|${(t.currency || "UAH").toUpperCase()}`
        )
    );
    const now = Date.now();
    let previewRows: ImportPreviewRow[] = rawRows.map((r, i) => {
      const cur = (r.currency || "UAH").toUpperCase();
      const key = `${r.date.slice(0, 10)}|${Math.abs(r.amount).toFixed(2)}|${cur}`;
      const isDuplicate = existingKeys.has(key);
      return {
        id: `import-${now}-${i}`,
        title: r.title, amount: r.amount, date: r.date, categoryName: r.categoryName,
        isDuplicate, selected: !isDuplicate,
        currency: r.currency,
        isPayoneerTransfer: r.isPayoneerTransfer,
      };
    });
    // Правила користувача ("Звідки приходить платіж", авто-вивчені назви) мають пріоритет над вгадуванням
    const noteRules = rules.filter(
        (r) => r.conditionType === "note_contains" && r.actionType === "set_category" && r.actionCategoryId && r.conditionValue,
    );
    const categoryById = new NativeMap(categories.map((c) => [String(c.id), c]));
    previewRows = previewRows.map((row, i) => {
      const text = `${rawRows[i]?.rawNote || ""} ${row.title}`.toLowerCase();
      const rowKind = row.amount >= 0 ? "income" : "expense";
      const rule = noteRules.find((r) => {
        const cat = categoryById.get(String(r.actionCategoryId));
        return cat?.kind === rowKind && text.replace(/\s+/g, " ").includes(String(r.conditionValue).toLowerCase().replace(/\s+/g, " ").trim());
      });
      const cat = rule ? categoryById.get(String(rule.actionCategoryId)) : undefined;
      return cat ? { ...row, categoryName: cat.name } : row;
    });

    // Payoneer: вивід (−$) → зарахування на будь-якому іншому рахунку (USD чи UAH)
    // в ТОЙ САМИЙ день, найближче за сумою (за день може бути кілька виводів).
    // Різниця з курсом НБУ на дату → комісія (окреме поле), пара імпортується як переказ.
    const payoneerAccount = accounts.find((a) => /payoneer|пайонер|піонер/i.test(`${a.name} ${a.bank}`));
    const importAccountId = previewRows.some((r) => r.isPayoneerTransfer) && payoneerAccount
        ? String(payoneerAccount.id)
        : defaultAccountId;
    const importAccountName = accounts.find((a) => String(a.id) === importAccountId)?.name;
    const kyivDay = (iso: string) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date(iso));
    const withdrawals = previewRows.filter((r) => r.isPayoneerTransfer && r.amount < 0 && !r.isDuplicate);
    const neededCurrencies = Array.from(new Set(["USD", ...accounts.map((a) => a.currency)]))
        .filter((c) => c && c !== "UAH").join(",");
    const rateByDay: Record<string, Record<string, number | null>> = {};
    await Promise.all(
        Array.from(new Set(withdrawals.map((r) => kyivDay(r.date)))).map(async (day) => {
          try {
            const res = await fetch(`/api/exchange-rates?date=${day}&currency=${neededCurrencies}`);
            rateByDay[day] = res.ok ? (await res.json()).rates || {} : {};
          } catch {
            rateByDay[day] = {};
          }
        }),
    );
    const uahRate = (cur: string, day: string) =>
        cur === "UAH" ? 1 : (rateByDay[day]?.[cur] ?? conversionRate(cur, rates, customRates));

    type Candidate = {
      rowId: string; tx: (typeof transactions)[number]; diff: number; score: number; fee: number; expectedUah: number;
      existingFromTxId?: string;
    };
    // Зарахування, які Монобанк уже зв'язав як переказ З ЦЬОГО Ж рахунку (опис "Payoneer")
    const linkedFromImport = new NativeMap<string, string>();
    for (const tr of transfers) {
      if (tr.toTransactionId && tr.fromTransactionId && String(tr.fromAccountId) === importAccountId) {
        linkedFromImport.set(String(tr.toTransactionId), String(tr.fromTransactionId));
      }
    }
    const dayMs = 24 * 3600 * 1000;
    const candidates: Candidate[] = [];
    for (const row of withdrawals) {
      const day = kyivDay(row.date);
      const rowDayTime = new Date(`${day}T12:00:00`).getTime();
      const sentCur = (row.currency || "USD").toUpperCase();
      const sentUah = Math.abs(row.amount) * uahRate(sentCur, day);
      for (const t of transactions) {
        if (!t.bookedAt || t.amount <= 0) continue;
        if (importAccountName && t.account === importAccountName) continue;
        const existingFromTxId = linkedFromImport.get(String(t.id));
        // Чужі перекази не чіпаємо; перекази з цього ж рахунку — це той самий вивід
        if ((t.kind === "transfer" || t.kind === "exchange") && !existingFromTxId) continue;
        // Той самий день; сусідній — лише як запасний варіант (різниця часових поясів / зарахування наступного дня)
        const dayDiff = Math.round(Math.abs(new Date(`${kyivDay(t.bookedAt)}T12:00:00`).getTime() - rowDayTime) / dayMs);
        if (dayDiff > 3) continue; // до 3 днів: Payoneer часто зараховує наступного дня або пізніше
        const cur = (t.currency || "UAH").toUpperCase();
        const receivedUah = t.amount * uahRate(cur, day);
        const diff = Math.abs(sentUah - receivedUah) / sentUah;
        if (diff > 0.15) continue; // не схоже на цей вивід
        candidates.push({
          rowId: row.id, tx: t, diff, score: diff + dayDiff * 0.05, // ближча дата — пріоритет, але сума важливіша
          fee: Math.max(0, Math.round((sentUah - receivedUah) * 100) / 100),
          expectedUah: Math.round(sentUah * 100) / 100,
          existingFromTxId,
        });
      }
    }
    // Жадібно: спершу найточніші пари (той самий день, найближча сума), кожен вивід і зарахування — лише раз
    candidates.sort((a, b) => a.score - b.score);
    const matchedRows = new Set<string>();
    const matchedTx = new Set<string>();
    const matchByRow = new NativeMap<string, Candidate>();
    for (const c of candidates) {
      if (matchedRows.has(c.rowId) || matchedTx.has(String(c.tx.id))) continue;
      matchedRows.add(c.rowId);
      matchedTx.add(String(c.tx.id));
      matchByRow.set(c.rowId, c);
    }
    // Підказка для виводів без пари: що найближче знайшлося і чому не підійшло
    const hintFor = (row: ImportPreviewRow): string => {
      const day = kyivDay(row.date);
      const rowDayTime = new Date(`${day}T12:00:00`).getTime();
      const sentCur = (row.currency || "USD").toUpperCase();
      const sentUah = Math.abs(row.amount) * uahRate(sentCur, day);
      let best: { text: string; score: number } | null = null;
      for (const t of transactions) {
        if (!t.bookedAt || t.amount <= 0) continue;
        if (importAccountName && t.account === importAccountName) continue;
        const dayDiff = Math.round(Math.abs(new Date(`${kyivDay(t.bookedAt)}T12:00:00`).getTime() - rowDayTime) / dayMs);
        if (dayDiff > 5) continue;
        const cur = (t.currency || "UAH").toUpperCase();
        const diff = Math.abs(sentUah - t.amount * uahRate(cur, day)) / sentUah;
        const score = diff + dayDiff * 0.2;
        if (best && best.score <= score) continue;
        const reasons: string[] = [];
        if (dayDiff > 3) reasons.push(`різниця ${dayDiff} дн.`);
        if (diff > 0.15) reasons.push(`сума відрізняється на ${Math.round(diff * 100)}%`);
        if ((t.kind === "transfer" || t.kind === "exchange") && !linkedFromImport.get(String(t.id))) reasons.push("вже переказ з іншого рахунку");
        if (matchedTx.has(String(t.id))) reasons.push("вже зайняте іншим виводом");
        best = {
          score,
          text: `найближче: +${t.amount.toFixed(2)} ${cur} на ${t.account || "?"} ${t.bookedAt.slice(0, 10)}${reasons.length ? ` — ${reasons.join(", ")}` : ""}`,
        };
      }
      return best ? best.text : "зарахувань ±5 днів не знайдено (онови сторінку, якщо щойно міняла дані)";
    };
    const withFees: ImportPreviewRow[] = previewRows.map((row) => {
      const m = matchByRow.get(row.id);
      if (!m) return row.isPayoneerTransfer && row.amount < 0 ? { ...row, matchHint: hintFor(row) } : row;
      // Уже є такий переказ і суми збігаються — нічого не робимо, позначаємо як дублікат
      const alreadyExact = Boolean(m.existingFromTxId) && m.fee < 0.01;
      return {
        ...row,
        matchedTxId: m.tx.id,
        matchedTxAmount: m.tx.amount,
        matchedTxAccount: `${m.tx.account || ""} · ${(m.tx.currency || "UAH").toUpperCase()}`,
        expectedUah: m.expectedUah,
        fee: m.fee,
        existingFromTxId: m.existingFromTxId,
        isDuplicate: row.isDuplicate || alreadyExact,
        selected: alreadyExact ? false : row.selected,
      };
    });
    setImportPreview({ rows: withFees, accountId: importAccountId });
  }

  async function confirmImport(rows: ImportPreviewRow[], accountId: string) {
    if (!initialLoggedIn) {
      const imported = rows.map((r, i) => ({
        id: Date.now() + i, title: r.title, category: r.categoryName || "Без категорії",
        date: new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(new Date(r.date)),
        bookedAt: r.date, amount: r.amount, kind: r.amount >= 0 ? "income" : "expense",
      }));
      setTransactions((prev) => [...(imported as unknown as Transaction[]), ...prev]);
      notify(`Додано операцій: ${imported.length}`);
      setImportPreview(null);
      return;
    }
    const catMap = new NativeMap(categories.map((c) => [c.name.toLowerCase(), c.id]));
    // Payoneer-виводи зі знайденою парою імпортуємо як переказ (з комісією в окремому полі)
    const linkedRows = rows.filter((r) => r.isPayoneerTransfer && r.matchedTxId && r.amount < 0);
    const plainRows = rows.filter((r) => !linkedRows.includes(r));
    if (linkedRows.length) {
      const res = await fetch("/api/import/payoneer-links", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          links: linkedRows.map((r) => ({
            note: r.title, amount: Math.abs(r.amount), booked_at: r.date, matchedTxId: r.matchedTxId,
            existingFromTxId: r.existingFromTxId,
          })),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { notify(result.error || "Помилка імпорту переказів Payoneer"); return; }
      if (!plainRows.length) {
        notify(`Зв'язано переказів: ${result.linked}`);
        setImportPreview(null);
        await refreshFinance();
        return;
      }
    }
    const apiRows = plainRows.map((r) => ({
      note: r.title, amount: Math.abs(r.amount),
      type: r.amount >= 0 ? "income" : "expense",
      booked_at: r.date,
      category_id: catMap.get(r.categoryName.toLowerCase()) || null,
    }));
    setBusy(true);
    try {
      const res = await fetch("/api/import/rows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, rows: apiRows }),
      });
      const result = await res.json();
      if (!res.ok) { notify(result.error || "Помилка імпорту"); return; }
      notify(`Додано операцій: ${result.imported}`);
      setImportPreview(null);
      await refreshFinance();
    } finally { setBusy(false); }
  }
  // --- Import preview ---
  type ImportPreviewRow = {
    id: string;
    title: string;
    amount: number; // signed: negative = expense
    date: string;   // ISO
    categoryName: string;
    isDuplicate: boolean;
    selected: boolean;
    currency?: string;              // e.g. "USD" for Payoneer
    isPayoneerTransfer?: boolean;   // withdrawal to bank card
    matchedTxId?: string | number;  // matched deposit transaction ID
    matchedTxAmount?: number;       // matched deposit amount, in UAH
    matchedTxAccount?: string;      // matched deposit account name
    expectedUah?: number;           // withdrawal converted to UAH at current rate
    fee?: number;                   // calculated fee, in UAH (expectedUah - matchedTxAmount)
    existingFromTxId?: string;      // переказ уже створено синхронізацією Монобанку — оновимо суму/комісію
    matchHint?: string;             // чому вивід не знайшов пару
  };
  const [importPreview, setImportPreview] = useState<{
    rows: ImportPreviewRow[];
    accountId: string;
  } | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanItems, setScanItems] = useState<
      {
        id: string;
        amount: number;
        title: string;
        date: string | null;
        category: string | null;
        type: "income" | "expense";
      }[]
  >([]);
  const [monoToken, setMonoToken] = useState("");
  const [monoAccounts, setMonoAccounts] = useState<
      {
        id: string;
        type: string;
        currency: string;
        balance: number;
        creditLimit: number;
        maskedPan: string;
      }[]
  >([]);
  const [monoConnecting, setMonoConnecting] = useState(false);
  const [monoLinks, setMonoLinks] = useState<Record<string, string>>({});
  const [monoStatusLoaded,setMonoStatusLoaded]=useState(false);
  const [monoLastSyncedAt,setMonoLastSyncedAt]=useState<string|null>(null);
  const [monoResyncingCard, setMonoResyncingCard] = useState<string | null>(null);
  useEffect(() => {
    if (!initialLoggedIn) return;
    fetch("/api/monobank/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.connected) {
            setMonoAccounts(data.accounts || []);
            setMonoLinks(data.links || {});
            setMonoLastSyncedAt(data.lastSyncedAt || null);
          }
          setMonoStatusLoaded(true);
        })
        .catch(() => setMonoStatusLoaded(true));
  }, [initialLoggedIn]);

  const [autoLinkAttempted, setAutoLinkAttempted] = useState(false);
  useEffect(() => {
    if (autoLinkAttempted) return;
    if (!monoStatusLoaded || !accounts.length || !monoAccounts.length) return;
    setAutoLinkAttempted(true);
    for (const ma of monoAccounts) {
      if (monoLinks[ma.id]) continue;
      const panDigits = String(ma.maskedPan || "").replace(/\D/g, "");
      const last4 = panDigits.slice(-4);
      if (!last4 || last4.length !== 4) continue;
      const matchedAccount = accounts.find(
          (a) => a.bank?.toLowerCase().includes("mono") && a.cardLast4 === last4,
      );
      if (matchedAccount) {
        linkMonobankAccount(ma.id, String(matchedAccount.id));
      }
    }
  }, [monoStatusLoaded, accounts, monoAccounts, monoLinks, autoLinkAttempted]);
  async function connectMonobank() {
    if (!monoToken.trim()) return notify("Встав токен Monobank");
    setMonoConnecting(true);
    try {
      const response = await fetch("/api/monobank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: monoToken.trim() }),
      });
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося підключити Monobank");
      setMonoAccounts(result.accounts || []);
      notify("Підключено! Тепер прив'яжи картки до рахунків нижче.");
    } catch {
      notify("Помилка мережі");
    } finally {
      setMonoConnecting(false);
    }
  }
  const [monoLinking, setMonoLinking] = useState<string | null>(null);
  // Спільна логіка прив'язки: індикатор, захист від повторного кліку, оновлення стану
  async function postMonoLink(monoAccountId: string, body: Record<string, unknown>, okText: (imported: number) => string) {
    if (monoLinking) return;
    setMonoLinking(monoAccountId);
    try {
      const response = await fetch("/api/monobank/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monoAccountId, ...body }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return notify(result.error || "Не вдалося прив'язати картку. Спробуй ще раз");
      if (result.appAccountId) setMonoLinks((links) => ({ ...links, [monoAccountId]: String(result.appAccountId) }));
      notify(okText(Number(result.imported) || 0));
      await refreshFinance();
    } catch {
      notify("Помилка мережі — перевір, чи рахунок не створився, перш ніж пробувати знову");
      await refreshFinance();
    } finally {
      setMonoLinking(null);
    }
  }
  async function linkMonobankAccount(monoAccountId: string, appAccountId: string) {
    if (!appAccountId) return;
    await postMonoLink(monoAccountId, { appAccountId }, (n) =>
        n ? `Прив'язано і завантажено ${n} операцій за 31 день` : "Картку прив'язано — операції прилітатимуть автоматично",
    );
  }
  async function unlinkMonobankAccount(monoAccountId: string) {
    if (!window.confirm("Відв'язати цю картку? Уже додані операції залишаться, нові перестануть прилітати."))
      return;
    const response = await fetch("/api/monobank/unlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monoAccountId }),
    });
    const result = await response.json();
    if (!response.ok) return notify(result.error || "Не вдалося відв'язати");
    setMonoLinks((links) => {
      const next = { ...links };
      delete next[monoAccountId];
      return next;
    });
    notify("Картку відв'язано");
  }
  async function createAndLinkMonobankAccount(ma: {
    id: string;
    type: string;
    currency: string;
    balance: number;
    creditLimit: number;
    maskedPan: string;
  }) {
    const last4 = String(ma.maskedPan || "").replace(/\D/g, "").slice(-4);
    const kind = ma.type === "fop" ? "ФОП" : ma.type === "jar" ? "Банка" : ma.type === "white" ? "Біла" : ma.type === "platinum" ? "Platinum" : ma.type === "black" ? "Чорна" : "";
    const name = [kind || "Mono", ma.currency !== "UAH" ? ma.currency : "", last4 ? `•${last4}` : ""].filter(Boolean).join(" ");
    await postMonoLink(
        ma.id,
        { createNew: true, name, currency: ma.currency, balance: ma.balance, creditLimit: ma.creditLimit },
        (n) => (n ? `Рахунок «${name}» створено, завантажено ${n} операцій` : `Рахунок «${name}» створено і прив'язано`),
    );
  }
  const [monoResyncing, setMonoResyncing] = useState(false);
  const [monoResyncDebug, setMonoResyncDebug] = useState<{ monoAccountId: string; status?: number; error?: string; itemsFound?: number }[] | null>(null);
  async function resyncMonobank(force?: boolean, days?: number, monoAccountId?: string, noDedupe?: boolean) {
    setMonoResyncing(true);
    setMonoResyncingCard(monoAccountId || null);
    try {
      const response = await fetch("/api/monobank/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: Boolean(force), days: days || 31, monoAccountId: monoAccountId || undefined, noDedupe: Boolean(noDedupe) }),
      });
      let result: {
        error?: string;
        imported?: number;
        debug?: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[];
      } = {};
      try {
        result = await response.json();
      } catch {}
      if (!response.ok)
        return notify(result.error || `Не вдалося оновити (код ${response.status})`);
      const failed = (result.debug || []).find((d) => d.error);
      notify(
          failed
              ? `Завантажено: ${result.imported ?? 0}. Проблема: ${failed.error} (${failed.status || "немає з'єднання"})`
              : `Завантажено операцій: ${result.imported ?? 0}`,
      );
      if (result.imported) setMonoLastSyncedAt(new Date().toISOString());
      if (result.debug?.length) {
        setMonoResyncDebug(result.debug);
      }
      await refreshFinance();
    } finally {
      setMonoResyncing(false);
      setMonoResyncingCard(null);
    }
  }
  async function scanReceipt(file: File) {
    setScanning(true);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append(
          "categories",
          JSON.stringify(categories.filter((c) => c.kind === "expense").map((c) => c.name)),
      );
      const response = await fetch("/api/scan-receipt", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) return notify(result.error || "Не вдалося розпізнати фото");
      if (!result.transactions?.length) return notify("Нічого не розпізнано на фото");
      setScanItems(
          result.transactions.map(
              (
                  t: {
                    amount: number;
                    title: string;
                    date: string | null;
                    category: string | null;
                    type?: string;
                  },
                  i: number,
              ) => ({
                ...t,
                id: `scan-${Date.now()}-${i}`,
                type: t.type === "income" ? "income" : "expense",
              }),
          ),
      );
      setModal("scan-review");
    } catch {
      notify("Помилка мережі під час розпізнавання");
    } finally {
      setScanning(false);
    }
  }
  async function saveScannedTransaction(
      item: { amount: number; title: string; date: string | null; category: string | null },
      accountId: string,
      categoryId: string,
      type: "income" | "expense",
      transferToAccountId: string,
  ) {
    const account = accounts.find((a) => String(a.id) === accountId) || accounts[0];
    if (!account) return (notify("Спочатку створіть рахунок"), false);
    if (categoryId === "__transfer__" && transferToAccountId) {
      const toAccount = accounts.find((a) => String(a.id) === transferToAccountId);
      if (!toAccount) return (notify("Рахунок отримувача не знайдено"), false);
      if (!initialLoggedIn) return (notify("Перекази доступні лише після входу в акаунт"), false);
      const payload = {
        action: "createTransfer",
        fromAccountId: account.id,
        toAccountId: toAccount.id,
        sentAmount: item.amount,
        receivedAmount: item.amount,
        exchangeRate: 1,
        feeAmount: 0,
        feeCurrency: account.currency,
        note: item.title,
        bookedAt: item.date ? new Date(item.date).toISOString() : undefined,
      };
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        notify(result.error || "Не вдалося зберегти переказ");
        return false;
      }
      await refreshFinance();
      notify("Переказ додано");
      return true;
    }
    const realCategoryId = categoryId === "__transfer__" ? "" : categoryId;
    if (initialLoggedIn) {
      const payload = {
        action: "createTransaction",
        accountId: account.id,
        categoryId: realCategoryId || null,
        amount: item.amount,
        currency: account.currency,
        note: item.title,
        type,
        bookedAt: item.date ? new Date(item.date).toISOString() : undefined,
      };
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        notify(result.error || "Не вдалося зберегти");
        return false;
      }
      await refreshFinance();
      notify("Операцію додано");
      return true;
    }
    setTransactions([
      {
        id: Date.now(),
        title: item.title,
        category: categories.find((c) => c.id === realCategoryId)?.name || "Інше",
        date: "Щойно",
        amount: type === "income" ? item.amount : -item.amount,
        currency: account.currency,
      },
      ...transactions,
    ]);
    notify("Операцію додано");
    return true;
  }

  if (!loggedIn)
    return (
        <Login
            dark={dark}
            setDark={setDark}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            login={() => setLoggedIn(true)}
        />
    );
  if (!hasLoadedOnce)
    return (
        <div className="app-loader">
          <span className="app-loader-logo" />
          <div className="app-loader-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
    );

  const nav: [Page, React.ReactNode][] = [
    ["Головна", <Home key="h" />],
    ["Операції", <ArrowUpRight key="o" />],
    ["Бюджет", <BarChart3 key="b" />],
    ["Рахунки", <WalletCards key="r" />],
    ["Накопичення", <Target key="c" />],
    ["Аналітика", <PieChart key="a" />],
    ["Борги", <HandCoins key="d" />],
  ];

  const inSettings = page === "Налаштування";
  const sTabs = settingsTabs(initialLoggedIn);
  const openSettings = () => {
    if (!inSettings) setPrevPage(page);
    setPage("Налаштування");
  };
  const logout = async () => {
    if (initialLoggedIn) {
      await fetch("/auth/signout", { method: "POST" });
      window.location.href = "/auth";
    } else setLoggedIn(false);
  };

  return (
      <main className={inSettings ? "app-shell settings-mode" : "app-shell"}>
        <aside className="sidebar">
          {inSettings ? (
              <div className="sb-settings" key="settings">
                <button className="sb-back" onClick={() => setPage(prevPage)}>
                  <ChevronLeft /> Назад
                </button>
                <h2 className="sb-title">Налаштування</h2>
                <nav>
                  {sTabs.map(({ key, label, icon: Icon }) => (
                      <button key={key} className={settingsTab === key ? "active" : ""} onClick={() => chooseSettingsTab(key)}>
                        <Icon /> {label}
                      </button>
                  ))}
                </nav>
                <div className="side-bottom">
                  <button className="sb-logout" onClick={logout}>
                    <LogOut /> Вийти з акаунта
                  </button>
                </div>
              </div>
          ) : (
          <div className="sb-main" key="main">
          <button className="brand brand-button" onClick={() => setPage("Головна")}>
            <span className="brand-mark-logo" />
          </button>{" "}
          <nav>
            {nav.map(([label, icon]) => (
                <button
                    key={label}
                    className={page === label ? "active" : ""}
                    onClick={() => setPage(label)}
                >
                  {icon}
                  {label}
                </button>
            ))}
          </nav>
          <div className="side-bottom">
            <button onClick={openSettings}>
              <Settings /> Налаштування
            </button>
            <button className="profile" onClick={openSettings}>
              <span>{(topProfile?.name || "??").slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{topProfile?.name || "Профіль"}</strong>
                <small>{topProfile?.email || ""}</small>
              </div>
              <MoreHorizontal />
            </button>
          </div>
          </div>
          )}
        </aside>

        <section className="content">
          <header>
            <div>
              <p className="hello">
                {topProfile?.name ? `Вітаємо, ${topProfile.name}` : "Вітаємо"} <span>☀</span>
              </p>
              <h1>
                {page === "Головна"
                    ? "Ваші фінанси"
                    : inSettings
                        ? sTabs.find((t) => t.key === settingsTab)?.label || "Налаштування"
                        : page}
              </h1>
            </div>
            <div className="header-actions">
              <button className="theme-btn" onClick={() => setDark(!dark)} aria-label="Змінити тему">
                {dark ? <Sun /> : <Moon />}
              </button>
              <div className="notification-wrap" ref={notifRef}>
                <button
                    className="theme-btn notification"
                    onClick={openNotifications}
                    aria-label="Сповіщення"
                >
                  <Bell />
                  {hasNewAlerts && <i />}
                </button>
                {notifOpen && (
                    <div className="notification-panel">
                      <strong>Сповіщення</strong>
                      {activeAlerts.length ? (
                          activeAlerts.map((a) => (
                              <div key={a.key} className="notification-item">
                                <span className={a.percent >= 100 ? "negative" : ""}>{a.name}</span>
                                {a.percent >= 0 && <small>{a.percent}% ліміту використано</small>}
                              </div>
                          ))
                      ) : (
                          <p className="empty-inline">Нових сповіщень немає</p>
                      )}
                    </div>
                )}
              </div>
              {!isOnline && (
                  <span className="offline-badge">
                Офлайн{offlineCount > 0 ? ` · ${offlineCount}` : ""}
              </span>
              )}
              <button
                  className="theme-btn"
                  onClick={() => setModal("purchase-sim")}
                  aria-label="Симулятор великої покупки"
              >
                <Target />
              </button>
              <button
                  className="theme-btn"
                  onClick={() => setModal("wrapped")}
                  aria-label="rivna Wrapped"
              >
                <Sparkles />
              </button>
              <button className="add-btn" onClick={() => setModal("expense")}>
                <Plus /> Додати витрату
              </button>
            </div>
          </header>
          <div className="page-stage" key={inSettings ? `s-${settingsTab}` : page}>
          {incomingInvites.map((inv) => (
              <div key={inv.id} className="incoming-invite">
                <span className="incoming-invite-ic">👋</span>
                <div>
                  <strong>
                    {inv.from ? `${inv.from} запрошує вас` : "Вас запрошують"} до бюджету «{inv.household}»
                  </strong>
                  <small>Ви бачитимете спільні рахунки, ліміти та операції. Свій бюджет ви не втратите — між ними можна перемикатися.</small>
                </div>
                <div className="incoming-invite-actions">
                  <button className="secondary" disabled={inviteBusy} onClick={() => answerInvite(inv.id, "decline")}>Відхилити</button>
                  <button className="small-primary" disabled={inviteBusy} onClick={() => answerInvite(inv.id, "accept")}>Прийняти</button>
                </div>
              </div>
          ))}
          {page === "Головна" && (
              <Dashboard
                  balance={balance}
                  baseCurrency={baseCurrency}
                  accounts={orderedAccounts}
                  transactions={normalizedTransactions}
                  goals={goals}
                  authenticated={initialLoggedIn}
                  openPage={setPage}
                  addAccount={() => setModal("account")}
                  changeCurrency={setBaseCurrency}
                  feesByMonth={feesByMonth}
                  plannedIncome={plannedMonthlyIncome}
                  recurring={recurring}
                  addRecurring={() => setModal("recurring")}
                  reorderAccounts={reorderAccounts}
                  removeRecurring={(id) => financeAction({ action: "deleteRecurring", id }, "Регулярний платіж видалено")}
              />
          )}
          {page === "Операції" && (
              <TransactionsView
                  transactions={filteredTransactions}
                  search={search}
                  setSearch={setSearch}
                  remove={removeTransaction}
                  exportCsv={() => exportCsv(transactions, notify)}
                  exportExcel={() => exportExcel(transactions, notify)}
                  exportJson={() => exportJson(transactions, notify)}
                  initialAccount={accountFilter}
                  onEdit={setEditingTransaction}
                  scanReceipt={scanReceipt}
                  scanning={scanning}
                  transfers={transfers}
                  categories={categories}
                  accounts={accounts}
              />
          )}{" "}
          {page === "Бюджет" &&
              (initialLoggedIn ? (
                  <LiveBudgetView
                      budgets={savedBudgets}
                      transactions={normalizedTransactions}
                      periodType={budgetPeriodType}
                      setPeriodType={setBudgetPeriodType}
                      anchor={budgetAnchor}
                      setAnchor={setBudgetAnchor}
                      baseCurrency={baseCurrency}
                      add={(categoryName?: string) => {
                        setBudgetPresetCategory(categories.find((c) => c.name === categoryName)?.id);
                        setModal("budget");
                      }}
                      remove={(id: string | number) =>
                          financeAction({ action: "deleteBudget", id }, "Ліміт видалено")
                      }
                      update={(id: string, limitAmount: number) =>
                          financeAction({ action: "updateBudget", id, limitAmount }, "Ліміт оновлено")
                      }
                      createFrom={(b: BudgetItem, limitAmount: number) =>
                          financeAction(
                              {
                                action: "createBudget",
                                categoryId: b.categoryId,
                                month: b.month,
                                periodType: "month",
                                limitAmount,
                                currency: baseCurrency,
                                icon: b.icon,
                                color: b.color,
                              },
                              "Ліміт оновлено",
                          )
                      }
                      rolloverEnabled={budgetRollover}
                  />
              ) : (
                  <BudgetView
                      budgets={savedBudgets}
                      transactions={normalizedTransactions}
                      baseCurrency={baseCurrency}
                      add={() => { setBudgetPresetCategory(undefined); setModal("budget"); }}
                      remove={(id: string | number) =>
                          financeAction({ action: "deleteBudget", id }, "Ліміт видалено")
                      }
                  />
              ))}
          {page === "Рахунки" && (
              <AccountsView
                  accounts={orderedAccounts}
                  rates={rates}
                  customRates={customRates}
                  add={() => {
                    setEditingAccount(null);
                    setModal("account");
                  }}
                  edit={(account) => {
                    setEditingAccount(account);
                    setModal("account");
                  }}
                  addRate={() => setModal("rate")}
                  transfer={() => {
                    setTransferPresetTo(undefined);
                    setModal("transfer");
                  }}
                  remove={removeAccount}
                  reorderAccounts={reorderAccounts}
                  monoToken={monoToken}
                  setMonoToken={setMonoToken}
                  monoAccounts={monoAccounts}
                  setMonoAccounts={setMonoAccounts}
                  monoConnecting={monoConnecting}
                  connectMonobank={connectMonobank}
                  linkMonobankAccount={linkMonobankAccount}
                  unlinkMonobankAccount={unlinkMonobankAccount}
                  createAndLinkMonobankAccount={createAndLinkMonobankAccount}
                  monoLinking={monoLinking}
                  resyncMonobank={resyncMonobank}
                  monoLinks={monoLinks}
                  monoResyncing={monoResyncing}
                  monoLastSyncedAt={monoLastSyncedAt}
                  monoResyncingCard={monoResyncingCard}
              />
          )}
          {page === "Накопичення" && (
              <>
                <GoalsView
                    goals={goals}
                    authenticated={initialLoggedIn}
                    add={() => {
                      setEditingGoal(null);
                      setModal("goal");
                    }}
                    contribute={(id, amount) =>
                        financeAction({ action: "contributeGoal", id, amount }, "Ціль поповнено")
                    }
                    recurring={recurring}
                    addRecurring={() => setModal("recurring")}
                    edit={(goal) => {
                      setEditingGoal(goal);
                      setModal("goal");
                    }}
                    openAction={(goal, mode) => setGoalAction({ goal, mode })}
                />
                <InvestmentSimulator goals={goals} baseCurrency={baseCurrency} />
              </>
          )}
          {page === "Аналітика" && (
              <AnalyticsView
                  transactions={normalizedTransactions}
                  baseCurrency={baseCurrency}
                  recurring={recurring}
                  balance={balance}
                  rates={rates}
                  customRates={customRates}
                  categories={categories}
                  accounts={accounts}
              />
          )}
          {page === "Борги" && (
              <>
                <DebtsView
                    debts={allDebts}
                    add={() => setModal("debt")}
                    settle={(debt) =>
                        debt.direction === "owed_to_me"
                            ? setSettleTarget(debt)
                            : financeAction({ action: "settleDebt", id: debt.id }, "Борг закрито")
                    }
                    payOff={(accountId) => {
                      setTransferPresetTo(accountId);
                      setModal("transfer");
                    }}
                    openPay={setPayTarget}
                    splitBill={() => setModal("split")}
                />
                <SettlementPanel
                    baseCurrency={baseCurrency}
                    createDebt={(person, amount) =>
                        financeAction(
                            {
                              action: "createDebt",
                              person,
                              direction: "owed_to_me",
                              amount,
                              currency: baseCurrency,
                              note: "Спільні витрати місяця",
                            },
                            "Борг створено",
                        )
                    }
                />
              </>
          )}
          {page === "Налаштування" && (
              <SettingsView
                  dark={dark}
                  setDark={setDark}
                  skin={skin}
                  setSkin={setSkin}
                  cardStyle={cardStyle}
                  setCardStyle={setCardStyle}
                  budgetRollover={budgetRollover}
                  setBudgetRollover={setBudgetRollover}
                  importCsv={importCsv}
                  categories={categories}
                  audit={audit}
                  pushEnabled={pushEnabled}
                  enablePush={enablePush}
                  installApp={installApp}
                  goals={goals}
                  budgets={savedBudgets}
                  debts={allDebts}
                  transactions={transactions}
                  rules={rules}
                  openAddRule={() => setModal("rule")}
                  removeRule={(id) => financeAction({ action: "deleteRule", id }, "Правило видалено")}
                  addCategory={() => setModal("category")}
                  editCategory={(category) => {
                    setEditingCategory(category);
                    setModal("category");
                  }}
                  deleteCategory={(id) =>
                      financeAction({ action: "deleteCategory", id }, "Категорію видалено")
                  }
                  logout={logout}
                  notify={notify}
                  tab={settingsTab}
                  setTab={chooseSettingsTab}
                  security={
                    initialLoggedIn ? (
                        <div className="st-card st-row">
                          <span>
                            <strong>Швидкий вхід</strong>
                            <small>Face ID, Touch ID, Windows Hello або PIN цього пристрою</small>
                          </span>
                          <PasskeyButton mode="register" className="small-primary" onMessage={notify} />
                        </div>
                    ) : undefined
                  }
                  members={
                    initialLoggedIn ? (
                        <MembersPanel notify={notify} onInvite={() => { setInviteResult(null); setModal("invite"); }} version={membersVersion} />
                    ) : undefined
                  }
                  recategorize={initialLoggedIn ? <RecategorizePanel notify={notify} /> : undefined}
                  feedback={<GuideFeedback notify={notify} authenticated={initialLoggedIn} />}
              />
          )}



          </div>

          <button
              className="mobile-quick-add"
              onClick={() => setModal("expense")}
              aria-label="Додати витрату"
          >
            <Plus />
          </button>

          <nav className="mobile-nav" aria-label="Основна навігація">
            <button className={page === "Головна" ? "active" : ""} onClick={() => setPage("Головна")}>
              <Home />
              <small>Головна</small>
            </button>
            <button
                className={page === "Аналітика" ? "active" : ""}
                onClick={() => setPage("Аналітика")}
            >
              <PieChart />
              <small>Аналітика</small>
            </button>
            <button className={page === "Рахунки" ? "active" : ""} onClick={() => setPage("Рахунки")}>
              <WalletCards />
              <small>Рахунки</small>
            </button>
            <button
                className={page === "Операції" ? "active" : ""}
                onClick={() => setPage("Операції")}
            >
              <ArrowUpRight />
              <small>Операції</small>
            </button>
            <button
                className={page === "Налаштування" ? "active" : ""}
                onClick={() => setPage("Налаштування")}
            >
              <MoreHorizontal />
              <small>Ще</small>
            </button>
          </nav>
        </section>

        {modal === "expense" && (
            <ExpenseModal
                amount={amount}
                setAmount={setAmount}
                note={note}
                setNote={setNote}
                accounts={accounts}
                categories={categories}
                debts={debts.filter((d) => d.direction === "i_owe" && !d.isVirtual)}
                goals={goals}
                budgets={savedBudgets}
                transactions={transactions}
                submit={addExpense}
                submitTransfer={addTransfer}
                close={() => setModal(null)}
            />
        )}
        {modal === "account" && (
            <AccountModal
                account={editingAccount}
                submit={addAccount}
                close={() => {
                  setEditingAccount(null);
                  setModal(null);
                }}
                openTransactions={(name) => {
                  setAccountFilter(name);
                  setModal(null);
                  setEditingAccount(null);
                  setPage("Операції");
                }}
            />
        )}
        {modal === "goal" && (
            <GoalModal
                goal={editingGoal}
                accounts={accounts}
                submit={addGoal}
                close={() => {
                  setModal(null);
                  setEditingGoal(null);
                }}
            />
        )}
        {goalAction && (
            <GoalActionModal
                action={goalAction}
                accounts={accounts}
                withdraw={withdrawGoal}
                contribute={async (id, amount, accountId) => {
                  const account = accounts.find((a) => String(a.id) === accountId);
                  if (!account) return notify("Оберіть рахунок");
                  const ok = await financeAction(
                      { action: "createTransaction", accountId: account.id, categoryId: null, amount, currency: account.currency, note: `Поповнення банки: ${goals.find((g) => g.id === id)?.name || ""}`, type: "expense" },
                      "Списано з рахунку",
                  );
                  if (ok) await financeAction({ action: "contributeGoal", id, amount }, "Банку поповнено");
                  setGoalAction(null);
                }}
                breakGoal={breakGoal}
                close={() => setGoalAction(null)}
            />
        )}
        {modal === "debt" && (
            <DebtModal
                accounts={accounts}
                categories={categories}
                submit={addDebt}
                close={() => setModal(null)}
            />
        )}
        {modal === "split" && <SplitBillModal submit={splitBill} close={() => setModal(null)} />}
        {modal === "purchase-sim" && (
            <BigPurchaseSimulator
                balance={balance}
                recurring={recurring}
                rates={rates}
                customRates={customRates}
                baseCurrency={baseCurrency}
                close={() => setModal(null)}
            />
        )}
        {modal === "wrapped" && (
            <WrappedModal
                transactions={transactions}
                goals={goals}
                baseCurrency={baseCurrency}
                close={() => setModal(null)}
            />
        )}
        {settleTarget && (
            <SettleDebtModal
                debt={settleTarget}
                accounts={accounts}
                submit={(accountId) => {
                  financeAction(
                      { action: "settleDebt", id: settleTarget.id, accountId },
                      "Борг закрито, кошти зараховано",
                  );
                  setSettleTarget(null);
                }}
                close={() => setSettleTarget(null)}
            />
        )}
        {payTarget && (
            <PayInstallmentModal
                debt={payTarget}
                accounts={accounts}
                submit={(accountId, amount) => {
                  financeAction(
                      { action: "payInstallment", id: payTarget.id, accountId, amount },
                      "Платіж внесено",
                  );
                  setPayTarget(null);
                }}
                close={() => setPayTarget(null)}
            />
        )}
        {modal === "recurring" && (
            <RecurringModal
                accounts={accounts}
                categories={categories}
                rates={rates}
                customRates={customRates}
                submit={addRecurring}
                close={() => setModal(null)}
            />
        )}
        {modal === "transfer" && (
            <TransferModal
                accounts={accounts}
                rates={rates}
                customRates={customRates}
                presetToAccountId={transferPresetTo}
                submit={addTransfer}
                close={() => {
                  setModal(null);
                  setTransferPresetTo(undefined);
                }}
            />
        )}
        {modal === "budget" && (
            <BudgetModal
                categories={categories}
                period={budgetPeriodType}
                initialDate={budgetModalDefaultDate}
                baseCurrency={baseCurrency}
                initialCategoryId={budgetPresetCategory}
                submit={addBudget}
                close={() => setModal(null)}
            />
        )}
        {modal === "category" && (
            <CategoryModal
                category={editingCategory}
                payerSources={rules
                    .filter((r) => editingCategory && r.actionCategoryId === editingCategory.id && r.conditionType === "note_contains" && r.name.startsWith("Джерело:"))
                    .map((r) => r.name.replace(/^Джерело:\s*/, ""))}
                submit={addCategory}
                close={() => {
                  setModal(null);
                  setEditingCategory(null);
                }}
            />
        )}
        {modal === "rule" && (
            <RuleModal
                categories={categories}
                goals={goals}
                submit={addRule}
                close={() => setModal(null)}
            />
        )}
        {editingTransaction && (
            <EditTransactionModal
                transaction={editingTransaction}
                categories={categories}
                accounts={accounts}
                goals={goals}
                close={() => setEditingTransaction(null)}
                submit={updateTransaction}
            />
        )}
        {milestoneCelebration && (
            <MilestoneModal
                goalName={milestoneCelebration.goalName}
                percent={milestoneCelebration.percent}
                close={() => setMilestoneCelebration(null)}
            />
        )}
        {modal === "invite" && (
            <InviteModal
                submit={createInvite}
                result={inviteResult}
                again={() => setInviteResult(null)}
                close={() => {
                  setModal(null);
                  setInviteResult(null);
                }}
            />
        )}
        {modal === "rate" && <CustomRateModal submit={addCustomRate} close={() => setModal(null)} />}
        {monoResyncDebug && (
            <MonoSyncDebugModal debug={monoResyncDebug} close={() => setMonoResyncDebug(null)} />
        )}
        {importPreview && (
            <ImportPreviewModal
                preview={importPreview}
                accounts={accounts}
                onConfirm={confirmImport}
                onClose={() => setImportPreview(null)}
            />
        )}
        {toast && <div className="toast">{toast}</div>}
        {busy && (
            <div className="busy-overlay">
              <div className="busy-spinner" />
              <span>Обробляємо…</span>
            </div>
        )}
        {syncing && hasLoadedOnce && <div className="sync-bar" />}
        <div
            style={{
              position: "fixed",
              bottom: "6px",
              right: "8px",
              fontSize: "10px",
              opacity: 0.35,
              pointerEvents: "none",
              zIndex: 9999,
              fontFamily: "monospace",
            }}
        >
          v{APP_VERSION}
        </div>
      </main>
  );
}

