export function translateEntity(entity: string): string {
    const map: Record<string, string> = {
        transaction: "Операція",
        account: "Рахунок",
        category: "Категорія",
        budget: "Бюджет",
        goal: "Ціль",
        debt: "Борг",
        rule: "Правило",
        recurring: "Регулярний платіж",
    };
    return map[entity?.toLowerCase()] || entity;
}

export function translateAction(action: string): string {
    const map: Record<string, string> = {
        insert: "Створено",
        update: "Оновлено",
        delete: "Видалено",
    };
    return map[action?.toLowerCase()] || action;
}