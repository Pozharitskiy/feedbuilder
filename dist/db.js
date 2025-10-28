import Database from "better-sqlite3";
import path from "path";
// Use persistent data directory if mounted, otherwise fallback to cwd
const dataDir = process.env.DATA_DIR || process.cwd();
const dbPath = path.join(dataDir, "feedbuilder.db");
export const db = new Database(dbPath);
// Включаем WAL mode для лучшей производительности
db.pragma("journal_mode = WAL");
// Инициализация таблиц
db.exec(`
  -- Таблица для хранения Shopify sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    shop TEXT NOT NULL,
    data TEXT NOT NULL,
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
// Simple custom session storage - just save raw session data
export const customSessionStorage = {
    loadSession: async (sessionId) => {
        try {
            console.log(`📦 Loading session: ${sessionId}`);
            const row = db
                .prepare("SELECT * FROM sessions WHERE id = ?")
                .get(sessionId);
            if (!row) {
                console.warn(`⚠️ Session not found: ${sessionId}`);
                return null;
            }
            const sessionData = JSON.parse(row.data);
            console.log(`✅ Session loaded: ${sessionId} for shop ${sessionData.shop}`);
            return sessionData;
        }
        catch (error) {
            console.error(`❌ Error loading session ${sessionId}:`, error);
            return null;
        }
    },
    storeSession: async (session) => {
        try {
            console.log(`💾 Storing session: ${session.id} for shop: ${session.shop}`);
            const now = Date.now();
            db.prepare(`
        INSERT OR REPLACE INTO sessions
        (id, shop, data, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(session.id, session.shop, JSON.stringify(session), now, now);
            console.log(`✅ Session stored: ${session.id}`);
            // Verify immediately
            const verify = await customSessionStorage.loadSession(session.id);
            if (verify) {
                console.log(`✅ Session verified in DB: ${session.id}`);
                return true;
            }
            else {
                console.error(`❌ Session verification FAILED: ${session.id}`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Failed to store session:`, error);
            return false;
        }
    },
    deleteSession: async (sessionId) => {
        try {
            console.log(`🗑️ Deleting session: ${sessionId}`);
            db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
            console.log(`✅ Session deleted: ${sessionId}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to delete session:`, error);
            return false;
        }
    },
    findSessions: async (shopIds) => {
        try {
            if (shopIds.length === 0) {
                const rows = db.prepare("SELECT data FROM sessions").all();
                return rows.map(row => JSON.parse(row.data));
            }
            const placeholders = shopIds.map(() => "?").join(",");
            const rows = db
                .prepare(`SELECT data FROM sessions WHERE shop IN (${placeholders})`)
                .all(...shopIds);
            return rows.map(row => JSON.parse(row.data));
        }
        catch (error) {
            console.error("❌ Error finding sessions:", error);
            return [];
        }
    },
    deleteSessions: async (sessionIds) => {
        try {
            for (const id of sessionIds) {
                db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
            }
            console.log(`✅ Deleted ${sessionIds.length} sessions`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to delete sessions:`, error);
            return false;
        }
    },
    findSessionsByShop: async (shop) => {
        try {
            const rows = db
                .prepare("SELECT data FROM sessions WHERE shop = ?")
                .all(shop);
            return rows.map(row => JSON.parse(row.data));
        }
        catch (error) {
            console.error("❌ Error finding sessions by shop:", error);
            return [];
        }
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
