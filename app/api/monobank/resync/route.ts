import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";

type MonoItem = { id: string; time: number; description?: string; amount: number; balance: number };
type FlatItem = { monoAccountId: string; appAccountId: string; currency: string; item: MonoItem };

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body.force);
    const days = Math.min(365, Math.max(1, Number(body.days) || 31));
    const context = await getFinanceContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: connection } = await admin
        .from("monobank_connections")
        .select("token,connected_by")
        .eq("household_id", context.householdId)
        .maybeSingle();
    if (!connection?.token) {
        return NextResponse.json(
            { error: "Monobank ще не підключено — спочатку встав токен вище" },
            { status: 400 }
        );
    }

    const { data: links } = await admin
        .from("monobank_account_links")
        .select("mono_account_id,app_account_id")
        .eq("household_id", context.householdId);
    if (!links?.length) {
        return NextResponse.json({ error: "Немає прив'язаних карток" }, { status: 400 });
    }

    const { data: categories } = await admin
        .from("categories")
        .select("id,name,kind")
        .eq("household_id", context.householdId);
    const debtCategoryId = (categories || []).find((c) => c.name === "Борги" && c.kind === "expense")?.id || null;

    const { data: installmentRulesRaw } = await admin
        .from("recurring_rules")
        .select("id,account_id,amount,debt_id,active,created_at,debts(person)")
        .eq("household_id", context.householdId)
        .not("debt_id", "is", null)
        .eq("active", true);
    const installmentRules = (installmentRulesRaw || []).map((rule) => ({
        ...rule,
        merchantName: String((rule.debts as { person?: string } | null)?.person || "").toLowerCase(),
        createdAtSeconds: Math.floor(new Date(rule.created_at).getTime() / 1000),
    }));

    const { data: accountRows } = await admin
        .from("accounts")
        .select("id,currency,credit_limit,balance")
        .in("id", links.map((l) => l.app_account_id));
    const accountById = new Map((accountRows || []).map((a) => [a.id, a]));

    const debug: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[] = [];
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 60 * 60;

    const flatItems: FlatItem[] = [];

    for (const link of links) {
        const account = accountById.get(link.app_account_id);
        if (!account) {
            debug.push({ monoAccountId: link.mono_account_id, error: "рахунок у застосунку не знайдено" });
            continue;
        }

        const items: MonoItem[] = [];
        const chunkSeconds = 31 * 24 * 60 * 60;
        let chunkTo = to;
        let chunkError: string | null = null;
        let lastStatus = 200;
        while (chunkTo > from) {
            const chunkFrom = Math.max(from, chunkTo - chunkSeconds);
            let chunkResponse: Response;
            try {
                chunkResponse = await fetch(
                    `https://api.monobank.ua/personal/statement/${link.mono_account_id}/${chunkFrom}/${chunkTo}`,
                    { headers: { "X-Token": connection.token } }
                );
            } catch {
                chunkError = "немає з'єднання з Monobank";
                break;
            }
            lastStatus = chunkResponse.status;
            if (!chunkResponse.ok) {
                const text = await chunkResponse.text().catch(() => "");
                chunkError = text.slice(0, 150);
                break;
            }
            const chunkItems: MonoItem[] = await chunkResponse.json();
            items.push(...chunkItems);
            chunkTo = chunkFrom - 1;
            if (chunkTo > from) await new Promise((resolve) => setTimeout(resolve, 650));
        }

        if (chunkError) {
            debug.push({ monoAccountId: link.mono_account_id, status: lastStatus, error: chunkError });
            continue;
        }

        debug.push({
            monoAccountId: link.mono_account_id,
            status: lastStatus,
            itemsFound: items.length,
        });
        if (items.length > 0) {
            const sortedByTime = [...items].sort((a, b) => b.time - a.time);
            const latestItem = sortedByTime[0];
            const monoBalance = latestItem.balance / 100;

            if (Number(account.credit_limit) > 0) {
                const monoAvailable = monoBalance;
                const appAvailable = Number(account.balance) + Number(account.credit_limit);
                const diff = Math.round((monoAvailable - appAvailable) * 100) / 100;

                if (Math.abs(diff) >= 1) {
                    const { data: existingChange } = await admin
                        .from("credit_limit_changes")
                        .select("id")
                        .eq("account_id", link.app_account_id)
                        .eq("new_limit", Number(account.credit_limit) + diff)
                        .maybeSingle();

                    if (!existingChange) {
                        const newLimit = Math.max(0, Number(account.credit_limit) + diff);
                        await admin.from("credit_limit_changes").insert({
                            household_id: context.householdId,
                            account_id: link.app_account_id,
                            old_limit: account.credit_limit,
                            new_limit: newLimit,
                            changed_at: new Date(latestItem.time * 1000).toISOString(),
                            created_by: connection.connected_by,
                        });
                        await admin.from("accounts").update({ credit_limit: newLimit }).eq("id", link.app_account_id);
                        account.credit_limit = newLimit;
                        debug.push({
                            monoAccountId: link.mono_account_id,
                            error: `Виявлено зміну кредитного ліміту: ${diff > 0 ? "+" : ""}${diff} → новий ліміт ${newLimit}`,
                        });
                    }
                }
            }

            const expectedBalance = monoBalance - Number(account.credit_limit);
            const balanceDiff = Math.round((expectedBalance -

        for (const item of items) {
            const { data: alreadySynced } = await admin
                .from("monobank_synced_items")
                .select("statement_item_id")
                .eq("statement_item_id", item.id)
                .maybeSingle();
            if (alreadySynced && !force) continue;

            flatItems.push({ monoAccountId: link.mono_account_id, appAccountId: link.app_account_id, currency: account.currency, item });
        }
    }

    const used = new Set<string>();
    let imported = 0;

    // 1. Шукаємо пари "переказ між своїми картками"
    for (const outgoing of flatItems) {
        if (used.has(outgoing.item.id)) continue;
        if (outgoing.item.amount >= 0) continue;

        const match = flatItems.find(
            (candidate) =>
                !used.has(candidate.item.id) &&
                candidate.item.id !== outgoing.item.id &&
                candidate.appAccountId !== outgoing.appAccountId &&
                candidate.currency === outgoing.currency &&
                candidate.item.amount === Math.abs(outgoing.item.amount) &&
                Math.abs(candidate.item.time - outgoing.item.time) <= 300
        );
        if (!match) continue;

        used.add(outgoing.item.id);
        used.add(match.item.id);

        const amount = Math.abs(outgoing.item.amount) / 100;
        const bookedAt = new Date(outgoing.item.time * 1000).toISOString();

        const { data: fromTx, error: fromError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: outgoing.appAccountId,
            p_category_id: null,
            p_type: "transfer",
            p_amount: amount,
            p_currency: outgoing.currency,
            p_note: "Переказ",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (fromError) {
            debug.push({ monoAccountId: outgoing.monoAccountId, error: `RPC (переказ, звідки): ${fromError.message}` });
            continue;
        }

        const { data: toTx, error: toError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: match.appAccountId,
            p_category_id: null,
            p_type: "income",
            p_amount: amount,
            p_currency: match.currency,
            p_note: "Поповнення переказом",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (toError) {
            debug.push({ monoAccountId: match.monoAccountId, error: `RPC (переказ, куди): ${toError.message}` });
            continue;
        }

        await admin.from("transactions").update({ type: "transfer" }).eq("id", toTx.id);
        await admin.from("transfers").insert({
            household_id: context.householdId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        await admin.from("monobank_synced_items").insert([
            { statement_item_id: outgoing.item.id, transaction_id: fromTx.id },
            { statement_item_id: match.item.id, transaction_id: toTx.id },
        ]);

        imported += 2;
    }
    // 1b. Шукаємо пари "обмін валют між своїми картками" (різні суми, різні валюти)
    for (const outgoing of flatItems) {
        if (used.has(outgoing.item.id)) continue;
        if (outgoing.item.amount >= 0) continue;

        const match = flatItems.find(
            (candidate) =>
                !used.has(candidate.item.id) &&
                candidate.item.id !== outgoing.item.id &&
                candidate.appAccountId !== outgoing.appAccountId &&
                candidate.currency !== outgoing.currency &&
                candidate.item.amount > 0 &&
                Math.abs(candidate.item.time - outgoing.item.time) <= 300
        );
        if (!match) continue;

        used.add(outgoing.item.id);
        used.add(match.item.id);

        const sentAmount = Math.abs(outgoing.item.amount) / 100;
        const receivedAmount = match.item.amount / 100;
        const exchangeRate = sentAmount > 0 ? Math.round((receivedAmount / sentAmount) * 1000000) / 1000000 : 1;
        const bookedAt = new Date(outgoing.item.time * 1000).toISOString();

        const { data: fromTx, error: fromError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: outgoing.appAccountId,
            p_category_id: null,
            p_type: "exchange",
            p_amount: sentAmount,
            p_currency: outgoing.currency,
            p_note: "Обмін валют",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (fromError) {
            debug.push({ monoAccountId: outgoing.monoAccountId, error: `RPC (обмін, звідки): ${fromError.message}` });
            continue;
        }

        const { data: toTx, error: toError } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: match.appAccountId,
            p_category_id: null,
            p_type: "income",
            p_amount: receivedAmount,
            p_currency: match.currency,
            p_note: "Поповнення обміном",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (toError) {
            debug.push({ monoAccountId: match.monoAccountId, error: `RPC (обмін, куди): ${toError.message}` });
            continue;
        }

        await admin.from("transactions").update({ type: "exchange" }).eq("id", toTx.id);
        await admin.from("transfers").insert({
            household_id: context.householdId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            sent_amount: sentAmount,
            received_amount: receivedAmount,
            exchange_rate: exchangeRate,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        await admin.from("monobank_synced_items").insert([
            { statement_item_id: outgoing.item.id, transaction_id: fromTx.id },
            { statement_item_id: match.item.id, transaction_id: toTx.id },
        ]);

        imported += 2;
    }

    // 2. Решта — звичайні операції з підбором категорії
    const remaining = flatItems.filter((f) => !used.has(f.item.id));
    // 2. Решта — звичайні операції з підбором категорії
    const remaining = flatItems.filter((f) => !used.has(f.item.id));
    const byAccount = new Map<string, FlatItem[]>();
    for (const f of remaining) {
        if (!byAccount.has(f.appAccountId)) byAccount.set(f.appAccountId, []);
        byAccount.get(f.appAccountId)!.push(f);
    }

    for (const [appAccountId, items] of byAccount) {
        const account = accountById.get(appAccountId)!;
        const categoryNameByItemId = await categorizeMonobankItems(
            items.map((f) => ({
                id: f.item.id,
                description: f.item.description || "",
                type: f.item.amount < 0 ? "expense" : "income",
            })),
            categories || []
        );

        for (const f of items) {
            const amount = f.item.amount / 100;
            const type = amount < 0 ? "expense" : "income";

            const description = (f.item.description || "").toLowerCase();
            const matchingInstallment = (installmentRules || []).find((rule) => {
                if (rule.account_id !== appAccountId || type !== "expense") return false;
                if (f.item.time < rule.createdAtSeconds) return false;
                const nameMatches = rule.merchantName.length >= 3 && description.includes(rule.merchantName);
                const amountMatches = Math.abs(Number(rule.amount) - Math.abs(amount)) < 1;
                return nameMatches || (amountMatches && !installmentRules.some((other) => other.id !== rule.id && other.account_id === appAccountId && Math.abs(Number(other.amount) - Math.abs(amount)) < 1));
            });

            if (matchingInstallment) {
                const { data: transaction, error: txError } = await admin.rpc("create_finance_transaction_admin", {
                    p_user_id: connection.connected_by,
                    p_account_id: account.id,
                    p_category_id: debtCategoryId,
                    p_type: "expense",
                    p_amount: Math.abs(amount),
                    p_currency: account.currency,
                    p_note: `Погашення розстрочки: ${matchingInstallment.merchantName || "автовизначено"}`,
                    p_booked_at: new Date(f.item.time * 1000).toISOString(),
                    p_is_impulsive: false,
                    p_split_total: null,
                    p_personal_share: null,
                });

                if (!txError) {
                    const { data: debtRow } = await admin
                        .from("debts")
                        .select("amount")
                        .eq("id", matchingInstallment.debt_id)
                        .maybeSingle();
                    if (debtRow) {
                        const newAmount = Math.max(0, Number(debtRow.amount) - Math.abs(amount));
                        await admin
                            .from("debts")
                            .update({ amount: newAmount, settled: newAmount <= 0 })
                            .eq("id", matchingInstallment.debt_id);
                    }
                    await admin.from("monobank_synced_items").insert({
                        statement_item_id: f.item.id,
                        transaction_id: transaction?.id || null,
                    });
                    imported++;
                    continue;
                }
            }

            const categoryName = categoryNameByItemId[f.item.id];
            const category = (categories || []).find(
                (c) => c.kind === type && c.name.toLowerCase() === (categoryName || "").toLowerCase()
            );

            const { data: transaction, error: txError } = await admin.rpc("create_finance_transaction_admin", {
                p_user_id: connection.connected_by,
                p_account_id: account.id,
                p_category_id: category?.id || null,
                p_type: type,
                p_amount: Math.abs(amount),
                p_currency: account.currency,
                p_note: f.item.description || "Monobank",
                p_booked_at: new Date(f.item.time * 1000).toISOString(),
                p_is_impulsive: false,
                p_split_total: null,
                p_personal_share: null,
            });

            if (txError) {
                debug.push({ monoAccountId: f.monoAccountId, error: `RPC: ${txError.message}` });
                continue;
            }

            await admin.from("monobank_synced_items").insert({
                statement_item_id: f.item.id,
                transaction_id: transaction?.id || null,
            });

            imported++;
        }
    }

    if (imported > 0) {
        await admin
            .from("monobank_connections")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("household_id", context.householdId);
    }

    return NextResponse.json({ imported, debug });
}