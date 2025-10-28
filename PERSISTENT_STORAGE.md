# 💾 Persistent Storage Setup

## Проблема

SQLite база данных `feedbuilder.db` хранится в контейнере, который пересоздается при каждом деплое. Это означает что **все данные теряются** при обновлении приложения.

## Решение

Используем **Fly.io Persistent Volumes** для сохранения базы данных между деплоями.

---

## 🚀 Шаг 1: Создание Volume

### На Fly.io уже есть база?

Проверьте существующие volumes:

```bash
fly volumes list
```

### Создайте новый volume

```bash
fly volumes create feedbuilder_data \
  --size 3 \
  --region ams
```

**Параметры:**

- `feedbuilder_data` - имя volume (должно совпадать с именем в `fly.toml`)
- `--size 3` - размер в GB (3GB достаточно для большинства случаев)
- `--region ams` - регион (должен совпадать с `primary_region` в `fly.toml`)

---

## 🚀 Шаг 2: Первый деплой с volume

После создания volume, сделайте деплой:

```bash
fly deploy
```

Fly.io автоматически примонтирует volume в `/app/data` и установит переменную `DATA_DIR=/app/data`.

---

## ✅ Что изменилось в коде

### 1. `fly.toml` - добавлен mount

```toml
[mounts]
  source = "feedbuilder_data"
  destination = "/app/data"
```

### 2. `Dockerfile` - создана директория и переменная

```dockerfile
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data
```

### 3. Все файлы с БД - используют `DATA_DIR`

```typescript
// src/db.ts, src/shopify.ts, src/services/billingService.ts
const dataDir = process.env.DATA_DIR || process.cwd();
const dbPath = path.join(dataDir, "feedbuilder.db");
```

### 4. `.dockerignore` - исключает БД из образа

```
*.db
*.sqlite
*.sqlite3
```

---

## 📊 Проверка

### После деплоя проверьте:

1. **Что volume примонтирован:**

```bash
fly ssh console
ls -la /app/data/
```

Должны увидеть:

```
feedbuilder.db
```

2. **Что база создалась:**

```bash
fly ssh console
sqlite3 /app/data/feedbuilder.db ".tables"
```

Должны увидеть все таблицы (sessions, feed_cache, subscriptions).

3. **Что данные сохраняются между деплоями:**

```bash
# Установите приложение через OAuth
https://feedbuilder.fly.dev/install?shop=test.myshopify.com

# Проверьте статус
curl https://feedbuilder.fly.dev/status

# Сделайте новый деплой
fly deploy

# Проверьте статус снова - магазин должен остаться
curl https://feedbuilder.fly.dev/status
```

---

## 🔧 Troubleshooting

### Volume не создался

**Ошибка:** `volume create failed: Unknown host`

**Решение:** Убедитесь что вы в правильном регионе:

```bash
fly regions list
fly volumes create feedbuilder_data --region ams
```

### Дубль базы данных

**Симптомы:** Приложение не видит sessions

**Решение:** Проверьте что старые БД не остались:

```bash
fly ssh console
find /app -name "*.db" -ls
```

Должна быть только `/app/data/feedbuilder.db`

### Недостаточно места

**Ошибка:** `no space left on device`

**Решение:** Увеличьте размер volume:

```bash
fly volumes extend feedbuilder_data --size 5
```

---

## 💰 Стоимость

Fly.io взимает плату за persistent volumes:

- **$0.15/GB/month** за хранение
- Пример: 3GB volume = $0.45/month

**Free tier:** Первые 3GB бесплатно! ✨

---

## 🔄 Резервное копирование

### Создание backup

```bash
fly ssh console
sqlite3 /app/data/feedbuilder.db ".backup /tmp/backup.db"

# Скачайте backup
fly sftp get /tmp/backup.db ./feedbuilder_backup_$(date +%Y%m%d).db
```

### Восстановление backup

```bash
# Загрузите backup
fly sftp put ./feedbuilder_backup_20231201.db /tmp/restore.db

# Войдите в контейнер
fly ssh console

# Замените базу
sqlite3 /app/data/feedbuilder.db ".backup /tmp/feedbuilder.db.old"
sqlite3 /app/data/feedbuilder.db ".restore /tmp/restore.db"
```

---

## 🎯 Итого

Теперь база данных:

- ✅ Сохраняется между деплоями
- ✅ Не теряется при перезапуске контейнера
- ✅ Может быть backup-нута
- ✅ Изолирована от кода приложения

**Все готово к продакшн использованию!** 🚀

## Database Repair Mechanism

### Problem: Corrupted Sessions
During the OAuth flow, sometimes session data can be stored as the string `"undefined"` instead of valid JSON. This causes the error:
```
SyntaxError: "undefined" is not valid JSON at JSON.parse
```

### Solution
The app now has a multi-layer protection:

1. **Automatic Repair on Startup** (`repairDatabase()`)
   - Called automatically when the app starts
   - Identifies and deletes any corrupted sessions
   - Logs all cleanup actions

2. **Validation on Save** (`storeSession()`)
   - Validates that the session object has required fields (id, shop)
   - Checks that serialization produces valid JSON
   - Prevents storing invalid data

3. **Safe Loading** (`loadSession()`)
   - Checks for null, undefined, or string "undefined" before parsing
   - Returns null gracefully instead of throwing errors
   - Logs warnings for invalid data

### How It Works
```typescript
// Automatically called at startup
repairDatabase() → finds corrupted sessions → deletes them

// During OAuth
storeSession(session) → validates → serializes → saves

// When accessing sessions
loadSession(id) → checks for corruption → parses safely
```

### Database Schema
The sessions table has:
- `id` (TEXT PRIMARY KEY)
- `shop` (TEXT NOT NULL)
- `data` (TEXT NOT NULL) - Must contain valid JSON
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)
