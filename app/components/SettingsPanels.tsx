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
                             section = "profile",
                         }: {
    section?: "profile" | "look" | "notify" | "budget";
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
    // Без «дефолтного» імені: поки профіль не завантажився, зберегти не можна (інакше затирали справжнє ім'я)
    const [profile, setProfile] = useState<SettingsProfile | null>(null);
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
    const Toggle = ({
        title,
        hint,
        checked,
        onChange,
    }: {
        title: string;
        hint: string;
        checked: boolean;
        onChange: (v: boolean) => void;
    }) => (
        <label className="st-toggle">
            <span>
                <strong>{title}</strong>
                <small>{hint}</small>
            </span>
            <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        </label>
    );
    const set = (patch: Partial<SettingsProfile>) => setProfile((p) => (p ? { ...p, ...patch } : p));
    const Swatches = ({
        value,
        onChange,
        items,
    }: {
        value: string;
        onChange: (v: string) => void;
        items: [string, string, string][];
    }) => (
        <div className="skin-picker">
            {items.map(([key, bg, label]) => (
                <button
                    key={key}
                    type="button"
                    className={`skin-swatch${value === key ? " active" : ""}`}
                    onClick={() => onChange(key)}
                >
                    <i style={{ background: bg }} />
                    <small>{label}</small>
                </button>
            ))}
        </div>
    );
    const saveBtn = (
        <div className="st-save">
            <button className="primary" disabled={!profile}>
                Зберегти зміни
            </button>
        </div>
    );

    if (section === "look")
        return (
            <div className="st-card">
                <h3>Вигляд</h3>
                <Toggle title="Темна тема" hint="Застосовується одразу" checked={dark} onChange={setDark} />
                <div className="st-field">
                    <span>Кольорова тема</span>
                    <Swatches
                        value={skin}
                        onChange={setSkin}
                        items={[
                            ["default", "#171a18", "Графіт"],
                            ["mulberry-mint", "#6B2D42", "Mulberry mint"],
                            ["espresso-cream", "#8A6A4A", "Espresso cream"],
                        ]}
                    />
                </div>
                <div className="st-field">
                    <span>Картка балансу</span>
                    <Swatches
                        value={cardStyle}
                        onChange={setCardStyle}
                        items={[
                            ["default", "linear-gradient(120deg,#12151a,#242832)", "Класична"],
                            ["aurora", "linear-gradient(135deg,#1b1233,#3a2a63)", "Аврора"],
                            ["mesh", "radial-gradient(circle at 30% 30%,#2c2450,#1a3a3a)", "Меш"],
                            ["minimal", "#171a18", "Мінімал"],
                        ]}
                    />
                </div>
            </div>
        );

    if (section === "budget")
        return (
            <div className="st-card">
                <h3>Планування</h3>
                <Toggle
                    title="Переносити залишок ліміту"
                    hint="Невитрачене (або перевитрачене) переходить на наступний місяць"
                    checked={budgetRollover}
                    onChange={setBudgetRollover}
                />
            </div>
        );

    if (section === "notify")
        return (
            <form className="st-card" onSubmit={save}>
                <h3>Сповіщення</h3>
                <Toggle
                    title="Ліміт вичерпано"
                    hint="Повідомлення, коли категорія досягла 100%"
                    checked={profile?.budget100 ?? true}
                    onChange={(v) => set({ budget100: v })}
                />
                <Toggle
                    title="Нагадування про платежі"
                    hint="Для регулярних платежів, які не списуються автоматично"
                    checked={profile?.recurringReminders ?? true}
                    onChange={(v) => set({ recurringReminders: v })}
                />
                <h3 className="st-sub">Звіти</h3>
                <Toggle
                    title="Звіт у Telegram"
                    hint="Підсумок витрат, лімітів і накопичень"
                    checked={profile?.digestEnabled ?? false}
                    onChange={(v) => set({ digestEnabled: v })}
                />
                <Toggle
                    title="Звіт на email"
                    hint={profile?.email || "Пошта акаунта"}
                    checked={profile?.digestEmailEnabled ?? false}
                    onChange={(v) => set({ digestEmailEnabled: v })}
                />
                {(profile?.digestEnabled || profile?.digestEmailEnabled) && (
                    <label className="st-field">
                        <span>Як часто</span>
                        <select
                            value={profile?.digestFrequency || "weekly"}
                            onChange={(e) => set({ digestFrequency: e.target.value as "weekly" | "monthly" })}
                        >
                            <option value="weekly">Щотижня</option>
                            <option value="monthly">Щомісяця</option>
                        </select>
                    </label>
                )}
                <h3 className="st-sub">Telegram</h3>
                <div className="st-tg">
                    <p>
                        {profile?.telegramChatId
                            ? "Telegram підключено ✓ — можна додавати витрати повідомленням, напр. «300 кава #робота»."
                            : "Підключи бота, щоб отримувати сповіщення й додавати витрати повідомленням."}
                    </p>
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
                        {profile?.telegramChatId ? "Перепідключити" : "Підключити Telegram"}
                    </button>
                </div>
                <details className="st-adv">
                    <summary>Ввести chat ID вручну</summary>
                    <input
                        value={profile?.telegramChatId || ""}
                        onChange={(e) => set({ telegramChatId: e.target.value })}
                        placeholder="Надішліть боту /start"
                    />
                </details>
                {saveBtn}
            </form>
        );

    return (
        <form className="st-card" onSubmit={save}>
            <h3>Профіль</h3>
            <label className="st-field">
                <span>Ваше ім’я</span>
                <input value={profile?.name || ""} onChange={(e) => set({ name: e.target.value })} placeholder="Ваше ім’я" />
            </label>
            {profile?.email && (
                <div className="st-field">
                    <span>Email</span>
                    <input value={profile.email} disabled />
                </div>
            )}
            <label className="st-field">
                <span>Основна валюта</span>
                <select
                    value={profile?.baseCurrency || "UAH"}
                    disabled={!["owner", "admin"].includes(profile?.role || "")}
                    onChange={(e) => set({ baseCurrency: e.target.value })}
                >
                    <option value="UAH">₴ Гривня</option>
                    <option value="USD">$ Долар</option>
                    <option value="EUR">€ Євро</option>
                    <option value="GBP">£ Фунт</option>
                    <option value="PLN">zł Злотий</option>
                </select>
                <small>У ній рахуються баланс, ліміти й аналітика</small>
            </label>
            <label className="st-field">
                <span>Планую бюджет на</span>
                <select
                    value={profile?.planningPeriod || "month"}
                    onChange={(e) => set({ planningPeriod: e.target.value === "week" ? "week" : "month" })}
                >
                    <option value="month">Місяць</option>
                    <option value="week">Тиждень</option>
                </select>
            </label>
            {saveBtn}
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
