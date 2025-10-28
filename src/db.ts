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

// Функция для очистки и восстановления БД от поддельных данных
export function repairDatabase() {
  try {
    console.log("🔧 Checking database integrity...");
    
    // Удаляем сессии с поддельными данными
    const badSessions = db
      .prepare(`SELECT id FROM sessions WHERE data IS NULL OR data = 'undefined' OR data = 'null'`)
      .all() as any[];
    
    if (badSessions.length > 0) {
      console.warn(`⚠️ Found ${badSessions.length} corrupted sessions, cleaning up...`);
      for (const session of badSessions) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
        console.log(`🗑️ Deleted corrupted session: ${session.id}`);
      }
    }
    
    console.log("✅ Database repair completed");
  } catch (error) {
    console.error("❌ Error repairing database:", error);
  }
}

export interface FeedCache {
  id: number;
  shop: string;
  format: string;
  content: string;
  productsCount: number;
  createdAt: number;
}

// Simple custom session storage - just save raw session data
export const customSessionStorage = {
  loadSession: async (sessionId: string): Promise<any | null> => {
    try {
      console.log(`📦 Loading session: ${sessionId}`);
      const row = db
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(sessionId) as any;

      if (!row) {
        console.warn(`⚠️ Session not found: ${sessionId}`);
        return null;
      }

      // Защита от сохранённого "undefined" или null
      if (!row.data || row.data === "undefined" || row.data === "null") {
        console.warn(`⚠️ Invalid session data for ${sessionId}: ${row.data}`);
        return null;
      }

      const sessionData = JSON.parse(row.data);
      console.log(
        `✅ Session loaded: ${sessionId} for shop ${sessionData.shop}`
      );
      return sessionData;
    } catch (error) {
      console.error(`❌ Error loading session ${sessionId}:`, error);
      return null;
    }
  },

  storeSession: async (session: any): Promise<boolean> => {
    try {
      console.log(
        `💾 Storing session: ${session.id} for shop: ${session.shop}`
      );
      
      // Проверка что session объект валидный
      if (!session || !session.id || !session.shop) {
        console.error(`❌ Invalid session object:`, session);
        return false;
      }

      const now = Date.now();
      const serialized = JSON.stringify(session);

      // Проверка что сериализация прошла успешно
      if (!serialized || serialized === "undefined") {
        console.error(`❌ Failed to serialize session:`, serialized);
        return false;
      }

      db.prepare(
        `
        INSERT OR REPLACE INTO sessions
        (id, shop, data, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(session.id, session.shop, serialized, now, now);

      console.log(`✅ Session stored: ${session.id}`);

      // Verify immediately
      const verify = await customSessionStorage.loadSession(session.id);
      if (verify) {
        console.log(`✅ Session verified in DB: ${session.id}`);
        return true;
      } else {
        console.error(`❌ Session verification FAILED: ${session.id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to store session:`, error);
      return false;
    }
  },

  deleteSession: async (sessionId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting session: ${sessionId}`);
      db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
      console.log(`✅ Session deleted: ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete session:`, error);
      return false;
    }
  },

  findSessions: async (shopIds: string[]): Promise<any[]> => {
    try {
      if (shopIds.length === 0) {
        const rows = db.prepare("SELECT data FROM sessions").all() as any[];
        return rows
          .filter((row) => row.data && row.data !== "undefined" && row.data !== "null")
          .map((row) => JSON.parse(row.data))
          .filter(Boolean);
      }

      const placeholders = shopIds.map(() => "?").join(",");
      const rows = db
        .prepare(`SELECT data FROM sessions WHERE shop IN (${placeholders})`)
        .all(...shopIds) as any[];

      return rows
        .filter((row) => row.data && row.data !== "undefined" && row.data !== "null")
        .map((row) => JSON.parse(row.data))
        .filter(Boolean);
    } catch (error) {
      console.error("❌ Error finding sessions:", error);
      return [];
    }
  },

  deleteSessions: async (sessionIds: string[]): Promise<boolean> => {
    try {
      for (const id of sessionIds) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
      }
      console.log(`✅ Deleted ${sessionIds.length} sessions`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete sessions:`, error);
      return false;
    }
  },

  findSessionsByShop: async (shop: string): Promise<any[]> => {
    try {
      const rows = db
        .prepare("SELECT data FROM sessions WHERE shop = ?")
        .all(shop) as any[];

      return rows
        .filter((row) => row.data && row.data !== "undefined" && row.data !== "null")
        .map((row) => JSON.parse(row.data))
        .filter(Boolean);
    } catch (error) {
      console.error("❌ Error finding sessions by shop:", error);
      return [];
    }
  },
};

// Утилиты для работы с feed cache
export const feedCacheStorage = {
  getCache: (
    shop: string,
    format: string,
    maxAge: number = 6 * 60 * 60 * 1000
  ): FeedCache | null => {
    const row = db
      .prepare(
        `
        SELECT * FROM feed_cache
        WHERE shop = ? AND format = ? AND createdAt > ?
      `
      )
      .get(shop, format, Date.now() - maxAge) as any;

    return row || null;
  },

  saveCache: (
    shop: string,
    format: string,
    content: string,
    productsCount: number
  ) => {
    db.prepare(
      `
      INSERT OR REPLACE INTO feed_cache (shop, format, content, productsCount, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(shop, format, content, productsCount, Date.now());
  },

  invalidateCache: (shop: string) => {
    db.prepare("DELETE FROM feed_cache WHERE shop = ?").run(shop);
    console.log(`🗑️ Invalidated feed cache for ${shop}`);
  },

  getAllCachedFeeds: (shop: string): FeedCache[] => {
    return db
      .prepare(
        "SELECT * FROM feed_cache WHERE shop = ? ORDER BY createdAt DESC"
      )
      .all(shop) as FeedCache[];
  },
};
