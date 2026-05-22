# Boba POS

POS-сайт для баблти на Next.js 14 с серверным backend внутри проекта.

## Что теперь есть

- Серверное состояние (заказы, смены, счета, приемки, переводы) через API роуты Next.js.
- Авторизация админки через `httpOnly` cookie-сессию.
- Защищенные админ-действия на backend.
- Файловое хранилище состояния: `data/state.json`.

## Основные API

- `GET /api/state` — получить текущее состояние + auth статус.
- `POST /api/state/action` — применить действие (checkout, shift, accounts, receipts, transfers и т.д.).
- `POST /api/admin/login` — вход в админку.
- `POST /api/admin/logout` — выход из админки.
- `GET /api/orders` — получить список заказов.

## Структура (ключевые файлы)

- `src/lib/pos-state.ts` — доменная логика состояния (серверная бизнес-логика).
- `src/lib/store.tsx` — клиентский store, синхронизируется с backend API.
- `src/server/state-db.ts` — чтение/запись состояния (PostgreSQL или `data/state.json`).
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
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/boba_pos?schema=public
STATE_STORAGE=postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
BOBA_POS_SESSION_SECRET=change_me_long_random_secret
```

Если не задать, используются значения по умолчанию.

## PostgreSQL + Prisma

```bash
# 1) Сгенерировать Prisma Client
npm run prisma:generate

# 2) Создать таблицы в PostgreSQL
npm run prisma:push

# 3) Запустить приложение
npm run dev
```

Альтернатива вместо `prisma:push`:

```bash
npm run prisma:migrate
```

## Важно про хранилище

Поддерживаются 2 режима:

- `STATE_STORAGE=postgres` + `DATABASE_URL` -> PostgreSQL через Prisma.
- Без `DATABASE_URL` (или `STATE_STORAGE=file`) -> файловая БД `data/state.json`.

## Деплой на Vercel + Supabase

1. Создать проект в Supabase.
2. В Supabase -> `Connect` взять connection string для pooler.
3. Для serverless (Vercel) использовать строку с портом `6543` и параметрами:
   - `pgbouncer=true`
   - `connection_limit=1`

Пример:

```env
DATABASE_URL=postgresql://prisma.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@YOUR_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
STATE_STORAGE=postgres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me
BOBA_POS_SESSION_SECRET=long_random_secret
```

4. Локально накатить схему в Supabase:

```bash
npm install
npm run prisma:push
```

5. Запушить проект в GitHub/GitLab/Bitbucket.
6. Импортировать репозиторий в Vercel (Next.js определяется автоматически).
7. В Vercel -> Project Settings -> Environment Variables добавить:
   - `DATABASE_URL`
   - `STATE_STORAGE=postgres`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `BOBA_POS_SESSION_SECRET`
8. Запустить deploy.
9. Если изменили env-переменные, сделать redeploy.

Рекомендуется для `Preview` и `Production` использовать разные `DATABASE_URL`, чтобы изменения схемы в preview не затронули production БД.

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
