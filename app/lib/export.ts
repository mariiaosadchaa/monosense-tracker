import type { Transaction } from "../types";

function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportCsv(items: Transaction[], notify: (s: string) => void) {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
        "Назва,Категорія,Дата,Сума,Валюта,Комісія (UAH)",
        ...items.map((t) =>
            [esc(t.title), esc(t.category), esc(t.bookedAt || t.date), t.amount, t.currency || "UAH", t.feeAmount || 0].join(","),
        ),
    ].join("\n");
    download(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), "rivna-transactions.csv");
    notify("CSV-файл завантажено");
}

export function exportJson(items: Transaction[], notify: (s: string) => void) {
    const json = JSON.stringify(
        items.map((t) => ({
            title: t.title,
            category: t.category,
            date: t.bookedAt || t.date,
            amount: t.amount,
            currency: t.currency || "UAH",
            account: t.account,
            tags: t.tags,
            fee: t.feeAmount || 0,
        })),
        null,
        2,
    );
    download(new Blob([json], { type: "application/json" }), "rivna-transactions.json");
    notify("JSON-файл завантажено");
}

export async function exportExcel(items: Transaction[], notify: (s: string) => void) {
    const XLSX = await import("xlsx");
    const rows = items.map((t) => ({
        Назва: t.title,
        Категорія: t.category,
        Дата: t.bookedAt || t.date,
        Сума: t.amount,
        Валюта: t.currency || "UAH",
        "Комісія (UAH)": t.feeAmount || 0,
        Рахунок: t.account || "",
        Власник: t.owner || "",
        Теги: (t.tags || []).map((tag) => `#${tag}`).join(" "),
        Імпульсивна: t.impulse ? "Так" : "Ні",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows),
        book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Операції");
    XLSX.writeFile(book, "rivna-transactions.xlsx");
    notify("Excel-файл завантажено");
}
