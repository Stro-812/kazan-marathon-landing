# Лендинг «Подготовка к Казанскому марафону с S10.run»

Astro, статический сайт. Контент — в `content/*.yaml`, вёрстка не трогается при смене марафона.

## Команды (Node 22: `source ~/.nvm/nvm.sh`)
- `npm install` — один раз
- `npm run dev` — сайт на http://127.0.0.1:4321, дату можно подменить: `/?today=2027-01-11`
- `npm run build` — проверка контента + сборка в `dist/` (папку `dist` выкладывать на хостинг)
- `npm run report` — таблица плана для сверки с S10.run
- `npm run test:validation` — проверка, что каждая ошибка из раздела 6 ТЗ останавливает сборку
- `npm run images` — пересобрать картинки первого экрана и превью из `assets-src/hero-original.webp`

## Что заполнить
- `content/config.yaml`: `s10_buy_url`, `telegram_url`, `s10_offer_url`, `s10_privacy_url` (сейчас `...`),
  `metrika_id` (номер счётчика Метрики), `site_url` (домен — для canonical и превью), `curator_photo`.
- `content/weeks/week-01…24.yaml`: черновой план, сверить с S10.run и удалить `draft: true`.
- `content/cases.yaml`: реальные ученики вместо заглушек, удалить `placeholder: true`.
- `content/faq.yaml`: ответы, удалить `placeholder: true`.

Цели Метрики: `buy_click` (параметр `block`: nav, hero, price, footer, actionbar), `week_open` (`week`),
`telegram_click` (`block`), `faq_open` (`question`).
