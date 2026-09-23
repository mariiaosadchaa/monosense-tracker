export const formatMoney = (value: number) =>
    new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 }).format(Math.abs(value));

export const currencySymbol = (currency: string) =>
    (({ UAH: "₴", USD: "$", EUR: "€", GBP: "£", PLN: "zł" }) as Record<string, string>)[currency] ||
    currency;

export const conversionRate = (
    currency: string,
    rates: { currency: string; rate: number }[],
    customRates: { currency: string; rate: number }[],
) =>
    currency === "UAH"
        ? 1
        : customRates.find((rate) => rate.currency === currency)?.rate ||
        rates.find((rate) => rate.currency === currency)?.rate ||
        1;

export function crossRate(
    from: string,
    to: string,
    rates: { currency: string; rate: number }[],
    customRates: { currency: string; rate: number }[],
) {
    const toUah = (currency: string) =>
        currency === "UAH"
            ? 1
            : customRates.find((r) => r.currency === currency)?.rate ||
            rates.find((r) => r.currency === currency)?.rate ||
            1;
    return toUah(from) / toUah(to);
}

export function toDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}