import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";

function parseCsvLine(line: string) {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function parsePayoneerDate(value: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type ParsedRow = { note: string; category: string; date: string; amount: number };

function mapRows(header: string[], dataRows: string[][]): ParsedRow[] {
  const idx = (name: string) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
  const iDate = idx("Transaction date");
  const iCredit = idx("Credit amount");
  const iDebit = idx("Debit amount");
  const iDesc = idx("Description");
  const iStatus = idx("Status");
  const isPayoneer = iDate !== -1 && iCredit !== -1 && iDebit !== -1 && iDesc !== -1;

  if (isPayoneer) {
    return dataRows
        .filter(row => iStatus === -1 || (row[iStatus] || "").trim() === "Completed")
        .map(row => {
          const credit = Number(row[iCredit] || 0);
          const debit = Number(row[iDebit] || 0);
          const parsed = parsePayoneerDate((row[iDate] || "").trim());
          return {
            note: (row[iDesc] || "").slice(0, 500),
            category: "",
            date: (parsed ?? new Date()).toISOString(),
            amount: credit + debit,
          };
        })
        .filter(row => Number.isFinite(row.amount) && row.amount !== 0);
  }

  // Legacy format: note, category, date, amount (by position)
  return dataRows.filter(row => row.length >= 4).map(row => ({
    note: (row[0] || "").slice(0, 500),
    category: row[1] || "",
    date: Number.isNaN(Date.parse(row[2])) ? new Date().toISOString() : new Date(row[2]).toISOString(),
    amount: Number(String(row[3]).replace(",", ".")),
  }));
}

export async function POST(request: Request) {
  const context = await getFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.role === "viewer") return NextResponse.json({ error: "Роль глядача дозволяє лише перегляд" }, { status: 403 });
  const { supabase, householdId } = context;
  const text = await request.text();
  if (text.length > 5_000_000) return NextResponse.json({ error: "Файл завеликий" }, { status: 413 });
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "CSV не містить даних" }, { status: 400 });

  const header = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1, 2001).map(parseCsvLine);

  const [{ data: account }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id", householdId).eq("archived", false).order("created_at").limit(1).single(),
    supabase.from("categories").select("id,name").eq("household_id", householdId),
  ]);
  if (!account) return NextResponse.json({ error: "Спочатку створіть рахунок" }, { status: 422 });
  const categoryIds = new Map((categories || []).map(category => [category.name.toLocaleLowerCase("uk-UA"), category.id]));

  const rows = mapRows(header, dataRows).map(row => ({
    type: row.amount >= 0 ? "income" : "expense",
    amount: Math.abs(row.amount),
    note: row.note,
    category_id: categoryIds.get(row.category.toLocaleLowerCase("uk-UA")) || null,
    booked_at: row.date,
  })).filter(row => Number.isFinite(row.amount) && row.amount > 0);

  if (!rows.length) return NextResponse.json({ error: "CSV не містить коректних операцій" }, { status: 400 });
  const { data: imported, error } = await supabase.rpc("import_finance_transactions", { p_account_id: account.id, p_rows: rows });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: Number(imported) || 0 });
}