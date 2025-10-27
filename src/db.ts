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

// Типы
export interface Session {
  id: string;
  shop: string;
  accessToken: string;
  scopes: string;
  isOnline: boolean;
  expiresAt?: number;
  onlineAccessInfo?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FeedCache {
  id: number;
  shop: string;
  format: string;
  content: string;
  productsCount: number;
  createdAt: number;
}

// Утилиты для работы с sessions
export const sessionStorage = {
  getSession: (shop: string): Session | null => {
    const row = db
      .prepare("SELECT * FROM sessions WHERE shop = ?")
      .get(shop) as any;

    if (!row) return null;

    return {
      ...row,
      isOnline: row.isOnline === 1,
    };
  },

  saveSession: (session: Partial<Session>) => {
    const now = Date.now();

    db.prepare(
      `
      INSERT OR REPLACE INTO sessions
      (id, shop, accessToken, scopes, isOnline, expiresAt, onlineAccessInfo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      session.id || `offline_${session.shop}`,
      session.shop,
      session.accessToken,
      session.scopes || "",
      session.isOnline ? 1 : 0,
      session.expiresAt || null,
      session.onlineAccessInfo || null,
      session.createdAt || now,
      now
    );
  },

  deleteSession: (shop: string) => {
    db.prepare("DELETE FROM sessions WHERE shop = ?").run(shop);
  },

  getAllShops: (): string[] => {
    const rows = db
      .prepare("SELECT DISTINCT shop FROM sessions")
      .all() as any[];
    return rows.map((row) => row.shop);
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
