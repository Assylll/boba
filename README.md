# Boba POS

POS-сайт для баблти на Next.js 14 с серверным backend внутри проекта.

## Что теперь есть

- Серверное состояние (заказы, смены, счета, приемки, переводы) через API роуты Next.js.
- Авторизация админки через `httpOnly` cookie-сессию.
- Защищенные админ-действия на backend.
- Хранилище состояния с 2 режимами: `Upstash Redis` (постоянно) или файл `data/state.json` (локально).

## Основные API

- `GET /api/state` — получить текущее состояние + auth статус.
- `POST /api/state/action` — применить действие (checkout, shift, accounts, receipts, transfers и т.д.).
- `POST /api/admin/login` — вход в админку.
- `POST /api/admin/logout` — выход из админки.
- `GET /api/orders` — получить список заказов.

## Структура (ключевые файлы)

- `src/lib/pos-state.ts` — доменная логика состояния (серверная бизнес-логика).
- `src/lib/store.tsx` — клиентский store, синхронизируется с backend API.
- `src/server/state-db.ts` — чтение/запись состояния (`Upstash Redis` или файл `data/state.json`).
- `src/server/auth.ts` — cookie-сессии админа.
- `src/app/api/*` — backend endpoints.

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`

## Прод-сборка

```bash
npm run build
npm run start
```

## Переменные окружения (опционально)

```env
STATE_STORAGE=file
STATE_DATA_DIR=./data
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
BOBA_POS_SESSION_SECRET=change_me_long_random_secret
```

Если не задать, используются значения по умолчанию.

## Важно про хранилище

Поддерживаются 2 режима:

- `STATE_STORAGE=redis` + `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` -> постоянная БД (рекомендуется для Vercel).
- `STATE_STORAGE=file` -> файловая БД `STATE_DATA_DIR/state.json` (удобно локально).

Если `STATE_STORAGE` не задан, приложение автоматически выбирает Redis при наличии `UPSTASH_*`, иначе файл.

## Деплой на Vercel (легко и постоянно)

1. Запушить проект в GitHub/GitLab/Bitbucket.
2. Импортировать репозиторий в Vercel (Next.js определяется автоматически).
3. Подключить Upstash Redis в проект:
   - через Dashboard: `Integrations -> Browse Marketplace -> Upstash`
   - или CLI: `vercel integration add upstash`
4. В `Project Settings -> Environment Variables` добавить:
   - `STATE_STORAGE=redis`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `BOBA_POS_SESSION_SECRET`
   - `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN` (обычно подставляются автоматически интеграцией)
5. Запустить deploy.
6. Если изменили env-переменные, сделать redeploy.

Пример минимального `.env`:

```env
STATE_STORAGE=redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
BOBA_POS_SESSION_SECRET=long_random_secret
```

## Чековый принтер (QZ Tray)

В кассе добавлены:

- `Тест-чек`
- `Последний чек`
- `Автопечать` после успешной оплаты

Как подключить:

1. Установить драйвер принтера в ОС и проверить печать тестовой страницы.
2. Установить и запустить QZ Tray на кассовом ПК.
3. В кассе указать имя принтера (или оставить пусто для принтера по умолчанию).
4. Нажать `Тест-чек`.
# boba
# boba
