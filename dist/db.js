import Database from "better-sqlite3";
import path from "path";
const dbPath = path.join(process.cwd(), "feedbuilder.db");
export const db = new Database(dbPath);
// Включаем WAL mode для лучшей производительности
db.pragma("journal_mode = WAL");
// Инициализация таблиц
db.exec(`
  -- Таблица для хранения Shopify sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    shop TEXT NOT NULL UNIQUE,
    accessToken TEXT NOT NULL,
    scopes TEXT NOT NULL,
    isOnline INTEGER DEFAULT 0,
    expiresAt INTEGER,
    onlineAccessInfo TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop);

  -- Таблица для кэширования фидов
  CREATE TABLE IF NOT EXISTS feed_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT NOT NULL,
    format TEXT NOT NULL,
    content TEXT NOT NULL,
    productsCount INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    UNIQUE(shop, format)
  );

  CREATE INDEX IF NOT EXISTS idx_feed_cache_shop_format ON feed_cache(shop, format);
`);
console.log("✅ Database initialized:", dbPath);
// Утилиты для работы с sessions
export const sessionStorage = {
    getSession: (shop) => {
        const row = db
            .prepare("SELECT * FROM sessions WHERE shop = ?")
            .get(shop);
        if (!row)
            return null;
        return {
            ...row,
            isOnline: row.isOnline === 1,
        };
    },
    saveSession: (session) => {
        const now = Date.now();
        db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, shop, accessToken, scopes, isOnline, expiresAt, onlineAccessInfo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id || `offline_${session.shop}`, session.shop, session.accessToken, session.scopes || "", session.isOnline ? 1 : 0, session.expiresAt || null, session.onlineAccessInfo || null, session.createdAt || now, now);
    },
    deleteSession: (shop) => {
        db.prepare("DELETE FROM sessions WHERE shop = ?").run(shop);
    },
    getAllShops: () => {
        const rows = db
            .prepare("SELECT DISTINCT shop FROM sessions")
            .all();
        return rows.map((row) => row.shop);
    },
};
// Утилиты для работы с feed cache
export const feedCacheStorage = {
    getCache: (shop, format, maxAge = 6 * 60 * 60 * 1000) => {
        const row = db
            .prepare(`
        SELECT * FROM feed_cache
        WHERE shop = ? AND format = ? AND createdAt > ?
      `)
            .get(shop, format, Date.now() - maxAge);
        return row || null;
    },
    saveCache: (shop, format, content, productsCount) => {
        db.prepare(`
      INSERT OR REPLACE INTO feed_cache (shop, format, content, productsCount, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(shop, format, content, productsCount, Date.now());
    },
    invalidateCache: (shop) => {
        db.prepare("DELETE FROM feed_cache WHERE shop = ?").run(shop);
        console.log(`🗑️ Invalidated feed cache for ${shop}`);
    },
    getAllCachedFeeds: (shop) => {
        return db
            .prepare("SELECT * FROM feed_cache WHERE shop = ? ORDER BY createdAt DESC")
            .all(shop);
    },
};
