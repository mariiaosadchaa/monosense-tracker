import { currencyFromIso, nbuRate } from "@/lib/nbu";

type MonoFeeItem = {
    time: number;
    amount: number;
    operationAmount?: number;
    currencyCode?: number;
    commissionRate?: number;
};

/**
 * Комісія для операції Монобанку (в UAH) + фактична сума з чека.
 * - Валюта операції ≠ валюта картки (напр. оплата 1000 ₴ з доларової):
 *   комісія = списане з картки за курсом НБУ − сума з чека за курсом НБУ.
 * - Та сама валюта: комісія = commissionRate банку.
 * Повертає null, якщо комісії немає і сума з чека не відрізняється.
 */
export async function monoItemFee(
    item: MonoFeeItem,
    accountCurrency: string
): Promise<{ feeUah: number; originalAmount: number | null; originalCurrency: string | null } | null> {
    const date = new Date(item.time * 1000);
    const accAmount = Math.abs(item.amount) / 100;
    const commission = Math.abs(item.commissionRate || 0) / 100;
    const opCurrency = currencyFromIso(item.currencyCode);
    const opAmount = item.operationAmount != null ? Math.abs(item.operationAmount) / 100 : null;

    if (opCurrency && opAmount && opCurrency !== String(accountCurrency).toUpperCase()) {
        const [accRate, opRate] = await Promise.all([nbuRate(accountCurrency, date), nbuRate(opCurrency, date)]);
        if (!accRate || !opRate) return { feeUah: 0, originalAmount: opAmount, originalCurrency: opCurrency };
        // Витрата: віддали accAmount (валюта картки), отримали товар на opAmount.
        // Надходження: відправник надіслав opAmount, на картку зайшло accAmount.
        const fee = item.amount < 0
            ? accAmount * accRate - opAmount * opRate
            : opAmount * opRate - accAmount * accRate;
        return {
            feeUah: Math.max(0, Math.round(fee * 100) / 100),
            originalAmount: opAmount,
            originalCurrency: opCurrency,
        };
    }

    if (commission > 0) {
        const rate = await nbuRate(accountCurrency, date);
        if (!rate) return null;
        return { feeUah: Math.round(commission * rate * 100) / 100, originalAmount: null, originalCurrency: null };
    }
    return null;
}
