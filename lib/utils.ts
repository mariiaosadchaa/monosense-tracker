export function cn(...classes:(string|false|null|undefined)[]){
  return classes.filter(Boolean).join(" ");
}
export function extractMerchant(title: string): string {
  if (!title) return "";

  // Шаблон для видалення банківських префіксів
  const prefixRegex = /^(платіж|оплата послуг|оплата товарів|оплата|переказ|купівля|поповнення|сплата|pos|p2p|tpp|qrc)\s+/gui;

  // Очищаємо назву від префіксів та зайвих пробілів
  const cleaned = title.replace(prefixRegex, "").trim();

  return cleaned || title;
}