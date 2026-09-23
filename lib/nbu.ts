// Курс НБУ на конкретну дату + розрахунок комісії (різниці з курсом НБУ) в гривнях.
const cache = new Map<string, number | null>();

const ISO_CURRENCIES: Record<number, string> = {
    980: "UAH", 840: "USD", 978: "EUR", 985: "PLN", 826: "GBP", 756: "CHF", 124: "CAD",
    203: "CZK", 348: "HUF", 949: "TRY", 36: "AUD", 392: "JPY", 156: "CNY", 752: "SEK",
    578: "NOK", 208: "DKK", 946: "RON", 975: "BGN", 191: "HRK", 933: "BYN", 643: "RUB",
};

export function currencyFromIso(code: number | undefined | null): string | null {
    if (!code) return null;
    return ISO_CURRENCIES[code] || null;
}

/** "YYYYMMDD" за київським часом */
export function kyivDateKey(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d); // 2026-06-24
    return parts.replace(/-/g, "");
}

/** Скільки гривень коштує 1 одиниця валюти за курсом НБУ на дату (UAH → 1). null — якщо не вдалося отримати. */
export async function nbuRate(currency: string, date: Date | string): Promise<number | null> {
    const cc = String(currency || "").toUpperCase();
    if (!cc || cc === "UAH") return 1;
    const key = `${cc}|${kyivDateKey(date)}`;
    if (cache.has(key)) return cache.get(key)!;
    try {
        const res = await fetch(
            `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${cc}&date=${key.split("|")[1]}&json`,
            { headers: { Accept: "application/json" }, next: { revalidate: 60 * 60 * 24 } } as RequestInit
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { rate?: number }[];
        const rate = Number(data?.[0]?.rate) || null;
        cache.set(key, rate);
        return rate;
    } catch {
        return null;
    }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Комісія в UAH = вартість відправленого за НБУ − вартість отриманого за НБУ (на дату операції).
 * extraFeeUah — додаткова явна комісія банку (вже в UAH).
 * Повертає null, якщо курс недоступний.
 */
export async function fxFeeUah(params: {
    sentAmount: number; sentCurrency: string;
    receivedAmount: number; receivedCurrency: string;
    date: Date | string;
}): Promise<number | null> {
    const { sentAmount, sentCurrency, receivedAmount, receivedCurrency, date } = params;
    if (!(sentAmount > 0) || !(receivedAmount > 0)) return null;
    if (String(sentCurrency).toUpperCase() === String(receivedCurrency).toUpperCase()) {
        return round2(Math.max(0, sentAmount - receivedAmount) * ((await nbuRate(sentCurrency, date)) ?? 0)) || 0;
    }
    const [rs, rr] = await Promise.all([nbuRate(sentCurrency, date), nbuRate(receivedCurrency, date)]);
    if (!rs || !rr) return null;
    return round2(Math.max(0, sentAmount * rs - receivedAmount * rr));
}
