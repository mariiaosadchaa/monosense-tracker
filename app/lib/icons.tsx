"use client";
import { useState } from "react";
import {
    CircleDollarSign, Banknote, Wallet, HandCoins, ShoppingCart, ShoppingBag, Utensils, Coffee, Pizza, Beer,
    Sandwich, IceCream2, Wine, Ham, Candy, Apple, Fish, Car, Bus, Bike, Train, Plane, Fuel,
    House, Sofa, Lamp, Bed, ShowerHead, Wrench, Zap, Droplets, Tv, HeartPulse, Stethoscope,
    Phone, Laptop, Film, Hotel, Umbrella, Cake, Percent, Syringe, Flower2, Gamepad2, Music,
    Camera, Dice5, Volleyball, Trophy, Mountain, Map, Amphora, Shirt, Glasses, GraduationCap,
    BookOpen, PawPrint, Cat, Dog, Gift, PartyPopper, Star, Smartphone, Wifi, Globe, Baby,
    Palette, Brush, Landmark, ShieldCheck, ArrowLeftRight, Repeat, Package, HeartHandshake,
    Leaf, Flame, Sparkles, CreditCard, TrendingUp, Coins, Scissors, PiggyBank,
} from "lucide-react";
import type { ComponentType } from "react";

export const BUDGET_ICONS: Record<string, ComponentType<{ size?: number }>> = {
    CircleDollarSign, Banknote, Wallet, HandCoins, CreditCard, TrendingUp, Coins,
    ShoppingCart, ShoppingBag, Utensils, Coffee, Pizza, Beer, Sandwich, IceCream2, Wine, Ham, Candy, Apple, Fish,
    Car, Bus, Bike, Train, Plane, Fuel,
    House, Sofa, Lamp, Bed, ShowerHead, Wrench, Zap, Droplets, Tv,
    HeartPulse, Stethoscope, Phone, Laptop, Film, Hotel, Umbrella, Cake, Percent, Syringe, Flower2,
    Gamepad2, Music, Camera, Dice5, Volleyball, Trophy, Mountain, Map, Amphora,
    Shirt, Glasses,
    GraduationCap, BookOpen,
    PawPrint, Cat, Dog,
    Gift, PartyPopper, Star,
    Smartphone, Wifi, Globe,
    Baby,
    Palette, Brush,
    Landmark,
    ShieldCheck,
    ArrowLeftRight, Repeat,
    Package,
    HeartHandshake,
    Leaf, Flame,
    Sparkles,
    PiggyBank,
};
export const BUDGET_ICON_NAMES = Object.keys(BUDGET_ICONS);
export const BUDGET_COLORS = [
    "#6558e8",
    "#ff7a66",
    "#f0a94a",
    "#28a879",
    "#4c91e8",
    "#e874a6",
    "#8875d1",
    "#42a7a2",
    "#d3a032",
    "#66717d",
];
export function guessIconFromTitle(title: string): string {
    if (isJarTitle(title)) return "PiggyBank";
    const t = `${title.toLowerCase()} ${splitWords(title)}`;
    if (/silpo|atb|novus|varus|auchan|fora|billa|velmart|kopiyka|ekomarket|eko market|produkt/.test(t)) return "ShoppingCart";
    if (/дімсад|dimsad|сад город|sad gorod|sad horod|garden/.test(t)) return "House";
    if (/ingo|strakh|insur/.test(t)) return "ShieldCheck";
    if (/зоомаг|zoomag|zoo(?!m)|pethouse|petshop|вет|veteri|kormotech|masterzoo|zoo ?market/.test(t)) return "PawPrint";
    if (/пекарн|pekarn|bakery|хліб|khlib|пекар|круасан|croissant/.test(t)) return "Cake";
    if (/apteka|pharma/.test(t)) return "Stethoscope";
    if (/kafe|restoran|piza|pizza|sushi|burger/.test(t)) return "Utensils";
    if (/kava|coffee|kofe|кав['’]?ярн|kav[iy]?[aj]?rn|kaviarn/.test(t)) return "Coffee";
    if (/goldi|new ?yorker/.test(t)) return "Shirt";
    if (/foto|kodak/.test(t)) return "Camera";
    if (/атб|сільпо|новус|варус|ашан|metro|продукт|billa|пятірочка|fozzy|супермаркет|grocery|маркет/.test(t)) return "ShoppingCart";
    if (/кафе|ресторан|cafe|restaurant|mcdonald|kfc|burger|піца|pizza|суші|sushi|їжа|food|фастфуд|круасан/.test(t)) return "Utensils";
    if (/кава|кофе|coffee|starbucks|сoffee|латте|капучіно/.test(t)) return "Coffee";
    if (/бар|паб|пиво|beer|алкоголь|вино|wine/.test(t)) return "Beer";
    if (/морозив|ice.?cream/.test(t)) return "IceCream2";
    if (/uber|bolt|uklon|таксі|taxi/.test(t)) return "Car";
    if (/метро|автобус|тролей|маршрутка|укрзалізниц|поїзд|train|bus|блаблакар|blablacar/.test(t)) return "Bus";
    if (/аеропорт|авіа|ryanair|wizz|mau|kiyavia|flight|airline/.test(t)) return "Plane";
    if (/пальне|wog|okko|upg|соcar|автозаправ|fuel|gas.?station|брсм|кло/.test(t)) return "Fuel";
    if (/велосипед|bike/.test(t)) return "Bike";
    if (/київстар|vodafone|lifecell|мобільн|поповнення|поповн|phone|mobile/.test(t)) return "Smartphone";
    if (/інтернет|wi-?fi|провайдер|broadband|internet/.test(t)) return "Wifi";
    if (/netflix|spotify|youtube|apple.*sub|google.*pay|підписк|subscription|patreon|chatgpt|openai|claude/.test(t)) return "Repeat";
    if (/apple|iphone|samsung|xiaomi|техніка|електрон/.test(t)) return "Smartphone";
    if (/комунальн|квартплат|газ|водопостач|водовідвед|dtek|дтек|yasno|нафтогаз/.test(t)) return "Droplets";
    if (/електр|enerh|light/.test(t)) return "Zap";
    if (/телебач|tv|кабельн/.test(t)) return "Tv";
    if (/аптек|pharmacy|ліки|лікар|клінік|лікуван|hospital|medical|стоматол|dentist|діла|dila|сінево|synevo|анц|подорожник|лаборатор/.test(t)) return "Stethoscope";
    if (/вакцин|укол|syringe/.test(t)) return "Syringe";
    if (/спортзал|gym|фітнес|fitness|тренажер|спорт/.test(t)) return "Volleyball";
    if (/квіт|flower/.test(t)) return "Flower2";
    if (/zara|h&m|lcwaikiki|одяг|взуття|fashion|cloth|shoes|shein|мейкап|makeup|eva|ева|простор|prostor|косметик/.test(t)) return "Shirt";
    if (/ikea|епіцентр|leroy|нова лін|меблі|ремонт|буд\.матер|jysk/.test(t)) return "House";
    if (/comfy|eldorado|rozetka|побутов|foxtrot|фокстрот|алло|citrus|цитрус/.test(t)) return "Sofa";
    if (/курс|школа|університет|навчан|освіта|udemy|coursera|study|duolingo/.test(t)) return "GraduationCap";
    if (/книг|book/.test(t)) return "BookOpen";
    if (/кіно|cinema|театр|concert|концерт|event|квиток|ticket|планета кіно|мультиплекс|karabas|concert\.ua/.test(t)) return "PartyPopper";
    if (/steam|playstation|xbox|game|ігор/.test(t)) return "Gamepad2";
    if (/музик|spotify|music/.test(t)) return "Music";
    if (/фото|camera|photo/.test(t)) return "Camera";
    if (/готел|hotel|airbnb|booking|hostel/.test(t)) return "Bed";
    if (/тур|travel|подорож/.test(t)) return "Map";
    if (/зарплат|salary|аванс/.test(t)) return "Banknote";
    if (/кешбек|cashback/.test(t)) return "Coins";
    if (/розстрочк|installment|частин/.test(t)) return "Landmark";
    if (/кредит|позик|loan/.test(t)) return "CreditCard";
    if (/страхув|insurance/.test(t)) return "ShieldCheck";
    if (/інвест|invest|акці|фонд/.test(t)) return "TrendingUp";
    if (/переказ|transfer/.test(t)) return "ArrowLeftRight";
    if (/нова пошта|nova poshta|meest|delivery|доставк|посилк|укрпошта/.test(t)) return "Package";
    if (/вет|ветерин|зоомаг|pet|кіт|cat|собак|dog/.test(t)) return "PawPrint";
    if (/дит|baby|іграшк|toy/.test(t)) return "Baby";
    if (/благодій|донат|charity|волонтер/.test(t)) return "HeartHandshake";
    // Загальні магазини: Market / Magazin / Shop / Store
    if (/market|magaz[iy]n|mahaz[iy]n|магазин|shop|store|маркет|мультимаркет|аврора|avrora/.test(t)) return "ShoppingBag";
    return "CircleDollarSign";
}

export const MERCHANT_LOGO_DOMAINS: [string, string][] = [
    // --- Мономаркет/Монобазар (розстрочка через Монобанк) — пріоритет над назвою продавця ---
    ["мономаркет", "monobank.ua"], ["monomarket", "monobank.ua"],
    ["монобазар", "monobank.ua"], ["monobazar", "monobank.ua"],
    // --- Додано: трансліт/часті з іноземних карток ---
    ["avrora multimarket", "avrora.ua"], ["аврора мультимаркет", "avrora.ua"],
    ["дімсадгород", "dimsadhorod.com.ua"], ["дім сад город", "dimsadhorod.com.ua"], ["dimsadhorod", "dimsadhorod.com.ua"], ["dimsadgorod", "dimsadhorod.com.ua"], ["dim sad gorod", "dimsadhorod.com.ua"], ["dim sad horod", "dimsadhorod.com.ua"],
    ["pethouse", "pethouse.ua"], ["петхаус", "pethouse.ua"],
    ["goldi", "goldi.ua"], ["голді", "goldi.ua"],
    ["new yorker", "newyorker.de"], ["newyorker", "newyorker.de"], ["нью йоркер", "newyorker.de"],
    ["сімейна пекарня", "family-bakery.com.ua"], ["family bakery", "family-bakery.com.ua"],
    ["kodak", "kodak.net.ua"], ["кодак", "kodak.net.ua"],
    ["ingo", "ingo.ua"], ["інго", "ingo.ua"],
    ["softserve", "softserveinc.com"], ["софтсерв", "softserveinc.com"],
    ["quality unit", "qualityunit.com"],
    ["claude", "claude.ai"], ["anthropic", "claude.ai"],
    // --- Супермаркети та ритейл ---
    ["фора", "fora.ua"], ["fora", "fora.ua"],
    ["нова пошта", "novaposhta.ua"], ["nova poshta", "novaposhta.ua"], ["novaposhta", "novaposhta.ua"],
    ["сільпо", "silpo.ua"], ["silpo", "silpo.ua"],
    ["ашан", "auchan.ua"], ["auchan", "auchan.ua"],
    ["metro", "metro.ua"], ["метро україна", "metro.ua"], ["metro ua", "metro.ua"],
    ["атб", "atbmarket.com"], ["atb market", "atbmarket.com"], ["atb", "atbmarket.com"],
    ["varus", "varus.ua"], ["варус", "varus.ua"],
    ["novus", "novus.ua"], ["новус", "novus.ua"],
    ["rozetka", "rozetka.com.ua"],
    ["monomarket", "mono.market"],
    ["універсал банк", "universalbank.com.ua"], ["universal bank", "universalbank.com.ua"],
    ["universalbank", "universalbank.com.ua"],
    ["аврора", "avrora.ua"], ["avrora", "avrora.ua"],
    ["коло", "kolomarket.com.ua"], ["kolo", "kolomarket.com.ua"],
    ["близенько", "blyzenko.ua"], ["blyzenko", "blyzenko.ua"],
    ["таврія в", "tavriav.ua"], ["tavria v", "tavriav.ua"],
    ["делікат", "delikat.ua"], ["delikat", "delikat.ua"],
    ["велика кишеня", "velmart.ua"], ["velyka kyshenya", "velmart.ua"],
    ["м'ясомаркет", "myasomarket.ua"], ["myasomarket", "myasomarket.ua"],
    ["наша ряба", "nasharyaba.ua"], ["nasha ryaba", "nasharyaba.ua"],

    // --- Аптеки, ліки та медицина ---
    ["liki24", "liki24.ua"],
    ["tabletki.ua", "tabletki.ua"], ["tabletki ua", "tabletki.ua"],
    ["анц", "anc.ua"], ["аптека анц", "anc.ua"], ["anc", "anc.ua"],
    ["аптека 911", "apteka911.com.ua"], ["apteka 911", "apteka911.com.ua"],
    ["подорожник", "apteka-podorozhnyk.ua"], ["podorozhnyk", "apteka-podorozhnyk.ua"],
    ["бажаємо здоров'я", "bazhayemo-zdorovya.ua"],
    ["аптека доброго дня", "add.ua"],
    ["аптека оптових цін", "aptekaoptovyhcen.ua"],
    ["мед-сервіс", "medservice.ua"], ["med service", "medservice.ua"],
    ["receptyka", "receptyka.ua"], ["рецептика", "receptyka.ua"],
    ["добробут", "dobrobut.com"], ["dobrobut", "dobrobut.com"],
    ["сінево", "synevo.ua"], ["synevo", "synevo.ua"],
    ["діла", "dila.ua"], ["dila", "dila.ua"],
    ["ескулаб", "eskulab.ua"], ["eskulab", "eskulab.ua"],
    ["медіком", "medikom.ua"], ["medikom", "medikom.ua"],
    ["оксфорд медікал", "oxfordmedical.ua"], ["oxford medical", "oxfordmedical.ua"],
    ["оберіг", "oberig.ua"], ["oberig", "oberig.ua"],

    // --- Квитки, кіно, розваги та заходи ---
    ["concert.ua", "concert.ua"], ["концерт юа", "concert.ua"], ["концерт.ua", "concert.ua"],
    ["karabas", "karabas.com"], ["карабас", "karabas.com"],
    ["планета кіно", "planetakino.ua"], ["planeta kino", "planetakino.ua"],
    ["мультиплекс", "multiplex.ua"], ["multiplex", "multiplex.ua"],
    ["kontramarka", "kontramarka.ua"], ["контрамарка", "kontramarka.ua"],
    ["atlas weekend", "atlasweekend.ua"],
    ["буковель", "bukovel.com"], ["bukovel", "bukovel.com"],

    // --- Кафе, ресторани та доставка їжі ---
    ["mcdonalds", "mcdonalds.com"], ["mcdonald's", "mcdonalds.com"], ["mcdonald", "mcdonalds.com"], ["макдональдс", "mcdonalds.com"],
    ["kfc", "kfc.com"],
    ["пузата хата", "puzatahata.ua"], ["puzata hata", "puzatahata.ua"],
    ["львівські круасани", "lvivcroissants.com"], ["lviv croissants", "lvivcroissants.com"],
    ["салатейра", "salateira.ua"], ["salateira", "salateira.ua"],
    ["мафія", "mafia.ua"], ["mafia", "mafia.ua"],
    ["муракамі", "murakami.ua"], ["murakami", "murakami.ua"],
    ["sushi master", "sushi-master.ua"], ["суші мастер", "sushi-master.ua"],
    ["сушія", "sushiya.ua"], ["sushiya", "sushiya.ua"],
    ["dominos pizza", "dominos.ua"], ["domino's pizza", "dominos.ua"],
    ["milk bar", "milkbar.ua"],
    ["glovo", "glovoapp.com"], ["glovo україна", "glovoapp.com"], ["glovo ua", "glovoapp.com"],
    ["bolt food", "bolt.eu"], ["bolt food ua", "bolt.eu"],
    ["zakaz.ua", "zakaz.ua"], ["zakaz ua", "zakaz.ua"],
    ["cooker", "cooker.ua"],

    // --- Краса, косметика та шопінг ---
    ["makeup", "makeup.com.ua"], ["мейкап", "makeup.com.ua"],
    ["eva", "eva.ua"], ["ева", "eva.ua"],
    ["prostor", "prostor.ua"],
    ["watsons", "watsons.ua"], ["watsons ua", "watsons.ua"],
    ["iherb", "iherb.com"], ["айхерб", "iherb.com"],
    ["notino", "notino.ua"], ["нотіно", "notino.ua"],
    ["parfums.ua", "parfums.ua"],
    ["zara", "zara.com"],
    ["h&m", "hm.com"],
    ["answear", "answear.ua"], ["ансвер", "answear.ua"],
    ["intertop", "intertop.ua"],
    ["kasta", "kasta.ua"],
    ["shafa.ua", "shafa.ua"], ["shafa ua", "shafa.ua"],
    ["vovk", "vovk.ua"],
    ["musthave", "musthave.ua"],
    ["andre tan", "andretan.ua"],
    ["gepur", "gepur.com"],
    ["цум київ", "tsum.ua"], ["tsum kyiv", "tsum.ua"],
    ["shein", "shein.com"], ["шейн", "shein.com"],

    // --- Електроніка та побутова техніка ---
    ["comfy", "comfy.ua"],
    ["eldorado", "eldorado.ua"],
    ["foxtrot", "foxtrot.com.ua"], ["фокстрот", "foxtrot.com.ua"],
    ["алло", "allo.ua"], ["allo", "allo.ua"],
    ["citrus", "citrus.ua"], ["цитрус", "citrus.ua"],
    ["moyo", "moyo.ua"],
    ["telemart", "telemart.ua"], ["телемарт", "telemart.ua"],
    ["brain", "brain.ua"],
    ["itbox", "itbox.ua"],
    ["maudau", "maudau.com.ua"],
    ["xiaomi", "mi.com"],
    ["samsung", "samsung.com"],
    ["apple", "apple.com"],

    // --- Будівництво, меблі та дім ---
    ["епіцентр", "epicentrk.ua"], ["epicentr", "epicentrk.ua"], ["epitsentr", "epicentrk.ua"],
    ["нова лінія", "novalinia.com.ua"], ["nova liniya", "novalinia.com.ua"],
    ["jysk", "jysk.ua"], ["jysk україна", "jysk.ua"], ["jysk ua", "jysk.ua"],
    ["ikea", "ikea.com"],
    ["33м2", "33m2.com.ua"], ["33 m2", "33m2.com.ua"],
    ["агромат", "agromat.ua"], ["agromat", "agromat.ua"],
    ["dnipro m", "dniprom.ua"], ["dnipro-m", "dniprom.ua"],

    // --- Транспорт, АЗС та авто ---
    ["окко", "okko.ua"], ["okko", "okko.ua"],
    ["wog", "wog.ua"],
    ["upg", "upg.ua"], ["юпджі", "upg.ua"],
    ["брсм-нафта", "brsmnafta.ua"], ["brsm nafta", "brsmnafta.ua"],
    ["укрнафта", "ukrnafta.com"], ["ukrnafta", "ukrnafta.com"],
    ["klo", "klo.ua"],
    ["socar", "socar.com.ua"], ["socar ua", "socar.com.ua"],
    ["shell", "shell.ua"], ["shell ua", "shell.ua"],
    ["авіас", "avias.ua"], ["avias", "avias.ua"],
    ["uklon", "uklon.com.ua"],
    ["bolt", "bolt.eu"],
    ["uber", "uber.com"],
    ["blablacar", "blablacar.com.ua"], ["блаблакар", "blablacar.com.ua"],
    ["укрзалізниця", "uz.gov.ua"], ["ukrzaliznytsia", "uz.gov.ua"],
    ["busfor", "busfor.ua"], ["busfor україна", "busfor.ua"],
    ["infobus", "infobus.ua"],
    ["auto.ria", "auto.ria.com"], ["auto ria", "auto.ria.com"],

    // --- Банки та платіжні системи ---
    ["приватбанк", "privatbank.ua"], ["privatbank", "privatbank.ua"],
    ["monobank", "monobank.ua"], ["monopay", "monobank.ua"],
    ["ощадбанк", "oschad.ua"], ["oschadbank", "oschad.ua"],
    ["райффайзен банк", "raiffeisen.ua"], ["raiffeisen ua", "raiffeisen.ua"],
    ["пумб", "pumb.ua"], ["pumb", "pumb.ua"],
    ["укрсиббанк", "ukrsibbank.com"], ["ukrsibbank", "ukrsibbank.com"],
    ["сенс банк", "sensebank.ua"], ["sense bank", "sensebank.ua"],
    ["а-банк", "abank.ua"], ["a bank", "abank.ua"],
    ["кредобанк", "kredobank.com.ua"], ["kredobank", "kredobank.com.ua"],
    ["укргазбанк", "ukrgasbank.com"], ["ukrgasbank", "ukrgasbank.com"],
    ["таскомбанк", "tascombank.ua"], ["tascombank", "tascombank.ua"],
    ["отп банк", "otpbank.com.ua"], ["otp bank ua", "otpbank.com.ua"],
    ["izibank", "izibank.ua"],
    ["sportbank", "sportbank.ua"],
    ["novapay", "novapay.ua"],
    ["portmone", "portmone.com.ua"],
    ["easypay", "easypay.ua"],
    ["city24", "city24.ua"],
    ["liqpay", "liqpay.ua"],
    ["fondy", "fondy.eu"],
    ["wayforpay", "wayforpay.com"],
    ["ipay.ua", "ipay.ua"], ["ipay ua", "ipay.ua"],
    ["revolut", "revolut.com"],
    ["wise", "wise.com"],
    ["paypal", "paypal.com"],

    // --- Зв'язок, інтернет та комунальні ---
    ["київстар", "kyivstar.ua"], ["kyivstar", "kyivstar.ua"],
    ["vodafone", "vodafone.ua"], ["vodafone ua", "vodafone.ua"],
    ["lifecell", "lifecell.ua"],
    ["volia", "volia.com"],
    ["triolan", "triolan.com"],
    ["ланет", "lanet.ua"], ["lanet", "lanet.ua"],
    ["ukrtelecom", "ukrtelecom.ua"],
    ["yasno", "yasno.com.ua"],
    ["дтек", "dtek.com"], ["dtek", "dtek.com"],
    ["нафтогаз", "naftogaz.com"], ["naftogaz", "naftogaz.com"],

    // --- IT, Сервіси, Підписки та AI ---
    ["chatgpt", "chatgpt.com"], ["openai", "openai.com"],
    ["midjourney", "midjourney.com"],
    ["patreon", "patreon.com"], ["патреон", "patreon.com"],
    ["github", "github.com"],
    ["google", "google.com"],
    ["netflix", "netflix.com"],
    ["spotify", "spotify.com"],
    ["megogo", "megogo.net"],
    ["sweet.tv", "sweet.tv"], ["sweet tv", "sweet.tv"],
    ["steam", "steampowered.com"],
    ["playstation", "playstation.com"],
    ["xbox", "xbox.com"],
    ["duolingo", "duolingo.com"],
    ["canva", "canva.com"],
    ["figma", "figma.com"],
    ["notion", "notion.so"],
    ["zoom", "zoom.us"],
    ["telegram", "telegram.org"],
    ["viber", "viber.com"],
    ["дія", "diia.gov.ua"], ["diia", "diia.gov.ua"],
    ["prom.ua", "prom.ua"], ["prom ua", "prom.ua"],
    ["olx", "olx.ua"], ["olx україна", "olx.ua"], ["olx ua", "olx.ua"],
    ["укрпошта", "ukrposhta.ua"], ["ukrposhta", "ukrposhta.ua"],
    ["meest", "meest.com"], ["meest express", "meest.com"],
    ["temu", "temu.com"],
    ["aliexpress", "aliexpress.com"],
    ["amazon", "amazon.com"],
    ["booking.com", "booking.com"], ["booking com", "booking.com"],
    ["airbnb", "airbnb.com"]
];

// ---- Розпізнавання мерчантів -------------------------------------------------
// Картки іноземних банків пишуть назви латиницею/транслітом ("SimeynaPekarnya",
// "Avrora Multimarket"), тому порівнюємо ще й «скелети» назв без голосних варіацій.
const CYR_TO_LAT: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i",
    й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh",
    ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", ы: "y", э: "e", ё: "e", ъ: "", "'": "", "’": "",
};

/** Латинський «скелет» назви: трансліт + зведення варіантів (y/i, kh/h, g/h, ts/c…), без пробілів. */
export function merchantSkeleton(value: string): string {
    return value
        .toLowerCase()
        .split("")
        .map((ch) => CYR_TO_LAT[ch] ?? ch)
        .join("")
        .replace(/shch/g, "s").replace(/sh/g, "s").replace(/ch/g, "c").replace(/zh/g, "z")
        .replace(/kh/g, "h").replace(/ts/g, "c").replace(/ph/g, "f")
        .replace(/g/g, "h").replace(/[yj]/g, "i").replace(/w/g, "v").replace(/q/g, "k").replace(/x/g, "ks")
        .replace(/[^a-z0-9]/g, "")
        .replace(/(.)\1+/g, "$1");
}

/** "SimeynaPekarnya" → "simeyna pekarnya", "KODAK2" → "kodak 2" */
function splitWords(title: string): string {
    return title
        .replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g, "$1 $2")
        .replace(/([A-Za-zА-Яа-яІіЇїЄєҐґ])(\d)/g, "$1 $2")
        .toLowerCase();
}

const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keyRegexCache = new globalThis.Map<string, RegExp>(); // Map з lucide-react затіняє вбудований
function wordRegex(key: string): RegExp {
    let re = keyRegexCache.get(key);
    if (!re) {
        re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(key)}($|[^\\p{L}\\p{N}])`, "u");
        keyRegexCache.set(key, re);
    }
    return re;
}
const skeletonCache = new globalThis.Map<string, string>();
function keySkeleton(key: string): string {
    let sk = skeletonCache.get(key);
    if (sk === undefined) {
        sk = merchantSkeleton(key);
        skeletonCache.set(key, sk);
    }
    return sk;
}

/** Операції з банками (накопиченнями) Монобанку — це не мерчант */
export function isJarTitle(title: string): boolean {
    return /(зняття\s+(з\s+)?банки|виплата\s+банки|поповнення\s+банки|на\s+банку|з\s+банки)/i.test(title || "");
}

export function findMerchantDomain(title: string): string | null {
    if (!title || isJarTitle(title)) return null;
    const words = splitWords(title);
    // 1) точний збіг цілого слова/фрази (щоб "Zoomagazin" не став "Zoom")
    const raw = title.toLowerCase();
    const exact = MERCHANT_LOGO_DOMAINS.find(([key]) => wordRegex(key).test(words) || wordRegex(key).test(raw));
    if (exact) return exact[1];
    // 2) трансліт/злиті слова: скелет ключа (≥5 символів) має починатися з початку слова назви
    //    ("SimeynaPekarnya" → так; "…банки" ≠ "а-банк")
    const tokens = words.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    let titleSkeleton = "";
    const tokenStarts = new Set<number>();
    for (const token of tokens) {
        tokenStarts.add(titleSkeleton.length);
        titleSkeleton += merchantSkeleton(token);
    }
    const fuzzy = MERCHANT_LOGO_DOMAINS.find(([key]) => {
        const sk = keySkeleton(key);
        if (sk.length < 5) return false;
        for (let i = titleSkeleton.indexOf(sk); i !== -1; i = titleSkeleton.indexOf(sk, i + 1)) {
            if (tokenStarts.has(i)) return true;
        }
        return false;
    });
    return fuzzy ? fuzzy[1] : null;
}
const BANK_DOMAINS: Record<string, string> = {
    monobank: "monobank.ua",
    "універсал банк": "universalbank.com.ua",
    "universal bank": "universalbank.com.ua",
    приватбанк: "privatbank.ua",
    пумб: "pumb.ua",
    ощадбанк: "oschad.ua",
    "райффайзен банк": "raiffeisen.ua",
    "а-банк": "abank.ua",
    "сенс банк": "sensebank.ua",
    укрсиббанк: "ukrsibbank.com",
    "отп банк": "otpbank.com.ua",
    кредобанк: "kredobank.com.ua",
    пайонер: "payoneer.com",
};
export function findBankDomain(bankName: string): string | null {
    const lower = bankName.toLowerCase();
    for (const key in BANK_DOMAINS) {
        if (lower.includes(key)) return BANK_DOMAINS[key];
    }
    return null;
}

export function isRecurringPaymentTitle(title: string): boolean {
    const lower = title.toLowerCase();
    return lower.includes("розстрочк") || lower.includes("щомісячний платіж");
}
export function isPersonName(title: string): boolean {
    const cleaned = title.replace(/^(від|from)\s*:?\s*/i, "").trim();
    // Двоє слів: "Ім'я Прізвище" (прізвище може бути ініціалом)
    if (/^[A-ZА-ЯЇЄІҐ][a-zа-яїєіґ'-]+\s+[A-ZА-ЯЇЄІҐ][a-zа-яїєіґ'-]*\.?$/.test(cleaned)) return true;
    // Одне слово — ймовірно просто ім'я (наприклад "Дима", "Марія")
    if (/^[A-ZА-ЯЇЄІҐ][a-zа-яїєіґ'-]{2,14}$/.test(cleaned)) return true;
    return false;
}
export function BudgetIcon({ name, size }: { name?: string; size?: number }) {
    const Icon = (name && BUDGET_ICONS[name]) || CircleDollarSign;
    return <Icon size={size} />;
}

export function MerchantIcon({
                                 title,
                                 bankName,
                                 imgStyle,
                                 fallback,
                             }: {
    title: string;
    bankName?: string;
    imgStyle: React.CSSProperties;
    fallback: React.ReactNode;
}) {
    const [stage, setStage] = useState(0);
    const domain = isRecurringPaymentTitle(title) && bankName
        ? findBankDomain(bankName)
        : findMerchantDomain(title);
    const urls = domain
        ? [
            `https://unavatar.io/${domain}?fallback=false`,
            `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
        ]
        : [];
    if (!domain || stage >= urls.length) return <>{fallback}</>;
    return (
        <img
            key={urls[stage]}
    src={urls[stage]}
    alt=""
    style={imgStyle}
    onError={() => setStage((s) => s + 1)}
    onLoad={(e) => {
        const img = e.currentTarget;
        // Google віддає сіру «глобус»-заглушку 16px, коли лого немає
        // Google (останнє джерело) замість лого віддає глобус 16px — відкидаємо
        const minSize = stage >= 1 ? 17 : 2;
        if (img.naturalWidth < minSize || img.naturalHeight < minSize) setStage((s) => s + 1);
    }}
    />
);
}