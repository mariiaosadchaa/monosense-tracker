"use client";
import { useState, useEffect } from "react";
import type { GoalItem, BudgetItem, DebtItem, Transaction, RuleItem, CategoryItem } from "../types";
import { formatMoney, currencySymbol } from "../lib/format";
import type { SettingsProfile } from "./Analytics";
import {Check, Plus, Sparkles, Trash2, WalletCards} from "lucide-react";

export function ProfileSettings({
                             dark,
                             setDark,
                             skin,
                             setSkin,
                             cardStyle,
                             setCardStyle,
                             budgetRollover,
                             setBudgetRollover,
                             notify,
                         }: {
    dark: boolean;
    setDark: (value: boolean) => void;
    skin: string;
    setSkin: (value: string) => void;
    cardStyle: string;
    setCardStyle: (value: string) => void;
    budgetRollover: boolean;
    setBudgetRollover: (value: boolean) => void;
    notify: (message: string) => void;
}) {
    const [profile, setProfile] = useState<SettingsProfile | null>({
        name: "Марія",
        email: "",
        baseCurrency: "UAH",
        planningPeriod: "month",
        householdName: "Мої фінанси",
        telegramChatId: "",
        recurringReminders: true,
        budget80: true,
        budget100: true,
        role: "owner",
        digestEmailEnabled: false,
    });
    useEffect(() => {
        fetch("/api/settings", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => data?.profile && setProfile(data.profile))
            .catch(() => {});
    }, []);
    async function save(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!profile) return;
        const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "saveProfile", ...profile }),
        });
        const result = await response.json();
        notify(response.ok ? "Налаштування збережено" : result.error || "Не вдалося зберегти");
        if (response.ok) window.setTimeout(() => window.location.reload(), 500);
    }
    return (
        <form className="panel settings-card" onSubmit={save}>
            <h2>Загальні</h2>
            <label>
                Ваше ім’я
                <input
                    value={profile?.name || ""}
                    onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                    placeholder="Ваше ім’я"
                />
            </label>
            <label>
                Базова валюта
                <select
                    value={profile?.baseCurrency || "UAH"}
                    disabled={!["owner", "admin"].includes(profile?.role || "")}
                    onChange={(e) => setProfile((p) => (p ? { ...p, baseCurrency: e.target.value } : p))}
                >
                    <option>UAH</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>PLN</option>
                </select>
            </label>
            <label>
                Період планування
                <select
                    value={profile?.planningPeriod || "month"}
                    onChange={(e) =>
                        setProfile((p) =>
                            p ? { ...p, planningPeriod: e.target.value === "week" ? "week" : "month" } : p,
                        )
                    }
                >
                    <option value="month">Місяць</option>
                    <option value="week">Тиждень</option>
                </select>
            </label>
            <label>
                Telegram chat ID
                <input
                    value={profile?.telegramChatId || ""}
                    onChange={(e) => setProfile((p) => (p ? { ...p, telegramChatId: e.target.value } : p))}
                    placeholder="Надішліть боту /start"
                />
            </label>
            <button
                type="button"
                className="secondary"
                onClick={async () => {
                    const response = await fetch("/api/telegram/link", { method: "POST" });
                    const result = await response.json();
                    if (!response.ok) return notify(result.error || "Не вдалося створити посилання");
                    window.open(result.url, "_blank");
                }}
            >
                Прив'язати Telegram в один клік
            </button>
            <label className="setting-toggle">
        <span>
          <strong>Темна тема</strong>
          <small>Змінити вигляд застосунку</small>
        </span>
                <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            </label>
            <label className="setting-toggle">
        <span>
          <strong>Переносити залишок бюджету</strong>
          <small>Невитрачене (або перевитрачене) переходить на наступний місяць для всіх категорій</small>
        </span>
                <input
                    type="checkbox"
                    checked={budgetRollover}
                    onChange={(e) => setBudgetRollover(e.target.checked)}
                />
            </label>
            <label className="setting-toggle">
        <span>
          <strong>Алерт на 100%</strong>
          <small>Повідомлення про вичерпаний ліміт</small>
        </span>
                <input
                    type="checkbox"
                    checked={profile?.budget100 ?? true}
                    onChange={(e) =>
                        setProfile((prevProfile) =>
                            prevProfile ? { ...prevProfile, budget100: e.target.checked } : prevProfile,
                        )
                    }
                />
            </label>
            <label className="setting-toggle">
        <span>
          <strong>Нагадування про платежі</strong>
          <small>Для неавтоматичних правил</small>
        </span>
                <input
                    type="checkbox"
                    checked={profile?.recurringReminders ?? true}
                    onChange={(e) =>
                        setProfile((p) => (p ? { ...p, recurringReminders: e.target.checked } : p))
                    }
                />
            </label>
            <label className="setting-toggle">
        <span>
          <strong>Тижневий/місячний звіт у Telegram</strong>
          <small>Дайджест витрат, бюджету та накопичень</small>
        </span>
                <input
                    type="checkbox"
                    checked={profile?.digestEnabled ?? false}
                    onChange={(e) => setProfile((p) => (p ? { ...p, digestEnabled: e.target.checked } : p))}
                />
            </label>
            {profile?.digestEnabled && (
                <label>
                    Частота звіту
                    <select
                        value={profile?.digestFrequency || "weekly"}
                        onChange={(e) =>
                            setProfile((p) =>
                                p ? { ...p, digestFrequency: e.target.value as "weekly" | "monthly" } : p,
                            )
                        }
                    >
                        <option value="weekly">Щотижня</option>
                        <option value="monthly">Щомісяця</option>
                    </select>
                </label>
            )}
            <label className="setting-toggle">
        <span>
          <strong>Той самий звіт на Email</strong>
          <small>{profile?.email || "Пошта акаунта"}</small>
        </span>
                <input
                    type="checkbox"
                    checked={profile?.digestEmailEnabled ?? false}
                    onChange={(e) =>
                        setProfile((p) => (p ? { ...p, digestEmailEnabled: e.target.checked } : p))
                    }
                />
            </label>{" "}
            <label className="setting-toggle">
        <span>
          <strong>Темна тема</strong>
          <small>Змінити вигляд застосунку</small>
        </span>
                <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            </label>
            <label>
                Кольорова тема
                <div className="skin-picker">
                    <button
                        type="button"
                        className={`skin-swatch${skin === "default" ? " active" : ""}`}
                        onClick={() => setSkin("default")}
                    >
                        <i style={{ background: "#171a18" }} />
                        <small>Поточна</small>
                    </button>
                    <button
                        type="button"
                        className={`skin-swatch${skin === "mulberry-mint" ? " active" : ""}`}
                        onClick={() => setSkin("mulberry-mint")}
                    >
                        <i style={{ background: "#6B2D42" }} />
                        <small>Mulberry mint</small>
                    </button>
                    <button
                        type="button"
                        className={`skin-swatch${skin === "espresso-cream" ? " active" : ""}`}
                        onClick={() => setSkin("espresso-cream")}
                    >
                        <i style={{ background: "#8A6A4A" }} />
                        <small>Espresso cream</small>
                    </button>
                </div>
            </label>
            <label>
                Дизайн картки балансу
                <div className="skin-picker">
                    <button
                        type="button"
                        className={`skin-swatch${cardStyle === "default" ? " active" : ""}`}
                        onClick={() => setCardStyle("default")}
                    >
                        <i style={{ background: "linear-gradient(120deg,#12151a,#242832)" }} />
                        <small>Класична</small>
                    </button>
                    <button
                        type="button"
                        className={`skin-swatch${cardStyle === "aurora" ? " active" : ""}`}
                        onClick={() => setCardStyle("aurora")}
                    >
                        <i style={{ background: "linear-gradient(135deg,#1b1233,#3a2a63)" }} />
                        <small>Аврора</small>
                    </button>
                    <button
                        type="button"
                        className={`skin-swatch${cardStyle === "mesh" ? " active" : ""}`}
                        onClick={() => setCardStyle("mesh")}
                    >
                        <i style={{ background: "radial-gradient(circle at 30% 30%,#2c2450,#1a3a3a)" }} />
                        <small>Меш</small>
                    </button>
                    <button
                        type="button"
                        className={`skin-swatch${cardStyle === "minimal" ? " active" : ""}`}
                        onClick={() => setCardStyle("minimal")}
                    >
                        <i style={{ background: "#171a18" }} />
                        <small>Мінімал</small>
                    </button>
                </div>
            </label>
            <button className="primary" disabled={!profile}>
                Зберегти
            </button>
        </form>
    );
}
type SharedMember = { userId: string; name: string; role: string; joinedAt: string; isMe: boolean };
type PendingInvite = {
    id: string;
    email?: string;
    username?: string;
    role: string;
    expires_at: string;
};
type FinanceSpace = { id: string; name: string; currency: string; role: string; active: boolean };
export function MembersPanel({
    notify,
    onInvite,
    version = 0,
}: {
    notify: (message: string) => void;
    onInvite?: () => void;
    version?: number;
}) {
    const [members, setMembers] = useState<SharedMember[]>([]),
        [invites, setInvites] = useState<PendingInvite[]>([]),
        [spaces, setSpaces] = useState<FinanceSpace[]>([]),
        [myRole, setMyRole] = useState("");
    async function load() {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setMembers(data.members || []);
        setInvites(data.invitations || []);
        setSpaces(data.spaces || []);
        setMyRole(data.profile?.role || "");
    }
    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [version]);
    async function action(payload: Record<string, unknown>) {
        const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        notify(response.ok ? "Доступ оновлено" : result.error || "Помилка");
        if (response.ok) await load();
    }
    async function switchSpace(householdId: string) {
        const response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "switchHousehold", householdId }),
        });
        const result = await response.json();
        if (!response.ok) return notify(result.error || "Не вдалося перемкнути бюджет");
        notify("Бюджет перемкнено");
        window.location.reload();
    }
    const canManage = ["owner", "admin"].includes(myRole);
    return (
        <section className="panel members-panel">
            <div className="section-title">
                <div>
                    <h2>Спільний бюджет</h2>
                    <p>Хто бачить і веде ваші фінанси разом з вами</p>
                </div>
                {canManage && onInvite ? (
                    <button className="small-primary" onClick={onInvite}>
                        <Plus /> Запросити
                    </button>
                ) : (
                    <span className="role-badge">{translateRole(myRole)}</span>
                )}
            </div>
            {spaces.length > 1 && (
                <div className="space-switcher">
                    {spaces.map((space) => (
                        <button
                            key={space.id}
                            className={space.active ? "active" : ""}
                            onClick={() => !space.active && switchSpace(space.id)}
                        >
              <span className="member-avatar">
                <WalletCards />
              </span>
                            <span>
                <strong>{space.name}</strong>
                <small>
                  {space.currency} · {translateRole(space.role)}
                </small>
              </span>
                            {space.active && <Check />}
                        </button>
                    ))}
                </div>
            )}
            <div className="member-list">
                {members.map((member) => (
                    <div key={member.userId}>
                        <span className="member-avatar">{member.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                            <strong>
                                {member.name}
                                {member.isMe ? " · ви" : ""}
                            </strong>
                            <small>З {new Date(member.joinedAt).toLocaleDateString("uk-UA")}</small>
                        </div>
                        {canManage && !member.isMe && member.role !== "owner" ? (
                            <>
                                <select
                                    value={member.role}
                                    onChange={(e) =>
                                        action({ action: "changeRole", userId: member.userId, role: e.target.value })
                                    }
                                >
                                    <option value="admin">Адміністратор</option>
                                    <option value="member">Учасник</option>
                                    <option value="viewer">Глядач</option>
                                </select>
                                <button
                                    className="icon-button"
                                    onClick={() => action({ action: "removeMember", userId: member.userId })}
                                    aria-label="Видалити учасника"
                                >
                                    <Trash2 />
                                </button>
                            </>
                        ) : (
                            <span className="member-role">{translateRole(member.role)}</span>
                        )}
                    </div>
                ))}
            </div>
            {members.length <= 1 && invites.length === 0 && (
                <p className="members-hint">
                    Поки що тут лише ви. Запросіть партнера — він побачить спільні рахунки, ліміти та операції, а
                    його картки додадуться до вашого бюджету.
                </p>
            )}
            {invites.length > 0 && (
                <div className="pending-invites">
                    <strong>Очікують приєднання</strong>
                    {invites.map((invite) => (
                        <div key={invite.id}>
                            <span>{invite.email || `@${invite.username}`}</span>
                            <small>
                                {translateRole(invite.role)} · до{" "}
                                {new Date(invite.expires_at).toLocaleDateString("uk-UA")}
                            </small>
                            {canManage && (
                                <button onClick={() => action({ action: "cancelInvite", id: invite.id })}>
                                    Скасувати
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
export function translateRole(role: string) {
    return role === "owner"
        ? "Власник"
        : role === "admin"
            ? "Адміністратор"
            : role === "viewer"
                ? "Глядач"
                : role === "member"
                    ? "Учасник"
                    : "—";
}
export function RecategorizePanel({ notify }: { notify: (msg: string) => void }) {
    const [busy, setBusy] = useState(false);
    async function run() {
        setBusy(true);
        try {
            const res = await fetch("/api/finance/recategorize", { method: "POST" });
            const data = await res.json();
            if (!res.ok) return notify(data.error || "Помилка");
            notify(`Оновлено: ${data.updated} категорій, конвертовано: ${data.converted} переказів`);
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="panel passkey-panel">
            <div>
                <strong>Виправити категорії</strong>
                <small>Перекатегоризувати існуючі операції за збереженими правилами</small>
            </div>
            <button className="small-primary" onClick={run} disabled={busy}>
                {busy ? "Обробляю…" : "Запустити"}
            </button>
        </section>
    );
}

export function GuideFeedback({
                           notify,
                           authenticated,
                       }: {
    notify: (message: string) => void;
    authenticated: boolean;
}) {
    const [rating, setRating] = useState(5),
        [message, setMessage] = useState(""),
        [sending, setSending] = useState(false);
    async function submit(e: React.SyntheticEvent) {
        e.preventDefault();
        if (!authenticated) return notify("Відгук можна надіслати після входу");
        setSending(true);
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, message }),
        });
        const result = await response.json();
        setSending(false);
        if (response.ok) {
            setMessage("");
            notify("Дякуємо за відгук");
        } else notify(result.error || "Не вдалося надіслати");
    }
    return (
        <section className="guide-grid">
            <div className="panel guide-card">
                <div className="section-title">
                    <div>
                        <h2>Короткий довідник</h2>
                        <p>Як швидко почати роботу з Rivna</p>
                    </div>
                </div>
                <ol>
                    <li>
                        <span>1</span>
                        <div>
                            <strong>Додайте рахунки</strong>
                            <small>Картки, готівку та валютні заощадження.</small>
                        </div>
                    </li>
                    <li>
                        <span>2</span>
                        <div>
                            <strong>Записуйте витрати</strong>
                            <small>Теги, поділ чека та повторення доступні в одній формі.</small>
                        </div>
                    </li>
                    <li>
                        <span>3</span>
                        <div>
                            <strong>Встановіть ліміти</strong>
                            <small>Rivna попередить на 80% та 100% бюджету.</small>
                        </div>
                    </li>
                    <li>
                        <span>4</span>
                        <div>
                            <strong>Підключіть Telegram</strong>
                            <small>Збережіть chat ID і пишіть боту: «300 кава».</small>
                        </div>
                    </li>
                    <li>
                        <span>5</span>
                        <div>
                            <strong>Залиште відгук</strong>
                            <small>Допоможіть зробити Rivna кращою.</small>
                        </div>
                    </li>
                </ol>
            </div>
            <form className="panel feedback-card" onSubmit={submit}>
        <span className="wizard-icon">
          <Sparkles />
        </span>
                <h2>Допоможіть зробити Rivna кращою</h2>
                <p>Що зручно, а що варто змінити?</p>
                <div className="rating-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            type="button"
                            key={value}
                            className={value <= rating ? "active" : ""}
                            onClick={() => setRating(value)}
                        >
                            ★
                        </button>
                    ))}
                </div>
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ваш відгук…"
                    required
                    minLength={3}
                />
                <button className="primary" disabled={sending}>
                    {sending ? "Надсилаємо…" : "Надіслати відгук"}
                </button>
            </form>
        </section>
    );
}
