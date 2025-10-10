# ✅ Исправление деплоя на Vercel

## Что было исправлено:

### 1. ✅ Обновлен `vercel.json`
Убран устаревший формат с `builds`, теперь используется современный подход:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

### 2. ✅ Добавлен `api/index.ts`
Создан entry point для Vercel serverless functions:

```typescript
import app from "../src/index.js";
export default app;
```

### 3. ✅ Добавлен `.nvmrc`
Указана версия Node.js 20 для Vercel.

### 4. ✅ Обновлен `package.json`
- Добавлено поле `engines` с версией Node.js
- Добавлены типы для TypeScript: `@types/better-sqlite3`, `@types/uuid`

---

## 🚀 Теперь деплой должен работать!

Vercel автоматически подхватит изменения из GitHub и задеплоит проект.

Или вручную:
```bash
vercel --prod
```

---

## 📁 Новая структура проекта:

```
feedbuilder/
├── api/
│   └── index.ts          # Entry point для Vercel
├── src/
│   ├── index.ts          # Express app (export default)
│   ├── shopify.ts
│   ├── db.ts
│   ├── queries.ts
│   ├── feeds.ts
│   └── routes/
│       ├── auth.ts
│       ├── feed.ts
│       └── webhooks.ts
├── .nvmrc                # Node.js версия
├── vercel.json           # Vercel конфигурация (без builds)
├── package.json
└── tsconfig.json
```

---

## 🔍 Как это работает:

1. Vercel видит папку `api/` и автоматически создает serverless functions
2. `api/index.ts` импортирует Express app из `src/index.ts`
3. `vercel.json` перенаправляет все запросы `/*` на `/api`
4. Vercel компилирует TypeScript автоматически

---

## ✅ Checklist после деплоя:

- [ ] Проверить, что деплой прошел успешно в Vercel Dashboard
- [ ] Убедиться, что все env переменные добавлены
- [ ] Протестировать `/install` endpoint
- [ ] Протестировать OAuth flow
- [ ] Загрузить продукты через `/admin/regenerate`
- [ ] Проверить XML фид через `/feed/{token}.xml`

**Готово!** 🎉

