"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Перемикач світла/темна тема на сторінках входу (той самий ключ, що й у застосунку). Скіни вимкнено. */
export function AuthThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("rivna-theme");
      localStorage.removeItem("rivna-skin");
    } catch {}
    delete document.documentElement.dataset.skin;
    setDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("rivna-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  return (
    <>
      <button
        type="button"
        className="auth-v3-theme-btn"
        onClick={() => setDark(!dark)}
        aria-label={dark ? "Світла тема" : "Темна тема"}
        title={dark ? "Світла тема" : "Темна тема"}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <span className="auth-v3-logo auth-lux-logo" role="img" aria-label="Rivna" />
    </>
  );
}
