import {NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {getFinanceContext} from "@/lib/supabase/context";

export const runtime="nodejs";

function parsePayoneerDate(value: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type ParsedRow = { note: string; category: string; date: string; amount: number };

function mapRows(header: unknown[], dataRows: unknown[][]): ParsedRow[] {
  const headerStrings = header.map(h => String(h ?? "").trim().toLowerCase());
  const idx = (name: string) => headerStrings.indexOf(name.toLowerCase());
  const iDate = idx("Transaction date");
  const iCredit = idx("Credit amount");
  const iDebit = idx("Debit amount");
  const iDesc = idx("Description");
  const iStatus = idx("Status");
  const isPayoneer = iDate !== -1 && iCredit !== -1 && iDebit !== -1 && iDesc !== -1;

  if (isPayoneer) {
    return dataRows
        .filter(row => iStatus === -1 || String(row[iStatus] ?? "").trim() === "Completed")
        .map(row => {
          const credit = Number(row[iCredit] ?? 0);
          const debit = Number(row[iDebit] ?? 0);
          const rawDate = row[iDate];
          const parsed = rawDate instanceof Date ? rawDate : parsePayoneerDate(String(rawDate ?? "").trim());
          return {
            note: String(row[iDesc] ?? "").slice(0, 500),
            category: "",
            date: (parsed ?? new Date()).toISOString(),
            amount: credit + debit,
          };
        })
        .filter(row => Number.isFinite(row.amount) && row.amount !== 0);
  }

  // Legacy format: note, category, date, amount (by position)
  return dataRows.filter(row => row.length >= 4).map(row => {
    const amount = Number(String(row[3]).replace(/\s/g, "").replace(",", "."));
    const parsedDate = row[2] instanceof Date ? row[2] : new Date(String(row[2]));
    return {
      note: String(row[0] || "Імпорт Excel").slice(0, 500),
      category: String(row[1] || ""),
      date: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
      amount,
    };
  });
}

export async function POST(request:Request){
  const context=await getFinanceContext();
  if(!context)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(context.role==="viewer")return NextResponse.json({error:"Роль глядача дозволяє лише перегляд"},{status:403});
  const {supabase,householdId}=context;
  const buffer=await request.arrayBuffer();
  if(buffer.byteLength>5_000_000)return NextResponse.json({error:"Файл завеликий"},{status:413});
  let allRows:unknown[][];
  try{
    const workbook=XLSX.read(buffer,{type:"array",cellDates:true}),sheet=workbook.Sheets[workbook.SheetNames[0]];
    allRows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:""});
  }catch{return NextResponse.json({error:"Не вдалося прочитати Excel-файл"},{status:400})}
  if (allRows.length < 2) return NextResponse.json({error:"Excel не містить даних"},{status:400});
  const header = allRows[0];
  const dataRows = allRows.slice(1, 2001);

  const [{data:account},{data:categories}]=await Promise.all([
    supabase.from("accounts").select("id,currency").eq("household_id",householdId).eq("archived",false).order("created_at").limit(1).single(),
    supabase.from("categories").select("id,name").eq("household_id",householdId),
  ]);
  if(!account)return NextResponse.json({error:"Спочатку створіть рахунок"},{status:422});
  const categoryIds=new Map((categories||[]).map(category=>[category.name.toLocaleLowerCase("uk-UA"),category.id]));

  const records = mapRows(header, dataRows).map(row => ({
    type: row.amount >= 0 ? "income" : "expense",
    amount: Math.abs(row.amount),
    note: row.note,
    category_id: categoryIds.get(row.category.toLocaleLowerCase("uk-UA")) || null,
    booked_at: row.date,
  })).filter(row=>Number.isFinite(row.amount)&&row.amount>0);

  if(!records.length)return NextResponse.json({error:"Excel не містить коректних операцій"},{status:400});
  const {data:imported,error}=await supabase.rpc("import_finance_transactions",{p_account_id:account.id,p_rows:records});
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({imported:Number(imported)||0});
}