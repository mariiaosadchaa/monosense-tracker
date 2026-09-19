function translateAction(value: string) {
    return (
        ({ insert: "створено", update: "змінено", delete: "видалено" } as Record<string, string>)[
            value
            ] || value
    );
}