import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";

// Перевіряє чи назва рахунку зустрічається в описі (враховує відмінки української мови)
function accountMatchesNote(accountName: string, note: string): boolean {
    const noteLower = note.toLowerCase();
    const nameLower = accountName.toLowerCase().trim();
    if (nameLower.length < 3) return false;
    if (noteLower.includes(nameLower)) return true;

    // Стеммінг: перші 4 символи кожного слова назви мають з'явитися в описі
    const nameWords = nameLower.split(/\s+/).filter((w) => w.length >= 4);
    if (!nameWords.length) return false;
    return nameWords.every((word) => {
        const stem = word.slice(0, 4);
        return noteLower.split(/\s+/).some((noteWord) => noteWord.startsWith(stem));
    });
}

// Перевіряє чи опис схожий на P2P-переказ від людини (Від: Ім'я Прізвище)
function looksLikePersonTransfer(note: string): boolean {
    const n = note.trim();
    // Виключаємо банки/установи — навіть якщо формат схожий на "Від Ім'я Прізвище"
    if (/банк|bank|\bтов\b|\bпат\b|\bват\b|\bат\b|\bфоп\b|\bпп\b|\bllc\b|\bltd\b|\binc\b|компані|corp/i.test(n)) return false;
    // "Від: Ім'я Прізвище" або "Від Ім'я Прізвище"
    if (/^від[:\s]/i.test(n)) return true;
    // "From Name Surname" pattern (2+ capitalized words after From)
    if (/^from\s+[A-ZА-ЯІЇЄ][a-zа-яіїє]+\s+[A-ZА-ЯІЇЄ]/i.test(n)) return true;
    // Просто два слова з великої (ім'я + прізвище), без іншого тексту
    if (/^[А-ЯІЇЄ][а-яіїє\-']+\s+[А-ЯІЇЄ][а-яіїє\-']+$/.test(n)) return true;
    // Популярні українські та англійські імена (одне слово, з великої літери)
    if (/^(Саша|Діма|Яна|Оля|Маша|Наталя|Іван|Петро|Олег|Андрій|Сергій|Віктор|Юлія|Олена|Тетяна|Марина|Оксана|Ірина|Анна|Софія|Максим|Артем|Дмитро|Олександр|Євген|Віталій|Владислав|Ігор|Микола|Володимир|Роман|Богдан|Вадим|Вячеслав|Денис|Олексій|Олександр|Анастасія|Вікторія|Дарина|Злата|Катерина|Ксенія|Марія|Мирослава|Надія|Поліна|Соломія|Уляна|Христина|Ярослава|John|Jane|Mike|Anna|Mary|David|Sarah|Chris|Emily|Alex|Sophia|Liam|Olivia|Noah|Ava|Isabella|Jackson|Lucas|Elijah|Aiden|Mia|Harper|Evelyn|Abigail|Ella|Scarlett|Grace|Chloe|Victoria|Madison|Elizabeth|Camila|Penelope|Layla|Riley|Zoey|Nora|Lily|Eleanor|Hannah|Lillian|Addison|Aubrey|Ellie|Stella|Natalie|Zoe|Leah|Hazel|Violet|Aurora|Savannah|Audrey|Brooklyn|Bella|Claire|Skylar|Lucy|Paisley|Everly|Amelia|Sofia|Aria|Charlotte|Willow|Luna|Gianna|Elena|Sofia|Ivy|Iris|Ruby|Eva|Alexandra|Selena|Maria|Valentina|Natalia)$/i.test(n)) return true;
    return false;
}
// Перевіряє чи опис схожий на продуктовий магазин
function looksLikeGroceryStore(note: string): boolean {
    const n = note.toLowerCase();
    return /атб|сільпо|новус|варус|ашан|billa|фора|metro|новус|коло|аврора|близенько|таврія|делікат|велика кишеня|наша ряба|продукт|супермаркет|grocery|маркет/.test(n);
}
// Операції з банками Монобанку (накопичення) — завжди Переказ
function looksLikeJar(note: string): boolean {
    return /(зняття\s+(з\s+)?банки|виплата\s+банки|поповнення\s+банки|на\s+банку|з\s+банки)/i.test(note);
}
// Універсал Банк — завжди зарплата
function looksLikeSalary(note: string): boolean {
    return /універсал\s*банк|universal\s*bank|universalbank/i.test(note);
}
// Перевіряє чи це покупка в розстрочку через Мономаркет/Монобазар (завжди Борги)
function looksLikeInstallment(note: string): boolean {
    const n = note.toLowerCase();
    return /мономаркет|монобазар|monomarket|monobazar|розстрочк|оплата частинами|купівля частинами|покупка частинами/.test(n);
}

export async function POST() {
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = context.user.id;

    const admin = createAdminClient();

    const [{ data: categories }, { data: allAccounts }, { data: existingTransfers }, { data: learnedRules }] =
        await Promise.all([
            admin.from("categories").select("id,name,kind").eq("household_id", context.householdId),
            admin.from("accounts").select("id,name,currency").eq("household_id", context.householdId).eq("archived", false),
            admin.from("transfers").select("from_transaction_id,to_transaction_id").eq("household_id", context.householdId),
            admin.from("transaction_rules")
                .select("condition_value,action_category_id")
                .eq("household_id", context.householdId)
                .eq("condition_type", "note_contains")
                .eq("active", true),
        ]);

    const transferTxIds = new Set<string>(
        (existingTransfers || []).flatMap((t) => [t.from_transaction_id, t.to_transaction_id])
    );

    // Всі некатегоризовані income/expense транзакції господарства
// Всі некатегоризовані income/expense транзакції господарства
    const { data: txRows } = await admin
        .from("transactions")
        .select("id,type,amount,currency,note,category_id,account_id,booked_at")
        .eq("household_id", context.householdId)
        .in("type", ["income", "expense"])
        .is("category_id", null)
        .order("booked_at", { ascending: false })
        .limit(500);

    let updated = 0;
    let converted = 0;
    const transferCategory = categories?.find(c => c.name === "Переказ" && c.kind === "expense");
    const transferCategoryId = transferCategory?.id;
    const groceryCategory = categories?.find(c => c.name === "Продукти" && c.kind === "expense");
    const groceryCategoryId = groceryCategory?.id;
    const transferIncomeCategoryId = categories?.find(c => c.name === "Переказ" && c.kind === "income")?.id;
    const transferFor = (type: string) => (type === "income" ? transferIncomeCategoryId || transferCategoryId : transferCategoryId);
    const debtCategory = categories?.find(c => c.name === "Борги" && c.kind === "expense");
    const debtCategoryId = debtCategory?.id;
    const salaryCategory = categories?.find(c => c.name === "Зарплата" && c.kind === "income")
        || categories?.find(c => c.kind === "income" && /^зарплата/i.test(c.name));
    const salaryCategoryId = salaryCategory?.id;

// Pass 0: жорсткі правила — завжди перекривають будь-яку категорію (ручну чи від ШІ)
    if (transferCategoryId || groceryCategoryId || debtCategoryId || salaryCategoryId) {
        const { data: allTx } = await admin
            .from("transactions")
            .select("id,note,category_id,type")
            .eq("household_id", context.householdId)
            .in("type", ["income", "expense"])
            .order("booked_at", { ascending: false })
            .limit(2000);
        for (const tx of allTx || []) {
            const note = tx.note || "";
            if (salaryCategoryId && tx.type === "income" && looksLikeSalary(note)) {
                if (tx.category_id !== salaryCategoryId) {
                    await admin.from("transactions").update({ category_id: salaryCategoryId }).eq("id", tx.id);
                    updated++;
                }
            } else if (transferFor(tx.type) && (looksLikeJar(note) || looksLikePersonTransfer(note))) {
                if (tx.category_id !== transferFor(tx.type)) {
                    await admin.from("transactions").update({ category_id: transferFor(tx.type) }).eq("id", tx.id);
                    updated++;
                }
            } else if (groceryCategoryId && looksLikeGroceryStore(note) && tx.category_id !== groceryCategoryId) {
                await admin.from("transactions").update({ category_id: groceryCategoryId }).eq("id", tx.id);
                updated++;
            } else if (debtCategoryId && looksLikeInstallment(note) && tx.category_id !== debtCategoryId) {
                await admin.from("transactions").update({ category_id: debtCategoryId }).eq("id", tx.id);
                updated++;
            }
        }
    }

    if (!txRows?.length) return NextResponse.json({ updated, converted });

    // Pass 1: трансфери за назвою рахунку або ім'ям людини
    for (const tx of txRows) {
        if (transferTxIds.has(tx.id)) continue;
        if (tx.type !== "income") continue;

        const note = tx.note || "";

        // Перевіряємо збіг з назвою рахунку (з урахуванням відмінків)
        const matchAccount = (allAccounts || []).find(
            (a) => a.id !== tx.account_id && accountMatchesNote(a.name || "", note)
        );

        if (matchAccount) {
            const { data: fromTx, error: fromErr } = await admin.rpc("create_finance_transaction_admin", {
                p_user_id: userId,
                p_account_id: matchAccount.id,
                p_category_id: transferCategoryId || null,
                p_type: "expense",
                p_amount: tx.amount,
                p_currency: matchAccount.currency || tx.currency,
                p_note: note || "Переказ",
                p_booked_at: tx.booked_at,
                p_is_impulsive: false,
                p_split_total: null,
                p_personal_share: null,
            });
            if (!fromErr && fromTx) {
                await admin.from("transactions").update({ type: "transfer", category_id: transferCategoryId }).eq("id", tx.id);
                await admin.from("transactions").update({ type: "transfer", category_id: transferCategoryId }).eq("id", fromTx.id);
                await admin.from("transfers").insert({
                    household_id: context.householdId,
                    from_transaction_id: fromTx.id,
                    to_transaction_id: tx.id,
                    fee_amount: 0,
                    fee_currency: null,
                    booked_at: tx.booked_at,
                });
                transferTxIds.add(tx.id);
                transferTxIds.add(fromTx.id);
                converted++;
                continue;
            }
        }

        // Переказ від людини (Від: Ім'я Прізвище)
        if (transferCategoryId && looksLikePersonTransfer(note)) {
            await admin.from("transactions").update({ type: "transfer", category_id: transferCategoryId }).eq("id", tx.id);
            transferTxIds.add(tx.id);
            converted++;
        }
    }

    // Валідні вивчені правила (ігноруємо биті — де категорія видалена)
    const validRules = (learnedRules || []).filter((r) =>
        r.action_category_id && (categories || []).some((c) => c.id === r.action_category_id)
    );

    const categorizedIds = new Set<string>();

    // Pass 2: вивчені правила (note_contains)
    const stillNeedsCategory = txRows.filter(
        (tx) => !tx.category_id && !transferTxIds.has(tx.id)
    );
    for (const tx of stillNeedsCategory) {
        const desc = (tx.note || "").toLowerCase();
        const rule = validRules.find((r) =>
            desc.replace(/\s+/g, " ").includes(String(r.condition_value || "").toLowerCase().replace(/\s+/g, " ").trim())
        );
        if (rule?.action_category_id) {
            await admin.from("transactions").update({ category_id: rule.action_category_id }).eq("id", tx.id);
            categorizedIds.add(tx.id as string);
            updated++;
        }
    }

    // Pass 3: Gemini для решти
    const forGemini = txRows.filter(
        (tx) => !tx.category_id && !transferTxIds.has(tx.id) && !categorizedIds.has(tx.id as string)
    );

    if (forGemini.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < forGemini.length; i += chunkSize) {
            const chunk = forGemini.slice(i, i + chunkSize);
            const categoryNameById = await categorizeMonobankItems(
                chunk.map((tx) => ({
                    id: tx.id as string,
                    description: tx.note || "",
                    type: tx.type as "income" | "expense",
                })),
                categories || []
            );
            for (const tx of chunk) {
                const categoryName = categoryNameById[tx.id as string];
                if (!categoryName) {
                    console.log("Recategorize: Gemini did not return category for", tx.note);
                    continue;
                }
                const category = (categories || []).find(
                    (c) => c.kind === tx.type && c.name.toLowerCase() === categoryName.toLowerCase()
                );
                if (!category) {
                    console.log("Recategorize: category name mismatch", tx.note, "-> Gemini said:", categoryName, "type:", tx.type);
                    continue;
                }
                await admin.from("transactions").update({ category_id: category.id }).eq("id", tx.id);
                categorizedIds.add(tx.id as string);
                updated++;
            }
        }
    }

    return NextResponse.json({ updated, converted });
}