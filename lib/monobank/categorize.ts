type CategorizeItem = { id: string; description: string; type: "income" | "expense" };
type CategoryRow = { id: string; name: string; kind: string };

export async function categorizeMonobankItems(
    items: CategorizeItem[],
    categories: CategoryRow[]
): Promise<Record<string, string | null>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !items.length) return {};

    const expenseNames = categories.filter((c) => c.kind === "expense").map((c) => c.name);
    const incomeNames = categories.filter((c) => c.kind === "income").map((c) => c.name);

    const lines = items
        .map((item) => `${item.id} | ${item.type === "income" ? "дохід" : "витрата"} | ${item.description || "без опису"}`)
        .join("\n");

    const prompt = `Ти — досвідчений фінансовий асистент, який класифікує банківські операції українського користувача за категоріями.
Категорії витрат: ${expenseNames.join(", ") || "немає"}.
Категорії доходів: ${incomeNames.join(", ") || "немає"}.

Правила:
- Опис операції зазвичай містить назву магазину/сервісу українською, англійською або транслітом (наприклад "Sylpo", "ATB", "Rozetka", "Kyivstar", "Bolt", "Glovo", "Uklon").
- Впізнавай популярні українські бренди: продуктові мережі (АТБ, Сільпо, Novus, Фора, Ашан, Metro) → категорія продуктів; заправки (WOG, ОККО, Укрнафта, Shell) → транспорт/авто; доставка їжі (Glovo, Bolt Food, Rozetka) → залежно від назви; таксі (Uklon, Bolt, Uber) → транспорт; мобільний зв'язок (Київстар, Vodafone, lifecell) → якщо є така категорія; кур'єрська доставка (Нова пошта, Nova Poshta, NP, Укрпошта, Meest) → Особисті якщо є така категорія.
- Операції з описом що містить "виведення кешбеку", "cashback", "кешбек" → категорія Кешбек якщо є така категорія доходів.
- Операції з описом що містить "розстрочка", "щомісячний платіж", "ежемесячный платеж", "installment" → категорія Борги якщо є така категорія витрат.
- Поповнення від "Універсал Банк", "Universal Bank", "Universalbank" → категорія Зарплата якщо є така категорія доходів.
- Якщо опис починається зі слова "Скасування" (або "Скасов.", "Відмова", "Reversal", "Refund") — визнач категорію так само, як якби слова "Скасування" не було. Наприклад: "Скасування Нова пошта" → Особисті, "Скасування АТБ" → Продукти.
- Якщо в описі є ім'я людини (українське чи іноземне: ім'я + прізвище, або у форматі "Від Іван Петренко", "Іваненко О.", тощо) — це завжди Переказ якщо є така категорія. Це стосується і доходів, і витрат.
- Операції що містять "Payoneer", "PayPal", "Wise", "SWIFT" в описі → категорія Переказ.
- Якщо назва не впізнається напряму, орієнтуйся на загальний сенс опису.
- Обов'язково обирай категорію СУВОРО зі списку вище для КОЖНОЇ операції, орієнтуючись на тип бізнесу компанії з опису. Наприклад: ігрові платформи (Steam, PlayStation, Xbox, Epic Games) → категорія розваг/ігор, якщо є; маркетплейси (Temu, AliExpress, Amazon, Rozetka, Shein) → категорія покупок/шопінгу, якщо є; платіжні сервіси (Portmone, LiqPay, Easypay) → категорія комунальних платежів або найближча за змістом.
- НІКОЛИ не повертай null, якщо у списку вище є хоча б одна категорія відповідного типу (дохід/витрата) — завжди обирай НАЙБЛИЖЧУ за змістом наявну категорію, навіть якщо збіг не ідеальний.

Для кожної операції нижче (формат: ID | тип | опис) визнач найбільш підходящу категорію СУВОРО зі списку відповідного типу вище, або null.
Операції:
${lines}
Поверни ЛИШЕ JSON без пояснень у форматі {"ID1":"назва категорії або null","ID2":"..."}.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0, responseMimeType: "application/json" },
                }),
            }
        );
        if (!response.ok) {
            console.error("Gemini categorize error:", response.status, await response.text());
            return {};
        }
        const data = await response.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const result: Record<string, string | null> = {};
        for (const item of items) {
            const value = parsed[item.id];
            result[item.id] = typeof value === "string" && value.toLowerCase() !== "null" ? value : null;
        }
        return result;
    } catch {
        return {};
    }
}
