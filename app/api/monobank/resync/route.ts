import { NextResponse } from "next/server";
import { getFinanceContext } from "@/lib/supabase/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeMonobankItems } from "@/lib/monobank/categorize";
import { mccCategoryCandidates } from "@/lib/monobank/mcc";
import { monoItemFee } from "@/lib/monobank/fee";
import { nbuRate } from "@/lib/nbu";

type MonoItem = { id: string; time: number; description?: string; amount: number; balance: number; mcc?: number; operationAmount?: number; currencyCode?: number; commissionRate?: number };
type FlatItem = { monoAccountId: string; appAccountId: string; currency: string; item: MonoItem };

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body.force);
    const days = Math.min(365, Math.max(1, Number(body.days) || 31));
    // Оновлення лише однієї картки (monoAccountId) — без 61-секундних пауз між картками
    const onlyMonoAccountId = body.monoAccountId ? String(body.monoAccountId) : null;
    // Довантаження після звірки: не «склеювати» з наявними операціями як дублікат
    const noDedupe = Boolean(body.noDedupe);
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
    const transferCategoryId = (categories || []).find((c) => c.name === "Переказ" && c.kind === "expense")?.id || null;
    const { data: learnedRules } = await admin
        .from("transaction_rules")
        .select("condition_value,action_category_id")
        .eq("household_id", context.householdId)
        .eq("condition_type", "note_contains")
        .eq("active", true);

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

    const { data: allHouseholdAccounts } = await admin
        .from("accounts")
        .select("id,name,currency")
        .eq("household_id", context.householdId)
        .eq("archived", false); // видалені (приховані) рахунки не беремо для зв'язування переказів

    const debug: { monoAccountId: string; status?: number; error?: string; itemsFound?: number }[] = [];
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 60 * 60;

    const flatItems: FlatItem[] = [];

    const activeLinks = onlyMonoAccountId ? links.filter((l) => l.mono_account_id === onlyMonoAccountId) : links;
    if (!activeLinks.length) {
        return NextResponse.json({ error: "Цю картку не прив'язано" }, { status: 400 });
    }
    for (const link of activeLinks) {
        if (activeLinks.indexOf(link) > 0) await new Promise((resolve) => setTimeout(resolve, 61000));
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
            if (chunkTo > from) await new Promise((resolve) => setTimeout(resolve, 61000));
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
                        const newLimit = Math.round(Math.max(0, Number(account.credit_limit) + diff) * 100) / 100;
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

            for (const item of items) {
                const { data: claimed } = await admin
                    .from("monobank_synced_items")
                    .upsert({ statement_item_id: item.id, transaction_id: null }, { onConflict: "statement_item_id", ignoreDuplicates: true })
                    .select("statement_item_id");
                if (!claimed?.length && !force) continue; // вже оброблено або обробляється паралельно

                const itemDate = new Date(item.time * 1000);
                const dayStart = new Date(itemDate);
                dayStart.setUTCHours(0, 0, 0, 0);
                const dayEnd = new Date(itemDate);
                dayEnd.setUTCHours(23, 59, 59, 999);

                const { data: matchingAutoDebit } = await admin
                    .from("transactions")
                    .select("id")
                    .eq("account_id", link.app_account_id)
                    .eq("amount", Math.abs(item.amount) / 100)
                    .eq("type", item.amount < 0 ? "expense" : "income")
                    .not("id", "in", `(select transaction_id from monobank_synced_items)`)
                    .gte("booked_at", dayStart.toISOString())
                    .lte("booked_at", dayEnd.toISOString())
                    .ilike("note", "%розстрочк%")
                    .maybeSingle();

                if (matchingAutoDebit && !noDedupe) {
                    await admin.from("monobank_synced_items")
                        .update({ transaction_id: matchingAutoDebit.id })
                        .eq("statement_item_id", item.id);
                    debug.push({
                        monoAccountId: link.mono_account_id,
                        error: `Пропущено дублікат: вже списано автоматично за розстрочкою (транзакція ${matchingAutoDebit.id})`,
                    });
                    continue;
                }

                flatItems.push({ monoAccountId: link.mono_account_id, appAccountId: link.app_account_id, currency: account.currency, item });
            }
        }
    }

    const used = new Set<string>();
    let imported = 0;

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
                Math.abs(candidate.item.time - outgoing.item.time) <= 5
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
            p_note: outgoing.item.description || "Переказ",
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
            p_note: match.item.description || "Поповнення переказом",
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
        const { error: transferInsertError } = await admin.from("transfers").insert({
            household_id: context.householdId,
            from_account_id: outgoing.appAccountId,
            to_account_id: match.appAccountId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            sent_amount: amount,
            received_amount: amount,
            exchange_rate: 1,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        if (transferInsertError) {
            debug.push({ monoAccountId: outgoing.monoAccountId, error: `Не вдалося зв'язати переказ: ${transferInsertError.message}` });
        }
        await admin.from("monobank_synced_items").update({ transaction_id: fromTx.id }).eq("statement_item_id", outgoing.item.id);
        await admin.from("monobank_synced_items").update({ transaction_id: toTx.id }).eq("statement_item_id", match.item.id);

        imported += 2;
    }

    for (const outgoing of flatItems) {
        if (used.has(outgoing.item.id)) continue;
        if (outgoing.item.amount >= 0) continue;

        // Кандидати на другу ногу обміну: інша валюта, зарахування, в межах 5 хв.
        // Обираємо того, чия вартість за курсом НБУ найближча до відправленого
        // (відсікає абсурдні пари типу 5225 ₴ ↔ $150).
        const exchangeCandidates = flatItems.filter(
            (candidate) =>
                !used.has(candidate.item.id) &&
                candidate.item.id !== outgoing.item.id &&
                candidate.appAccountId !== outgoing.appAccountId &&
                candidate.currency !== outgoing.currency &&
                candidate.item.amount > 0 &&
                Math.abs(candidate.item.time - outgoing.item.time) <= 300
        );
        if (!exchangeCandidates.length) continue;
        const outDate = new Date(outgoing.item.time * 1000);
        const outRate = await nbuRate(outgoing.currency, outDate);
        const sentUah = outRate ? (Math.abs(outgoing.item.amount) / 100) * outRate : null;
        let match: FlatItem | undefined;
        let bestRatioDiff = Infinity;
        for (const candidate of exchangeCandidates) {
            const candRate = await nbuRate(candidate.currency, outDate);
            if (!sentUah || !candRate) {
                // без курсу — беремо найближчого за часом, як раніше
                if (!match) match = candidate;
                continue;
            }
            const ratio = ((candidate.item.amount / 100) * candRate) / sentUah; // ~0.9–1.0 для реального обміну
            if (ratio < 0.8 || ratio > 1.05) continue;
            const diff = Math.abs(1 - ratio);
            if (diff < bestRatioDiff) { bestRatioDiff = diff; match = candidate; }
        }
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
            p_note: outgoing.item.description || "Обмін валют",
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
            p_note: match.item.description || "Поповнення обміном",
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
        const { error: transferInsertError2 } = await admin.from("transfers").insert({
            household_id: context.householdId,
            from_account_id: outgoing.appAccountId,
            to_account_id: match.appAccountId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            sent_amount: sentAmount,
            received_amount: receivedAmount,
            exchange_rate: exchangeRate,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        if (transferInsertError2) {
            debug.push({ monoAccountId: outgoing.monoAccountId, error: `Не вдалося зв'язати обмін: ${transferInsertError2.message}` });
        }
        if (sentUah) {
            const recvRate = await nbuRate(match.currency, outDate);
            if (recvRate) {
                const fee = Math.max(0, Math.round((sentUah - receivedAmount * recvRate) * 100) / 100);
                await admin.from("transactions").update({
                    fee_amount: fee,
                    original_amount: receivedAmount,
                    original_currency: match.currency,
                }).eq("id", fromTx.id);
            }
        }
        await admin.from("monobank_synced_items").update({ transaction_id: fromTx.id }).eq("statement_item_id", outgoing.item.id);
        await admin.from("monobank_synced_items").update({ transaction_id: toTx.id }).eq("statement_item_id", match.item.id);

        imported += 2;
    }

    for (const incoming of flatItems) {
        if (used.has(incoming.item.id)) continue;
        if (incoming.item.amount <= 0) continue;

        const desc = (incoming.item.description || "").toLowerCase();
        const matchAccount = (allHouseholdAccounts || []).find(
            (a) =>
                a.id !== incoming.appAccountId &&
                a.name &&
                a.name.trim().length >= 4 &&
                desc.includes(a.name.trim().toLowerCase())
        );
        if (!matchAccount) continue;

        used.add(incoming.item.id);

        const amount = incoming.item.amount / 100;
        const bookedAt = new Date(incoming.item.time * 1000).toISOString();

        const { data: fromTx, error: fromErr } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: matchAccount.id,
            p_category_id: null,
            p_type: "expense",
            p_amount: amount,
            p_currency: matchAccount.currency || incoming.currency,
            p_note: incoming.item.description || "Переказ",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (fromErr || !fromTx) continue;

        const { data: toTx, error: toErr } = await admin.rpc("create_finance_transaction_admin", {
            p_user_id: connection.connected_by,
            p_account_id: incoming.appAccountId,
            p_category_id: null,
            p_type: "income",
            p_amount: amount,
            p_currency: incoming.currency,
            p_note: incoming.item.description || "Переказ",
            p_booked_at: bookedAt,
            p_is_impulsive: false,
            p_split_total: null,
            p_personal_share: null,
        });
        if (toErr || !toTx) continue;

        await admin.from("transactions").update({ type: "transfer" }).eq("id", fromTx.id);
        await admin.from("transactions").update({ type: "transfer" }).eq("id", toTx.id);
        const { error: transferInsertError3 } = await admin.from("transfers").insert({
            household_id: context.householdId,
            from_account_id: matchAccount.id,
            to_account_id: incoming.appAccountId,
            from_transaction_id: fromTx.id,
            to_transaction_id: toTx.id,
            sent_amount: amount,
            received_amount: amount,
            exchange_rate: 1,
            fee_amount: 0,
            fee_currency: null,
            booked_at: bookedAt,
        });
        if (transferInsertError3) {
            debug.push({ monoAccountId: incoming.monoAccountId, error: `Не вдалося зв'язати зовнішній переказ: ${transferInsertError3.message}` });
        }
        await admin.from("monobank_synced_items")
            .update({ transaction_id: toTx.id })
            .eq("statement_item_id", incoming.item.id);
        imported += 2;
    }

    const remaining = flatItems.filter((f) => !used.has(f.item.id));
    const byAccount = new Map<string, FlatItem[]>();
    for (const f of remaining) {
        if (!byAccount.has(f.appAccountId)) byAccount.set(f.appAccountId, []);
        byAccount.get(f.appAccountId)!.push(f);
    }

    const salaryCategoryId = ((categories || []).find((c) => c.name === "Зарплата" && c.kind === "income")
        || (categories || []).find((c) => c.kind === "income" && /^зарплата/i.test(c.name)))?.id;
    for (const [appAccountId, items] of byAccount) {
        const account = accountById.get(appAccountId)!;

        const learnedItems: Record<string, string> = {};
        const needsGemini: typeof items = [];
        for (const f of items) {
            const desc = (f.item.description || "").toLowerCase();
            if (salaryCategoryId && f.item.amount > 0 && /універсал\s*банк|universal\s*bank|universalbank/i.test(desc)) {
                learnedItems[f.item.id] = salaryCategoryId;
                continue;
            }
            // Банки (накопичення) — завжди Переказ
            if (/(зняття\s+(з\s+)?банки|виплата\s+банки|поповнення\s+банки|на\s+банку|з\s+банки)/i.test(desc)) {
                const jarCat = (categories || []).find((c) => c.name === "Переказ" && c.kind === (f.item.amount > 0 ? "income" : "expense"))?.id || transferCategoryId;
                if (jarCat) { learnedItems[f.item.id] = jarCat; continue; }
            }
            const rule = (learnedRules || []).find(
                (r) => desc.replace(/\s+/g, " ").includes(String(r.condition_value || "").toLowerCase().replace(/\s+/g, " ").trim())
            );
            if (rule?.action_category_id) {
                learnedItems[f.item.id] = rule.action_category_id;
                continue;
            }
            const itemType = f.item.amount < 0 ? "expense" : "income";
            const mccMatch = (categories || []).find(
                (c) => c.kind === itemType && mccCategoryCandidates(f.item.mcc).some((n) => c.name.toLowerCase() === n.toLowerCase())
            );
            if (mccMatch) {
                learnedItems[f.item.id] = mccMatch.id;
            } else {
                needsGemini.push(f);
            }
        }

        const categoryNameByItemId = await categorizeMonobankItems(
            needsGemini.map((f) => ({
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
                    await admin.from("monobank_synced_items")
                        .update({ transaction_id: transaction?.id || null })
                        .eq("statement_item_id", f.item.id);
                    imported++;
                    continue;
                }
            }

            const description2 = f.item.description || "";
            let refundCategoryId: string | null = null;
            const cancellationMatch = description2.match(/^Скасування\.\s*(.+)$/i);
            if (cancellationMatch) {
                const originalName = cancellationMatch[1].trim();
                const { data: originalTx } = await admin
                    .from("transactions")
                    .select("category_id")
                    .eq("account_id", account.id)
                    .eq("type", "expense")
                    .ilike("note", `%${originalName}%`)
                    .order("booked_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                refundCategoryId = originalTx?.category_id || null;
            }

            const itemDate2 = new Date(f.item.time * 1000);
            const dayStart2 = new Date(itemDate2);
            dayStart2.setUTCHours(0, 0, 0, 0);
            const dayEnd2 = new Date(itemDate2);
            dayEnd2.setUTCHours(23, 59, 59, 999);

            const { data: possibleDuplicate } = await admin
                .from("transactions")
                .select("id")
                .eq("account_id", account.id)
                .eq("amount", Math.abs(amount))
                .eq("type", type)
                .not("id", "in", `(select transaction_id from monobank_synced_items where transaction_id is not null)`)
                .gte("booked_at", dayStart2.toISOString())
                .lte("booked_at", dayEnd2.toISOString())
                .maybeSingle();

            if (possibleDuplicate && !noDedupe) {
                await admin.from("monobank_synced_items")
                    .update({ transaction_id: possibleDuplicate.id })
                    .eq("statement_item_id", f.item.id);
                debug.push({
                    monoAccountId: f.monoAccountId,
                    error: `Пропущено дублікат: знайдено схожу вручну додану транзакцію того ж дня (${possibleDuplicate.id})`,
                });
                continue;
            }

            const categoryName = categoryNameByItemId[f.item.id];
            const learnedCategoryId = learnedItems[f.item.id];
            const category = learnedCategoryId
                ? { id: learnedCategoryId }
                : (categories || []).find(
                    (c) => c.kind === type && c.name.toLowerCase() === (categoryName || "").toLowerCase()
                );
            const { data: transaction, error: txError } = await admin.rpc("create_finance_transaction_admin", {
                p_user_id: connection.connected_by,
                p_account_id: account.id,
                p_category_id: refundCategoryId || category?.id || null,
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

            const feeInfo = await monoItemFee(f.item, account.currency);
            if (feeInfo && transaction?.id) {
                await admin.from("transactions").update({
                    fee_amount: feeInfo.feeUah,
                    original_amount: feeInfo.originalAmount,
                    original_currency: feeInfo.originalCurrency,
                }).eq("id", transaction.id);
            }

            await admin.from("monobank_synced_items")
                .update({ transaction_id: transaction?.id || null })
                .eq("statement_item_id", f.item.id);

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