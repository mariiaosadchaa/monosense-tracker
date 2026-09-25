# Rivna для iPhone (Capacitor)

Нативна оболонка: відкриває сайт Rivna (Vercel) на весь екран, з іконкою, сплешем,
тактильною віддачею та статус-баром під тему. Уся логіка — у веб-частині (`/app`),
тож оновлення сайту одразу видно в застосунку без перевидання в App Store.

## Структура
- `capacitor.config.json` — bundle id `ua.rivna.app`, адреса сайту (`server.url`)
- `ios/` — Xcode-проєкт (Swift Package Manager, без CocoaPods)
- `www/offline.html` — екран «Немає з'єднання»
- `assets/` — вихідні іконка та сплеш → `npm run assets`

## Корисні команди (з папки `mobile/`)
- `npm run set-url -- https://твій-домен` — змінити адресу сайту
- `npm run assets` — перегенерувати іконки/сплеш з `assets/`
- `npm run sync` — оновити iOS-проєкт після змін конфігу/плагінів

Збірка без Mac — GitHub Actions: `.github/workflows/ios-testflight.yml`.
