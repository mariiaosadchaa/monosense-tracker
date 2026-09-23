# Rivna App — Інструкції розробки та контексний файл

## 🎯 Проект
Фінансовий додаток у стилі Monobank/Privat24 для обліку доходів, витрат, переказів, боргів, цілей та бюджетів.

## 🛠 Технологічний стек
- **Framework:** Next.js (App Router, Server/Client Components, Turbopack)
- **Language:** TypeScript / React
- **Icons:** `lucide-react`
- **Database:** PostgreSQL (таблиці: `transactions`, `transfers`, `accounts`, `categories` тощо)

---

## ⚡ Правила економії токенів (СТРОГО ДЛЯ AI):
1. **Лаконічність:** Відповідай стисло, без вступів, вітань та підсумків.
2. **Фрагментарний код (Diffs):** Не виводь вміст всього файлу, якщо змінилися лише кілька рядків. Показуй тільки змінені блоки із зазначенням рядків або контексту.
3. **Без банальних пояснень:** Не пояснюй стандартний код, якщо про це не було окремого промпту.
4. **Не дублюй імпорти:** Уважно перевіряй існуючі імпорти перед додаванням нових.

---

## 🗺 Карта імпортів компонентів (СТРУКТУРА PROJ):

### 1. Панелі налаштувань (`app/components/`)
- `SettingsView.tsx`: Експортує `SettingsView`.
- `SettingsPanels.tsx`: Експортує `MembersPanel`, `RecategorizePanel`, `GuideFeedback`.
- `SettingsPanels2.tsx`: Експортує `AchievementsPanel`, `RulesPanel`.
    - *Примітка:* Використовує `useMemo` з `"react"`, масив `ACHIEVEMENTS` та іконки з `lucide-react` (`Plus`, `Award` тощо).

### 2. Модуль перекладів (`app/components/translate.ts`)
- Експортує: `translateEntity`, `translateAction`.
- Обов'язково імпортувати в `SettingsView.tsx` для відображення історій дій/аудіту.

### 3. Головний контейнер (`app/rivna-app.tsx`)
Приклад правильних імпортів панелей:
```tsx
import { SettingsView } from "./components/SettingsView";
import { MembersPanel, RecategorizePanel, GuideFeedback } from "./components/SettingsPanels";
import { AchievementsPanel, RulesPanel } from "./components/SettingsPanels2";