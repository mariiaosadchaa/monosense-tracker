"use client";

import {
    ArrowRight,
    CircleDollarSign,
    CreditCard,
    Eye,
    EyeOff,
    Fingerprint,
    Moon,
    Repeat2,
    Sparkles,
    Sun
} from "lucide-react";

export function Login({
                   dark,
                   setDark,
                   showPassword,
                   setShowPassword,
                   login,
               }: {
    dark: boolean;
    setDark: (v: boolean) => void;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    login: () => void;
}) {
    const floatingCards = [
        {
            top: "6%",
            left: "5%",
            rotate: -8,
            icon: null,
            label: "Продукти",
            value: "−₴1 248",
            color: "#D85A30",
        },
        {
            top: "10%",
            right: "6%",
            rotate: 7,
            icon: null,
            label: "Бюджет",
            value: "82% виконано",
            color: undefined,
        },
        {
            bottom: "24%",
            left: "3%",
            rotate: 5,
            icon: null,
            label: "Зарплата",
            value: "+₴24 500",
            color: "#3B6D11",
        },
        {
            bottom: "20%",
            right: "4%",
            rotate: -6,
            icon: null,
            label: "Ціль: Резерв",
            value: "60% накопичено",
            color: undefined,
        },
        { top: "38%", left: "-1%", rotate: -4, icon: "CreditCard", label: "Основна картка" },
        { top: "42%", right: "-1%", rotate: 6, icon: "Repeat2", label: "Netflix щомісяця" },
        {
            bottom: "8%",
            left: "22%",
            rotate: 3,
            icon: null,
            label: "Кава",
            value: "−₴185",
            color: undefined,
        },
    ];
    return (
        <main className="auth-shell">
            <section className="auth-brand">
                <div className="brand large">
          <span className="brand-mark">
            <CircleDollarSign />
          </span>{" "}
                    rivna
                </div>
                <div className="auth-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> Гроші без зайвої складності
          </span>
                    <h1>
                        Фінанси, які
                        <br />
                        нарешті зрозумілі.
                    </h1>
                    <p>Рахунки, бюджети та спільні цілі — в одному спокійному просторі.</p>
                </div>
                <div className="auth-stat">
                    <div>
                        <small>Бюджет під контролем</small>
                        <strong>82%</strong>
                    </div>
                    <div className="mini-bars">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                    </div>
                </div>
            </section>
            <section className="auth-form-wrap">
                <button className="theme-btn auth-theme" onClick={() => setDark(!dark)}>
                    {dark ? <Sun /> : <Moon />}
                </button>
                <div className="auth-float-layer">
                    {floatingCards.map((card, index) => (
                        <div
                            key={index}
                            className="auth-float-card"
                            style={{
                                top: card.top,
                                left: card.left,
                                right: card.right,
                                bottom: card.bottom,
                                transform: `rotate(${card.rotate}deg)`,
                            }}
                        >
                            {card.icon === "CreditCard" && (
                                <span className="auth-float-icon">
                  <CreditCard size={14} />
                </span>
                            )}
                            {card.icon === "Repeat2" && (
                                <span className="auth-float-icon">
                  <Repeat2 size={14} />
                </span>
                            )}
                            <span className="auth-float-label">{card.label}</span>
                            {card.value && (
                                <span
                                    className="auth-float-value"
                                    style={card.color ? { color: card.color } : undefined}
                                >
                  {card.value}
                </span>
                            )}
                        </div>
                    ))}
                </div>
                <form
                    className="auth-card"
                    onSubmit={(e) => {
                        e.preventDefault();
                        login();
                    }}
                >
                    <div className="mobile-logo brand">
            <span className="brand-mark">
              <CircleDollarSign />
            </span>{" "}
                        rivna
                    </div>
                    <div>
                        <h2>З поверненням</h2>
                        <p>Увійдіть, щоб продовжити</p>
                    </div>
                    <label>
                        Email
                        <input type="email" defaultValue="maria@example.com" required />
                    </label>
                    <label>
                        Пароль
                        <span className="password-field">
              <input type={showPassword ? "text" : "password"} defaultValue="rivna2026" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
                    </label>
                    <div className="form-row">
                        <label className="check">
                            <input type="checkbox" defaultChecked /> Запам’ятати мене
                        </label>
                        <button
                            type="button"
                            className="link"
                            onClick={() => window.alert("У демо-режимі відновлення пароля не потрібне.")}
                        >
                            Забули пароль?
                        </button>
                    </div>
                    <button className="primary" type="submit">
                        Увійти <ArrowRight />
                    </button>
                    <button className="bio-btn" type="button" onClick={login}>
                        <Fingerprint /> Увійти з Touch ID
                    </button>
                    <p className="signup">
                        Немає акаунта?{" "}
                        <button type="button" onClick={login}>
                            Створити демо
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}
export function translateEntity(value: string) {
    return (
        (
            {
                transactions: "Операція",
                accounts: "Рахунок",
                transfers: "Переказ",
                budgets: "Бюджет",
            } as Record<string, string>
        )[value] || value
    );
}
